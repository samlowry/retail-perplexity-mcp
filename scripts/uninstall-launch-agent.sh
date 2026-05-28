#!/usr/bin/env bash
# Remove macOS LaunchAgent for Perplexity broker.
set -euo pipefail

LABEL="io.perplexity.desktop-broker"
INSTALLED_PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
USER_ID="$(id -u)"
DOMAIN="gui/${USER_ID}"

if [[ -f "${INSTALLED_PLIST}" ]]; then
  launchctl bootout "${DOMAIN}" "${INSTALLED_PLIST}" 2>/dev/null || \
    launchctl unload "${INSTALLED_PLIST}" 2>/dev/null || true
  rm -f "${INSTALLED_PLIST}"
  echo "Removed ${INSTALLED_PLIST}"
else
  echo "Not installed (${INSTALLED_PLIST} missing)"
fi
