"""
Database initialization runner for GridShare.
Creates all database tables and populates deterministic demo data.
"""

import sys
import os

# Add workspace root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from gridshare.backend.app import create_app
from gridshare.backend.app.models import db
from gridshare.database.seed_data import seed_database

def initialize_database():
    app = create_app()
    with app.app_context():
        print(f"Connecting to database: {app.config['SQLALCHEMY_DATABASE_URI']}")
        print("Recreating all tables (Households, EnergyReadings, Batteries, Transactions, Predictions, Decisions)...")
        db.drop_all()
        db.create_all()
        print("Tables created successfully.")

        print("Populating deterministic seed data for 5 households and PPT scenario...")
        seed_database(clear_existing=True)
        print("Database initialization complete.")

if __name__ == "__main__":
    initialize_database()
