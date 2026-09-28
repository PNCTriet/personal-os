#!/usr/bin/env bash
# Renders every ```mermaid block in docs/*.md with mermaid-cli; fails on any parse error.
# Needs: npm i -g @mermaid-js/mermaid-cli (or MMDC=/path/to/mmdc).
set -euo pipefail
cd "$(dirname "$0")/.."
MMDC="${MMDC:-mmdc}"
OUT="$(mktemp -d)"
echo '{"args":["--no-sandbox"]}' > "$OUT/puppeteer.json"
fail=0
for f in docs/*.md README.md; do
  [ -f "$f" ] && grep -q "\`\`\`mermaid" "$f" || continue
  if "$MMDC" -p "$OUT/puppeteer.json" -i "$f" -o "$OUT/$(basename "$f" .md).md" -q >/dev/null 2>"$OUT/err"; then
    echo "OK   $f ($(ls "$OUT" | grep -c "^$(basename "$f" .md)-.*\.svg$") diagrams)"
  else
    echo "FAIL $f"; cat "$OUT/err"; fail=1
  fi
done
exit $fail
