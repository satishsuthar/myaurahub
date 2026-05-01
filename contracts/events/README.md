# Event Contracts

EventBridge events will use this envelope:

```json
{
  "source": "scheduling-service",
  "detailType": "appointment.booked",
  "detail": {
    "eventId": "uuid",
    "workspaceId": "workspace",
    "subAccountId": "subaccount",
    "occurredAtUtc": "2026-05-02T00:00:00Z",
    "data": {}
  }
}
```

Initial event names:

- `appointment.booked`
- `appointment.cancelled`
- `availability.changed`
- `contact.created`
- `contact.updated`
- `contact.tag_added`
- `opportunity.created`
- `opportunity.moved`
- `site.page_published`
- `marketing.campaign_scheduled`
- `automation.started`
- `automation.completed`
- `external.webhook_received`
