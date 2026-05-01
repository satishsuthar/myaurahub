# Serverless Modular Services Strategy

This repository is moving from one growing application into a serverless modular monorepo.

The goal is not to create noisy microservices immediately. The goal is to give every module a clear ownership boundary, a smaller deployable surface, and a stable contract while keeping the product experience unified.

## Current Layout

```text
apps/
  admin-web/              React admin shell and public booking/site shell

services/
  core-api/               Current deployed Lambda API while modules are extracted
  identity-service/       Target home for auth, users, roles, subaccounts
  scheduling-service/     Target home for calendars, availability, bookings
  contacts-service/       Target home for contacts, custom fields, tasks, activity
  opportunities-service/  Target home for pipelines and opportunities
  automation-service/     Target home for workflow builder/execution
  sites-service/          Target home for websites, pages, publishing
  marketing-service/      Target home for campaigns, accounts, tracking
  notification-service/   Target home for email, SMS, WhatsApp, webhooks

packages/
  ui/                     Shared UI primitives and theme system
  api-client/             Generated typed API clients
  contracts/              Shared schemas and event names
  auth/                   Shared auth/context helpers

contracts/
  openapi/                Service OpenAPI documents
  events/                 EventBridge event schemas
```

## Runtime Model

Users see one application:

```text
https://app.myaurahub.com
```

The browser talks to one API domain:

```text
https://api.myaurahub.com
```

API Gateway routes requests to service Lambdas:

```text
/api/auth/*              -> identity-service
/api/workspace/*         -> identity-service
/api/calendar/*          -> scheduling-service
/api/contacts/*          -> contacts-service
/api/opportunities/*     -> opportunities-service
/api/automations/*       -> automation-service
/api/sites/*             -> sites-service
/api/marketing/*         -> marketing-service
```

During the migration, `services/core-api` serves those routes. Each module is extracted out of core only when its contract is clear.

## Frontend Consistency

The admin frontend remains one shell:

- left navigation
- top bar
- active workspace/subaccount switcher
- auth/session handling
- theme provider
- shared layout, tables, forms, modals, panels

Modules must use shared UI from `packages/ui` as it grows. This keeps the visual product consistent even when backend modules are independently deployed.

## Request Context

Every module request carries:

```http
Authorization: Bearer <token>
X-Workspace-Id: <workspace>
X-Sub-Account-Id: <subaccount>
X-Request-Id: <request id>
```

Each service is responsible for validating workspace access, subaccount access, and module permissions.

## Data Strategy

Use one DynamoDB table initially, with service-owned item prefixes:

```text
PK = WS#{workspaceSlug}
PK = WS#{workspaceSlug}#SUBACCOUNT#{subAccountId}

SK = APPT#{slug}
SK = BOOKING#{bookingId}
SK = CONTACT#{email}
SK = PIPELINE#{pipelineId}
SK = OPP#{opportunityId}
SK = AUTOMATION#{automationId}
SK = SITEPAGE#{pageId}
SK = MKTCAMPAIGN#{campaignId}
```

This keeps the free/serverless posture while preserving a path to separate databases later.

## Events And Orchestration

Synchronous APIs handle user actions and reads. Side effects flow through EventBridge.

Example:

```text
scheduling-service creates booking
  -> emits appointment.booked
contacts-service upserts contact/activity
automation-service starts matching workflows
notification-service sends confirmations/reminders
opportunities-service creates/moves deals when automation requests it
```

Long-running workflows use Step Functions:

```text
Trigger -> Action -> Action -> Wait -> Action -> Wait -> Action
```

## Deployment Strategy

Each service owns its deployment script/template:

```text
services/{service-name}/deploy.ps1
```

Today:

```powershell
powershell.exe -ExecutionPolicy Bypass -File services\core-api\deploy.ps1
```

Compatibility wrapper:

```powershell
powershell.exe -ExecutionPolicy Bypass -File serverless\aws\deploy.ps1
```

Future:

```powershell
services\scheduling-service\deploy.ps1
services\contacts-service\deploy.ps1
apps\admin-web\deploy.ps1
```

Every AWS resource should be tagged:

```text
Project=calbook
App=calbook
Service=<service-name>
```

## Extraction Order

1. Identity: auth, users, roles, subaccounts, permissions.
2. Scheduling: appointment types, availability, bookings, public booking pages.
3. Contacts: profiles, custom fields, tasks, activity.
4. Opportunities: pipelines, stages, opportunities.
5. Sites: pages, themes, publishing.
6. Marketing: accounts, campaigns, tracking.
7. Automations and notifications: events, workflows, reminders, external APIs.

Each extraction must preserve existing API behavior before adding new behavior.
