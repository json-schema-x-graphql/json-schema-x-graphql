import { useEffect, useRef, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Script from "next/script";

declare global {
  interface Window {
    GraphQLVoyager?: {
      renderVoyager: (
        element: HTMLElement,
        options: {
          introspection: unknown;
          displayOptions?: Record<string, unknown>;
        },
      ) => void;
    };
  }
}

const VoyagerPage: NextPage = () => {
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
          fetch("/data/schema_unification.graphql"),
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
            introspectionResult.errors.map((graphqlError) => graphqlError.message).join("\n"),
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

        console.error("[VoyagerPage]", err);
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
        <title>GraphQL Voyager | Schema Unification Forest</title>
        <meta
          name="description"
          content="Visualise the Schema Unification Forest GraphQL schema as an interactive graph using GraphQL Voyager."
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
          align-items: stretch;
          justify-content: center;
        }

        #voyager {
          flex: 1;
          background: white;
        }

        .voyager-error {
          margin: auto;
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

export default VoyagerPage;
