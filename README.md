# Coaching SaaS Calendar Module

First module of a multi-tenant SaaS platform for appointment scheduling.

## What is included

- .NET 8 Web API
- React + TypeScript + Tailwind frontend
- PostgreSQL via EF Core
- Workspace-scoped data model
- Appointment types
- Weekly availability
- Buffers, minimum notice, maximum booking window
- Public booking links
- Contact create/update on booking
- Conflict prevention with serializable booking transaction
- Docker Compose for local development
- AWS CloudFormation starter for ECS Fargate + RDS

## Local run

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

The deployable infrastructure is in `infra/aws/cloudformation.yml`. To deploy to your AWS account, you need to provide AWS credentials or run the AWS CLI locally with an IAM principal that has the permissions listed in `infra/aws/IAM_PERMISSIONS.md`.
