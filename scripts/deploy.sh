#!/usr/bin/env bash
#
# Deploys the current commit to the live site on alwaysdata.
#
#   Windows:  .\deploy.cmd            (from the project folder)
#   Git Bash: bash scripts/deploy.sh
#
# Options:
#   --skip-tests   do not run the test suite before deploying
#
# What it does:
#   1. checks the working tree is clean and on main, pushes main to GitHub if needed
#   2. runs the tests and builds the frontend
#   3. uploads the committed code + built assets to the server
#   4. on the server: maintenance mode on, sync files (keeps .env, storage, vendor),
#      composer install, migrations, caches, maintenance mode off
#   5. checks that the live site serves the new build
#
# The server's .env and database are never overwritten.

set -euo pipefail

SSH_HOST="${DEPLOY_SSH_HOST:-myhours@ssh-myhours.alwaysdata.net}"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/alwaysdata_myhours}"
APP_DIR="${DEPLOY_APP_DIR:-myhours}"   # relative to the server home directory
SITE_URL="${DEPLOY_SITE_URL:-https://myhours.alwaysdata.net}"
BRANCH="main"

RUN_TESTS=1
for arg in "$@"; do
    case "$arg" in
        --skip-tests) RUN_TESTS=0 ;;
        *) echo "Unknown option: $arg" >&2; exit 2 ;;
    esac
done

SSH_OPTS=(-i "$SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=20)

step() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mDeploy stopped: %s\033[0m\n' "$*" >&2; exit 1; }

# Runs a command quietly; prints its output only if it fails.
quiet() {
    local log="$WORK_DIR/step.log"
    if ! "$@" >"$log" 2>&1; then
        cat "$log" >&2
        return 1
    fi
}

cd "$(dirname "$0")/.."
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

# --- 1. Git checks -----------------------------------------------------------
step "Checking git"
[ "$(git rev-parse --abbrev-ref HEAD)" = "$BRANCH" ] || fail "you are not on the $BRANCH branch."
[ -z "$(git status --porcelain)" ] || fail "there are uncommitted changes. Commit them first (only committed code is deployed)."
[ -f "$SSH_KEY" ] || fail "SSH key not found at $SSH_KEY."

git fetch -q origin "$BRANCH"
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
    if git merge-base --is-ancestor "$REMOTE_SHA" "$LOCAL_SHA"; then
        echo "Pushing $BRANCH to GitHub..."
        git push -q origin "$BRANCH"
    else
        fail "GitHub has commits that are not here. Run 'git pull' first."
    fi
fi
SHA="$(git rev-parse --short HEAD)"
echo "Deploying commit $SHA: $(git log -1 --format=%s)"

# --- 2. Tests and build ------------------------------------------------------
if [ "$RUN_TESTS" = 1 ]; then
    step "Running tests"
    quiet php artisan test || fail "tests failed, nothing was deployed."
    echo "All tests passed."
fi

step "Building frontend"
quiet npm run build || fail "frontend build failed, nothing was deployed."
APP_JS="$(php -r '$m = json_decode(file_get_contents("public/build/manifest.json"), true); echo $m["resources/js/app.tsx"]["file"];')"

# --- 3. Package and upload ---------------------------------------------------
step "Packaging and uploading"
ARCHIVE="release-$SHA.tar.gz"
git archive --format=tar -o "$WORK_DIR/release.tar" HEAD
tar --force-local -rf "$WORK_DIR/release.tar" public/build
gzip -c "$WORK_DIR/release.tar" > "$WORK_DIR/$ARCHIVE"
scp -q "${SSH_OPTS[@]}" "$WORK_DIR/$ARCHIVE" "$SSH_HOST:$ARCHIVE"
echo "Uploaded $(du -h "$WORK_DIR/$ARCHIVE" | cut -f1)."

# --- 4. Install on the server ------------------------------------------------
step "Installing on the server"
ssh "${SSH_OPTS[@]}" "$SSH_HOST" bash -s -- "$APP_DIR" "$ARCHIVE" "$SHA" <<'REMOTE'
set -euo pipefail
APP_DIR="$HOME/$1"; ARCHIVE="$HOME/$2"; SHA="$3"
STAGE="$HOME/.deploy-stage"

[ -f "$APP_DIR/.env" ] || { echo "Missing $APP_DIR/.env on the server" >&2; exit 1; }

rm -rf "$STAGE" && mkdir -p "$STAGE"
tar -xzf "$ARCHIVE" -C "$STAGE"
rm -f "$ARCHIVE"

cd "$APP_DIR"
php artisan down --retry=15 >/dev/null
# Whatever happens next, bring the site back up and clean the staging folder.
trap 'cd "$APP_DIR" && php artisan up >/dev/null; rm -rf "$STAGE"' EXIT

# Mirror the release, keeping the server-only .env, storage and vendor.
rsync -a --delete \
    --exclude='/.env' \
    --exclude='/storage/' \
    --exclude='/vendor/' \
    "$STAGE"/ "$APP_DIR"/

composer install --no-dev --optimize-autoloader --no-interaction --no-progress --quiet
php artisan migrate --force
php artisan optimize >/dev/null
echo "$SHA" > "$APP_DIR/REVISION"
echo "Server now runs $SHA."
REMOTE

# --- 5. Smoke test -----------------------------------------------------------
step "Checking $SITE_URL"
PAGE="$WORK_DIR/login.html"
STATUS="$(curl -s -o "$PAGE" -w '%{http_code}' --max-time 60 "$SITE_URL/login")"
[ "$STATUS" = "200" ] || fail "the login page answered HTTP $STATUS. Check the site and ~/admin/logs on the server."
grep -q "$APP_JS" "$PAGE" || fail "the live page does not use the new build ($APP_JS). Check the server."

printf '\n\033[1;32mDeployed %s to %s\033[0m\n' "$SHA" "$SITE_URL"
