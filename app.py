import os
import json
import time
from datetime import timedelta
from functools import wraps
from flask import Flask, jsonify, render_template, request, session, redirect, url_for
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from db import get_engine
from auth import (
    verify_credentials,
    touch_last_login,
    list_users,
    create_user,
    get_user_by_id,
    delete_user_by_id,
    set_active_by_id,
)

CACHE_TTL_SECONDS = 300

_cache = {"data": None, "loaded_at": 0.0}

app = Flask(__name__)

app.secret_key = os.environ.get("SECRET_KEY")
if not app.secret_key:
    raise RuntimeError("SECRET_KEY is not set. Add it to .env locally or to your Vercel project's environment variables.")

app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
if os.environ.get("VERCEL"):
    app.config["SESSION_COOKIE_SECURE"] = True


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"error": "authentication required"}), 401
            return redirect(url_for("login", next=request.path))
        return view(*args, **kwargs)
    return wrapped


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"error": "authentication required"}), 401
            return redirect(url_for("login", next=request.path))
        if session.get("role") != "admin":
            if request.path.startswith("/api/"):
                return jsonify({"error": "admin access required"}), 403
            return redirect(url_for("dashboard"))
        return view(*args, **kwargs)
    return wrapped


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
def forecast():
    return render_template("forecast.html")


@app.route("/dashboard")
@login_required
def dashboard():
    data = get_data()
    return render_template(
        "dashboard.html",
        regions=data["regions"],
        targets=data["targets"],
        current_user_name=session.get("name"),
        current_user_role=session.get("role"),
    )


@app.route("/subscription")
def subscription():
    return render_template("subscription.html")


@app.route("/login")
def login():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    next_url = request.args.get("next") or url_for("dashboard")
    return render_template("login.html", next_url=next_url)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/api/login", methods=["POST"])
def api_login():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip()
    password = body.get("password") or ""
    remember = bool(body.get("remember"))
    next_url = body.get("next") or url_for("dashboard")

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required."}), 400

    user = verify_credentials(email, password)
    if not user:
        return jsonify({"success": False, "error": "Invalid email or password."}), 401

    session.clear()
    session.permanent = remember
    session["user_id"] = user["id"]
    session["email"] = user["email"]
    session["name"] = user["name"]
    session["role"] = user["role"]
    touch_last_login(user["id"])

    return jsonify({"success": True, "redirect": next_url})


@app.route("/admin")
@admin_required
def admin_page():
    return render_template(
        "admin.html",
        current_user_name=session.get("name"),
        current_user_role=session.get("role"),
        current_user_id=session.get("user_id"),
    )


@app.route("/api/admin/users", methods=["GET"])
@admin_required
def api_admin_list_users():
    return jsonify(list_users())


@app.route("/api/admin/users", methods=["POST"])
@admin_required
def api_admin_create_user():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip()
    name = (body.get("name") or "").strip()
    role = body.get("role") or "analyst"
    password = body.get("password") or ""

    if not email or not name or not password:
        return jsonify({"success": False, "error": "Name, email, and password are required."}), 400
    if role not in ("admin", "analyst"):
        return jsonify({"success": False, "error": "Invalid role."}), 400
    if len(password) < 8:
        return jsonify({"success": False, "error": "Password must be at least 8 characters."}), 400

    try:
        new_id = create_user(email, name, password, role)
    except IntegrityError:
        return jsonify({"success": False, "error": "A user with that email already exists."}), 409

    return jsonify({"success": True, "user": get_user_by_id(new_id)}), 201


@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@admin_required
def api_admin_delete_user(user_id):
    if user_id == session.get("user_id"):
        return jsonify({"success": False, "error": "You cannot delete your own account."}), 400
    count = delete_user_by_id(user_id)
    if not count:
        return jsonify({"success": False, "error": "User not found."}), 404
    return jsonify({"success": True})


@app.route("/api/admin/users/<int:user_id>/active", methods=["PATCH"])
@admin_required
def api_admin_set_active(user_id):
    body = request.get_json(silent=True) or {}
    is_active = bool(body.get("is_active"))
    if user_id == session.get("user_id") and not is_active:
        return jsonify({"success": False, "error": "You cannot deactivate your own account."}), 400
    count = set_active_by_id(user_id, is_active)
    if not count:
        return jsonify({"success": False, "error": "User not found."}), 404
    return jsonify({"success": True})


@app.route("/api/regions")
@login_required
def api_regions():
    return jsonify(get_data()["regions"])


@app.route("/api/current/<region>")
@login_required
def api_current(region):
    data = get_data()
    if region not in data["current"]:
        return jsonify({"error": "unknown region"}), 404
    return jsonify(data["current"][region])


@app.route("/api/forecast/<region>/<target>")
@login_required
def api_forecast(region, target):
    data = get_data()
    if target not in data["targets"] or region not in data["forecast"]:
        return jsonify({"error": "unknown region or target"}), 404
    result = dict(data["forecast"][region][target])
    result["region"] = region
    result["target"] = target
    return jsonify(result)


@app.route("/api/timeseries/<region>/<target>")
@login_required
def api_timeseries(region, target):
    data = get_data()
    if target not in data["targets"] or region not in data["timeseries"]:
        return jsonify({"error": "unknown region or target"}), 404
    return jsonify(data["timeseries"][region][target])


@app.route("/api/comparison/<region>/<target>")
@login_required
def api_comparison(region, target):
    data = get_data()
    if target not in data["targets"] or region not in data["comparison"]:
        return jsonify({"error": "unknown region or target"}), 404
    return jsonify(data["comparison"][region][target])


@app.route("/api/weights-map/<target>")
@login_required
def api_weights_map(target):
    data = get_data()
    if target not in data["weights_map"]:
        return jsonify({"error": "unknown target"}), 404
    return jsonify(data["weights_map"][target])


@app.route("/api/extreme/<region>")
@login_required
def api_extreme(region):
    data = get_data()
    if region not in data["extreme"]:
        return jsonify({"error": "unknown region"}), 404
    return jsonify(data["extreme"][region])


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)