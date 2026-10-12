# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# nginx reverse proxy for the companion robot stack (Python API + console + WS).
# The bundled config terminates TLS and expects the certificate material to be
# mounted at /etc/letsencrypt at runtime, so the config is copied in as-is and
# is only validated once those mounts exist (never at build time).
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443
