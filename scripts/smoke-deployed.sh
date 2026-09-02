#!/usr/bin/env bash
set -euo pipefail

# Gate 0b smoke against a deployed app (optional CI / manual).
# Requires DEPLOYED_APP_URL and DEPLOYED_API_KEY.

: "${DEPLOYED_APP_URL:?Set DEPLOYED_APP_URL e.g. https://app.kitsuneos.com}"
: "${DEPLOYED_API_KEY:?Set DEPLOYED_API_KEY}"

MCP_URL="${DEPLOYED_APP_URL%/}/api/mcp/tools/call"

curl -sf "${DEPLOYED_APP_URL%/}/health" >/dev/null
echo "Health OK"

curl -sf -X POST "$MCP_URL" \
  -H "Authorization: Bearer $DEPLOYED_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tool":"describe_schema","arguments":{}}'

echo ""
echo "Deployed smoke passed."

