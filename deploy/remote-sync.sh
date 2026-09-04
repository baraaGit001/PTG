#!/usr/bin/env bash
# Stage 1 of a deploy: make ~/PTG on the server an exact copy of origin/main.
#
# Piped to the server over stdin (`ssh ... bash -s < deploy/remote-sync.sh`)
# rather than run from the checkout, because on a first deploy the checkout
# does not exist yet - and because it means the *next* stage always runs the
# freshly pulled version of deploy/server-update.sh rather than the old one.
set -euo pipefail

REPO_URL="${PTG_REPO_URL:-https://github.com/baraaGit001/PTG.git}"
REPO_DIR="${PTG_REPO_DIR:-$HOME/PTG}"
BRANCH="${PTG_BRANCH:-main}"

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "==> cloning $REPO_URL -> $REPO_DIR"
  git clone --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"
else
  echo "==> updating $REPO_DIR from origin/$BRANCH"
  cd "$REPO_DIR"
  git remote set-url origin "$REPO_URL"
  git fetch --prune origin "$BRANCH"
  # Hard reset, not merge: the server is a deploy target, never a place where
  # edits are authored, so anything local is drift to be discarded.
  git checkout -B "$BRANCH" "origin/$BRANCH"
  git reset --hard "origin/$BRANCH"
  # -d without -x: untracked build leftovers go, .gitignore'd files (.env, the
  # thing that carries every production secret) stay.
  git clean -fd
fi

cd "$REPO_DIR"
echo "==> now at $(git rev-parse --short HEAD) $(git log -1 --format=%s)"
