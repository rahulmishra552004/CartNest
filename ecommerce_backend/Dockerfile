FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1\
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN DB_PASSWORD=build-only python manage.py collectstatic --noinput

RUN useradd --uid 1000 --create-home appuser
RUN mkdir -p /app/media && chown appuser /app/media
USER appuser

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--access-logfile", "-"]
