# Securing GraphQL Applications with `x-graphql` Extensions

This guide demonstrates how `json-schema-x-graphql` extensions can be used to proactively secure your GraphQL API against common vulnerabilities, such as those demonstrated in the [Damn Vulnerable GraphQL Application (DVGA)](https://github.com/dolevf/Damn-Vulnerable-GraphQL-Application).

By encoding security directly into your single source of truth (the JSON Schema), you ensure that authorization, authentication, and access controls are inherently generated into your GraphQL SDL, reducing the risk of human error and eliminating the need for manual security enforcement on individual endpoints.

## 1. Broken User Authentication & Unauthorized Access

**Vulnerability:** Endpoints or queries that should be private are accidentally exposed to unauthenticated users.

**Solution (`x-graphql-federation-authenticated`):**
Use the `@authenticated` directive equivalent by adding `"x-graphql-federation-authenticated": true` to your schema definitions.

```json
{
  "title": "PrivateProfile",
  "type": "object",
  "x-graphql-federation-authenticated": true,
  "properties": {
    "email": { "type": "string" }
  }
}
```

## 2. Broken Function Level Authorization (RBAC)

**Vulnerability:** A standard user accesses administrative mutations or queries (e.g., `deleteUser`, `makeAdmin`).

**Solution (`x-graphql-federation-requires-scopes`):**
Define the required OAuth or authorization scopes to restrict operations to specific roles.

```json
{
  "title": "AdminDashboard",
  "type": "object",
  "x-graphql-federation-requires-scopes": [
    ["read:admin", "write:admin"]
  ],
  "properties": {
    "auditLogs": { "type": "array", "items": { "type": "string" } }
  }
}
```

## 3. Broken Object Level Authorization (BOLA / IDOR)

**Vulnerability:** A user alters arguments (e.g., `userId=123`) to access or modify data belonging to another user.

**Solution (`x-graphql-federation-policy`):**
Use OpenFGA or similar Fine-Grained Access (FGA) authorization by utilizing the `@policy` directive.

```json
{
  "title": "Document",
  "type": "object",
  "properties": {
    "content": {
      "type": "string",
      "x-graphql-federation-policy": [["viewer_can_read_document"]]
    }
  }
}
```

## 4. Query Depth and Complexity (Denial of Service)

**Vulnerability:** An attacker sends highly nested, complex queries or batches multiple queries to overload the server.

**Solution (`x-graphql-resolver-complexity`):**
Define the complexity of resolving a field directly in the schema so that gateways can reject overly expensive queries before execution.

```json
{
  "title": "ExpensiveReport",
  "type": "object",
  "properties": {
    "generate": {
      "type": "string",
      "x-graphql-resolver-complexity": 100
    }
  }
}
```

## Summary

Mapping security to the JSON Schema ensures a secure-by-default architecture:
1. **Consistency:** Both your JSON API and GraphQL endpoints share identical security contracts.
2. **Federation Ready:** Directives like `@authenticated` and `@policy` are Apollo Federation native and can be evaluated at the Router level.
3. **Auditable:** Security reviewers can parse a single, well-defined JSON schema file to verify RBAC and ABAC without digging through implementation code.
