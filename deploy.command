#!/bin/zsh
# Double-click to publish Memorabilia Showcase: runs the tests, sends
# Code.gs, the .html files and appsscript.json to Apps Script with clasp,
# and moves the existing web app deployment to a new version (the URL stays
# the same). The first run asks for your Apps Script project (or creates one).
cd "$(dirname "$0")" || exit 1
export PATH="$HOME/.npm-global/bin:$PATH"

finish() { echo; read -k1 "?$1 Press any key to close."; echo; exit ${2:-0}; }
trap 'finish "Deploy FAILED - see the message above." 1' ERR
set -e

echo "Memorabilia Showcase - deploy"
echo "-----------------------------"
command -v clasp >/dev/null || { echo "clasp is not installed. Install it first: npm install -g @google/clasp, then run clasp login."; false; }

# Get the latest code from GitHub first (main is the source of truth).
if [ -d .git ]; then
  echo "Updating from GitHub..."
  git pull --ff-only || { echo "Could not update from GitHub (local commits not pushed, or a conflict). Sync in your editor first."; false; }
  if [ -n "$(git status --porcelain -- Code.gs '*.html' appsscript.json)" ]; then
    echo
    echo "Warning: these files have changes that are not on GitHub yet:"
    git status --short -- Code.gs '*.html' appsscript.json
    read -q "?Deploy them anyway? (y/n) " || { echo; echo "Cancelled."; false; }
    echo
  fi
fi

# First run: connect this folder to an Apps Script project. The script ID lives in
# .clasp.json (never committed: it is in .gitignore). Either paste the ID of a
# project you already made, or let clasp create a new one for you.
if [ ! -f .clasp.json ] || grep -q "YOUR_SCRIPT_ID_HERE" .clasp.json 2>/dev/null; then
  echo
  echo "First run: this folder is not linked to an Apps Script project yet."
  echo "Make one at script.google.com (a standalone project, any name), open its"
  echo "Project Settings, and copy the Script ID — or press Enter to create one here."
  read "SCRIPT_ID?Script ID (blank to create a new project): "
  if [ -z "$SCRIPT_ID" ]; then
    echo "Creating a new Apps Script project..."
    SCRIPT_ID=$(clasp create --type webapp --title "Memorabilia Showcase" --rootDir . 2>&1 | grep -oE '[A-Za-z0-9_-]{40,}' | head -1)
    [ -n "$SCRIPT_ID" ] || { echo "Could not create a project. Check that clasp is logged in (clasp login) and the Apps Script API is on."; false; }
  fi
  printf '{\n  "scriptId": "%s",\n  "rootDir": "."\n}\n' "$SCRIPT_ID" > .clasp.json
  echo "Linked to script $SCRIPT_ID (saved in .clasp.json, not committed)."
fi

# The web app settings must live in the manifest, or a redeploy can drop them.
node -e '
const fs = require("fs");
const m = JSON.parse(fs.readFileSync("appsscript.json", "utf8"));
const want = { executeAs: "USER_DEPLOYING", access: "MYSELF" };
if (!m.webapp || m.webapp.executeAs !== want.executeAs || m.webapp.access !== want.access) {
  m.webapp = want;
  fs.writeFileSync("appsscript.json", JSON.stringify(m, null, 2) + "\n");
  console.log("Manifest: web app set to Execute as Me / Only myself.");
}'

# Tests first, each run once: a failing test stops the deploy and says which one.
# The code and server tests need only Node; the page tests need Playwright (npm install, then npx playwright install chromium).
if [ -d tests/unit ]; then
  echo "Testing the code and the server..."
  node --test --test-reporter=dot tests/unit/*.test.js || { echo "Code or server tests failed."; false; }
  if [ -x node_modules/.bin/playwright ]; then
    echo "Testing the pages (phone and computer)..."
    node_modules/.bin/playwright test --config tests/playwright.config.js --reporter=dot || { echo "Page tests failed. To see one: npx playwright show-trace <the trace.zip named above>"; false; }
  else
    echo "(Page tests skipped: Playwright is not installed.)"
  fi
fi

echo "Sending files..."
clasp push -f
echo "Publishing a new version..."
DEPLOY_ID=$(clasp deployments 2>/dev/null | grep -oE 'AKfyc[A-Za-z0-9_-]+' | head -1)
if [ -n "$DEPLOY_ID" ]; then
  clasp redeploy "$DEPLOY_ID" -d "$(date '+%Y-%m-%d %H:%M')"
else
  echo "(No web app deployment yet: creating the first one.)"
  clasp deploy -d "$(date '+%Y-%m-%d %H:%M')"
fi
trap - ERR
finish "Done. The site is updated (same URL, once a deployment exists)."
