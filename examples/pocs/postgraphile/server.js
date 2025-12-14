const express = require('express');
const { spawn } = require('child_process');
const http = require('http');

const app = express();
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@db:5432/localdb';
const SCHEMAS = process.env.POSTGRAPHILE_SCHEMAS || 'public,unified_model';
const CHILD_PORT = 5001; // postgraphile child will listen here
const PORT = process.env.PORT || 5000; // external port serving graphiql

// Start postgraphile CLI as a child process on CHILD_PORT
const pgArgs = [
  '-c', DATABASE_URL,
  '--schema', SCHEMAS,
  '--host', '127.0.0.1',
  `--port=${CHILD_PORT}`,
  '--watch',
  '--enhance-graphiql',
  '--graphiql',
  '--show-error-stack',
  '--append-plugins',
  '/postgraphile/plugins/extend-supergraph-plugin.js',
];

console.log('[server] starting postgraphile (programmatic) with args', pgArgs.join(' '));
let child = null;
let childServer = null;
try {
  // Try programmatic PostGraphile middleware (works when `postgraphile` package is installed).
  const { postgraphile } = require('postgraphile');
  const pluginPath = '/postgraphile/plugins/extend-supergraph-plugin.js';
  let appendPlugins = [];
  try {
    // require the plugin module if present
    const p = require(pluginPath);
    appendPlugins = [p];
  } catch (e) {
    console.warn('[server] could not require plugin at', pluginPath, e && e.message);
  }

  const middleware = postgraphile(DATABASE_URL, SCHEMAS.split(','), {
    watch: true,
    enhanceGraphiql: true,
    graphiql: true,
    showErrorStack: true,
    appendPlugins,
  });

  const childApp = express();
  childApp.use(middleware);
  childServer = childApp.listen(CHILD_PORT, () => console.log(`[postgraphile] programmatic server listening on ${CHILD_PORT}`));
} catch (err) {
  console.warn('[server] programmatic postgraphile failed, falling back to spawning CLI:', err && err.message);
  try {
    const cliPath = require.resolve('postgraphile/cli.js');
    child = spawn(process.execPath, [cliPath, ...pgArgs], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    child = spawn('postgraphile', pgArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  }
  child.stdout.on('data', d => process.stdout.write(`[postgraphile] ${d}`));
  child.stderr.on('data', d => process.stderr.write(`[postgraphile] ${d}`));
  child.on('exit', (code, sig) => console.log(`[server] postgraphile CLI exited ${code} ${sig}`));
}

// Serve a simple GraphiQL HTML page at /graphiql
const graphiqlHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>GraphiQL</title>
    <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
    <style>body { height: 100vh; margin: 0; }</style>
  </head>
  <body>
    <div id="graphiql" style="height:100vh;"></div>
    <script crossorigin src="https://unpkg.com/react@17/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/graphiql/graphiql.min.js"></script>
    <script>
      const fetcher = GraphiQL.createFetcher({ url: '/graphql' });
      ReactDOM.render(
        React.createElement(GraphiQL, { fetcher }),
        document.getElementById('graphiql')
      );
    </script>
  </body>
</html>`;

app.get('/graphiql', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(graphiqlHtml);
});

// Proxy POST /graphql to the child postgraphile instance at CHILD_PORT
app.post('/graphql', express.json(), (req, res) => {
  const body = JSON.stringify(req.body || {});
  const options = {
    hostname: '127.0.0.1',
    port: CHILD_PORT,
    path: '/graphql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };
  const prox = http.request(options, proxRes => {
    let data = '';
    proxRes.setEncoding('utf8');
    proxRes.on('data', chunk => (data += chunk));
    proxRes.on('end', () => {
      res.status(proxRes.statusCode || 200);
      for (const h in proxRes.headers) {
        if (h.toLowerCase() === 'content-length') continue;
        res.setHeader(h, proxRes.headers[h]);
      }
      res.send(data);
    });
  });
  prox.on('error', (e) => {
    console.error('[server] proxy error', e && e.message);
    res.status(502).json({ error: 'bad gateway', detail: e && e.message });
  });
  prox.write(body);
  prox.end();
});

// For OPTIONS preflight and other requests, forward to child when reasonable
app.options('/graphql', (req, res) => res.sendStatus(204));

app.listen(PORT, () => console.log(`[server] GraphiQL server listening on ${PORT}, proxying GraphQL to ${CHILD_PORT}`));

process.on('SIGINT', () => {
  child.kill('SIGINT');
  process.exit(0);
});
