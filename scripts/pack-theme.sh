#!/usr/bin/env bash
# Rebuild newsletter-site-theme as a committed tarball and copy it into
# every converted market site repo. One command to propagate a theme fix.
#
# This is a bridge until the theme is a public GitHub repo. After the
# owner creates github.com/HenrytheLobster/newsletter-site-template, each
# site swaps one line:
#
#   "newsletter-site-theme": "github:HenrytheLobster/newsletter-site-template"
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

usage() {
  cat <<'EOF'
pack-theme.sh — npm pack the theme and refresh vendor/*.tgz in all site repos.

  scripts/pack-theme.sh           pack + copy + update each site lockfile
  scripts/pack-theme.sh --dry-run print paths, write nothing
  scripts/pack-theme.sh --help

Each converted site then depends on:

  "newsletter-site-theme": "file:./vendor/newsletter-site-theme-<version>.tgz"

npm ci installs from that tarball with no network and no auth, so
Cloudflare Workers Builds can see it. The theme SOURCE stays in this
repo; each site carries a built artifact.

Later, one-line swap per site:

  "newsletter-site-theme": "github:HenrytheLobster/newsletter-site-template"
EOF
}

DRY=0
case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
  --dry-run)
    DRY=1
    ;;
  "")
    ;;
  *)
    echo "unknown argument: $1" >&2
    usage >&2
    exit 1
    ;;
esac

VERSION="$(node -p "require('./package.json').version")"
NAME="$(node -p "require('./package.json').name")"
TARBALL="${NAME}-${VERSION}.tgz"
SPEC="file:./vendor/${TARBALL}"

PACK_DIR="$(mktemp -d)"
trap 'rm -rf "$PACK_DIR"' EXIT

echo "packing ${TARBALL} from ${ROOT}"
if [[ "$DRY" == 1 ]]; then
  echo "  (dry-run: skip npm pack)"
else
  npm pack --pack-destination "$PACK_DIR"
  if [[ ! -f "$PACK_DIR/$TARBALL" ]]; then
    echo "npm pack did not produce ${PACK_DIR}/${TARBALL}" >&2
    ls -la "$PACK_DIR" >&2
    exit 1
  fi
fi

while IFS= read -r site; do
  [[ -z "$site" ]] && continue
  if [[ ! -f "$site/package.json" ]]; then
    echo "skip ${site} (no package.json yet)"
    continue
  fi
  echo "refresh ${site}"
  if [[ "$DRY" == 1 ]]; then
    echo "  would copy ${TARBALL} and set ${SPEC}"
    continue
  fi
  mkdir -p "$site/vendor"
  rm -f "$site/vendor"/${NAME}-*.tgz
  cp "$PACK_DIR/$TARBALL" "$site/vendor/$TARBALL"
  node --input-type=module -e "
    import fs from 'node:fs';
    const file = process.argv[1];
    const spec = process.argv[2];
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies['newsletter-site-theme'] = spec;
    fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  " "$site/package.json" "$SPEC"
  # Same version + same file: spec makes `npm install --package-lock-only`
  # treat the tarball as unchanged and leave a stale integrity hash.
  # npm ci then reinstalls the CACHED old pack. Write the sha512 of the
  # bytes we just copied so the next npm ci extracts this file.
  node --input-type=module -e "
    import { createHash } from 'node:crypto';
    import fs from 'node:fs';
    import path from 'node:path';
    const site = process.argv[1];
    const tarball = process.argv[2];
    const tgz = path.join(site, 'vendor', tarball);
    const lockFile = path.join(site, 'package-lock.json');
    const integrity = 'sha512-' + createHash('sha512').update(fs.readFileSync(tgz)).digest('base64');
    const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    const key = 'node_modules/newsletter-site-theme';
    if (!lock.packages?.[key]) {
      throw new Error(lockFile + ' missing ' + key);
    }
    lock.packages[key].integrity = integrity;
    if (lock.packages[key].resolved) {
      lock.packages[key].resolved = 'file:vendor/' + tarball;
    }
    if (lock.dependencies?.['newsletter-site-theme']) {
      lock.dependencies['newsletter-site-theme'].integrity = integrity;
    }
    fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2) + '\n');
    console.log('  lockfile integrity ' + integrity.slice(0, 27) + '…');
  " "$site" "$TARBALL"
  echo "  wrote vendor/${TARBALL} and updated lockfile"
done < <(node --input-type=module -e "
import { MARKETS } from './src/config/markets.js';
for (const m of Object.values(MARKETS)) {
  if (m.siteRepo) console.log(m.siteRepo);
}
")

if [[ "$DRY" == 1 ]]; then
  echo "dry-run done"
  exit 0
fi

echo "done. commit vendor/${TARBALL} + package.json + package-lock.json in each site."
echo "later, one-line swap: \"newsletter-site-theme\": \"github:HenrytheLobster/newsletter-site-template\""
