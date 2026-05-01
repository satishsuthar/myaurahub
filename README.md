# MyAuraHub SaaS Platform

Serverless-first SaaS platform for coaches, consultants, freelancers, clinics, fitness coaches, and personal brands.

## What is included

- React + TypeScript + Tailwind admin/public web app
- AWS Lambda Python serverless API
- Legacy .NET 8 Web API prototype
- PostgreSQL via EF Core
- Workspace/subaccount-scoped serverless data model
- Appointment types
- Weekly availability
- Buffers, minimum notice, maximum booking window
- Public booking links
- Contact create/update on booking
- Contacts, opportunities, automations, sites, marketing, team management
- Docker Compose for local development
- AWS serverless deployment scripts

## Repository layout

```text
apps/admin-web              React app shell and modules
services/core-api           Current deployed Lambda API
services/*-service          Target module service boundaries
packages/*                  Shared UI/client/auth/contract packages
contracts/openapi           API contracts
contracts/events            EventBridge event contracts
docs                        Architecture notes
CoachingSaaS.Api            Original .NET prototype
infra/aws                   Original ECS/RDS infrastructure prototype
serverless/aws              Compatibility wrappers for serverless deploy
```

See [docs/serverless-modular-services.md](docs/serverless-modular-services.md) for the modular serverless strategy.

## Local run with Docker

```powershell
docker compose up --build
```

Then open:

- Frontend: http://localhost:5173
- API health: http://localhost:5000/health
- Swagger: http://localhost:5000/swagger

Seed data:

- Workspace slug: `acme-coaching`
- Public booking slug: `discovery-call`
- Workspace header: `11111111-1111-1111-1111-111111111111`
- User header: `22222222-2222-2222-2222-222222222222`

## AWS deploy status

Current serverless deploy:

```powershell
powershell.exe -ExecutionPolicy Bypass -File services\core-api\deploy.ps1 -AwsRegion ap-southeast-2 -AccountId 604545443541
```

Compatibility wrapper:

```powershell
powershell.exe -ExecutionPolicy Bypass -File serverless\aws\deploy.ps1 -AwsRegion ap-southeast-2 -AccountId 604545443541
```

The original ECS/RDS infrastructure prototype remains in `infra/aws/cloudformation.yml`.
