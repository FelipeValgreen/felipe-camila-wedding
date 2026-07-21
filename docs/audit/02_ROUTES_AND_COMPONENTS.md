# 02 — Routes and Components

Status: **Pending Antigravity audit**

## Route inventory

Verify all public, internal and legacy routes, including at minimum:

- `/`
- `/invitacion?t=TOKEN` or current equivalent
- `/fotos`
- `/galeria`
- `/civil`
- `/admin`
- redirects, rewrites and static files

| Route | Purpose | Entry file | Data source | Authentication | Current status | Risk |
|---|---|---|---|---|---|---|
| Pending | Pending | Pending | Pending | Pending | Pending | Pending |

## Component / section inventory

Document every major section or component, including:

- opening interaction;
- navigation;
- ceremony and venue information;
- history and civil archive;
- RSVP;
- WhatsApp CTA;
- gallery and uploads;
- music;
- trivia;
- playlist / song requests;
- footer and metadata.

For each item identify:

- owning file;
- dependencies;
- mobile behavior;
- data writes;
- whether it is essential to the primary invitation journey;
- retain, relocate, refactor or remove recommendation.

## Experience conflict check

Flag components that dilute the core journey:

```text
Invitation -> event information -> individual RSVP -> WhatsApp concierge
```
