# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Production image — European Children Companion Robot
# Builds the React management console AND the FastAPI backend into one image.
# One container serves: API, /console (React), /api/docs, health probes.
# ---------------------------------------------------------------------------

# ---- Stage 1: build the React management console -------------------------
FROM node:20-alpine AS frontend
WORKDIR /fe
COPY project_source/management_center/frontend/package.json ./
# `npm install` on purpose (not `npm ci`): a lockfile generated on one platform
# omits the other platforms' optional native binaries (npm/cli#4828), so `ci`
# cannot provide the rollup/esbuild binaries this build needs. `npm install`
# resolves the correct binaries for the container platform.
RUN npm install --no-audit --no-fund --include=optional
COPY project_source/management_center/frontend/ ./
RUN npm run build && test -f dist/index.html


# ---- Stage 2: build Python wheels ----------------------------------------
FROM python:3.11-slim AS pybuild
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc g++ libpq-dev \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt


# ---- Stage 3: runtime -----------------------------------------------------
FROM python:3.11-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -g 1001 -r appgroup \
    && useradd -u 1001 -r -g appgroup -s /sbin/nologin -d /app appuser

# Python packages
COPY --from=pybuild /install /usr/local

# Application source
COPY --chown=appuser:appgroup children_*.py cli.py ./
COPY --chown=appuser:appgroup scripts/ ./scripts/
COPY --chown=appuser:appgroup project_source/ ./project_source/
# Freshly built console overrides any committed dist
COPY --from=frontend --chown=appuser:appgroup /fe/dist ./project_source/management_center/frontend/dist

RUN mkdir -p /app/data /app/logs /app/models /app/runtime \
    && chown -R appuser:appgroup /app/data /app/logs /app/models /app/runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8888 \
    ROBOT_STAGE=production \
    AUTONOMOUS_AUTOSTART=1 \
    DEPLOYMENT_REGION=EU

EXPOSE 8888

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://localhost:8888/health/live || exit 1

USER appuser
CMD ["python", "children_robot_system.py"]
