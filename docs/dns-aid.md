# DNS-AID records for echo-footprint.luongnv.com

Issue: [#83](https://github.com/luongnv89/echo-footprint/issues/83) — publish DNS for AI Discovery (DNS-AID) SVCB/HTTPS records so agents can discover this site via DNS, with DNSSEC validation enabled.

Reference: [isitagentready.com DNS-AID guide](https://isitagentready.com/.well-known/agent-skills/dns-aid/SKILL.md) and [`dns/dns-aid-zone-template.txt`](../dns/dns-aid-zone-template.txt).

**Publishing is operator DNS work.** The `luongnv.com` zone is hosted on GoDaddy (`ns01.domaincontrol.com`, `ns02.domaincontrol.com`). Merging this repository does not create public DNS records.

## Records to add

Add these in **GoDaddy → Domain Portfolio → luongnv.com → DNS → Add record**. Use the **host** column as the name field (GoDaddy appends `.luongnv.com`).

| Host | Type | Value (ServiceMode) |
|------|------|---------------------|
| `_index._agents.echo-footprint` | `SVCB` (preferred on GoDaddy) | `1 echo-footprint.luongnv.com. alpn=h2 port=443` |
| `_a2a._agents.echo-footprint` | `SVCB` | `1 echo-footprint.luongnv.com. alpn=h2 port=443` |
| `_mcp._agents.echo-footprint` | `SVCB` | `1 echo-footprint.luongnv.com. alpn=h2 port=443` |

GoDaddy’s v3 API accepts `parameters`: `alpn=h2 port=443` on `SVCB` records. Avoid comma-separated ALPN lists (`h3,h2`) — the registrar currently encodes them so resolvers treat `port` as another ALPN token.

The landing site is a static brochure (GitHub Pages + optional Cloudflare Worker). Records advertise HTTPS on the canonical hostname; there is no separate A2A or MCP transport endpoint.

If the GoDaddy UI does not offer `HTTPS`/`SVCB`, use GoDaddy Managed DNS full-service mode (see [GoDaddy SVCB/HTTPS announcement](https://www.godaddy.com/resources/news/beyond-cname-flattening)) or migrate `luongnv.com` DNS to Cloudflare and run `scripts/publish-dns-aid.sh publish`.

## Enable DNSSEC

The agent-readiness scanner expects validating resolvers to see authenticated answers (`dnssecValidated: true`).

1. GoDaddy → `luongnv.com` → **DNS** → **DNSSEC** → enable signing.
2. Confirm: `dig +dnssec _index._agents.echo-footprint.luongnv.com HTTPS` returns `RRSIG`, and `dig +short DS luongnv.com` returns DS data.

## Verify

```sh
scripts/verify-dns-aid.sh
scripts/publish-dns-aid-godaddy.sh publish   # when gddy is authenticated
scripts/publish-dns-aid.sh verify            # includes isitagentready.com API scan
```

Expect `checks.discoverability.dnsAid.status` === `"pass"` for `https://echo-footprint.luongnv.com`.

## Cloudflare alternative

When `luongnv.com` uses Cloudflare nameservers, set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID`, then:

```sh
scripts/publish-dns-aid.sh publish
scripts/publish-dns-aid.sh dnssec   # enable signing in Cloudflare; add DS at registrar if needed
scripts/publish-dns-aid.sh verify
```
