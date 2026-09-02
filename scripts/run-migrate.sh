#!/usr/bin/env bash
set -euo pipefail

STACK="${1:-staging}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"
pnpm --filter @kitsuneos/core build

cd "$ROOT/infra"
ADMIN_URL=$(aws secretsmanager get-secret-value --secret-id "$(pulumi stack output ownerDbSecretArn -s "$STACK")" --query SecretString --output text)
APP_URL=$(aws secretsmanager get-secret-value --secret-id "$(pulumi stack output appDbSecretArn -s "$STACK")" --query SecretString --output text)

OWNER_PW=$(node -e "console.log(new URL(process.argv[1]).password)" "$ADMIN_URL")
APP_PW=$(node -e "console.log(new URL(process.argv[1]).password)" "$APP_URL")
export KITSUNE_ADMIN_URL="$ADMIN_URL"
export KITSUNE_OWNER_PASSWORD="$OWNER_PW"
export KITSUNE_APP_PASSWORD="$APP_PW"
"$ROOT/scripts/bootstrap-rds.sh"

export KITSUNE_OWNER_URL="$ADMIN_URL"
export KITSUNE_APP_URL="$APP_URL"
node "$ROOT/packages/core/dist/cli/migrate.js"

echo "Migration complete for stack $STACK"
