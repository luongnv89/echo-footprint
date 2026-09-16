# EchoFootPrint auth.md

Agents that call protected EchoFootPrint discovery APIs should authenticate using the OAuth Protected Resource Metadata and Authorization Server documents published on this site.

## Discovery documents

- Protected Resource Metadata (RFC 9728): `/.well-known/oauth-protected-resource`
- Authorization Server metadata (RFC 8414): `/.well-known/oauth-authorization-server`
- JSON Web Key Set: `/.well-known/jwks.json`

Full URLs:

- https://echo-footprint.luongnv.com/.well-known/oauth-protected-resource
- https://echo-footprint.luongnv.com/.well-known/oauth-authorization-server

## Audience

Automated clients that need authenticated access to EchoFootPrint agent discovery endpoints beyond the public marketing pages.

## Supported registration (anonymous)

The authorization server advertises anonymous agent registration for read-only `site.read` scope.

### Register

```http
POST /agent/auth HTTP/1.1
Host: echo-footprint.luongnv.com
Content-Type: application/json

{
  "type": "anonymous"
}
```

Successful registration returns a bearer credential suitable for `Authorization: Bearer` on protected discovery routes. Passive scanners must not probe this endpoint.

### Optional claim

To associate an anonymous credential with a verified contact, POST to the `claim_uri` advertised in Authorization Server metadata (`agent_auth.anonymous.claim_uri`).

## Credential use

Send credentials in the `Authorization` header. Scopes are listed in Protected Resource Metadata (`scopes_supported`).
