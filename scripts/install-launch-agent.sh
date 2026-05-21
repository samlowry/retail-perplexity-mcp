#!/usr/bin/env bash
# Install macOS LaunchAgent: start Perplexity broker at user login.
set -euo pipefail

LABEL="com.samlowry.perplexity-broker"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATE="${SCRIPT_DIR}/launchd/${LABEL}.plist.template"
AGENTS_DIR="${HOME}/Library/LaunchAgents"
INSTALLED_PLIST="${AGENTS_DIR}/${LABEL}.plist"
BROKER_ENTRY="${REPO_ROOT}/apps/broker/dist/index.js"
LOG_DIR="${REPO_ROOT}/data/logs"

die() {
  echo "error: $*" >&2
  exit 1
}

require_file() {
  [[ -f "$1" ]] || die "missing $1 — run: cd ${REPO_ROOT} && pnpm build"
}

require_file "${TEMPLATE}"
require_file "${REPO_ROOT}/.env"

NODE_BIN="$(command -v node || true)"
[[ -n "${NODE_BIN}" ]] || die "node not found in PATH — install Node 20+ (e.g. nvm) and retry"

require_file "${BROKER_ENTRY}"

mkdir -p "${LOG_DIR}" "${AGENTS_DIR}"

PATH_VALUE="${PATH:-/usr/local/bin:/usr/bin:/bin}"
NODE_DIR="$(dirname "${NODE_BIN}")"
if [[ ":${PATH_VALUE}:" != *":${NODE_DIR}:"* ]]; then
  PATH_VALUE="${NODE_DIR}:${PATH_VALUE}"
fi

sed \
  -e "s|__REPO_ROOT__|${REPO_ROOT}|g" \
  -e "s|__NODE_BIN__|${NODE_BIN}|g" \
  -e "s|__BROKER_ENTRY__|${BROKER_ENTRY}|g" \
  -e "s|__PATH_VALUE__|${PATH_VALUE}|g" \
  -e "s|__HOME_DIR__|${HOME}|g" \
  -e "s|__LOG_DIR__|${LOG_DIR}|g" \
  "${TEMPLATE}" > "${INSTALLED_PLIST}"

USER_ID="$(id -u)"
DOMAIN="gui/${USER_ID}"

# Reload if already registered.
if launchctl print "${DOMAIN}/${LABEL}" &>/dev/null; then
  launchctl bootout "${DOMAIN}" "${INSTALLED_PLIST}" 2>/dev/null || \
    launchctl unload "${INSTALLED_PLIST}" 2>/dev/null || true
fi

if launchctl bootstrap "${DOMAIN}" "${INSTALLED_PLIST}" 2>/dev/null; then
  :
else
  launchctl load -w "${INSTALLED_PLIST}"
fi

launchctl kickstart -k "${DOMAIN}/${LABEL}" 2>/dev/null || true

echo "Installed LaunchAgent: ${INSTALLED_PLIST}"
echo "Logs: ${LOG_DIR}/broker.{stdout,stderr}.log"
echo "Health: curl -s http://127.0.0.1:3317/health"
echo "Status: launchctl print ${DOMAIN}/${LABEL}"
