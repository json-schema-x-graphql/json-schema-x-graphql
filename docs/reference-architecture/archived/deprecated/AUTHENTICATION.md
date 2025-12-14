Manual demo login (quick test)

1. Start the local stack:

```
docker compose up --build -d keycloak oauth2-proxy jsonViewer
```

1. In a browser, initiate the login flow:

```
http://localhost:4180/oauth2/start?rd=http://localhost:8888/
```

1. The request will redirect to the Keycloak login page for the `ttse` realm.
   Use the test user from the realm export:

   - Username: testuser
   - Password: password

1. After successful login you'll be redirected back to `http://localhost:8888/`
   and oauth2-proxy will set its session cookie. You can confirm with curl
   (cookies stored in a cookie jar):

---
# Authentication

Manual demo login (quick test)

1. Start the local stack:

```bash
docker compose up --build -d keycloak oauth2-proxy jsonViewer
```

1. In a browser, initiate the login flow (or paste this URL into your browser):

```bash
http://localhost:4180/oauth2/start?rd=http://localhost:8888/
```

1. The request will redirect to the Keycloak login page for the `ttse` realm.
   Use the test user from the realm export:

   - Username: `testuser`
   - Password: `password`

1. After successful login you'll be redirected back to `http://localhost:8888/`
   and oauth2-proxy will set its session cookie. You can confirm with curl
   (cookies stored in a cookie jar):

```bash
curl -I -b /tmp/cookies.txt http://localhost:8888/
```

## Generating a self-signed certificate for Login.gov (testing only)

For local testing you can generate a self-signed certificate and upload the
base64-encoded DER (x5c) value to Login.gov's Public Certificate field. Use
the script included in the repo which wraps the OpenSSL commands and prints
the x5c string.

Generate a cert and print x5c:

```bash
./scripts/generate-self-signed-cert.sh ./config/keycloak keycloak-ttse
```

The script outputs three files in `./config/keycloak/`:

- `keycloak-ttse.key.pem` (private key) — keep this secure
- `keycloak-ttse.cert.pem` (PEM-encoded cert)
- `keycloak-ttse.cert.der` (DER-encoded cert)

It also prints the base64-encoded DER string (x5c) which you can paste into
Login.gov's Public Certificate field when registering the client.

### Important Login.gov notes about certificates

- Use self-signed certs only for testing/sandbox. For production, request a
  CA-issued certificate.
- The private key must be kept secret and secure. Do not commit it to source
  control. Use cloud.gov CredHub or a similar secret store in production.
- Login.gov does not automatically rotate certificates, and they do not check
  expiration dates. Follow Login.gov's certificate rotation procedure and
  Partner Support Help Desk guidance when rotating or removing certs.

## Local Keycloak + oauth2-proxy (development)

This repository includes an example setup to run a local Keycloak and oauth2-proxy
for development. In production (cloud.gov) we recommend running Keycloak as its
own app (with its own domain) and configuring Login.gov as an external identity
provider.

### Local quickstart

1. Copy example env and adjust secrets:

```bash
cp config/oauth2-proxy.env.example config/oauth2-proxy.env
```

1. Start docker-compose:

```bash
docker-compose up --build
```

1. Visit the app at `http://localhost:8888`. When you hit a protected route you
   will be redirected to oauth2-proxy which initiates OIDC with the local
   Keycloak instance.

## Production on cloud.gov with Login.gov

This section explains how the local docker-compose setup maps to a production deployment on cloud.gov using three apps: Keycloak, oauth2-proxy, and the frontend app. In production we recommend using Login.gov as the identity provider (IdP) and, if you need a realm for internal brokering or client management, running Keycloak as a separate app with its own domain.

### Components and routes

- Keycloak (optional if you use Login.gov directly)
  - App name: `keycloak-ttse`
  - Route: `https://keycloak-ttse.apps.cloud.gov`
- oauth2-proxy (front door for auth)
  - App name: `oauth2-proxy-ttse`
  - Route: `https://oauth2-proxy-ttse.apps.cloud.gov`
- App (this repo)
  - App name: `ttse-forest-app`
  - Route: `https://ttse.apps.cloud.gov`

See manifests in `manifests/` for the above names and routes.

### Deploy the apps

1. Authenticate to cloud.gov and target your org/space.
2. Push Keycloak (if using Keycloak):
   - Configure admin creds via CredHub/vars (don’t hardcode in manifest).
   - Push with `cf push -f manifests/manifest-keycloak.yml`.
   - After first start, configure the realm (e.g., `ttse`) and, if brokering to Login.gov, add a Login.gov IdP in Keycloak.
3. Push oauth2-proxy:
   - Ensure env vars in `manifests/manifest-oauth2-proxy.yml` are set to production values, including:
     - `OAUTH2_PROXY_PROVIDER=oidc`
     - `OAUTH2_PROXY_CLIENT_ID` and `OAUTH2_PROXY_CLIENT_SECRET` (from your IdP)
     - `OAUTH2_PROXY_COOKIE_SECRET` (32-byte base64; rotate via CredHub)
     - `OAUTH2_PROXY_OIDC_ISSUER_URL` (Login.gov or Keycloak issuer)
     - `OAUTH2_PROXY_REDIRECT_URL` (e.g., `https://ttse.apps.cloud.gov/oauth2/callback`)
   - Push with `cf push -f manifests/manifest-oauth2-proxy.yml`.
4. Push the app:
   - Set `OAUTH2_PROXY_URL=https://oauth2-proxy-ttse.apps.cloud.gov` (see `manifests/manifest-app.yml`).
   - Push with `cf push -f manifests/manifest-app.yml`.

### Registering with Login.gov (recommended)

You have two options:

#### Option A: oauth2-proxy -> Login.gov directly (no Keycloak)

- In Login.gov, register a client and configure:
  - Redirect URI: `https://ttse.apps.cloud.gov/oauth2/callback`
  - Client ID (Issuer): a globally unique URN (e.g., `urn:gov:gsa:openidconnect.profiles:sp:sso:agency_name:app_name`)
  - Client secret (or private key JWT if using certificates)
  - Optional: upload a certificate (x5c) if using Private Key JWT
- In `oauth2-proxy` set:
  - `OAUTH2_PROXY_OIDC_ISSUER_URL=https://secure.login.gov` (or the sandbox issuer)
  - `OAUTH2_PROXY_CLIENT_ID` to the URN above
  - `OAUTH2_PROXY_CLIENT_SECRET` or JWT settings

#### Option B: oauth2-proxy -> Keycloak -> Login.gov (federation)

- In Keycloak realm `ttse`, add an Identity Provider of type OIDC pointing to Login.gov.
- In Login.gov, register a client whose redirect URI points to Keycloak’s broker endpoint (e.g., `https://keycloak-ttse.apps.cloud.gov/realms/ttse/broker/logingov/endpoint`).
- In `oauth2-proxy`, point issuer to Keycloak’s realm issuer:
  - `OAUTH2_PROXY_OIDC_ISSUER_URL=https://keycloak-ttse.apps.cloud.gov/realms/ttse`
  - Client ID/secret correspond to the Keycloak client created for oauth2-proxy.

### Mapping local to production

- Issuer URL
  - Local: `http://keycloak:8080/realms/ttse` (internal container network)
  - Production: Login.gov or `https://keycloak-ttse.apps.cloud.gov/realms/ttse`
- Redirect URL
  - Local: `http://localhost:4180/oauth2/callback`
  - Production: `https://ttse.apps.cloud.gov/oauth2/callback`
- Upstream (the protected app)
  - Local: `http://json-viewer:8080/`
  - Production: `https://ttse.apps.cloud.gov/` (usually via nginx or direct)
- Client IDs and secrets
  - Local: sample client ID/secret for testing
  - Production: store in CredHub and reference via `cf set-env` or vars files

### Maintenance and parity

- Keep the realm configuration under source control for reproducibility (e.g., a realm export for Keycloak during development). For production, manage changes via Keycloak admin and maintain a migration process (export snapshots or use Keycloak’s admin CLI in CI to seed updates).
- Mirror oauth2-proxy options:
  - Local flags in `docker-compose.yml` map to `OAUTH2_PROXY_*` env vars in the cloud.gov manifest. Keep both in sync.
  - Always register the exact redirect URIs in the IdP to match your deployment routes.
- Secrets rotation:
  - Rotate `COOKIE_SECRET` and client secrets regularly. Use CredHub on cloud.gov and avoid committing secrets.
- TLS and issuer verification:
  - Local dev may disable issuer checks and TLS; in production ensure `OAUTH2_PROXY_OIDC_ISSUER_URL` is HTTPS and verification is enabled (do not use skip flags in prod).

### Smoke test in production

1. Hit the start URL:
   `https://oauth2-proxy-ttse.apps.cloud.gov/oauth2/start?rd=https://ttse.apps.cloud.gov/`
2. Complete Login.gov login (or Keycloak if brokering) with a test account.
3. You should land at the app’s route and see an `_oauth2_proxy` cookie set for the app domain.

## Additional cloud.gov guidance

- On cloud.gov, create a dedicated Keycloak app if you want to host an
  internal realm. More commonly, you'll run Keycloak (or your chosen OIDC
  provider) as a separate service (or use Login.gov directly as an IdP).

- Configure oauth2-proxy with the cloud.gov app URL and register the redirect
  URLs with your IdP (Login.gov or Keycloak). For Login.gov integration you
  will need to follow Login.gov's Relying Party registration and provide
  redirect URIs for the oauth2-proxy app.

- The nginx config in `nginx.conf` expects an oauth2-proxy endpoint at
  `/oauth2/auth` for `auth_request` checks. On cloud.gov this will be the
  oauth2-proxy app's domain rather than `localhost`.

## Security notes

- Never commit real client secrets or cookie secrets to the repo. Use cloud.gov
  environment variables or a secrets store.

- For production, ensure TLS is enforced and the OIDC issuer is a trusted
  provider (Login.gov or a managed Keycloak instance configured with Login.gov
  as a federated IdP).

## Issuer (client_id) requirement for Login.gov (reference)

Login.gov requires an "Issuer" value that must be sent as the `client_id` in
OIDC authentication requests. This value must be unique (not already used by
another application) and must be passed exactly as registered, otherwise
Login.gov will return a `bad_client_id` error. The recommended format for the
Issuer is a URN scoped to your agency and application.

Example Issuer (OIDC):

```text
urn:gov:gsa:openidconnect.profiles:sp:sso:agency_name:app_name
```

## How to use this with Keycloak + Login.gov (reference)

1. In Keycloak, when you configure the Login.gov Identity Provider, set the
   *Client ID* (or Issuer field shown in some Keycloak plugins) to the exact
   URN you will register with Login.gov.

1. In Login.gov's client registration, use the same URN in the *Client ID /
   Issuer* field. Login.gov expects the public certificate (x5c) for any
   Private Key JWT client authentication; extract the Keycloak realm certs
   (use the endpoint below and copy the first value of the `x5c` array):

```text
https://{KEYCLOAK_HOST}/realms/{realm}/protocol/openid-connect/certs
```

1. When Keycloak initiates an authentication request against Login.gov, it
   will include this Issuer value as the `client_id` parameter. Login.gov will
   validate that it matches the registered client and the uploaded certificate.

## Notes & recommendations (reference)

- Make sure your chosen URN is globally unique within Login.gov's client list.
- Use the Private Key JWT method for stronger security; this requires
  uploading Keycloak's public certificate (x5c) to Login.gov.
- If you prefer not to handle certificates, PKCE is an acceptable alternative
  for public clients, but Private Key JWT is the recommended approach for
  confidential server-to-server client auth.

---

- Never commit real client secrets or cookie secrets to the repo. Use cloud.gov
  environment variables or a secrets store.

- For production, ensure TLS is enforced and the OIDC issuer is a trusted
  provider (Login.gov or a managed Keycloak instance configured with Login.gov
  as a federated IdP).

