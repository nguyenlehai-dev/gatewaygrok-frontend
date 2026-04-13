#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "${ROOT_DIR}/.env" ]]; then
  while IFS='=' read -r key value; do
    case "${key}" in
      FRONTEND_PORT|FRONTEND_CONTAINER_NAME|FRONTEND_DOCKERFILE|VITE_API_BASE_URL|COMPOSE_PROJECT_NAME)
        export "${key}=${value}"
        ;;
    esac
  done < <(grep -E '^(FRONTEND_PORT|FRONTEND_CONTAINER_NAME|FRONTEND_DOCKERFILE|VITE_API_BASE_URL|COMPOSE_PROJECT_NAME)=' "${ROOT_DIR}/.env" || true)
fi

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-gatewaygrok-fe}"

cd "${ROOT_DIR}"
if [[ -n "${FRONTEND_CONTAINER_NAME:-}" ]] && docker ps -a --format '{{.Names}}' | grep -Fxq "${FRONTEND_CONTAINER_NAME}"; then
  docker rm -f "${FRONTEND_CONTAINER_NAME}"
fi
docker compose -p "${PROJECT_NAME}" up -d --build
docker compose -p "${PROJECT_NAME}" ps
