#!/usr/bin/env bash
# publish-dns-aid.sh — Publish DNS-AID HTTPS/SVCB records for echo-footprint.luongnv.com
#
# GoDaddy hosts luongnv.com today; use docs/dns-aid.md for the web UI path.
# When the zone uses Cloudflare nameservers, use: publish | dnssec | verify | show
#
# Usage:
#   scripts/publish-dns-aid.sh show
#   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_ID=... scripts/publish-dns-aid.sh publish
#   scripts/publish-dns-aid.sh verify

set -euo pipefail

SITE_HOST="${DNS_AID_SITE_HOST:-echo-footprint.luongnv.com}"
ZONE_NAME="${CLOUDFLARE_ZONE_NAME:-luongnv.com}"
TARGET="${DNS_AID_TARGET:-echo-footprint.luongnv.com.}"
API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"
SCAN_URL="https://echo-footprint.luongnv.com"

RECORD_RDATA='1 echo-footprint.luongnv.com. alpn="h3,h2" port=443 mandatory=alpn,port'
LABELS=(_index._agents _a2a._agents _mcp._agents)

cmd="${1:-show}"

zone_record_name() {
  local label="$1"
  echo "${label}.echo-footprint"
}

show() {
  echo "# DNS-AID records for ${SITE_HOST} (zone ${ZONE_NAME})"
  echo "# See dns/dns-aid-zone-template.txt and docs/dns-aid.md"
  echo
  for label in "${LABELS[@]}"; do
    echo "${label}.${SITE_HOST}. 3600 IN HTTPS ${RECORD_RDATA}"
  done
}

cf_zone_id() {
  if [ -n "$ZONE_ID" ]; then
    echo "$ZONE_ID"
    return
  fi
  if [ -z "$API_TOKEN" ]; then
    return 1
  fi
  curl -fsS -H "Authorization: Bearer $API_TOKEN" \
    "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
    | python3 -c "import json,sys; r=json.load(sys.stdin)['result']; print(r[0]['id'] if r else '')"
}

cf_create_https() {
  local zid="$1"
  local name="$2"
  local existing
  existing=$(curl -fsS -G -H "Authorization: Bearer $API_TOKEN" \
    --data-urlencode "type=HTTPS" \
    --data-urlencode "name=${name}.${ZONE_NAME}" \
    "https://api.cloudflare.com/client/v4/zones/${zid}/dns_records" \
    | python3 -c "import json,sys; r=json.load(sys.stdin).get('result',[]); print(r[0]['id'] if r else '')" 2>/dev/null || true)
  if [ -n "$existing" ]; then
    echo "  ○ HTTPS ${name}.${ZONE_NAME} already exists (${existing})"
    return 0
  fi
  local resp
  resp=$(curl -fsS -X POST \
    "https://api.cloudflare.com/client/v4/zones/${zid}/dns_records" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"HTTPS\",\"name\":\"${name}.${ZONE_NAME}\",\"content\":\"${RECORD_RDATA}\",\"ttl\":3600,\"proxied\":false}")
  echo "$resp" | python3 -c "import json,sys; j=json.load(sys.stdin); assert j['success'], j; print('  ✓ Created HTTPS', j['result']['name'])"
}

publish() {
  if [ -z "$API_TOKEN" ]; then
    echo "✗ CLOUDFLARE_API_TOKEN is required for publish (or use GoDaddy UI — docs/dns-aid.md)" >&2
    exit 1
  fi
  local zid
  zid=$(cf_zone_id) || {
    echo "✗ Could not resolve Cloudflare zone id for ${ZONE_NAME}" >&2
    exit 1
  }
  echo "Publishing DNS-AID HTTPS records in zone ${ZONE_NAME} (${zid})"
  for label in "${LABELS[@]}"; do
    cf_create_https "$zid" "$(zone_record_name "$label")"
  done
  echo "Done. Run: $0 verify"
}

dnssec() {
  if [ -z "$API_TOKEN" ]; then
    echo "✗ CLOUDFLARE_API_TOKEN is required for dnssec" >&2
    exit 1
  fi
  local zid
  zid=$(cf_zone_id)
  curl -fsS -X PATCH \
    "https://api.cloudflare.com/client/v4/zones/${zid}/dnssec" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"status":"active"}' \
    | python3 -c "import json,sys; j=json.load(sys.stdin); assert j['success'], j; print('✓ Cloudflare DNSSEC activation requested; add DS at registrar if luongnv.com NS are external')"
}

verify() {
  local root
  root="$(cd "$(dirname "$0")/.." && pwd)"
  bash "${root}/scripts/verify-dns-aid.sh" "$SITE_HOST" || true
  echo
  echo "Agent-readiness scan for ${SCAN_URL} ..."
  python3 - <<'PY'
import json, sys, urllib.request

url = "https://isitagentready.com/api/scan"
body = json.dumps({"url": "https://echo-footprint.luongnv.com"}).encode()
req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req, timeout=120) as resp:
    data = json.load(resp)
aid = data.get("checks", {}).get("discoverability", {}).get("dnsAid", {})
print("dnsAid.status:", aid.get("status"))
print("dnssecValidated:", aid.get("details", {}).get("dnssecValidated"))
print("serviceRecordCount:", aid.get("details", {}).get("serviceRecordCount"))
if aid.get("status") != "pass":
    sys.exit(1)
PY
}

case "$cmd" in
  show) show ;;
  publish) publish ;;
  dnssec) dnssec ;;
  verify) verify ;;
  *)
    echo "Usage: $0 {show|publish|dnssec|verify}" >&2
    exit 1
    ;;
esac
