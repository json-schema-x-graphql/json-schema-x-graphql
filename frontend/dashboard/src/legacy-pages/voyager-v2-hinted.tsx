import { useEffect, useRef, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import Script from "next/script";

declare global {
  interface Window {
    GraphQLVoyager?: {
      renderVoyager: (
        element: HTMLElement,
        options: {
          introspection: unknown;
          displayOptions?: Record<string, unknown>;
        }
      ) => void;
    };
  }
}

const VoyagerV2HintedPage: NextPage = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scriptReady || !containerRef.current) {
      return;
    }

    let cancelled = false;

    const loadVoyager = async () => {
      try {
        const [graphqlModule, response] = await Promise.all([
          import("graphql"),
          fetch("/data/schema_unification-contract_data-hinted.graphql"),
        ]);

        if (!response.ok) {
          throw new Error(`Failed to load SDL: ${response.statusText}`);
        }

        const sdl = await response.text();
        const { buildSchema, getIntrospectionQuery, graphql } = graphqlModule as {
          buildSchema: (sdl: string) => any;
          getIntrospectionQuery: () => string;
          graphql: (args: any) => Promise<any>;
        };
        const schema = buildSchema(sdl);
        const introspectionResult = await graphql({
          schema,
          source: getIntrospectionQuery(),
        });

        if (introspectionResult.errors?.length) {
          throw new Error(
            introspectionResult.errors.map(graphqlError => graphqlError.message).join("\n")
          );
        }

        if (cancelled) {
          return;
        }

        const voyContainer = containerRef.current;
        if (!voyContainer) {
          throw new Error("Voyager container has not been initialised");
        }

        const voyager = window.GraphQLVoyager;
        if (!voyager) {
          throw new Error("GraphQLVoyager library is not available on window");
        }

        voyager.renderVoyager(voyContainer, {
          introspection: introspectionResult,
          displayOptions: {
            sortByAlphabet: true,
            showLeafFields: true,
          },
        });
      } catch (err) {
        if (cancelled) {
          return;
        }

        const message = err instanceof Error ? err.message : "Unknown error initialising Voyager";
        setError(message);

        console.error("[VoyagerV2HintedPage]", err);
      }
    };

    loadVoyager();

    return () => {
      cancelled = true;
    };
  }, [scriptReady]);

  return (
    <>
      <Head>
        <title>GraphQL Voyager - V2 x-graphql Hinted Contract Data Example | Schema Unification Forest</title>
        <meta
          name="description"
          content="Visualise the V2 x-graphql hinted Contract Data example schema with interfaces, unions, and custom scalars as an interactive graph using GraphQL Voyager."
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/graphql-voyager/dist/voyager.css"
        />
      </Head>

      <Script
        src="https://cdn.jsdelivr.net/npm/graphql-voyager/dist/voyager.standalone.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setError("Failed to load GraphQL Voyager CDN bundle.")}
      />

      <div className="voyager-wrapper">
        <div className="voyager-header">
          <div className="header-content">
            <h1>V2 x-graphql Hinted Contract Data Example</h1>
            <p className="header-subtitle">Interfaces • Unions • Custom Scalars • Directives</p>
          </div>
          <div className="voyager-nav">
            <Link href="/voyager-v1" className="nav-link">
              V1 Auto-Generated
            </Link>
            <Link href="/voyager-v2" className="nav-link">
              V2 Hand-Crafted
            </Link>
          </div>
        </div>

        <div className="voyager-info">
          <div className="info-badge">
            <span className="badge-label">Generated from:</span>
            <code>schema_unification-contract_data-hinted.schema.json</code>
          </div>
          <div className="info-badge">
            <span className="badge-label">Features:</span>
            <span className="badge-features">
              Contract interface • Union types • DateTime scalar • @currency directive
            </span>
          </div>
          <div className="info-badge">
            <Link href="/docs/x-graphql-hints-guide" className="docs-link">
              📖 View x-graphql Hints Documentation →
            </Link>
          </div>
        </div>

        {error ? (
          <div className="voyager-error" role="alert">
            {error}
          </div>
        ) : (
          <div ref={containerRef} id="voyager" aria-live="polite">
            Loading GraphQL Voyager…
          </div>
        )}
      </div>

      <style jsx>{`
        .voyager-wrapper {
          width: 100%;
          height: calc(100vh - var(--app-header-height, 0px));
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }

        .voyager-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.25rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .header-content h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .header-subtitle {
          margin: 0.25rem 0 0 0;
          font-size: 0.875rem;
          opacity: 0.9;
          font-weight: 400;
        }

        .voyager-nav {
          display: flex;
          gap: 0.75rem;
        }

        .voyager-nav :global(.nav-link) {
          color: white;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          background: rgba(255, 255, 255, 0.2);
          transition: all 0.2s;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .voyager-nav :global(.nav-link:hover) {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .voyager-info {
          background: linear-gradient(to right, #f8fafc, #f1f5f9);
          padding: 1rem 2rem;
          display: flex;
          gap: 1.5rem;
          align-items: center;
          flex-wrap: wrap;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .info-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .badge-label {
          color: #64748b;
          font-weight: 600;
        }

        .info-badge code {
          background: white;
          padding: 0.25rem 0.625rem;
          border-radius: 0.25rem;
          color: #7c3aed;
          font-family: "Monaco", "Courier New", monospace;
          font-size: 0.8125rem;
          border: 1px solid #e9d5ff;
          font-weight: 500;
        }

        .badge-features {
          color: #475569;
          font-weight: 500;
        }

        .info-badge :global(.docs-link) {
          color: #7c3aed;
          text-decoration: none;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: color 0.2s;
        }

        .info-badge :global(.docs-link:hover) {
          color: #6d28d9;
          text-decoration: underline;
        }

        #voyager {
          flex: 1;
          background: white;
        }

        .voyager-error {
          margin: 2rem auto;
          padding: 1.5rem;
          border-radius: 0.75rem;
          background: #fee2e2;
          color: #991b1b;
          max-width: 480px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.25);
        }

        @media (max-width: 768px) {
          .voyager-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
            padding: 1rem 1.5rem;
          }

          .header-content h1 {
            font-size: 1.25rem;
          }

          .voyager-nav {
            width: 100%;
            justify-content: space-between;
          }

          .voyager-info {
            padding: 0.875rem 1.5rem;
            gap: 1rem;
          }

          .info-badge {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};

export default VoyagerV2HintedPage;
