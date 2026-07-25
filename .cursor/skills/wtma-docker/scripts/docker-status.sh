#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

PROD=false
QUIET=false
WATCH=false
INTERVAL=5

usage() {
  cat <<'EOF'
WTMA Docker status checker

Usage:
  bash .cursor/skills/wtma-docker/scripts/docker-status.sh [options]

Options:
  --prod          Use docker-compose.prod.yml (server/production)
  --env-file F    Extra env file for compose (e.g. .env.prod)
  --quiet         Only print summary line (OK / FAIL)
  --watch         Refresh every N seconds (default: 5)
  --interval N    Watch interval in seconds (default: 5)
  -h, --help      Show this help

Examples:
  bash .cursor/skills/wtma-docker/scripts/docker-status.sh
  bash .cursor/skills/wtma-docker/scripts/docker-status.sh --prod --env-file .env.prod
  bash .cursor/skills/wtma-docker/scripts/docker-status.sh --watch
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prod) PROD=true; shift ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --quiet) QUIET=true; shift ;;
    --watch) WATCH=true; shift ;;
    --interval)
      INTERVAL="${2:-5}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

COMPOSE=(docker compose)
if $PROD; then
  COMPOSE+=(-f docker-compose.prod.yml)
  MODE="production"
else
  MODE="development"
fi
if [[ -n "${ENV_FILE:-}" ]]; then
  COMPOSE+=(--env-file "$ENV_FILE")
fi

FAILED=0
ISSUES=()

log() {
  if ! $QUIET; then
    echo "$@"
  fi
}

fail() {
  ISSUES+=("$1")
  FAILED=1
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: '$1' topilmadi. Docker o'rnatilganligini tekshiring." >&2
    exit 2
  fi
}

http_ok() {
  local url="$1"
  local code
  code="$(curl -fsS -o /dev/null -w "%{http_code}" --connect-timeout 3 --max-time 8 "$url" 2>/dev/null || echo "000")"
  [[ "$code" =~ ^(200|204|301|302|307|308)$ ]]
}

print_header() {
  log ""
  log "=== WTMA Docker status ($MODE) ==="
  log "Project: $ROOT"
  log "Time:    $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  log ""
}

check_once() {
  FAILED=0
  ISSUES=()

  if ! docker info >/dev/null 2>&1; then
    echo "FAIL: Docker daemon ishlamayapti (docker info xato)" >&2
    exit 2
  fi

  print_header

  log "--- docker compose ps ---"
  if ! "${COMPOSE[@]}" ps; then
    fail "docker compose ps bajarilmadi"
  fi
  log ""

  mapfile -t SERVICES < <("${COMPOSE[@]}" ps --services 2>/dev/null | sort -u)
  if [[ ${#SERVICES[@]} -eq 0 ]]; then
    fail "Hech qanday compose servisi topilmadi (stack ishga tushirilmagan?)"
  fi

  log "--- service checks ---"
  for service in "${SERVICES[@]}"; do
    cid="$("${COMPOSE[@]}" ps -q "$service" 2>/dev/null | head -n1)"
    if [[ -z "$cid" ]]; then
      log "  [FAIL] $service — ishlamayapti"
      fail "$service ishlamayapti"
      continue
    fi

    health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || echo "unknown")"
    if [[ "$health" == "unhealthy" ]]; then
      log "  [FAIL] $service — unhealthy"
      fail "$service unhealthy"
    elif [[ "$health" == "starting" ]]; then
      log "  [WARN] $service — starting"
      fail "$service starting"
    elif [[ "$health" == "healthy" ]]; then
      log "  [ OK ] $service — running, healthy"
    else
      log "  [ OK ] $service — running"
    fi
  done
  log ""

  log "--- HTTP probes ---"
  if $PROD; then
    HTTP_PORT="${HTTP_PORT:-80}"
    if [[ -f "${ENV_FILE:-.env.prod}" ]]; then
      # shellcheck disable=SC1090
      set -a
      source "${ENV_FILE:-.env.prod}" 2>/dev/null || true
      set +a
      HTTP_PORT="${HTTP_PORT:-80}"
    fi
    if http_ok "http://127.0.0.1:${HTTP_PORT}/api/v1/health"; then
      log "  [ OK ] API health via :${HTTP_PORT}/api/v1/health"
    else
      log "  [FAIL] API health via :${HTTP_PORT}/api/v1/health"
      fail "API health probe (:${HTTP_PORT})"
    fi
  else
    if http_ok "http://127.0.0.1:8002/api/v1/health"; then
      log "  [ OK ] API http://127.0.0.1:8002/api/v1/health"
    else
      log "  [FAIL] API http://127.0.0.1:8002/api/v1/health"
      fail "API :8002"
    fi

    if http_ok "http://127.0.0.1:5173/"; then
      log "  [ OK ] Web http://127.0.0.1:5173/"
    else
      log "  [WARN] Web http://127.0.0.1:5173/ — javob yo'q (build yoki npm dev hali tayyor emas)"
    fi
  fi
  log ""

  log "--- quick commands ---"
  if $PROD; then
    log "  logs:   ${COMPOSE[*]} logs -f --tail=100"
    log "  up:     ${COMPOSE[*]} up -d --build"
  else
    log "  logs:   ${COMPOSE[*]} logs -f --tail=100 api web db"
    log "  up:     ${COMPOSE[*]} up -d --build"
  fi
  log ""

  if [[ $FAILED -eq 0 ]]; then
    if $QUIET; then
      echo "OK: WTMA Docker ($MODE) — barcha servislar yaxshi"
    else
      log "RESULT: OK — barcha muhim servislar ishlayapti"
    fi
    return 0
  fi

  if $QUIET; then
    echo "FAIL: WTMA Docker ($MODE) — ${#ISSUES[@]} muammo: ${ISSUES[*]}"
  else
    log "RESULT: FAIL — muammolar:"
    for issue in "${ISSUES[@]}"; do
      log "  - $issue"
    done
  fi
  return 1
}

require_cmd docker
require_cmd curl

if $WATCH; then
  while true; do
    clear || true
    check_once || true
    sleep "$INTERVAL"
  done
else
  check_once
  exit $?
fi
