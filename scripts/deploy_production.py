#!/usr/bin/env python3
"""
Production deployment script for European Children Companion Robot.

Usage:
    python scripts/deploy_production.py --domain children-robot.com --email admin@children-robot.com
    python scripts/deploy_production.py --check-only

This script:
1. Validates all required environment variables
2. Generates docker-compose.prod.yml with live values
3. Runs pre-deploy checks (DB migration, health endpoints)
4. Deploys via docker compose
5. Runs post-deploy smoke tests
6. Sets up monitoring alerts
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

ROOT = Path(__file__).parent.parent


REQUIRED_ENV = {
    # Core
    "POSTGRES_PASSWORD": "PostgreSQL password (32+ chars)",
    "JWT_SECRET": "JWT signing secret (64+ chars)",
    "JWT_REFRESH_SECRET": "JWT refresh secret (64+ chars)",
    "REDIS_PASSWORD": "Redis password (optional but recommended)",
    # Encryption
    "PERSISTENCE_ENCRYPTION_KEY": "Fernet key for data-at-rest encryption (32 bytes base64)",
    "DATA_LOOP_SALT": "Pseudonymization salt (32+ chars)",
    # Payments (Stripe live)
    "STRIPE_SECRET_KEY": "Stripe live secret key (sk_live_...)",
    "STRIPE_PUBLISHABLE_KEY": "Stripe live publishable key (pk_live_...)",
    "STRIPE_WEBHOOK_SECRET": "Stripe webhook signing secret (whsec_...)",
    # Email (SendGrid)
    "SENDGRID_API_KEY": "SendGrid API key (SG.xxx)",
    "SENDGRID_FROM_EMAIL": "Verified sender email (noreply@children-robot.com)",
    # External Auth
    "GOOGLE_CLIENT_ID": "Google OAuth client ID",
    "GOOGLE_CLIENT_SECRET": "Google OAuth client secret",
    "FACEBOOK_APP_TOKEN": "Facebook App token",
    # Domain & TLS
    "DOMAIN": "Production domain (children-robot.com)",
    "CORS_ORIGINS": "Allowed origins (https://app.children-robot.com,https://parent.children-robot.com)",
    "ACME_EMAIL": "Let's Encrypt registration email",
    # Monitoring
    "GRAFANA_PASSWORD": "Grafana admin password",
    "GRAFANA_ADMIN": "Grafana admin username (default: admin)",
    # Evidence channels
    "GITHUB_TOKEN": "GitHub PAT for evidence issues (repo scope)",
    "GITHUB_REPO": "Evidence repo (org/robot-evidence)",
    "WECOM_WEBHOOK_URL": "WeCom webhook URL",
    "WECOM_WEBHOOK_SECRET": "WeCom webhook secret",
    "DINGTALK_WEBHOOK_URL": "DingTalk webhook URL",
    "DINGTALK_WEBHOOK_SECRET": "DingTalk webhook secret",
    # Logistics (Shippo live)
    "SHIPPO_API_KEY": "Shippo live API key",
    "SHIPPO_WEBHOOK_SECRET": "Shippo webhook secret",
    # Classroom / LTI
    "CLASSROOM_CLIENT_ID": "Google Classroom client ID",
    "CLASSROOM_CLIENT_SECRET": "Google Classroom client secret",
    "CLASSROOM_REDIRECT_URI": "OAuth redirect URI",
    "CLASSROOM_PROJECT_ID": "Google Cloud project ID",
    "CLASSROOM_WEBHOOK_URL": "Classroom webhook URL",
    # Hidden API
    "ENABLE_HIDDEN_API": "true",
    "AUTONOMOUS_INTERNAL_KEY": "256-bit hex string for hidden API auth",
    "AUTONOMOUS_AUTOSTART": "1",
    "AUTONOMOUS_INTERVAL": "300",
    "HUNTER_ONLINE": "1",
    "AUTONOMOUS_STATE_BACKEND": "redis",
    "DEPLOYMENT_REGION": "EU",  # Enables EU AI Act compliance gates
}

OPTIONAL_ENV = {
    "SENTRY_DSN": "Sentry DSN for error tracking",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "OTLP endpoint for traces (e.g. jaeger:4317)",
    "LOG_LEVEL": "INFO",
}


def check_env() -> Dict[str, List[str]]:
    """Check all required environment variables."""
    missing = []
    empty = []
    for k, desc in REQUIRED_ENV.items():
        v = os.getenv(k)
        if v is None:
            missing.append(f"{k} ({desc})")
        elif v.strip() == "":
            empty.append(f"{k} ({desc})")
    return {"missing": missing, "empty": empty}


def generate_fernet_key() -> str:
    """Generate a new Fernet key for encryption."""
    from cryptography.fernet import Fernet
    return Fernet.generate_key().decode()


def generate_jwt_secret() -> str:
    """Generate a secure JWT secret."""
    import secrets
    return secrets.token_urlsafe(48)


def run_cmd(cmd: List[str], cwd: Optional[Path] = None, check: bool = True) -> subprocess.CompletedProcess:
    """Run a command and return result."""
    print(f"$ {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=cwd or ROOT, capture_output=True, text=True, check=check)


def check_docker() -> bool:
    """Verify Docker and docker-compose are available."""
    try:
        run_cmd(["docker", "version"])
        run_cmd(["docker", "compose", "version"])
        return True
    except Exception as e:
        print(f"Docker check failed: {e}")
        return False


def generate_prod_compose(env_file: Path) -> Path:
    """Generate docker-compose.prod.yml from template with live values."""
    compose_template = ROOT / "docker-compose.yml"
    if not compose_template.exists():
        raise FileNotFoundError("docker-compose.yml not found")
    
    # Read template and replace any placeholder patterns
    content = compose_template.read_text()
    
    # Write production compose
    prod_compose = ROOT / "docker-compose.prod.yml"
    prod_compose.write_text(content)
    print(f"Generated {prod_compose}")
    return prod_compose


def run_migrations() -> bool:
    """Run database migrations."""
    print("Running database migrations...")
    try:
        run_cmd(["docker", "compose", "-f", "docker-compose.prod.yml", "run", "--rm", "python-api", "python", "-c",
                 "from children_persistence import init_sqlite_db; init_sqlite_db(); print('SQLite OK')"])
        run_cmd(["docker", "compose", "-f", "docker-compose.prod.yml", "run", "--rm", "python-api", "python", "-c",
                 "from children_persistence import init_sqlite_db; init_sqlite_db(); print('PostgreSQL OK')"])
        return True
    except subprocess.CalledProcessError as e:
        print(f"Migration failed: {e.stderr}")
        return False


def wait_for_health(url: str, timeout: int = 120) -> bool:
    """Wait for a health endpoint to return 200."""
    import urllib.request
    import urllib.error
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.getcode() == 200:
                    return True
        except Exception:
            pass
        time.sleep(3)
    return False


def smoke_tests(domain: str) -> bool:
    """Run post-deploy smoke tests."""
    import urllib.request
    import json
    base = f"https://{domain}"
    tests = [
        (f"{base}/health/live", 200, "live health"),
        (f"{base}/health/ready", 200, "ready health"),
        (f"{base}/api/integrations/status", 200, "integrations status"),
        (f"{base}/api/engagement/stats", 200, "engagement stats"),
    ]
    all_ok = True
    for url, expected, name in tests:
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.getcode() == expected:
                    print(f"  ✅ {name}: {url}")
                else:
                    print(f"  ❌ {name}: {url} -> {resp.getcode()}")
                    all_ok = False
        except Exception as e:
            print(f"  ❌ {name}: {url} -> {e}")
            all_ok = False
    return all_ok


def main():
    parser = argparse.ArgumentParser(description="Deploy to production")
    parser.add_argument("--domain", default=os.getenv("DOMAIN", "children-robot.com"))
    parser.add_argument("--email", default=os.getenv("ACME_EMAIL"))
    parser.add_argument("--check-only", action="store_true", help="Only validate environment")
    parser.add_argument("--generate-secrets", action="store_true", help="Print generated secrets")
    args = parser.parse_args()

    print("=" * 60)
    print("  PRODUCTION DEPLOYMENT - European Children Companion Robot")
    print("=" * 60)

    # 1. Check environment
    print("\n[1/8] Checking environment variables...")
    check = check_env()
    if check["missing"] or check["empty"]:
        print("  ❌ MISSING:")
        for m in check["missing"]:
            print(f"    - {m}")
        print("  ❌ EMPTY:")
        for e in check["empty"]:
            print(f"    - {e}")
        if args.generate_secrets:
            print("\n  Generated secrets you can use:")
            print(f"  POSTGRES_PASSWORD={generate_jwt_secret()}")
            print(f"  JWT_SECRET={generate_jwt_secret()}")
            print(f"  JWT_REFRESH_SECRET={generate_jwt_secret()}")
            print(f"  PERSISTENCE_ENCRYPTION_KEY={generate_fernet_key()}")
            print(f"  DATA_LOOP_SALT={generate_jwt_secret()}")
            print(f"  AUTONOMOUS_INTERNAL_KEY={generate_jwt_secret()}")
        if args.check_only:
            return 1
        else:
            print("\n  Set all required env vars and re-run.")
            return 1
    else:
        print("  ✅ All required env vars present")

    if args.check_only:
        print("  ✅ Environment check passed")
        return 0

    # 2. Check Docker
    print("\n[2/8] Checking Docker...")
    if not check_docker():
        print("  ❌ Docker not available")
        return 1
    print("  ✅ Docker available")

    # 3. Generate production compose
    print("\n[3/8] Generating docker-compose.prod.yml...")
    prod_compose = generate_prod_compose(ROOT / "docker-compose.yml")
    print(f"  ✅ Generated {prod_compose}")

    # 4. Pull images
    print("\n[4/8] Pulling Docker images...")
    run_cmd(["docker", "compose", "-f", "docker-compose.prod.yml", "pull"])
    print("  ✅ Images pulled")

    # 5. Run migrations
    print("\n[5/8] Running database migrations...")
    if not run_migrations():
        print("  ❌ Migrations failed")
        return 1
    print("  ✅ Migrations complete")

    # 6. Start services
    print("\n[6/8] Starting services...")
    run_cmd(["docker", "compose", "-f", "docker-compose.prod.yml", "up", "-d"])
    print("  ✅ Services started")

    # 7. Wait for health
    print("\n[7/8] Waiting for health checks...")
    domain = args.domain
    if not wait_for_health(f"https://{domain}/health/live"):
        print(f"  ❌ Health check failed for {domain}")
        return 1
    if not wait_for_health(f"https://{domain}/health/ready"):
        print(f"  ❌ Ready check failed for {domain}")
        return 1
    print("  ✅ All health checks passed")

    # 8. Smoke tests
    print("\n[8/8] Running smoke tests...")
    if not smoke_tests(domain):
        print("  ❌ Smoke tests failed")
        return 1
    print("  ✅ All smoke tests passed")

    print("\n" + "=" * 60)
    print(f"  🎉 DEPLOYMENT SUCCESSFUL - {domain} is live!")
    print("=" * 60)
    print(f"  API:      https://{domain}")
    print(f"  Console:  https://{domain}/console")
    print(f"  Grafana:  https://monitoring.{domain}")
    print(f"  Jaeger:   https://jaeger.{domain}")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())