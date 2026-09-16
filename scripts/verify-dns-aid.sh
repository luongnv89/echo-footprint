#!/usr/bin/env bash
# Verify DNS-AID records for echo-footprint.luongnv.com (issue #83).
set -u

DOMAIN="${1:-echo-footprint.luongnv.com}"
NAMES="_index._agents _a2a._agents _mcp._agents"
TYPES="64 65"

found=0

query() {
  fqdn="$1"
  rrtype="$2"
  if command -v dig >/dev/null 2>&1; then
    dig +short +time=5 +tries=1 -t "TYPE$rrtype" "$fqdn" 2>/dev/null
  else
    echo "dig required for DNS-AID verification" >&2
    return 2
  fi
}

echo "DNS-AID check for $DOMAIN"
echo "=================================="
for n in $NAMES; do
  for t in $TYPES; do
    tname="SVCB"
    [ "$t" = "65" ] && tname="HTTPS"
    out=$(query "$n.$DOMAIN" "$t")
    if [ -n "$out" ]; then
      found=1
      echo "FOUND $n.$DOMAIN $tname:"
      echo "$out" | sed 's/^/    /'
    else
      echo "MISSING $n.$DOMAIN $tname"
    fi
  done
done

echo "=================================="
if command -v dig >/dev/null 2>&1; then
  if dig +dnssec +time=5 +tries=1 "_index._agents.$DOMAIN" TYPE65 2>/dev/null | grep -q 'RRSIG'; then
    echo "DNSSEC: answer is signed (RRSIG present)"
  else
    echo "DNSSEC: no RRSIG on _index._agents answer (zone may be unsigned)"
  fi
  parent="${DOMAIN#*.}"
  ds=$(dig +short +time=5 +tries=1 DS "$parent" 2>/dev/null)
  if [ -n "$ds" ]; then
    echo "DS at $parent: $ds"
  else
    echo "DS: none found at $parent"
  fi
fi

if [ "$found" -eq 1 ]; then
  echo "RESULT: DNS-AID records present"
  exit 0
fi
echo "RESULT: no DNS-AID records found — see docs/dns-aid.md"
exit 1
