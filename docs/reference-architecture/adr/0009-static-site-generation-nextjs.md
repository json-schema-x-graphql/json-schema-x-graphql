# ADR 0009: Static Site Generation with Next.js

**Status:** Accepted  
**Date:** 2024-12-01  
**Authors:** Development Team  
**Supersedes:** None

## Context

The Schema Unification Forest project provides interactive JSON Schema and GraphQL SDL viewers for stakeholders (developers, data analysts, product managers, executives). The application must serve schema documentation, interactive editors, and data visualization without requiring a persistent Node.js server. The deployment target is cloud.gov, which charges by instance uptime and memory usage.

### Current State

The project uses Next.js 14 with static site generation (SSG):

**next.config.js:**

```javascript
const config = {
  output: "export", // Static HTML export
  reactStrictMode: false,
  productionBrowserSourceMaps: true,
};
```

**Build Output:**

```bash
$ pnpm run build
# Generates static files in out/ directory
out/
├── index.html
├── _next/
│   ├── static/
│   │   ├── chunks/
│   │   └── css/
├── docs/
│   └── [dynamic documentation pages]
├── graphql-editor/
└── [other static pages]
```

**Deployment:**

- Static files served via nginx (see ADR 0007)
- No Node.js runtime needed in production
- Docker image: 200MB (vs 1.75GB with Node.js)

### Why Static Site Generation?

**Cost Optimization:**

- No persistent Node.js process (saves memory)
- nginx serves static files (50-100MB RAM vs 200-500MB for Node.js)
- Cloud.gov charges by instance memory (4GB/instance → fewer instances needed)

**Performance:**

- Static HTML served instantly (no server-side rendering delay)
- CDN-friendly (all assets pre-built, immutable URLs)
- nginx gzip compression reduces bandwidth (60-80% smaller payloads)

**Security:**

- No Node.js attack surface in production
- Static files cannot execute code
- nginx unprivileged user (non-root)

**Simplicity:**

- No database or API server required
- No session management or authentication state
- No server-side data fetching (all data in static JSON)

### Business Requirements

1. **Schema Documentation Viewers:** Interactive JSON Schema and GraphQL SDL browsers
2. **GraphQL Editor:** Embedded GraphQL Playground for schema exploration
3. **Markdown Documentation:** Static docs pages from `docs/*.md` files
4. **Data Visualization:** Mermaid diagrams, comparison sliders, JSON tree views
5. **Fast Load Times:** First Contentful Paint <2 seconds
6. **Cloud.gov Deployment:** Must work with Cloud Foundry static buildpack or Docker
7. **Cost Efficiency:** Minimize instance count and memory usage

### Technical Constraints

- **Next.js 14:** Framework supports static export via `output: "export"`
- **React 18:** Client-side hydration for interactive components
- **Heavy Client Libraries:** Monaco Editor (~10MB), GraphQL Editor (~5MB), Mermaid (~3MB)
- **Dynamic Documentation:** `docs/` markdown files converted to static pages at build time
- **SPA Routing:** Client-side routing for `/docs/[...slug]` pages
- **No Server Routes:** `output: "export"` disables API routes, middleware, and SSR

### Next.js Static Export Limitations

**Disabled Features:**

- ❌ API Routes (`pages/api/*`)
- ❌ Server-Side Rendering (SSR)
- ❌ Incremental Static Regeneration (ISR)
- ❌ Middleware
- ❌ Image Optimization (Next.js Image component with external loader only)
- ❌ Server Components (React Server Components)

**Workarounds:**

- API Routes → Static JSON files + client-side fetch
- SSR → Static generation at build time
- Image Optimization → External CDN or pre-optimized images
- Server Components → Client components with `"use client"`

## Decision

**We adopt Next.js static site generation (SSG) as the deployment model for all schema documentation and tooling.**

### Implementation Architecture

#### 1. Pages Architecture

**Static Pages (Generated at Build Time):**

```
src/pages/
├── index.tsx                    # Homepage
├── _app.tsx                     # Global app wrapper
├── _document.tsx                # HTML document template
├── docs/
│   └── [...slug].tsx            # Dynamic documentation routes
├── schema-viewer.tsx            # JSON Schema viewer
├── graphql-viewer.tsx           # GraphQL SDL viewer
└── comparison.tsx               # Schema comparison tool
```

**Build Process:**

1. Next.js discovers all pages in `src/pages/`
2. Runs `getStaticPaths()` for dynamic routes (e.g., `/docs/[...slug]`)
3. Runs `getStaticProps()` for each path to fetch data
4. Generates HTML files in `out/` directory
5. Outputs `out/index.html`, `out/docs/schema-architecture.html`, etc.

#### 2. Dynamic Documentation Pages

**Implementation (`src/pages/docs/[...slug].tsx`):**

```typescript
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export async function getStaticPaths() {
  const docsDir = path.join(process.cwd(), "docs");
  const files = fs.readdirSync(docsDir).filter((f) => f.endsWith(".md"));

  return {
    paths: files.map((file) => ({
      params: { slug: [file.replace(".md", "")] },
    })),
    fallback: false, // 404 for non-existent pages
  };
}

export async function getStaticProps({ params }) {
  const { slug } = params;
  const filePath = path.join(process.cwd(), "docs", `${slug[0]}.md`);
  const fileContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContent);

  return {
    props: {
      frontmatter: data,
      markdown: content,
    },
  };
}
```

**Result:** Every `.md` file in `docs/` becomes a static HTML page at build time

#### 3. Heavy Client Libraries (Code Splitting)

**Problem:** Monaco Editor (10MB), GraphQL Editor (5MB) are too large for initial bundle

**Solution:** Dynamic imports with `next/dynamic`

```typescript
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  {
    ssr: false,  // Client-only
    loading: () => <Spinner />
  }
);

const GraphQLEditor = dynamic(
  () => import('graphql-editor'),
  { ssr: false }
);
```

**Benefits:**

- Initial bundle: ~300KB (fast First Contentful Paint)
- Heavy editors loaded on-demand (lazy loading)
- No server-side rendering for client-only libraries

#### 4. Static Data Loading

**Schema Data Strategy:**

```typescript
// At build time, read JSON Schema files
import schema_unificationSchema from "@/data/schema_unification.schema.json";
import legacy_procurementSchema from "@/data/legacy_procurement.schema.json";

// Inline into JavaScript bundle
export default function SchemaViewer() {
  const [schema, setSchema] = useState(schema_unificationSchema);
  // ... viewer logic
}
```

**For Large Schemas:**

```typescript
// Fetch from static JSON at runtime (client-side)
useEffect(() => {
  fetch("/data/schema_unification.schema.json")
    .then((r) => r.json())
    .then(setSchema);
}, []);
```

#### 5. SPA Routing with nginx

**nginx Configuration:**

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

**Why:** Next.js static export generates client-side routing. nginx fallback to `index.html` enables SPA navigation.

### Build Configuration

**Memory Requirement:**

```json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

**Why 4GB Heap:**

- Monaco Editor processing (~10MB source)
- GraphQL Editor bundling (~5MB source)
- Markdown processing (100+ doc files)
- Image optimization (if enabled)
- Webpack bundling overhead

### Deployment Workflow

**Local Build:**

```bash
pnpm run build
# Output: out/ directory with static files

pnpm run start  # Preview with `next start` (dev only)
# OR
npx serve out    # Serve with static file server
```

**Docker Build (Production):**

```dockerfile
# Builder stage
RUN pnpm run build

# Production stage
COPY --from=builder /app/out /app
# nginx serves /app
```

**Cloud.gov Deploy:**

```bash
docker build -t schema-unification-project:prod .
cf push schema-unification-project -o schema-unification-project:prod
```

## Consequences

### Positive

- **Zero Server Cost:** No Node.js runtime in production (nginx only)
- **87.5% Smaller Images:** 200MB vs 1.75GB (see ADR 0007)
- **Fast Load Times:** Static HTML served instantly, <2s FCP
- **CDN-Friendly:** All assets pre-built with immutable URLs
- **Security:** No server-side code execution in production
- **Simple Deployment:** Copy `out/` directory, serve with any static file server
- **Cost Efficiency:** 50-100MB RAM vs 200-500MB for Node.js
- **Build-Time Validation:** Schema errors caught during build (fail fast)

### Negative

- **No API Routes:** Cannot implement server-side API endpoints
- **Build Time:** Full rebuild required for any content change (~6 minutes)
- **No Dynamic Content:** Cannot serve user-specific or real-time data
- **Large Build Memory:** Requires 4GB heap for Next.js build
- **Client-Only Libraries:** Heavy client bundles for interactive features (Monaco, GraphQL Editor)
- **No SSR:** Cannot pre-render user-specific content or authenticated pages
- **Rebuild for Docs:** Markdown doc changes require full rebuild and redeploy

### Neutral

- **Client-Side Hydration:** React hydrates on client (slight FCP delay)
- **SPA Navigation:** Client-side routing feels fast but requires JavaScript
- **No Image Optimization:** Next.js Image component limited (external loader only)
- **Bundle Splitting:** Requires manual `dynamic()` imports for code splitting

## Alternatives Considered

### Alternative 1: Server-Side Rendering (SSR)

**Approach:** Use Next.js with Node.js runtime, enable SSR

**Why Rejected:**

- Requires persistent Node.js process (200-500MB RAM)
- Higher cloud.gov costs (more instances needed)
- Longer startup time (Node.js bootstrap)
- Larger attack surface (Node.js + npm packages)
- No server-side data needed (all schemas are static files)

### Alternative 2: Single-Page App (SPA) with Create React App

**Approach:** Use CRA instead of Next.js

**Why Rejected:**

- No static page generation (single `index.html` for all routes)
- Worse SEO (all content in JavaScript bundle)
- No automatic code splitting (manual webpack config)
- CRA deprecated (React team recommends Next.js or Vite)
- Loses Next.js benefits (image optimization, font optimization, etc.)

### Alternative 3: Gatsby (Static Site Generator)

**Approach:** Use Gatsby instead of Next.js

**Why Rejected:**

- Gatsby primarily for content-heavy sites (blogs, marketing)
- Complex plugin ecosystem (more dependencies)
- Slower build times than Next.js for large sites
- Next.js has better TypeScript support
- Team already familiar with Next.js

### Alternative 4: Astro (Partial Hydration)

**Approach:** Use Astro for islands architecture (partial hydration)

**Why Rejected:**

- Astro better for content sites, not interactive tools
- Heavy client libraries (Monaco, GraphQL Editor) need full hydration
- Next.js has larger ecosystem and better tooling
- Migration cost high (rewrite entire frontend)
- Astro less mature (v1.0 released 2022, Next.js since 2016)

## Success Metrics

1. **First Contentful Paint:** <2 seconds (currently ~1.5s) ✅
2. **Build Time:** <10 minutes (currently ~6 minutes) ✅
3. **Production Memory:** <200MB per instance (currently ~150MB) ✅
4. **Bundle Size:** Initial JS bundle <500KB (currently ~300KB) ✅
5. **Lighthouse Score:** >90 Performance, >90 Accessibility ✅
6. **Cloud.gov Cost:** <$100/month for 2-3 instances ✅

## Implementation Status

- ✅ Next.js 14 with `output: "export"` configured
- ✅ Dynamic documentation pages from `docs/*.md` files
- ✅ Code splitting for heavy libraries (Monaco, GraphQL Editor)
- ✅ nginx serving with SPA routing fallback
- ✅ Docker multi-stage build (see ADR 0007)
- ✅ Build memory: 4GB heap configured
- ✅ Static JSON data loading strategy
- ✅ Lighthouse score: 95+ Performance, 90+ Accessibility

## Related Documentation

- [next.config.js](../../next.config.js) - Next.js static export configuration
- [src/pages/docs/[...slug].tsx](../../src/pages/docs/[...slug].tsx) - Dynamic docs implementation
- [ADR 0007: Multi-Stage Docker Build](./0007-multi-stage-docker-build.md) - nginx serving layer
- [ADR 0003: Schema Viewers as Communication Layer](./0003-visual-communication-layer.md) - Why viewers needed
- [Next.js Static Export Documentation](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Next.js Dynamic Imports](https://nextjs.org/docs/pages/building-your-application/optimizing/lazy-loading)
- [Cloud.gov Static Site Deployment](https://cloud.gov/docs/deployment/static/)

## Review Schedule

- **Q1 2025:** Evaluate Next.js 15 upgrade (improved static export features)
- **Q2 2025:** Review bundle size optimization opportunities (tree-shaking, compression)
- **Q4 2025:** Consider Astro migration if partial hydration becomes critical
