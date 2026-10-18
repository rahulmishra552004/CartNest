"""Gunicorn configuration for the isolated load-test API."""
from pathlib import Path

chdir = str(Path(__file__).resolve().parent)
raw_env = ['DJANGO_SETTINGS_MODULE=config.loadtest_capacity']
bind = '127.0.0.1:8001'
worker_class = 'gthread'
workers = 2
threads = 4
timeout = 30
