#!/usr/bin/env bash
# Stage 2 of a deploy: rebuild the images from the checkout, run migrations,
# and bring the stack back up. Run on the server, from the repo root, after
# deploy/remote-sync.sh has updated the checkout and the .env has been pushed.
#
#   bash ~/PTG/deploy/server-update.sh
#
# Idempotent: safe to run on a box that has never seen the stack and on one
# that is already serving it.
set -euo pipefail

REPO_DIR="${PTG_REPO_DIR:-$HOME/PTG}"
COMPOSE_FILE=docker-compose.server.yml
PROJECT=ptg
# Set PTG_SEED=force to reseed a database that already has users in it.
SEED_MODE="${PTG_SEED:-auto}"

cd "$REPO_DIR"

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }

[ -f "$COMPOSE_FILE" ] || fail "$REPO_DIR/$COMPOSE_FILE is missing - is the checkout up to date?"
[ -f .env ] || fail "$REPO_DIR/.env is missing - update-server.bat normally uploads it from deploy/server.env"

# Read individual values out of .env rather than sourcing it. The file is a
# compose env_file, not a shell script: `VITE_BRAND_NAME=PTG Business` is a
# perfectly valid line there, and `. ./.env` tries to run `Business`.
env_value() { sed -n "s/^[[:space:]]*$1=//p" .env | tail -1 | tr -d '[:cntrl:]'; }
POSTGRES_USER="$(env_value POSTGRES_USER)"; : "${POSTGRES_USER:=ptg}"
POSTGRES_DB="$(env_value POSTGRES_DB)"; : "${POSTGRES_DB:=ptg}"

compose() { podman-compose -f "$COMPOSE_FILE" "$@"; }

step "building images (api, web, admin) - first run pulls base images and can take ~15 min"
compose build

# Infra first and on its own: migrations have to land before the API starts
# querying, and podman-compose's depends_on wait is not something to bet the
# deploy on.
step "starting postgres / redis / minio"
compose up -d postgres redis minio minio-init

step "waiting for postgres to accept connections"
for i in $(seq 1 60); do
  if podman exec ptg-postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    echo "postgres ready after ${i}s"
    break
  fi
  [ "$i" -eq 60 ] && fail "postgres did not become ready within 60s"
  sleep 1
done

# podman-compose names the network after the project; resolve it rather than
# assuming, so the one-off migration container lands on the same network as
# postgres and DATABASE_URL's `postgres` hostname resolves.
NETWORK="$(podman network ls --format '{{.Name}}' | grep -E "^${PROJECT}(_default)?$" | head -1)"
[ -n "$NETWORK" ] || fail "could not find the compose network for project '$PROJECT'"

run_in_api() {
  podman run --rm --network "$NETWORK" --env-file .env \
    -e NODE_ENV=production \
    -w /repo/apps/api localhost/ptg_api:latest sh -c "$1"
}

step "applying database migrations"
run_in_api 'npx prisma migrate deploy' || fail "prisma migrate deploy failed"

user_count() {
  podman exec ptg-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    'SELECT count(*) FROM users' 2>/dev/null | tr -d '[:space:]'
}

USERS="$(user_count || true)"
if [ "$SEED_MODE" = force ] || [ "${USERS:-0}" = 0 ]; then
  step "seeding database (users table currently holds ${USERS:-0} rows)"
  run_in_api 'npx tsx prisma/seed.ts' || fail "seed failed"
else
  step "skipping seed - users table already holds $USERS rows"
fi

step "starting api / web / admin / proxy"
compose up -d

step "waiting for the API to report healthy"
API_OK=no
for i in $(seq 1 60); do
  if podman exec ptg-api wget -q -O - http://127.0.0.1:3001/health >/dev/null 2>&1; then
    API_OK=yes
    echo "api healthy after ${i}s"
    break
  fi
  sleep 2
done
if [ "$API_OK" != yes ]; then
  echo "--- last 60 lines of API log ---" >&2
  podman logs --tail 60 ptg-api >&2 || true
  fail "the API never answered /health"
fi

# Containers are rootless, so this - plus `loginctl enable-linger opc` - is what
# brings the stack back after a reboot. Enabling it every run keeps a rebuilt
# box correct without a separate bootstrap step.
step "ensuring the stack restarts after a reboot"
systemctl --user enable podman-restart.service >/dev/null 2>&1 || true
systemctl --user start podman-restart.service >/dev/null 2>&1 || true

step "reclaiming disk from the previous build's layers"
podman image prune -f >/dev/null 2>&1 || true

step "running containers"
podman ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

IP="$(curl -fsS --max-time 5 https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || hostname -I | awk '{print $1}')"
printf '\n\033[1;32mDeployed %s\033[0m\n' "$(git rev-parse --short HEAD)"
echo "  web    http://${IP}/          (also http://${IP}:3000/)"
echo "  admin  http://${IP}:4000/"
echo "  api    http://${IP}/api/v1    docs at http://${IP}/docs"
