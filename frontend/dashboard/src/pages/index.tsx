import React from "react";
import type { InferGetStaticPropsType, GetStaticProps } from "next";
import { NextSeo } from "next-seo";
import { SEO } from "../constants/seo";
import { Features } from "../layout/Landing/Features";
// import { HeroPreview } from "../layout/Landing/HeroPreview";
import { HeroSection } from "../layout/Landing/HeroSection";
import { Section1 } from "../layout/Landing/Section1";
// import { Section2 } from "../layout/Landing/Section2";
import { Section3 } from "../layout/Landing/Section3";
import Layout from "../layout/PageLayout";

export const HomePage = (props: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
    <Layout>
      <NextSeo {...SEO} canonical="https://ttse-schema-unification-project.app.cloud.gov" />
      <HeroSection stars={props.stars} />
      {/* <HeroPreview /> */}
      <Section1 docs={props.docs} />
      {/* <Section2 /> */}
      <Section3 />
      <Features />
    </Layout>
  );
};

export default HomePage;

export const getStaticProps = (async () => {
  // Fetch repo stars as before
  let stars = 0;
  try {
    const res = await fetch("https://api.github.com/repos/GSA-TTS/enterprise-schema-unification", {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
    });
    const data = await res.json();
    stars = data?.stargazers_count || 0;
  } catch (e) {
    // ignore
  }

  // Generate docs list dynamically based on directory structure
  let docs: string[] = [];
  try {
    const fs = await import("fs");
    const pathMod = await import("path");

    const docsDir = pathMod.join(process.cwd(), "docs");

    const walk = (dir: string, base = dir): string[] => {
      if (!fs.existsSync(dir)) return [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let results: string[] = [];

      for (const ent of entries) {
        const full = pathMod.join(dir, ent.name);
        if (ent.isDirectory()) {
          results = results.concat(walk(full, base));
        } else if (ent.isFile() && ent.name.endsWith(".md")) {
          let rel = pathMod.relative(base, full).replace(/\\/g, "/");

          // Handle READMEs: docs/adr/README.md -> adr
          if (rel.endsWith("/README.md")) {
            rel = rel.replace(/\/README\.md$/, "");
          } else if (rel === "README.md") {
            // Root README maps to root docs index
            rel = "";
          } else {
            rel = rel.replace(/\.md$/, "");
          }

          if (rel) {
            results.push(rel);
          }
        }
      }
      return results;
    };

    docs = walk(docsDir);
  } catch (e) {
    console.error("Error generating docs list:", e);
    docs = [];
  }

  return {
    props: {
      stars,
      docs,
    },
  };
}) satisfies GetStaticProps<{ stars: number; docs: string[] }>;
