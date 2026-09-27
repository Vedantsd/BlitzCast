import os
import json
import numpy as np
import pandas as pd
import xgboost as xgb
from flask import Flask, jsonify, render_template, request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "datasets", "blitzcast_training_data.csv")
OBS_PATH = os.path.join(BASE_DIR, "datasets", "era5_observations.csv")
ARTIFACT_DIR = os.path.join(BASE_DIR, "artifacts")

SOURCES = ["nwp", "ai", "ensemble"]
TARGETS = ["temp", "rain", "wind"]
CATEGORICALS = ["region", "season", "weather_regime", "lead_time_bucket"]
CONFIDENCE_SCALE = {"temp": 6.0, "rain": 20.0, "wind": 8.0}

app = Flask(__name__)


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
    evaluation = pd.read_csv(os.path.join(ARTIFACT_DIR, f"evaluation_{target}.csv"))
    return {"model": model, "encoders": encoders, "feature_cols": feature_cols,
            "weights": weights, "evaluation": evaluation}


DATASET = load_dataset()
OBSERVATIONS = load_observations()
ARTIFACTS = {t: load_target_artifacts(t) for t in TARGETS}
REGIONS = sorted(DATASET["region"].unique().tolist())


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


def ai_blend_predict(df_slice, target):
    art = ARTIFACTS[target]
    matrix = np.array(
        [build_feature_vector(row, target, art["encoders"], art["feature_cols"])
         for _, row in df_slice.iterrows()],
        dtype=float,
    )
    return art["model"].predict(matrix)


def group_weights(region, lead_time_bucket, season, weather_regime, target):
    weights = ARTIFACTS[target]["weights"]
    match = weights[
        (weights.region == region)
        & (weights.lead_time_bucket == lead_time_bucket)
        & (weights.season == season)
        & (weights.weather_regime == weather_regime)
    ]
    if match.empty:
        match = weights[weights.region == "__GLOBAL_FALLBACK__"]
    row = match.iloc[0]
    return {source: float(row[f"w_{source}"]) for source in SOURCES}


def weighted_blend_predict(df_slice, target):
    predictions = []
    for _, row in df_slice.iterrows():
        weights = group_weights(row["region"], row["lead_time_bucket"], row["season"], row["weather_regime"], target)
        predictions.append(sum(weights[source] * row[f"{source}_{target}"] for source in SOURCES))
    return np.array(predictions)


def confidence_score(row, target):
    values = [row[f"{source}_{target}"] for source in SOURCES]
    spread = max(values) - min(values)
    score = max(0.0, 1.0 - spread / CONFIDENCE_SCALE[target])
    return round(score * 100, 1)


def region_extreme_summary(region, days=14):
    obs = OBSERVATIONS[OBSERVATIONS.region == region].sort_values("date").tail(days)
    latest = obs.iloc[-1]
    recent = obs.tail(3)
    return {
        "latest_regime": latest["weather_regime"],
        "latest_date": str(latest["date"].date()),
        "regime_counts": obs["weather_regime"].value_counts().to_dict(),
        "alert": bool(recent["weather_regime"].isin(["Storm", "Heatwave", "HighWind", "Monsoon"]).any()),
    }


@app.route("/")
def index():
    return render_template("index.html", regions=REGIONS, targets=TARGETS)


@app.route("/api/regions")
def api_regions():
    return jsonify(REGIONS)


@app.route("/api/current/<region>")
def api_current(region):
    obs = OBSERVATIONS[OBSERVATIONS.region == region].sort_values("date")
    if obs.empty:
        return jsonify({"error": "unknown region"}), 404
    latest = obs.iloc[-1]
    return jsonify({
        "region": region,
        "date": str(latest["date"].date()),
        "temp": float(latest["temp_actual"]),
        "rain": float(latest["rain_actual"]),
        "wind": float(latest["wind_actual"]),
        "humidity": float(latest["humidity"]),
        "pressure": float(latest["pressure"]),
        "regime": latest["weather_regime"],
        "season": latest["season"],
    })


@app.route("/api/forecast/<region>/<target>")
def api_forecast(region, target):
    if target not in TARGETS:
        return jsonify({"error": "unknown target"}), 400
    subset = DATASET[(DATASET.region == region) & (DATASET.forecast_lead_time_hours == 24)].sort_values("date")
    if subset.empty:
        return jsonify({"error": "unknown region"}), 404
    latest_slice = subset.tail(1)
    latest = latest_slice.iloc[0]
    weighted = weighted_blend_predict(latest_slice, target)[0]
    ai_blend = ai_blend_predict(latest_slice, target)[0]
    weights = group_weights(latest["region"], latest["lead_time_bucket"], latest["season"], latest["weather_regime"], target)
    return jsonify({
        "region": region,
        "target": target,
        "date": str(latest["date"].date()),
        "nwp": float(latest[f"nwp_{target}"]),
        "ai_model": float(latest[f"ai_{target}"]),
        "ensemble": float(latest[f"ensemble_{target}"]),
        "blitzcast_weighted": round(float(weighted), 2),
        "blitzcast_ai": round(float(ai_blend), 2),
        "weights": {source: round(value, 3) for source, value in weights.items()},
        "confidence": confidence_score(latest, target),
        "regime": latest["weather_regime"],
        "season": latest["season"],
    })


@app.route("/api/timeseries/<region>/<target>")
def api_timeseries(region, target):
    if target not in TARGETS:
        return jsonify({"error": "unknown target"}), 400
    days = int(request.args.get("days", 30))
    subset = DATASET[(DATASET.region == region) & (DATASET.forecast_lead_time_hours == 24)].sort_values("date").tail(days).copy()
    if subset.empty:
        return jsonify({"error": "unknown region"}), 404
    subset["blitzcast_weighted"] = weighted_blend_predict(subset, target)
    subset["blitzcast_ai"] = ai_blend_predict(subset, target)
    series = []
    for _, row in subset.iterrows():
        series.append({
            "date": str(row["date"].date()),
            "actual": float(row[f"{target}_actual"]),
            "nwp": float(row[f"nwp_{target}"]),
            "ai_model": float(row[f"ai_{target}"]),
            "ensemble": float(row[f"ensemble_{target}"]),
            "blitzcast_weighted": round(float(row["blitzcast_weighted"]), 2),
            "blitzcast_ai": round(float(row["blitzcast_ai"]), 2),
        })
    return jsonify(series)


@app.route("/api/comparison/<region>/<target>")
def api_comparison(region, target):
    if target not in TARGETS:
        return jsonify({"error": "unknown target"}), 400
    subset = DATASET[(DATASET.region == region) & (DATASET.forecast_lead_time_hours == 24)].sort_values("date")
    if subset.empty:
        return jsonify({"error": "unknown region"}), 404
    cutoff = subset["date"].quantile(0.8)
    test = subset[subset["date"] > cutoff].copy()
    if test.empty:
        test = subset.copy()
    test["blitzcast_weighted"] = weighted_blend_predict(test, target)
    test["blitzcast_ai"] = ai_blend_predict(test, target)
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
    return jsonify(rows)


@app.route("/api/weights-map/<target>")
def api_weights_map(target):
    if target not in TARGETS:
        return jsonify({"error": "unknown target"}), 400
    weights = ARTIFACTS[target]["weights"]
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
    return jsonify(result)


@app.route("/api/extreme/<region>")
def api_extreme(region):
    if region not in REGIONS:
        return jsonify({"error": "unknown region"}), 404
    return jsonify(region_extreme_summary(region))


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)