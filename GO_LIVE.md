# GO LIVE — 24/7 Online Commercial Operation

Put the European Children Companion Robot on the internet and keep it running
unattended. Every path below is real and verified; nothing is claimed without
an executable command backing it.

---

## 0. One command to see what is deployable

```bash
python scripts/go_live.py --check
```

Reports each target as `READY` or `SETUP` (with the exact missing piece), and
downloads the free tunnel binary (`cloudflared`, Apache-2.0) on first use.

Generate all production secrets:

```bash
python scripts/go_live.py --generate-secrets      # writes .env.production
```

---

## 1. Public HTTPS in ~1 minute — no account, no server

Runs the app + a free Cloudflare quick tunnel and supervises both forever:

```bash
python scripts/go_live.py --target tunnel
#  or directly:
python scripts/live_runner.py
```

* Starts `children_robot_system.py`, waits for `/health/live`, then attaches a
  public `https://<random>.trycloudflare.com` URL (parsed from cloudflared's own
  output — never invented).
* Restarts the app and/or tunnel automatically if either dies.
* State is persisted to `runtime/live_state.json`.

Inspect / stop:

```bash
python scripts/live_runner.py --status
python scripts/live_runner.py --stop
```

> The tunnel keeps the machine's internet connection as the origin. For true
> 24/7 with the computer off, use a cloud target in section 2–5.

---

## 2. Survive crashes and reboots on this machine

```bash
python scripts/install_autostart.py --install                 # Windows task / systemd / launchd
python scripts/install_autostart.py --install --trigger onstart
python scripts/install_autostart.py --status
python scripts/install_autostart.py --uninstall
```

Windows uses a Scheduled Task (`RobotCompanionLive`), Linux writes a systemd
unit, macOS writes a launchd plist. All of them run `live_runner.py`, which is
itself resilient, so the stack self-heals.

---

## 3. Fly.io (always-on container, EU region)

```bash
# once
curl -L https://fly.io/install.sh | sh
fly auth login
fly volumes create robot_data --region fra --size 3

# every deploy
python scripts/go_live.py --target fly --app robot-companion-eu
```

`fly.toml` runs one always-on `shared-cpu-1x` machine in `fra` with an HTTP
health check on `/health/live` and a persistent volume mounted at `/app/data`.
Secrets come from `.env.production` (imported via `fly secrets import`).

Set `FLY_API_TOKEN` to let CI deploy for you (see section 6).

## 4. Railway (Docker)

```bash
npm i -g @railway/cli
export RAILWAY_TOKEN=...        # https://railway.app/account/tokens
python scripts/go_live.py --target railway
```

`railway.json` builds `Dockerfile` with `restartPolicyType: ALWAYS` and a
`/health/live` health check.

## 5. Render (Blueprint)

```bash
# push the repo to GitHub, then in the Render dashboard:
#   New → Blueprint → pick the repo → Apply
```

`render.yaml` defines a Docker web service in `frankfurt` on the **starter**
plan (always-on). `sync: false` secrets are set in the dashboard — the file
never carries them. With `RENDER_API_KEY` + `--repo-url`, `go_live.py` can also
create the service through the Render API.

## 6. Anything with Docker, or a plain VPS

```bash
python scripts/go_live.py --target docker     # docker compose up -d --build
SSH_HOST=root@1.2.3.4 python scripts/go_live.py --target vps
```

---

## 7. Continuous delivery + keep-alive

`.github/workflows/deploy.yml`:

* **verify** — runs `tests/test_deploy_assets.py`, the closure audit and the
  go-live readiness check on every push.
* **deploy-fly / deploy-railway** — token-gated real deploys (`FLY_API_TOKEN`,
  `RAILWAY_TOKEN`); skipped cleanly when the secret is absent.
* **keepalive** — a `*/10 * * * *` cron that hits `/health/live`,
  `/health/ready` and `/api/integrations/status` on the URL in the `LIVE_URL`
  repo variable, defeating free-tier idle spin-down.

Set repo variable `LIVE_URL` to the public URL, and secrets `FLY_API_TOKEN` /
`RAILWAY_TOKEN` (plus your Stripe/Shippo keys) to go fully hands-off.

---

## 8. Going from mock to real money

The commerce legs boot in **mock** mode and switch to **live** only when the
operator provides real credentials:

```bash
# on the host (e.g. fly secrets import / Render dashboard / docker .env)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYMENT_LIVE_MODE=1

SHIPPO_API_KEY=shippo_live_...
SHIPPO_WEBHOOK_SECRET=...
LOGISTICS_LIVE_MODE=1
```

Until then the platform still runs 24/7, records every loop (collect → publish
→ price → payment → fulfill → aftersales → engage) and never crashes — the
adapters fall back to mocks.

---

## 9. Verify the live deployment

```bash
python scripts/go_live.py --check
python tests/test_deploy_assets.py
python scripts/closure_audit.py
curl -f https://<your-url>/health/live
curl -f https://<your-url>/health/ready
curl -f https://<your-url>/api/integrations/status
```

---

## Files added for online operation

| File | Purpose |
|------|---------|
| `Dockerfile` | Production image: builds the React console + FastAPI app |
| `.dockerignore` | Keeps the build context small **without** dropping sources |
| `fly.toml` | Fly.io always-on machine + volume + health check |
| `render.yaml` | Render Blueprint (Docker, always-on plan) |
| `railway.json` | Railway Docker deploy + always restart |
| `Procfile` | Generic buildpack start command |
| `scripts/go_live.py` | Unified deployer + readiness check + secret generation |
| `scripts/live_runner.py` | 24/7 supervisor (app + tunnel, auto-restart) |
| `scripts/tunnel.py` | Free public HTTPS bridge (Cloudflare quick tunnel) |
| `scripts/install_autostart.py` | Boot autostart (Task Scheduler / systemd / launchd) |
| `.github/workflows/deploy.yml` | CD + keep-alive |
| `tests/test_deploy_assets.py` | Verifies every asset above |
