import os
import numpy as np
import pandas as pd
from datetime import date, timedelta
from db import get_engine

RNG = np.random.default_rng(7)

START = date(2023, 1, 1)
END = date(2025, 9, 30)
LEAD_TIMES_H = [24, 72, 120, 168]

REGIONS = {
    "Pune": dict(
        lat=18.52, lon=73.86,
        temp=[21, 23, 27, 31, 32, 27, 25, 24, 25, 26, 23, 21],
        rain=[3, 2, 4, 12, 25, 140, 175, 115, 145, 65, 18, 5],
        wind=[8, 9, 9, 11, 13, 15, 16, 14, 11, 8, 7, 7],
        season_by_month={1: "Winter", 2: "Winter", 3: "Summer", 4: "Summer", 5: "Summer",
                          6: "Monsoon", 7: "Monsoon", 8: "Monsoon", 9: "Monsoon",
                          10: "PostMonsoon", 11: "PostMonsoon", 12: "Winter"},
    ),
    "Mumbai": dict(
        lat=19.08, lon=72.88,
        temp=[24, 25, 28, 30, 32, 30, 28, 27, 28, 30, 28, 26],
        rain=[1, 1, 1, 2, 18, 540, 780, 480, 300, 60, 12, 2],
        wind=[10, 10, 10, 12, 15, 22, 24, 20, 15, 10, 9, 9],
        season_by_month={1: "Winter", 2: "Winter", 3: "Summer", 4: "Summer", 5: "Summer",
                          6: "Monsoon", 7: "Monsoon", 8: "Monsoon", 9: "Monsoon",
                          10: "PostMonsoon", 11: "PostMonsoon", 12: "Winter"},
    ),
    "Delhi": dict(
        lat=28.61, lon=77.21,
        temp=[14, 18, 24, 30, 34, 34, 31, 30, 29, 25, 19, 15],
        rain=[20, 20, 15, 10, 15, 65, 210, 245, 125, 15, 5, 10],
        wind=[7, 8, 9, 10, 12, 13, 11, 9, 8, 6, 6, 6],
        season_by_month={1: "Winter", 2: "Winter", 3: "Summer", 4: "Summer", 5: "Summer", 6: "Summer",
                          7: "Monsoon", 8: "Monsoon", 9: "Monsoon",
                          10: "PostMonsoon", 11: "PostMonsoon", 12: "Winter"},
    ),
    "Chennai": dict(
        lat=13.08, lon=80.27,
        temp=[25, 27, 29, 33, 35, 34, 32, 31, 30, 28, 26, 25],
        rain=[25, 10, 8, 15, 30, 50, 85, 105, 120, 270, 340, 150],
        wind=[9, 9, 10, 11, 13, 16, 15, 13, 11, 12, 14, 10],
        season_by_month={1: "Winter", 2: "Winter", 3: "Summer", 4: "Summer", 5: "Summer", 6: "Summer",
                          7: "PostMonsoon", 8: "PostMonsoon", 9: "PostMonsoon",
                          10: "Monsoon", 11: "Monsoon", 12: "Monsoon"},
    ),
    "Bengaluru": dict(
        lat=12.97, lon=77.59,
        temp=[21, 24, 27, 28, 27, 24, 23, 23, 23, 23, 21, 20],
        rain=[2, 3, 5, 45, 115, 85, 100, 130, 190, 165, 55, 12],
        wind=[6, 7, 8, 10, 10, 12, 12, 11, 9, 7, 6, 6],
        season_by_month={1: "Winter", 2: "Winter", 3: "Summer", 4: "Summer", 5: "Summer",
                          6: "Monsoon", 7: "Monsoon", 8: "Monsoon", 9: "Monsoon",
                          10: "PostMonsoon", 11: "PostMonsoon", 12: "Winter"},
    ),
}

DAYS = pd.date_range(START, END, freq="D")


def simulate_region_truth(cfg):
    n = len(DAYS)
    months = DAYS.month.values

    phi = 0.75
    sigma = 1.1
    anomaly = np.zeros(n)
    for t in range(1, n):
        anomaly[t] = phi * anomaly[t - 1] + RNG.normal(0, sigma)
    clim_temp = np.array([cfg["temp"][m - 1] for m in months])
    temp_actual = clim_temp + anomaly

    days_in_month = pd.Series(DAYS).dt.days_in_month.values
    clim_rain_per_day = np.array([cfg["rain"][m - 1] for m in months]) / days_in_month
    p_wet_target = np.clip(clim_rain_per_day / (clim_rain_per_day + 6.0), 0.03, 0.85)

    is_wet = np.zeros(n, dtype=bool)
    for t in range(n):
        p_target = p_wet_target[t]
        if t == 0:
            is_wet[t] = RNG.random() < p_target
            continue
        if is_wet[t - 1]:
            p = np.clip(p_target * 1.7, 0, 0.92)
        else:
            p = np.clip(p_target * 0.55, 0, 0.92)
        is_wet[t] = RNG.random() < p

    rain_actual = np.zeros(n)
    for m in range(1, 13):
        mask = (months == m) & is_wet
        if mask.sum() == 0:
            continue
        wet_frac = mask.sum() / (months == m).sum()
        target_mean_wet_day = cfg["rain"][m - 1] / max(days_in_month[months == m][0] * wet_frac, 1e-6)
        shape = 1.4
        scale = max(target_mean_wet_day / shape, 0.1)
        rain_actual[mask] = RNG.gamma(shape, scale, size=mask.sum())
    rain_actual = np.round(rain_actual, 2)

    clim_wind = np.array([cfg["wind"][m - 1] for m in months])
    wind_anom = np.zeros(n)
    for t in range(1, n):
        wind_anom[t] = 0.55 * wind_anom[t - 1] + RNG.normal(0, 1.6)
    rain_boost = np.clip(rain_actual, 0, 80) * 0.18
    wind_actual = np.clip(clim_wind + wind_anom + rain_boost, 1.5, None)

    humidity = np.clip(55 + 0.55 * rain_boost * 3 + RNG.normal(0, 6, n) + (anomaly < 0) * 4, 15, 98)
    pressure = np.clip(1013 - 0.9 * np.clip(rain_actual, 0, 60) / 10 + RNG.normal(0, 1.8, n), 985, 1022)

    return pd.DataFrame({
        "date": DAYS, "month": months,
        "temp_actual": np.round(temp_actual, 2),
        "rain_actual": rain_actual,
        "wind_actual": np.round(wind_actual, 2),
        "humidity": np.round(humidity, 1),
        "pressure": np.round(pressure, 1),
        "temp_anomaly": anomaly,
    })


def derive_regime(row, season):
    if row["rain_actual"] > 45:
        return "Storm"
    if row["rain_actual"] > 8:
        return "Monsoon" if season in ("Monsoon",) else "Convective"
    if row["wind_actual"] > 22:
        return "HighWind"
    if season == "Summer" and row["temp_anomaly"] > 1.8:
        return "Heatwave"
    return "Clear"


def simulate_model_forecasts(truth: pd.DataFrame, lead_h: int, rng):
    n = len(truth)
    lead_days = lead_h / 24.0
    t, r, w = truth["temp_actual"].values, truth["rain_actual"].values, truth["wind_actual"].values
    regime = truth["regime"].values

    monsoon_or_storm = np.isin(regime, ["Monsoon", "Storm"])

    nwp_temp = t + rng.normal(0, 0.55 + 0.24 * lead_days, n)
    ai_temp = t + rng.normal(0, 0.65 + 0.09 * lead_days, n) + np.where(regime == "Heatwave", rng.normal(0.9, 0.4, n), 0)
    ens_temp = t + rng.normal(0, 0.45 + 0.15 * lead_days, n)

    nwp_rain_mult = np.clip(rng.normal(1.0, 0.22 + 0.11 * lead_days + np.where(monsoon_or_storm, 0.35, 0), n), 0, None)
    ai_rain_mult = np.clip(rng.normal(1.0, 0.18 + 0.03 * lead_days - np.where(monsoon_or_storm, 0.04, 0), n), 0, None)
    ens_rain_mult = np.clip(rng.normal(0.92, 0.14 + 0.05 * lead_days, n), 0, None)

    nwp_wind = np.clip(w + rng.normal(0, 1.1 + 0.5 * lead_days, n), 0, None)
    ai_wind = np.clip(w + rng.normal(0, 0.95 + 0.2 * lead_days, n), 0, None)
    ens_wind = np.clip(w + rng.normal(0, 0.8 + 0.28 * lead_days, n), 0, None)

    return pd.DataFrame({
        "date": truth["date"], "forecast_lead_time_hours": lead_h,
        "nwp_temp": np.round(nwp_temp, 2), "nwp_rain": np.round(r * nwp_rain_mult, 2), "nwp_wind": np.round(nwp_wind, 2),
        "ai_temp": np.round(ai_temp, 2), "ai_rain": np.round(r * ai_rain_mult, 2), "ai_wind": np.round(ai_wind, 2),
        "ensemble_temp": np.round(ens_temp, 2), "ensemble_rain": np.round(r * ens_rain_mult, 2), "ensemble_wind": np.round(ens_wind, 2),
    })


def ensure_schema(engine):
    schema_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")
    with open(schema_path) as f:
        schema_sql = f.read()
    with engine.begin() as conn:
        conn.exec_driver_sql(schema_sql)


def main():
    engine = get_engine()
    ensure_schema(engine)

    obs_frames, nwp_frames, ai_frames, ens_frames, processed_frames = [], [], [], [], []

    for region, cfg in REGIONS.items():
        truth = simulate_region_truth(cfg)
        truth["region"] = region
        truth["latitude"], truth["longitude"] = cfg["lat"], cfg["lon"]
        truth["season"] = truth["month"].map(cfg["season_by_month"])
        truth["regime"] = truth.apply(lambda row: derive_regime(row, row["season"]), axis=1)

        obs = truth[["date", "region", "latitude", "longitude", "month", "season", "regime",
                      "temp_actual", "rain_actual", "wind_actual", "humidity", "pressure"]].rename(
            columns={"regime": "weather_regime"})
        obs_frames.append(obs)

        region_hist = {k: 1.5 for k in
                       ["nwp_temp", "ai_temp", "ensemble_temp", "nwp_rain", "ai_rain", "ensemble_rain",
                        "nwp_wind", "ai_wind", "ensemble_wind"]}
        region_n = {k: 0 for k in region_hist}

        for lead_h in LEAD_TIMES_H:
            fc = simulate_model_forecasts(truth, lead_h, RNG)
            fc["region"] = region

            nwp_frames.append(fc[["date", "region", "forecast_lead_time_hours", "nwp_temp", "nwp_rain", "nwp_wind"]])
            ai_frames.append(fc[["date", "region", "forecast_lead_time_hours", "ai_temp", "ai_rain", "ai_wind"]])
            ens_frames.append(fc[["date", "region", "forecast_lead_time_hours", "ensemble_temp", "ensemble_rain", "ensemble_wind"]])

            merged = fc.merge(obs[["date", "region", "latitude", "longitude", "month", "season",
                                    "weather_regime", "temp_actual", "rain_actual", "wind_actual",
                                    "humidity", "pressure"]], on=["date", "region"])
            merged.sort_values("date", inplace=True)

            for var, src_target in [("temp", "temp_actual"), ("rain", "rain_actual"), ("wind", "wind_actual")]:
                for src in ["nwp", "ai", "ensemble"]:
                    key = f"{src}_{var}"
                    errs = (merged[key] - merged[src_target]).abs().values
                    hist_col = np.empty(len(merged))
                    running_mean, count = region_hist[key], region_n[key]
                    for i, e in enumerate(errs):
                        hist_col[i] = running_mean
                        count += 1
                        running_mean += (e - running_mean) / count
                    region_hist[key], region_n[key] = running_mean, count
                    merged[f"{key}_hist_mae"] = np.round(hist_col, 3)

            processed_frames.append(merged)

    observations = pd.concat(obs_frames, ignore_index=True)
    nwp = pd.concat(nwp_frames, ignore_index=True)
    ai = pd.concat(ai_frames, ignore_index=True)
    ensemble = pd.concat(ens_frames, ignore_index=True)

    processed = pd.concat(processed_frames, ignore_index=True)
    cols = ["date", "region", "latitude", "longitude", "forecast_lead_time_hours", "month", "season",
            "weather_regime", "humidity", "pressure",
            "nwp_temp", "ai_temp", "ensemble_temp", "temp_actual",
            "nwp_rain", "ai_rain", "ensemble_rain", "rain_actual",
            "nwp_wind", "ai_wind", "ensemble_wind", "wind_actual",
            "nwp_temp_hist_mae", "ai_temp_hist_mae", "ensemble_temp_hist_mae",
            "nwp_rain_hist_mae", "ai_rain_hist_mae", "ensemble_rain_hist_mae",
            "nwp_wind_hist_mae", "ai_wind_hist_mae", "ensemble_wind_hist_mae"]
    processed = processed[cols].sort_values(["region", "date", "forecast_lead_time_hours"])

    with engine.begin() as conn:
        for table in ["observations", "raw_nwp_forecasts", "raw_ai_forecasts", "raw_ensemble_forecasts", "processed_training_data"]:
            conn.exec_driver_sql(f"TRUNCATE TABLE {table}")

    observations.to_sql("observations", engine, if_exists="append", index=False)
    nwp.to_sql("raw_nwp_forecasts", engine, if_exists="append", index=False)
    ai.to_sql("raw_ai_forecasts", engine, if_exists="append", index=False)
    ensemble.to_sql("raw_ensemble_forecasts", engine, if_exists="append", index=False)
    processed.to_sql("processed_training_data", engine, if_exists="append", index=False)

    print(f"observations              {len(observations):>7,} rows -> table observations")
    print(f"raw_nwp_forecasts         {len(nwp):>7,} rows -> table raw_nwp_forecasts")
    print(f"raw_ai_forecasts          {len(ai):>7,} rows -> table raw_ai_forecasts")
    print(f"raw_ensemble_forecasts    {len(ensemble):>7,} rows -> table raw_ensemble_forecasts")
    print(f"processed_training_data   {len(processed):>7,} rows -> table processed_training_data")


if __name__ == "__main__":
    main()