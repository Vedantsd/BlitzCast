import time
import numpy as np
import pandas as pd
import requests

HIST_FORECAST_URL = "https://historical-forecast-api.open-meteo.com/v1/forecast"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

MODEL_MAP = {
    "nwp": "ecmwf_ifs025",
    "ai": "ecmwf_aifs025_single",
    "ensemble": "gfs_seamless",
}

REGIONS = {
    "Pune":      (18.52, 73.86),
    "Mumbai":    (19.08, 72.88),
    "Delhi":     (28.61, 77.21),
    "Chennai":   (13.08, 80.27),
    "Bengaluru": (12.97, 77.59),
}

DAILY_VARS = [
    "temperature_2m_mean",
    "precipitation_sum",
    "wind_speed_10m_max",
    "relative_humidity_2m_mean",
    "surface_pressure_mean",
]

START_DATE = "2024-04-01"
END_DATE = "2025-09-30"

OUTPUT_PATH = "datasets/blitzcast_training_data.csv"


def fetch_daily(url, lat, lon, start, end, extra_params=None, retries=3):
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start,
        "end_date": end,
        "daily": ",".join(DAILY_VARS),
        "timezone": "auto",
    }
    if extra_params:
        params.update(extra_params)
    for attempt in range(retries):
        r = requests.get(url, params=params, timeout=60)
        if r.status_code == 200:
            return r.json()
        time.sleep(2 * (attempt + 1))
    r.raise_for_status()


def daily_json_to_df(payload, prefix):
    d = payload["daily"]
    df = pd.DataFrame({"date": d["time"]})
    df[f"{prefix}_temp"] = d["temperature_2m_mean"]
    df[f"{prefix}_rain"] = d["precipitation_sum"]
    df[f"{prefix}_wind"] = d["wind_speed_10m_max"]
    if prefix == "actual":
        df["humidity"] = d["relative_humidity_2m_mean"]
        df["pressure"] = d["surface_pressure_mean"]
    return df


def month_to_season(month):
    if month in (12, 1, 2):
        return "Winter"
    if month in (3, 4, 5):
        return "Summer"
    if month in (6, 7, 8, 9):
        return "Monsoon"
    return "PostMonsoon"


def classify_regime(row):
    if row["rain_actual"] > 40:
        return "Storm"
    if row["rain_actual"] > 7:
        return "Monsoon" if row["season"] == "Monsoon" else "Convective"
    if row["wind_actual"] > 35:
        return "HighWind"
    if row["season"] == "Summer" and row["temp_actual"] > 38:
        return "Heatwave"
    return "Clear"


def build_region_frame(region, lat, lon):
    print(f"Fetching {region} ...")
    actual_df = daily_json_to_df(
        fetch_daily(ARCHIVE_URL, lat, lon, START_DATE, END_DATE), "actual")
    actual_df = actual_df.rename(columns={
        "actual_temp": "temp_actual",
        "actual_rain": "rain_actual",
        "actual_wind": "wind_actual",
    })
    frames = {"actual": actual_df}

    for key, model_id in MODEL_MAP.items():
        payload = fetch_daily(HIST_FORECAST_URL, lat, lon, START_DATE, END_DATE,
                               extra_params={"models": model_id})
        frames[key] = daily_json_to_df(payload, key)
        time.sleep(1)

    merged = frames["actual"]
    for key in MODEL_MAP:
        merged = merged.merge(frames[key], on="date", how="inner")

    merged["region"] = region
    merged["latitude"] = lat
    merged["longitude"] = lon
    merged["date"] = pd.to_datetime(merged["date"])
    merged["month"] = merged["date"].dt.month
    merged["season"] = merged["month"].apply(month_to_season)
    merged["weather_regime"] = merged.apply(classify_regime, axis=1)

    for var in ["temp", "rain", "wind"]:
        for key in MODEL_MAP:
            err = (merged[f"{key}_{var}"] - merged[f"{var}_actual"]).abs()
            merged[f"{key}_{var}_hist_mae"] = err.expanding(min_periods=1).mean().shift(1)
    merged.dropna(inplace=True)

    return merged


def main(lead_time_note=True):
    all_frames = []
    for region, (lat, lon) in REGIONS.items():
        all_frames.append(build_region_frame(region, lat, lon))
    df = pd.concat(all_frames, ignore_index=True)

    df["forecast_lead_time_hours"] = 24

    cols = ["date", "region", "latitude", "longitude", "forecast_lead_time_hours",
            "month", "season", "weather_regime", "humidity", "pressure",
            "nwp_temp", "ai_temp", "ensemble_temp", "temp_actual",
            "nwp_rain", "ai_rain", "ensemble_rain", "rain_actual",
            "nwp_wind", "ai_wind", "ensemble_wind", "wind_actual",
            "nwp_temp_hist_mae", "ai_temp_hist_mae", "ensemble_temp_hist_mae",
            "nwp_rain_hist_mae", "ai_rain_hist_mae", "ensemble_rain_hist_mae",
            "nwp_wind_hist_mae", "ai_wind_hist_mae", "ensemble_wind_hist_mae"]
    df = df[cols]
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"Saved {len(df):,} rows -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()