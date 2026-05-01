# OpenAPI Contracts

Each service owns an OpenAPI document:

```text
identity.openapi.yaml
scheduling.openapi.yaml
contacts.openapi.yaml
opportunities.openapi.yaml
automation.openapi.yaml
sites.openapi.yaml
marketing.openapi.yaml
```

These contracts will generate:

- Swagger/API documentation
- typed TypeScript clients in `packages/api-client`
- service integration tests
