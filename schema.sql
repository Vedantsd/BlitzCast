CREATE TABLE IF NOT EXISTS observations (
    date DATE NOT NULL,
    region TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    month SMALLINT NOT NULL,
    season TEXT NOT NULL,
    weather_regime TEXT NOT NULL,
    temp_actual DOUBLE PRECISION NOT NULL,
    rain_actual DOUBLE PRECISION NOT NULL,
    wind_actual DOUBLE PRECISION NOT NULL,
    humidity DOUBLE PRECISION NOT NULL,
    pressure DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (region, date)
);

CREATE TABLE IF NOT EXISTS raw_nwp_forecasts (
    date DATE NOT NULL,
    region TEXT NOT NULL,
    forecast_lead_time_hours SMALLINT NOT NULL,
    nwp_temp DOUBLE PRECISION NOT NULL,
    nwp_rain DOUBLE PRECISION NOT NULL,
    nwp_wind DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (region, forecast_lead_time_hours, date)
);

CREATE TABLE IF NOT EXISTS raw_ai_forecasts (
    date DATE NOT NULL,
    region TEXT NOT NULL,
    forecast_lead_time_hours SMALLINT NOT NULL,
    ai_temp DOUBLE PRECISION NOT NULL,
    ai_rain DOUBLE PRECISION NOT NULL,
    ai_wind DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (region, forecast_lead_time_hours, date)
);

CREATE TABLE IF NOT EXISTS raw_ensemble_forecasts (
    date DATE NOT NULL,
    region TEXT NOT NULL,
    forecast_lead_time_hours SMALLINT NOT NULL,
    ensemble_temp DOUBLE PRECISION NOT NULL,
    ensemble_rain DOUBLE PRECISION NOT NULL,
    ensemble_wind DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (region, forecast_lead_time_hours, date)
);

CREATE TABLE IF NOT EXISTS processed_training_data (
    date DATE NOT NULL,
    region TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    forecast_lead_time_hours SMALLINT NOT NULL,
    month SMALLINT NOT NULL,
    season TEXT NOT NULL,
    weather_regime TEXT NOT NULL,
    humidity DOUBLE PRECISION NOT NULL,
    pressure DOUBLE PRECISION NOT NULL,
    nwp_temp DOUBLE PRECISION NOT NULL,
    ai_temp DOUBLE PRECISION NOT NULL,
    ensemble_temp DOUBLE PRECISION NOT NULL,
    temp_actual DOUBLE PRECISION NOT NULL,
    nwp_rain DOUBLE PRECISION NOT NULL,
    ai_rain DOUBLE PRECISION NOT NULL,
    ensemble_rain DOUBLE PRECISION NOT NULL,
    rain_actual DOUBLE PRECISION NOT NULL,
    nwp_wind DOUBLE PRECISION NOT NULL,
    ai_wind DOUBLE PRECISION NOT NULL,
    ensemble_wind DOUBLE PRECISION NOT NULL,
    wind_actual DOUBLE PRECISION NOT NULL,
    nwp_temp_hist_mae DOUBLE PRECISION NOT NULL,
    ai_temp_hist_mae DOUBLE PRECISION NOT NULL,
    ensemble_temp_hist_mae DOUBLE PRECISION NOT NULL,
    nwp_rain_hist_mae DOUBLE PRECISION NOT NULL,
    ai_rain_hist_mae DOUBLE PRECISION NOT NULL,
    ensemble_rain_hist_mae DOUBLE PRECISION NOT NULL,
    nwp_wind_hist_mae DOUBLE PRECISION NOT NULL,
    ai_wind_hist_mae DOUBLE PRECISION NOT NULL,
    ensemble_wind_hist_mae DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (region, forecast_lead_time_hours, date)
);

CREATE INDEX IF NOT EXISTS idx_processed_date ON processed_training_data (date);
CREATE INDEX IF NOT EXISTS idx_observations_date ON observations (date);

CREATE TABLE IF NOT EXISTS dashboard_cache (
    key TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);