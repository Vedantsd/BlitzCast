import os
import json
import time
from flask import Flask, jsonify, render_template
from sqlalchemy import text
from db import get_engine

CACHE_TTL_SECONDS = 300

_cache = {"data": None, "loaded_at": 0.0}

app = Flask(__name__)


def get_data():
    now = time.time()
    if _cache["data"] is None or now - _cache["loaded_at"] > CACHE_TTL_SECONDS:
        with get_engine().connect() as conn:
            row = conn.execute(text("SELECT payload FROM dashboard_cache WHERE key = 'dashboard'")).fetchone()
        if row is None:
            raise RuntimeError("dashboard_cache is empty. Run precompute_predictions.py to populate it.")
        payload = row[0]
        _cache["data"] = payload if isinstance(payload, dict) else json.loads(payload)
        _cache["loaded_at"] = now
    return _cache["data"]


@app.route("/")
def index():
    data = get_data()
    return render_template("index.html", regions=data["regions"], targets=data["targets"])


@app.route("/api/regions")
def api_regions():
    return jsonify(get_data()["regions"])


@app.route("/api/current/<region>")
def api_current(region):
    data = get_data()
    if region not in data["current"]:
        return jsonify({"error": "unknown region"}), 404
    return jsonify(data["current"][region])


@app.route("/api/forecast/<region>/<target>")
def api_forecast(region, target):
    data = get_data()
    if target not in data["targets"] or region not in data["forecast"]:
        return jsonify({"error": "unknown region or target"}), 404
    result = dict(data["forecast"][region][target])
    result["region"] = region
    result["target"] = target
    return jsonify(result)


@app.route("/api/timeseries/<region>/<target>")
def api_timeseries(region, target):
    data = get_data()
    if target not in data["targets"] or region not in data["timeseries"]:
        return jsonify({"error": "unknown region or target"}), 404
    return jsonify(data["timeseries"][region][target])


@app.route("/api/comparison/<region>/<target>")
def api_comparison(region, target):
    data = get_data()
    if target not in data["targets"] or region not in data["comparison"]:
        return jsonify({"error": "unknown region or target"}), 404
    return jsonify(data["comparison"][region][target])


@app.route("/api/weights-map/<target>")
def api_weights_map(target):
    data = get_data()
    if target not in data["weights_map"]:
        return jsonify({"error": "unknown target"}), 404
    return jsonify(data["weights_map"][target])


@app.route("/api/extreme/<region>")
def api_extreme(region):
    data = get_data()
    if region not in data["extreme"]:
        return jsonify({"error": "unknown region"}), 404
    return jsonify(data["extreme"][region])


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)