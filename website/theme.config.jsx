import { useRouter } from "next/router";

/** @type {import('nextra-theme-docs').DocsThemeConfig} */
export default {
  logo: (
    <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
      json-schema-x-graphql
    </span>
  ),
  project: {
    link: "https://github.com/json-schema-x-graphql/json-schema-x-graphql",
  },
  docsRepositoryBase:
    "https://github.com/json-schema-x-graphql/json-schema-x-graphql/tree/main/website",
  footer: {
    text: (
      <span>
        MIT {new Date().getFullYear()} ©{" "}
        <a
          href="https://github.com/json-schema-x-graphql"
          target="_blank"
          rel="noreferrer"
        >
          json-schema-x-graphql contributors
        </a>
      </span>
    ),
  },
  useNextSeoProps() {
    const { asPath } = useRouter();
    return {
      titleTemplate:
        asPath === "/" ? "json-schema-x-graphql" : "%s – json-schema-x-graphql",
    };
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta
        name="description"
        content="Bidirectional, lossless conversion between JSON Schema and GraphQL SDL with Apollo Federation support"
      />
      <meta property="og:title" content="json-schema-x-graphql" />
      <meta
        property="og:description"
        content="Bidirectional, lossless conversion between JSON Schema and GraphQL SDL with Apollo Federation support"
      />
    </>
  ),
  navigation: true,
  darkMode: true,
  primaryHue: 212,
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
};
