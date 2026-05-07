#!/bin/bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/miao/app}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
PM2_APP="${PM2_APP:-miao}"
BACKUP_DIR="$(mktemp -d /tmp/miao-public-assets.XXXXXX)"

# Only keep server-customized brand assets. Do not restore the full public/
# directory, otherwise service-worker.js and manifest.json cannot update.
ASSET_FILES=(
  "logo.png"
  "public/icon-180.png"
  "public/icon-32.png"
  "public/logo.png"
  "public/og-image.jpg"
  "public/splash.png"
  "public/splash.webp"
)

RESET_BEFORE_PULL=(
  "${ASSET_FILES[@]}"
  "public/manifest.json"
  "public/service-worker.js"
)

cleanup() {
  rm -rf "$BACKUP_DIR"
}
trap cleanup EXIT

backup_assets() {
  echo "==> Backing up server logo assets ..."
  for file in "${ASSET_FILES[@]}"; do
    if [ -f "$file" ]; then
      mkdir -p "$BACKUP_DIR/$(dirname "$file")"
      cp -p "$file" "$BACKUP_DIR/$file"
    fi
  done
}

restore_assets() {
  echo "==> Restoring server logo assets ..."
  for file in "${ASSET_FILES[@]}"; do
    if [ -f "$BACKUP_DIR/$file" ]; then
      mkdir -p "$(dirname "$file")"
      cp -p "$BACKUP_DIR/$file" "$file"
    fi
  done
}

clean_known_tracked_changes() {
  echo "==> Cleaning tracked deploy-time asset changes before pull ..."
  for file in "${RESET_BEFORE_PULL[@]}"; do
    if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
      git restore --source=HEAD -- "$file"
    fi
  done
}

rollback() {
  echo "!!! Build or restart failed, rolling back to $PREV_COMMIT ..."
  git reset --hard "$PREV_COMMIT"
  restore_assets
  npm install
  npm run build
  pm2 restart "$PM2_APP"
  echo "!!! Rolled back. Please check the deploy error above."
  exit 1
}

cd "$APP_DIR"

if git show-ref --verify --quiet "refs/heads/$DEPLOY_BRANCH"; then
  git switch "$DEPLOY_BRANCH"
else
  git fetch origin "$DEPLOY_BRANCH"
  git switch -c "$DEPLOY_BRANCH" --track "origin/$DEPLOY_BRANCH"
fi

PREV_COMMIT="$(git rev-parse HEAD)"

backup_assets
clean_known_tracked_changes

echo "==> Pulling latest code..."
git fetch origin "$DEPLOY_BRANCH"
git merge --ff-only "origin/$DEPLOY_BRANCH"

restore_assets

echo "==> Installing dependencies..."
npm install

echo "==> Building frontend..."
npm run build || rollback

echo "==> Restarting server..."
pm2 restart "$PM2_APP" || rollback

sleep 3
if pm2 show "$PM2_APP" | grep -q "status.*online"; then
  echo "==> Deploy success!"
  pm2 status
else
  rollback
fi
