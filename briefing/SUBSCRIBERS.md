# Kell Briefing - Subscriber Management

## API Endpoint
`https://email-api.kell.cx`

## Authentication
Header: `X-Auth-Token: kell-email-api-secret-2026`

## Endpoints

### Stats
```
GET /stats
```
Returns subscriber counts.

### List Subscribers
```
GET /subscribers
```
Returns all subscribers (active and unsubscribed).

### Add Subscriber
```
POST /subscribers
Content-Type: application/json

{
  "email": "user@example.com",
  "domain": "example.com",        // optional, auto-extracted
  "competitors": ["cursor"],       // optional
  "source": "kell.cx form"        // optional
}
```

### Get Subscriber
```
GET /subscribers/:id
```

### Update Subscriber
```
PUT /subscribers/:id
Content-Type: application/json

{
  "status": "active",              // or "unsubscribed"
  "competitors": ["cursor", "copilot"]
}
```

### Unsubscribe
```
DELETE /subscribers/:id
```
Soft delete - sets status to "unsubscribed".

## Scripts

### Process Signups
```bash
node ~/clawd/projects/briefing/scripts/process-signups.js
```
Reads FormSubmit emails from hi@kell.cx inbox and adds new subscribers.

### Send Briefings
```bash
node ~/clawd/projects/briefing/scripts/send-briefings.js --test --dry-run
```
Sends briefings to all active subscribers.

## Current Stats

{
  "subscribers": {
    "total": 3,
    "active": 3,
    "unsubscribed": 0
  },
  "lastUpdated": "2026-02-11T09:53:19.690Z"
}

## Current Subscribers
```
"hello@mitchellbryson.com (active) - null"
"mitchelljbryson@gmail.com (active) - null"
"activation-test@example.com (active) - null"
```
