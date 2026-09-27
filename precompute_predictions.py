import os
import json
import numpy as np
import pandas as pd
import xgboost as xgb

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "datasets", "processed", "blitzcast_training_data.csv")
OBS_PATH = os.path.join(BASE_DIR, "datasets", "observations", "era5_observations.csv")
ARTIFACT_DIR = os.path.join(BASE_DIR, "artifacts")
OUTPUT_PATH = os.path.join(ARTIFACT_DIR, "dashboard_data.json")

SOURCES = ["nwp", "ai", "ensemble"]
TARGETS = ["temp", "rain", "wind"]
CATEGORICALS = ["region", "season", "weather_regime", "lead_time_bucket"]
CONFIDENCE_SCALE = {"temp": 6.0, "rain": 20.0, "wind": 8.0}
TIMESERIES_DAYS = 30
EXTREME_DAYS = 14


def lead_bucket(hours):
    if hours <= 24:
        return "0-24h"
    if hours <= 72:
        return "1-3d"
    if hours <= 120:
        return "3-5d"
    return "5-10d"


def load_dataset():
    df = pd.read_csv(DATA_PATH, parse_dates=["date"])
    df["lead_time_bucket"] = df["forecast_lead_time_hours"].apply(lead_bucket)
    return df


def load_observations():
    return pd.read_csv(OBS_PATH, parse_dates=["date"])


def load_target_artifacts(target):
    model = xgb.XGBRegressor()
    model.load_model(os.path.join(ARTIFACT_DIR, f"model_{target}.json"))
    with open(os.path.join(ARTIFACT_DIR, f"encoders_{target}.json")) as f:
        encoders = json.load(f)
    with open(os.path.join(ARTIFACT_DIR, f"feature_columns_{target}.json")) as f:
        feature_cols = json.load(f)
    weights = pd.read_csv(os.path.join(ARTIFACT_DIR, f"weights_{target}.csv"))
    return {"model": model, "encoders": encoders, "feature_cols": feature_cols, "weights": weights}


def encode_value(value, classes):
    return classes.index(value) if value in classes else -1


def build_feature_vector(row, target, encoders, feature_cols):
    values = {
        "month": row["month"],
        "forecast_lead_time_hours": row["forecast_lead_time_hours"],
        "humidity": row["humidity"],
        "pressure": row["pressure"],
    }
    for source in SOURCES:
        values[f"{source}_{target}"] = row[f"{source}_{target}"]
        values[f"{source}_{target}_hist_mae"] = row[f"{source}_{target}_hist_mae"]
    for col in CATEGORICALS:
        values[col] = encode_value(str(row[col]), encoders[col])
    return [values[c] for c in feature_cols]


def ai_blend_predict(df_slice, target, art):
    matrix = np.array(
        [build_feature_vector(row, target, art["encoders"], art["feature_cols"])
         for _, row in df_slice.iterrows()],
        dtype=float,
    )
    return art["model"].predict(matrix)


def group_weights(region, lead_time_bucket, season, weather_regime, weights_df):
    match = weights_df[
        (weights_df.region == region)
        & (weights_df.lead_time_bucket == lead_time_bucket)
        & (weights_df.season == season)
        & (weights_df.weather_regime == weather_regime)
    ]
    if match.empty:
        match = weights_df[weights_df.region == "__GLOBAL_FALLBACK__"]
    row = match.iloc[0]
    return {source: float(row[f"w_{source}"]) for source in SOURCES}


def confidence_score(row, target):
    values = [row[f"{source}_{target}"] for source in SOURCES]
    spread = max(values) - min(values)
    score = max(0.0, 1.0 - spread / CONFIDENCE_SCALE[target])
    return round(score * 100, 1)


def build_current(obs, region):
    subset = obs[obs.region == region].sort_values("date")
    latest = subset.iloc[-1]
    return {
        "region": region,
        "date": str(latest["date"].date()),
        "temp": round(float(latest["temp_actual"]), 1),
        "rain": round(float(latest["rain_actual"]), 1),
        "wind": round(float(latest["wind_actual"]), 1),
        "humidity": round(float(latest["humidity"]), 1),
        "pressure": round(float(latest["pressure"]), 1),
        "regime": latest["weather_regime"],
        "season": latest["season"],
    }


def build_forecast(subset, target, art):
    latest_slice = subset.tail(1)
    latest = latest_slice.iloc[0]
    weighted = float(weighted_generic(latest_slice, target, art["weights"])[0])
    ai_blend = float(ai_blend_predict(latest_slice, target, art)[0])
    weights = group_weights(latest["region"], latest["lead_time_bucket"], latest["season"], latest["weather_regime"], art["weights"])
    return {
        "date": str(latest["date"].date()),
        "nwp": float(latest[f"nwp_{target}"]),
        "ai_model": float(latest[f"ai_{target}"]),
        "ensemble": float(latest[f"ensemble_{target}"]),
        "blitzcast_weighted": round(weighted, 2),
        "blitzcast_ai": round(ai_blend, 2),
        "weights": {source: round(value, 3) for source, value in weights.items()},
        "confidence": confidence_score(latest, target),
        "regime": latest["weather_regime"],
        "season": latest["season"],
    }


def weighted_generic(df_slice, target, weights_df):
    predictions = []
    for _, row in df_slice.iterrows():
        weights = group_weights(row["region"], row["lead_time_bucket"], row["season"], row["weather_regime"], weights_df)
        predictions.append(sum(weights[source] * row[f"{source}_{target}"] for source in SOURCES))
    return np.array(predictions)


def build_timeseries(subset, target, art):
    tail = subset.tail(TIMESERIES_DAYS).copy()
    tail["blitzcast_weighted"] = weighted_generic(tail, target, art["weights"])
    tail["blitzcast_ai"] = ai_blend_predict(tail, target, art)
    points = []
    for _, row in tail.iterrows():
        points.append({
            "date": str(row["date"].date()),
            "actual": float(row[f"{target}_actual"]),
            "nwp": float(row[f"nwp_{target}"]),
            "ai_model": float(row[f"ai_{target}"]),
            "ensemble": float(row[f"ensemble_{target}"]),
            "blitzcast_weighted": round(float(row["blitzcast_weighted"]), 2),
            "blitzcast_ai": round(float(row["blitzcast_ai"]), 2),
        })
    return points


def build_comparison(subset, target, art):
    cutoff = subset["date"].quantile(0.8)
    test = subset[subset["date"] > cutoff].copy()
    if test.empty:
        test = subset.copy()
    test["blitzcast_weighted"] = weighted_generic(test, target, art["weights"])
    test["blitzcast_ai"] = ai_blend_predict(test, target, art)
    observed = test[f"{target}_actual"]
    rows = []
    for label, column in [
        ("NWP", f"nwp_{target}"),
        ("AI Model", f"ai_{target}"),
        ("Ensemble", f"ensemble_{target}"),
        ("BlitzCast Weighted", "blitzcast_weighted"),
        ("BlitzCast AI", "blitzcast_ai"),
    ]:
        error = test[column] - observed
        ss_res = float((error ** 2).sum())
        ss_tot = float(((observed - observed.mean()) ** 2).sum())
        r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0
        rows.append({
            "model": label,
            "mae": round(float(error.abs().mean()), 3),
            "rmse": round(float((error ** 2).mean() ** 0.5), 3),
            "r2": round(r2, 3),
            "bias": round(float(error.mean()), 3),
        })
    return rows


def build_weights_map(target, art):
    weights = art["weights"]
    weights = weights[weights.region != "__GLOBAL_FALLBACK__"]
    grouped = weights.groupby("region")[[f"w_{source}" for source in SOURCES]].mean().reset_index()
    result = []
    for _, row in grouped.iterrows():
        result.append({
            "region": row["region"],
            "nwp": round(float(row["w_nwp"]), 3),
            "ai_model": round(float(row["w_ai"]), 3),
            "ensemble": round(float(row["w_ensemble"]), 3),
        })
    return result


def build_extreme(obs, region):
    subset = obs[obs.region == region].sort_values("date").tail(EXTREME_DAYS)
    latest = subset.iloc[-1]
    recent = subset.tail(3)
    return {
        "latest_regime": latest["weather_regime"],
        "latest_date": str(latest["date"].date()),
        "regime_counts": subset["weather_regime"].value_counts().to_dict(),
        "alert": bool(recent["weather_regime"].isin(["Storm", "Heatwave", "HighWind", "Monsoon"]).any()),
    }


def main():
    dataset = load_dataset()
    obs = load_observations()
    artifacts = {target: load_target_artifacts(target) for target in TARGETS}
    regions = sorted(dataset["region"].unique().tolist())

    output = {
        "regions": regions,
        "targets": TARGETS,
        "current": {},
        "forecast": {},
        "timeseries": {},
        "comparison": {},
        "weights_map": {},
        "extreme": {},
    }

    for target in TARGETS:
        output["weights_map"][target] = build_weights_map(target, artifacts[target])

    for region in regions:
        output["current"][region] = build_current(obs, region)
        output["extreme"][region] = build_extreme(obs, region)
        output["forecast"][region] = {}
        output["timeseries"][region] = {}
        output["comparison"][region] = {}
        for target in TARGETS:
            subset = dataset[(dataset.region == region) & (dataset.forecast_lead_time_hours == 24)].sort_values("date")
            art = artifacts[target]
            output["forecast"][region][target] = build_forecast(subset, target, art)
            output["timeseries"][region][target] = build_timeseries(subset, target, art)
            output["comparison"][region][target] = build_comparison(subset, target, art)

    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f)

    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f"Wrote {OUTPUT_PATH} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()