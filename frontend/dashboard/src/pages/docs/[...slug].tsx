import React from "react";
import type { GetStaticPaths, GetStaticProps } from "next";
import fs from "fs";
import matter from "gray-matter";
import { NextSeo } from "next-seo";
import path from "path";
import { MarkdownPage } from "../../components/MarkdownPage";
import Layout from "../../layout/PageLayout";

interface DocPageProps {
  content: string;
  frontMatter: {
    title?: string;
    description?: string;
    [key: string]: unknown;
  };
  slug: string[];
}

const DocPage: React.FC<DocPageProps> = ({ content, frontMatter, slug }) => {
  const title = frontMatter.title || slug.join(" / ");
  const description =
    frontMatter.description || `Documentation for ${slug.join(" / ")} in Schema Unification Forest`;

  return (
    <Layout>
      <NextSeo
        title={`${title} | Schema Unification Forest Documentation`}
        description={description}
        canonical={`https://ttse-schema-unification-project.app.cloud.gov/docs/${slug.join("/")}`}
      />
      <MarkdownPage content={content} title={title} />
    </Layout>
  );
};

export default DocPage;

const getAllMarkdownFiles = (dir: string, baseDir: string = dir): string[] => {
  const files = fs.readdirSync(dir);
  let markdownFiles: string[] = [];

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      markdownFiles = markdownFiles.concat(getAllMarkdownFiles(filePath, baseDir));
    } else if (file.endsWith(".md")) {
      const relativePath = path.relative(baseDir, filePath);
      markdownFiles.push(relativePath);
    }
  });

  return markdownFiles;
};

export const getStaticPaths: GetStaticPaths = async () => {
  const docsDirectory = path.join(process.cwd(), "docs");
  const markdownFiles = getAllMarkdownFiles(docsDirectory);

  const paths = markdownFiles.flatMap(file => {
    const slug = file.replace(/\.md$/, "").split(/[/\\]/).filter(Boolean);

    if (!slug || slug.length === 0) {
      return [];
    }

    const result = [{ params: { slug } }];

    // If the file is named README, also generate a route for the directory itself
    // e.g. docs/adr/README.md -> /docs/adr
    if (slug[slug.length - 1] === "README" && slug.length > 1) {
      result.push({ params: { slug: slug.slice(0, -1) } });
    }

    return result;
  });

  console.log(
    "Generated Doc Paths:",
    paths.map(p => `/docs/${(p.params.slug as string[]).join("/")}`)
  );

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<DocPageProps> = async ({ params }) => {
  const slug = params?.slug as string[];

  if (!slug) {
    return {
      notFound: true,
    };
  }

  const docsDirectory = path.join(process.cwd(), "docs");
  let filePath = path.join(docsDirectory, ...slug) + ".md";

  // Check if file exists as a direct markdown file
  if (!fs.existsSync(filePath)) {
    // If not, check if it exists as a README in a directory (for cleaner URLs)
    const readmePath = path.join(docsDirectory, ...slug, "README.md");
    if (fs.existsSync(readmePath)) {
      filePath = readmePath;
    } else {
      return {
        notFound: true,
      };
    }
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data: frontMatter, content } = matter(fileContents);

  return {
    props: {
      content,
      frontMatter: frontMatter as DocPageProps["frontMatter"],
      slug,
    },
  };
};
