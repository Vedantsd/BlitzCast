import os
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        url = os.environ.get("DATABASE_URL")
        if not url:
            raise RuntimeError("DATABASE_URL is not set. Add it to .env locally or to your Vercel project's environment variables.")
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        _engine = create_engine(url, pool_pre_ping=True)
    return _engine