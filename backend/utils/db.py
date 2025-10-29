from 
extensions import db

from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

def execute_query(query, params=None, fetch=False):
    """Execute SQL query using SQLAlchemy"""
    try:
        result = db.session.execute(query, params or {})
        if fetch:
            if query.strip().upper().startswith('SELECT'):
                rows = result.fetchall()
                columns = [col[0] for col in result.keys()]
                return [dict(zip(columns, row)) for row in rows]
            else:
                # For INSERT with RETURNING
                row = result.fetchone()
                return dict(zip(result.keys(), row)) if row else None
        else:
            db.session.commit()
            return result.rowcount
    except SQLAlchemyError as e:
        logger.error(f"Query error: {e}")
        db.session.rollback()
        return None
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        db.session.rollback()
        return None

def fetch_one(query, params=None):
    """Fetch single row using SQLAlchemy"""
    try:
        result = db.session.execute(query, params or {})
        row = result.fetchone()
        if row and result.keys():
            columns = [col[0] for col in result.keys()]
            return dict(zip(columns, row))
        return row
    except SQLAlchemyError as e:
        logger.error(f"Fetch one error: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return None

def fetch_all(query, params=None):
    """Fetch all rows using SQLAlchemy"""
    return execute_query(query, params, fetch=True)