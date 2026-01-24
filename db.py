# db.py
import psycopg2

def get_connection():
    return psycopg2.connect(
        dbname="ATS_DB",
        user="postgres",
        password="0112",
        host="localhost",
        port=5432
    )
