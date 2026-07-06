#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

FRONTEND_ONLY=false
BACKEND_ONLY=false
RUN_ALL=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --frontend-only) FRONTEND_ONLY=true; shift ;;
    --backend-only) BACKEND_ONLY=true; shift ;;
    --all) RUN_ALL=true; shift ;;
    *) shift ;;
  esac
done

FAILED=0

run_frontend=false
run_backend=false

if $RUN_ALL || { $FRONTEND_ONLY && $BACKEND_ONLY; }; then
  run_frontend=true
  run_backend=true
elif $FRONTEND_ONLY; then
  run_frontend=true
elif $BACKEND_ONLY; then
  run_backend=true
else
  mapfile -t CHANGED < <( {
    git diff --name-only HEAD 2>/dev/null
    git diff --name-only --cached 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
  } | sort -u)

  for f in "${CHANGED[@]}"; do
    [[ "$f" == frontend/* ]] && run_frontend=true
    [[ "$f" == backend/* ]] && run_backend=true
  done
  if ! $run_frontend && ! $run_backend; then
    run_frontend=true
    run_backend=true
  fi
fi

step() {
  local name="$1"
  shift
  echo ""
  echo "=== $name ==="
  if "$@"; then
    echo "OK: $name"
  else
    echo "FAIL: $name"
    FAILED=1
  fi
}

if $run_frontend; then
  step "Frontend build (tsc + vite)" bash -c "cd frontend && npm run build"
fi

if $run_backend; then
  if command -v docker >/dev/null 2>&1 && docker compose ps --services --filter status=running 2>/dev/null | grep -q '^api$'; then
    step "Backend Python compile (docker)" docker compose exec -T api python -m compileall -q app
    if docker compose exec -T api python -c "import pytest" >/dev/null 2>&1; then
      step "Backend pytest (docker api)" docker compose exec -T api python -m pytest -q
    else
      echo "SKIP: pytest (dev dependencies not installed in runtime)"
    fi
  else
    step "Backend Python compile (local)" bash -c "cd backend && python -m compileall -q app"
    if [[ -f backend/requirements-dev.txt ]] && python -c "import pytest" >/dev/null 2>&1; then
      step "Backend pytest (local)" bash -c "cd backend && python -m pytest -q"
    fi
  fi
fi

echo ""
if [[ $FAILED -ne 0 ]]; then
  echo "VERIFY FAILED"
  exit 1
fi

echo "VERIFY PASSED"
exit 0
