import os
import json
from flask import Flask, jsonify, render_template

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "artifacts", "dashboard_data.json")

with open(DATA_PATH) as f:
    DATA = json.load(f)

REGIONS = DATA["regions"]
TARGETS = DATA["targets"]

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html", regions=REGIONS, targets=TARGETS)


@app.route("/api/regions")
def api_regions():
    return jsonify(REGIONS)


@app.route("/api/current/<region>")
def api_current(region):
    if region not in DATA["current"]:
        return jsonify({"error": "unknown region"}), 404
    return jsonify(DATA["current"][region])


@app.route("/api/forecast/<region>/<target>")
def api_forecast(region, target):
    if target not in TARGETS or region not in DATA["forecast"]:
        return jsonify({"error": "unknown region or target"}), 404
    result = dict(DATA["forecast"][region][target])
    result["region"] = region
    result["target"] = target
    return jsonify(result)


@app.route("/api/timeseries/<region>/<target>")
def api_timeseries(region, target):
    if target not in TARGETS or region not in DATA["timeseries"]:
        return jsonify({"error": "unknown region or target"}), 404
    return jsonify(DATA["timeseries"][region][target])


@app.route("/api/comparison/<region>/<target>")
def api_comparison(region, target):
    if target not in TARGETS or region not in DATA["comparison"]:
        return jsonify({"error": "unknown region or target"}), 404
    return jsonify(DATA["comparison"][region][target])


@app.route("/api/weights-map/<target>")
def api_weights_map(target):
    if target not in DATA["weights_map"]:
        return jsonify({"error": "unknown target"}), 404
    return jsonify(DATA["weights_map"][target])


@app.route("/api/extreme/<region>")
def api_extreme(region):
    if region not in DATA["extreme"]:
        return jsonify({"error": "unknown region"}), 404
    return jsonify(DATA["extreme"][region])


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)