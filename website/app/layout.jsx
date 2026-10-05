import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";

export const metadata = {
  title: {
    default: "json-schema-x-graphql",
    template: "%s – json-schema-x-graphql",
  },
  description:
    "Bidirectional, lossless conversion between JSON Schema and GraphQL SDL with Apollo Federation support.",
};

const navbar = (
  <Navbar
    logo={<b>json-schema-x-graphql</b>}
    projectLink="https://github.com/json-schema-x-graphql/json-schema-x-graphql"
  />
);

const footer = (
  <Footer>
    MIT {new Date().getFullYear()} ©{" "}
    <a
      href="https://github.com/json-schema-x-graphql"
      target="_blank"
      rel="noreferrer"
    >
      json-schema-x-graphql contributors
    </a>
  </Footer>
);

export default async function RootLayout({ children }) {
  const pageMap = await getPageMap();

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta property="og:title" content="json-schema-x-graphql" />
        <meta
          property="og:description"
          content="Bidirectional, lossless conversion between JSON Schema and GraphQL SDL with Apollo Federation support"
        />
      </Head>
      <body>
        <Layout
          navbar={navbar}
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/json-schema-x-graphql/json-schema-x-graphql/tree/main/website"
          footer={footer}
          sidebar={{ defaultMenuCollapseLevel: 1, toggleButton: true }}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
