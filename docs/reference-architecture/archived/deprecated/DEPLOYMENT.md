# Cloud.gov Deployment Guide

This guide explains how to deploy the Enterprise Schema Unification Forest application to cloud.gov.

## Prerequisites

1. **Cloud.gov Account**: Ensure you have access to cloud.gov
2. **CF CLI**: Install the Cloud Foundry CLI
3. **Authentication**: Log in to cloud.gov

```bash
# Login to cloud.gov
cf login -a api.fr.cloud.gov --sso
```

## Deployment Steps

### 1. Prepare for Deployment

Ensure your application is ready:

```bash
# Install dependencies
pnpm install

# Test the build locally (optional)
pnpm build
```

### 2. Deploy to Cloud.gov

```bash
# Deploy using the manifest
cf push

# Or deploy with a specific manifest file
cf push -f manifest.yml
```

### 2b. Auth stack deployment checklist (Keycloak + oauth2-proxy)

Use this checklist when deploying the authentication components alongside the app.

1. Prepare CredHub secrets (recommended)

```bash
# Log in to CredHub (via UAA SSO token)
credhub api https://credhub.fr.cloud.gov
cf oauth-token | credhub login --uaa-token -

# Create or rotate secrets (names are examples; adjust per org/space naming)
credhub set -n /concourse/ttse/oauth2-proxy/client_id -t value -v "urn:gov:gsa:openidconnect.profiles:sp:sso:agency_name:app_name"
credhub set -n /concourse/ttse/oauth2-proxy/client_secret -t value -v "REDACTED"
credhub set -n /concourse/ttse/oauth2-proxy/cookie_secret -t value -v "base64-32-byte-secret"

# (Optional) Keycloak admin creds
credhub set -n /concourse/ttse/keycloak/admin_user -t value -v "admin"
credhub set -n /concourse/ttse/keycloak/admin_password -t value -v "REDACTED"
```

1. Bind secrets to apps as env vars (example using cf set-env)

```bash
# Resolve values from CredHub
OIDC_CLIENT_ID=$(credhub get -n /concourse/ttse/oauth2-proxy/client_id -k value)
OIDC_CLIENT_SECRET=$(credhub get -n /concourse/ttse/oauth2-proxy/client_secret -k value)
COOKIE_SECRET=$(credhub get -n /concourse/ttse/oauth2-proxy/cookie_secret -k value)

# Set on oauth2-proxy app
cf set-env oauth2-proxy-ttse OAUTH2_PROXY_CLIENT_ID "$OIDC_CLIENT_ID"
cf set-env oauth2-proxy-ttse OAUTH2_PROXY_CLIENT_SECRET "$OIDC_CLIENT_SECRET"
cf set-env oauth2-proxy-ttse OAUTH2_PROXY_COOKIE_SECRET "$COOKIE_SECRET"

# (Optional) Keycloak admin user/pass
KEYCLOAK_ADMIN_USER=$(credhub get -n /concourse/ttse/keycloak/admin_user -k value)
KEYCLOAK_ADMIN_PASS=$(credhub get -n /concourse/ttse/keycloak/admin_password -k value)
cf set-env keycloak-ttse KEYCLOAK_ADMIN "$KEYCLOAK_ADMIN_USER"
cf set-env keycloak-ttse KEYCLOAK_ADMIN_PASSWORD "$KEYCLOAK_ADMIN_PASS"
```

1. Push auth apps

```bash
cf push -f manifests/manifest-keycloak.yml
cf push -f manifests/manifest-oauth2-proxy.yml
```

1. Configure IdP and redirect URIs

- If using Login.gov directly with oauth2-proxy, register:
  - Redirect URI: <https://ttse.apps.cloud.gov/oauth2/callback>
  - Client ID (Issuer) and secret per your Login.gov registration
- If brokering through Keycloak, configure the Login.gov IdP in Keycloak and set
  - oauth2-proxy issuer to the Keycloak realm: <https://keycloak-ttse.apps.cloud.gov/realms/ttse>

1. Push the app and wire the auth URL

```bash
cf set-env ttse-forest-app OAUTH2_PROXY_URL https://oauth2-proxy-ttse.apps.cloud.gov
cf push -f manifests/manifest-app.yml
```

1. Smoke test

```bash
open "https://oauth2-proxy-ttse.apps.cloud.gov/oauth2/start?rd=https://ttse.apps.cloud.gov/"
```

### 3. Check Deployment Status

```bash
# Check application status
cf apps

# View application logs
cf logs ttse-schema-unification-project --recent

# Follow live logs
cf logs ttse-schema-unification-project
```

## Configuration

### Environment Variables

The application uses the following environment variables:

- `NODE_ENV=production`
- `NODE_VERSION=18`
- `NODE_OPTIONS=--max-old-space-size=4096`

Auth-related (cloud.gov examples):

- `OAUTH2_PROXY_PROVIDER=oidc`
- `OAUTH2_PROXY_OIDC_ISSUER_URL=https://keycloak-ttse.apps.cloud.gov/realms/ttse` (or Login.gov issuer)
- `OAUTH2_PROXY_REDIRECT_URL=https://ttse.apps.cloud.gov/oauth2/callback`
- `OAUTH2_PROXY_CLIENT_ID` (from CredHub)
- `OAUTH2_PROXY_CLIENT_SECRET` (from CredHub)
- `OAUTH2_PROXY_COOKIE_SECRET` (from CredHub)

### Resource Allocation

- **Memory**: 1GB
- **Disk**: 2GB
- **Instances**: 2 (for high availability)

### Buildpack

- **nodejs_buildpack**: Automatically detects and builds Node.js applications
- **Node.js Version**: 18 (specified via NODE_VERSION environment variable)

## Troubleshooting

### Common Issues

1. **Build Failures**

   ```bash
   # Check build logs
   cf logs ttse-schema-unification-project --recent | grep -i error
   ```

2. **Memory Issues**
   - Increase memory allocation in `manifest.yml`
   - Adjust `NODE_OPTIONS` for heap size

3. **Timeout Issues**
   - Increase `timeout` value in manifest
   - Check application startup time

### Useful Commands

```bash
# Restart application
cf restart ttse-schema-unification-project

# Scale application
cf scale ttse-schema-unification-project -i 3

# Update environment variables
cf set-env ttse-schema-unification-project NODE_ENV production
cf restage ttse-schema-unification-project

# View application info
cf app ttse-schema-unification-project

# SSH into application container
cf ssh ttse-schema-unification-project
```

## Security Considerations

- Application runs on cflinuxfs4 stack
- Uses HTTPS by default on cloud.gov
- No external services configured (can be added as needed)

## Monitoring

- Health checks: HTTP endpoint on `/`
- Logs: Available via `cf logs` command
- Metrics: Available in cloud.gov dashboard

## Updates and Maintenance

To update the application:

1. Make changes to your code
2. Test locally
3. Deploy: `cf push`
4. Verify deployment: `cf apps`

## Additional Resources

- [Cloud.gov Documentation](https://cloud.gov/docs/)
- [Cloud Foundry CLI Reference](https://cli.cloudfoundry.org/)
- [Node.js Buildpack Documentation](https://docs.cloudfoundry.org/buildpacks/node/)
