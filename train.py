import argparse
import json
import os
import warnings

import numpy as np
import pandas as pd
from scipy.optimize import nnls
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb

warnings.filterwarnings("ignore")

SOURCES = ["nwp", "ai", "ensemble"]
GROUP_COLS = ["region", "lead_time_bucket", "season", "weather_regime"]
ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")


def load_data(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path, parse_dates=["date"])
    df.sort_values("date", inplace=True)

    def lead_bucket(h):
        if h <= 24:
            return "0-24h"
        if h <= 72:
            return "1-3d"
        if h <= 120:
            return "3-5d"
        return "5-10d"

    df["lead_time_bucket"] = df["forecast_lead_time_hours"].apply(lead_bucket)
    return df


def time_split(df: pd.DataFrame, test_frac=0.2):
    cutoff = df["date"].quantile(1 - test_frac)
    train = df[df["date"] <= cutoff].copy()
    test = df[df["date"] > cutoff].copy()
    return train, test


def baseline_metrics(df: pd.DataFrame, target: str) -> pd.DataFrame:
    rows = []
    obs = df[f"{target}_actual"]
    for src in SOURCES:
        pred = df[f"{src}_{target}"]
        rows.append({
            "model": src.upper(),
            "MAE": mean_absolute_error(obs, pred),
            "RMSE": mean_squared_error(obs, pred) ** 0.5,
            "R2": r2_score(obs, pred),
            "Bias": (pred - obs).mean(),
        })
    return pd.DataFrame(rows)


def solve_group_weights(group: pd.DataFrame, target: str) -> np.ndarray:
    A = group[[f"{s}_{target}" for s in SOURCES]].values
    b = group[f"{target}_actual"].values
    if len(group) < 5:
        return None
    w, _ = nnls(A, b)
    if w.sum() == 0:
        return np.ones(len(SOURCES)) / len(SOURCES)
    return w / w.sum()


def fit_dynamic_weights(train: pd.DataFrame, target: str):
    weight_table, global_fallback = [], solve_group_weights(train, target)
    if global_fallback is None:
        global_fallback = np.ones(len(SOURCES)) / len(SOURCES)

    for keys, group in train.groupby(GROUP_COLS):
        w = solve_group_weights(group, target)
        if w is None:
            w = global_fallback
        row = dict(zip(GROUP_COLS, keys))
        row.update({f"w_{s}": round(v, 4) for s, v in zip(SOURCES, w)})
        row["n_train_rows"] = len(group)
        weight_table.append(row)

    weight_df = pd.DataFrame(weight_table)
    fallback_row = {c: "__GLOBAL_FALLBACK__" for c in GROUP_COLS}
    fallback_row.update({f"w_{s}": round(v, 4) for s, v in zip(SOURCES, global_fallback)})
    fallback_row["n_train_rows"] = len(train)
    weight_df = pd.concat([weight_df, pd.DataFrame([fallback_row])], ignore_index=True)
    return weight_df


def apply_dynamic_weights(df: pd.DataFrame, target: str, weight_df: pd.DataFrame) -> np.ndarray:
    merged = df.merge(weight_df, on=GROUP_COLS, how="left")
    fb = weight_df[weight_df["region"] == "__GLOBAL_FALLBACK__"].iloc[0]
    for s in SOURCES:
        merged[f"w_{s}"] = merged[f"w_{s}"].fillna(fb[f"w_{s}"])
    blend = sum(merged[f"w_{s}"] * merged[f"{s}_{target}"] for s in SOURCES)
    return blend.values


CATEGORICALS = ["region", "season", "weather_regime", "lead_time_bucket"]


def build_features(df: pd.DataFrame, target: str, encoders: dict, fit: bool):
    feats = pd.DataFrame(index=df.index)
    feats["month"] = df["month"]
    feats["forecast_lead_time_hours"] = df["forecast_lead_time_hours"]
    feats["humidity"] = df["humidity"]
    feats["pressure"] = df["pressure"]
    for s in SOURCES:
        feats[f"{s}_{target}"] = df[f"{s}_{target}"]
        feats[f"{s}_{target}_hist_mae"] = df[f"{s}_{target}_hist_mae"]
    for col in CATEGORICALS:
        if fit:
            le = LabelEncoder()
            feats[col] = le.fit_transform(df[col].astype(str))
            encoders[col] = le
        else:
            le = encoders[col]
            feats[col] = df[col].astype(str).map(
                lambda v, le=le: le.transform([v])[0] if v in le.classes_ else -1
            )
    return feats


def train_ai_blender(train: pd.DataFrame, target: str):
    encoders = {}
    X_train = build_features(train, target, encoders, fit=True)
    y_train = train[f"{target}_actual"]

    model = xgb.XGBRegressor(
        n_estimators=400,
        max_depth=5,
        learning_rate=0.04,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_lambda=1.0,
        objective="reg:squarederror",
        random_state=42,
    )
    model.fit(X_train, y_train)
    return model, encoders, X_train.columns.tolist()


def evaluate_all(train: pd.DataFrame, test: pd.DataFrame, target: str):
    os.makedirs(ARTIFACT_DIR, exist_ok=True)

    print(f"\n{'=' * 60}\nTARGET: {target.upper()}\n{'=' * 60}")

    base_train_metrics = baseline_metrics(train, target)
    print("\nIndividual model performance (TRAIN, for reference):")
    print(base_train_metrics.to_string(index=False))

    weight_df = fit_dynamic_weights(train, target)
    test = test.copy()
    test["blitzcast_weighted"] = apply_dynamic_weights(test, target, weight_df)

    model, encoders, feature_cols = train_ai_blender(train, target)
    X_test = build_features(test, target, encoders, fit=False)[feature_cols]
    test["blitzcast_ai"] = model.predict(X_test)

    obs = test[f"{target}_actual"]
    rows = []
    for label, pred in [
        ("NWP", test[f"nwp_{target}"]),
        ("AI Model", test[f"ai_{target}"]),
        ("Ensemble", test[f"ensemble_{target}"]),
        ("BlitzCast (weighted blend)", test["blitzcast_weighted"]),
        ("BlitzCast (AI meta-model)", test["blitzcast_ai"]),
    ]:
        rows.append({
            "model": label,
            "MAE": round(mean_absolute_error(obs, pred), 3),
            "RMSE": round(mean_squared_error(obs, pred) ** 0.5, 3),
            "R2": round(r2_score(obs, pred), 3),
            "Bias": round((pred - obs).mean(), 3),
        })
    eval_df = pd.DataFrame(rows)
    print("\nHeld-out TEST comparison (this is the number that matters):")
    print(eval_df.to_string(index=False))

    best = eval_df.loc[eval_df["MAE"].idxmin(), "model"]
    baseline_best_mae = eval_df[eval_df["model"].isin(["NWP", "AI Model", "Ensemble"])]["MAE"].min()
    blitz_best_mae = eval_df[eval_df["model"].str.startswith("BlitzCast")]["MAE"].min()
    if baseline_best_mae > 0:
        improvement = 100 * (baseline_best_mae - blitz_best_mae) / baseline_best_mae
        print(f"\nBest single model: MAE={baseline_best_mae:.3f}  |  Best BlitzCast blend: MAE={blitz_best_mae:.3f}"
              f"  ->  {improvement:+.1f}% change vs. best individual model")
    print(f"Overall best performer on this test set: {best}")

    weight_df.to_csv(f"{ARTIFACT_DIR}/weights_{target}.csv", index=False)
    eval_df.to_csv(f"{ARTIFACT_DIR}/evaluation_{target}.csv", index=False)
    model.save_model(f"{ARTIFACT_DIR}/model_{target}.json")
    with open(f"{ARTIFACT_DIR}/encoders_{target}.json", "w") as f:
        json.dump({c: le.classes_.tolist() for c, le in encoders.items()}, f, indent=2)
    with open(f"{ARTIFACT_DIR}/feature_columns_{target}.json", "w") as f:
        json.dump(feature_cols, f, indent=2)

    fi = pd.DataFrame({
        "feature": feature_cols,
        "importance": model.feature_importances_,
    }).sort_values("importance", ascending=False)
    fi.to_csv(f"{ARTIFACT_DIR}/feature_importance_{target}.csv", index=False)

    return eval_df.assign(target=target)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", default="datasets/blitzcast_training_data.csv",
                         help="Path to training CSV (datasets/blitzcast_training_data.csv, or your own fetched file with the same schema)")
    parser.add_argument("--target", default="all", choices=["temp", "rain", "wind", "all"])
    parser.add_argument("--test_frac", type=float, default=0.2)
    args = parser.parse_args()

    df = load_data(args.csv)
    train, test = time_split(df, args.test_frac)
    print(f"Loaded {len(df):,} rows | train={len(train):,} (<= {train['date'].max().date()}) "
          f"| test={len(test):,} (> {train['date'].max().date()})")

    targets = ["temp", "rain", "wind"] if args.target == "all" else [args.target]
    summaries = [evaluate_all(train, test, t) for t in targets]

    summary = pd.concat(summaries, ignore_index=True)
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    summary.to_csv(f"{ARTIFACT_DIR}/evaluation_summary.csv", index=False)
    print(f"\nAll artifacts written to: {ARTIFACT_DIR}/")


if __name__ == "__main__":
    main()