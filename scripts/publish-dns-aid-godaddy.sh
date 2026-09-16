#!/usr/bin/env bash
# Publish DNS-AID SVCB records for echo-footprint.luongnv.com via GoDaddy v3 API (gddy).
# Requires: gddy authenticated with domains.dns:update (gddy auth login).
#
# GoDaddy encodes comma-separated ALPN lists incorrectly in SVCB wire format; use a
# single ALPN (h2) until the registrar fixes multi-value alpn= parameters.
#
# Usage:
#   scripts/publish-dns-aid-godaddy.sh publish
#   scripts/publish-dns-aid-godaddy.sh verify

set -euo pipefail

ZONE="${GODADDY_ZONE:-luongnv.com}"
TARGET="${DNS_AID_TARGET:-echo-footprint.luongnv.com.}"
LABELS=(_index._agents.echo-footprint _a2a._agents.echo-footprint _mcp._agents.echo-footprint)
# Single ALPN avoids GoDaddy merging port into the alpn SvcParam list.
PARAMS='alpn=h2 port=443'

cmd="${1:-publish}"

require_gddy() {
  command -v gddy >/dev/null 2>&1 || {
    echo "✗ gddy CLI required — https://developer.godaddy.com/" >&2
    exit 1
  }
}

delete_svcb() {
  local name="$1"
  local items
  items=$(gddy api call "/v3/domains/zones/${ZONE}/dns-records" \
    --param "name=${name}" --param "type=SVCB" 2>/dev/null \
    | python3 -c "import json,sys; print(' '.join(i['recordId'] for i in json.load(sys.stdin)['data']['data'].get('items',[])))" || true)
  for rid in $items; do
    [ -n "$rid" ] && gddy api call -X DELETE "/v3/domains/zones/${ZONE}/dns-records/${rid}" >/dev/null
  done
}

publish() {
  require_gddy
  for name in "${LABELS[@]}"; do
    echo "Publishing SVCB ${name}.${ZONE} ..."
    delete_svcb "$name"
    gddy api call -X POST "/v3/domains/zones/${ZONE}/dns-records" \
      -d "{\"type\":\"SVCB\",\"name\":\"${name}\",\"priority\":1,\"data\":\"${TARGET}\",\"parameters\":\"${PARAMS}\",\"ttl\":3600}" \
      | python3 -c "import json,sys; j=json.load(sys.stdin); assert j['data']['status']==201, j; print('  ✓', j['data']['data']['name'])"
  done
  echo ""
  echo "Enable DNSSEC: GoDaddy → ${ZONE} → DNS → DNSSEC → Turn On (required for isitagentready pass)."
  echo "Then: scripts/publish-dns-aid.sh verify"
}

verify() {
  exec "$(dirname "$0")/publish-dns-aid.sh" verify
}

case "$cmd" in
  publish) publish ;;
  verify) verify ;;
  *)
    echo "Usage: $0 {publish|verify}" >&2
    exit 1
    ;;
esac
