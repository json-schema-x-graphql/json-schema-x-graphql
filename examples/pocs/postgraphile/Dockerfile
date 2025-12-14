FROM graphile/postgraphile:latest

# Install graphile-utils so our plugin can use makeExtendSchemaPlugin.
# Install into both the app root and into /srv/plugins so a mounted
# plugin loaded from /srv/plugins can resolve the dependency.
RUN npm install --no-save graphile-utils@^4.2.0 || true
RUN npm install --no-save --prefix /srv/plugins graphile-utils@^4.2.0 || true
RUN npm install --no-save postgraphile@^4.14.1 || true
RUN npm install --no-save graphql-tag@^2.12.6 || true
# Ensure `postgraphile` and runtime helpers are available to code under /postgraphile
# so programmatic require() and CLI invocation via require.resolve work from server.js.
RUN npm install --no-save --prefix /postgraphile postgraphile@^4.14.1 node-fetch@^2.6.9 graphql-tag@^2.12.6 || true

# Add our server wrapper into the image so the entrypoint can run it.
COPY server.js /postgraphile/server.js
