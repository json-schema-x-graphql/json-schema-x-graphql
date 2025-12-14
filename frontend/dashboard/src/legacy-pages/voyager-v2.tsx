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

const VoyagerV2Page: NextPage = () => {
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
          fetch("/data/schema_unification-v2.graphql"),
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

        console.error("[VoyagerV2Page]", err);
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
        <title>GraphQL Voyager - V2 Hand-Crafted | Schema Unification Forest</title>
        <meta
          name="description"
          content="Visualise the hand-crafted V2 schema (30 types with detailed extensions) as an interactive graph using GraphQL Voyager."
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
          <h1>V2 Hand-Crafted (30 Types)</h1>
          <div className="voyager-nav">
            <Link href="/voyager-v1" className="nav-link">
              ← View V1 Auto-Generated (17 Types)
            </Link>
          </div>
        </div>

        <div className="voyager-info">
          <div className="info-badge">
            <span className="badge-label">Generated from:</span>
            <code>schema_unification-v2.graphql</code>
          </div>
          <div className="info-badge">
            <span className="badge-label">Features:</span>
            <span className="badge-features">
              Hand-crafted schema • Typed extensions • System chain tracking
            </span>
          </div>
          <div className="info-badge">
            <span className="docs-link">
              📖 GraphQL Voyager documentation has been archived and is available in the docs
              archive.
            </span>
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
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .voyager-header h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .voyager-nav {
          display: flex;
          gap: 1rem;
        }

        .voyager-nav :global(.nav-link) {
          color: white;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          background: rgba(255, 255, 255, 0.2);
          transition: background 0.2s;
        }

        .voyager-nav :global(.nav-link:hover) {
          background: rgba(255, 255, 255, 0.3);
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
      `}</style>
    </>
  );
};

export default VoyagerV2Page;
