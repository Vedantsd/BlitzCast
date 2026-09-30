from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import text
from db import get_engine


def get_user_by_email(email):
    with get_engine().connect() as conn:
        row = conn.execute(
            text("SELECT id, email, name, password_hash, role, is_active FROM users WHERE email = :email"),
            {"email": email.lower().strip()},
        ).mappings().fetchone()
    return dict(row) if row else None


def verify_credentials(email, password):
    user = get_user_by_email(email)
    if not user or not user["is_active"]:
        return None
    if not check_password_hash(user["password_hash"], password):
        return None
    return user


def touch_last_login(user_id):
    with get_engine().begin() as conn:
        conn.execute(text("UPDATE users SET last_login_at = now() WHERE id = :id"), {"id": user_id})


def create_user(email, name, password, role="analyst"):
    password_hash = generate_password_hash(password)
    with get_engine().begin() as conn:
        conn.execute(
            text("""
                INSERT INTO users (email, name, password_hash, role)
                VALUES (:email, :name, :password_hash, :role)
            """),
            {"email": email.lower().strip(), "name": name.strip(), "password_hash": password_hash, "role": role},
        )


def delete_user(email):
    with get_engine().begin() as conn:
        result = conn.execute(text("DELETE FROM users WHERE email = :email"), {"email": email.lower().strip()})
        return result.rowcount


def list_users():
    with get_engine().connect() as conn:
        rows = conn.execute(
            text("SELECT id, email, name, role, is_active, created_at, last_login_at FROM users ORDER BY created_at")
        ).mappings().fetchall()
    return [dict(row) for row in rows]


def set_role(email, role):
    with get_engine().begin() as conn:
        result = conn.execute(
            text("UPDATE users SET role = :role WHERE email = :email"),
            {"email": email.lower().strip(), "role": role},
        )
        return result.rowcount


def set_active(email, is_active):
    with get_engine().begin() as conn:
        result = conn.execute(
            text("UPDATE users SET is_active = :is_active WHERE email = :email"),
            {"email": email.lower().strip(), "is_active": is_active},
        )
        return result.rowcount