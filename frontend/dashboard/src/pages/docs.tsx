import React from "react";
import type { GetStaticProps } from "next";
import { Group, Paper, Stack, Text, Title, Divider } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import styled from "styled-components";
import fs from "fs";
import matter from "gray-matter";
import { NextSeo } from "next-seo";
import path from "path";
import { SEO } from "../constants/seo";
import Layout from "../layout/PageLayout";

const StyledFrame = styled.iframe`
  border: none;
  width: 80%;
  flex: 500px;
  margin: 3% auto;
`;

const StyledContentBody = styled.div`
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 15px;
  line-height: 1.8;
  overflow-x: auto;
`;

const StyledHighlight = styled.span<{ $link?: boolean; $alert?: boolean }>`
  display: inline-block;
  text-align: left;
  color: ${({ theme, $link, $alert }) =>
    $alert ? theme.DANGER : $link ? theme.BLURPLE : theme.TEXT_POSITIVE};
  background: ${({ theme }) => theme.BACKGROUND_TERTIARY};
  border-radius: 4px;
  font-weight: 500;
  padding: 2px 4px;
  font-size: 14px;
  margin: ${({ $alert }) => ($alert ? "8px 0" : "1px")};
`;

interface DocLink {
  href: string;
  title: string;
}

interface DocsProps {
  active: DocLink[];
  archived: DocLink[];
}

const Docs: React.FC<DocsProps> = ({ active, archived }) => {
  return (
    <Layout>
      <NextSeo
        {...SEO}
        title="Documentation - JSON Crack"
        description="Integrate JSON Crack widgets into your website."
        canonical="https://jsoncrack.com/docs"
      />
      <Stack mx="auto" maw="90%">
        <Group mb="lg" mt={40}>
          <Title order={1} c="dark">
            Embed
          </Title>
        </Group>
        <Paper bg="white" c="black" p="md" radius="md" withBorder>
          <Title mb="sm" order={3} c="dark">
            # Fetching from URL
          </Title>
          <StyledContentBody>
            <Text>
              By adding <StyledHighlight>?json=https://catfact.ninja/fact</StyledHighlight> query at
              the end of iframe src you will be able to fetch from URL at widgets without additional
              scripts. This applies to editor page as well, the following link will fetch the url at
              the editor:{" "}
              <StyledHighlight
                as="a"
                href="https://jsoncrack.com/editor?json=https://catfact.ninja/fact"
                $link
              >
                https://jsoncrack.com/editor?json=https://catfact.ninja/fact
              </StyledHighlight>
            </Text>

            <StyledFrame
              title="Untitled"
              src="https://codepen.io/AykutSarac/embed/KKBpWVR?default-tab=html%2Cresult"
              loading="eager"
            >
              See the Pen <a href="https://codepen.io/AykutSarac/pen/KKBpWVR">Untitled</a> by Aykut
              Saraç (<a href="https://codepen.io/AykutSarac">@AykutSarac</a>) on{" "}
              <a href="https://codepen.io">CodePen</a>.
            </StyledFrame>
          </StyledContentBody>
        </Paper>
        <Paper bg="white" c="black" p="md" radius="md" withBorder>
          <Title mb="sm" order={3} c="dark">
            # Documentation Index
          </Title>
          <Text mb="sm">Active Docs</Text>
          <Stack mb="lg">
            {active.map(d => (
              <a key={d.href} href={d.href}>
                {d.title}
              </a>
            ))}
          </Stack>

          <Divider />
          <Text mb="sm" mt="md">
            Archived Docs
          </Text>
          <Stack>
            {archived.map(d => (
              <a key={d.href} href={d.href}>
                {d.title}
              </a>
            ))}
          </Stack>
        </Paper>

        <Paper bg="white" c="black" p="md" radius="md" withBorder>
          <Title mb="sm" order={3} c="dark">
            # Communicating with API
          </Title>
          <Title order={4}>◼︎ Post Message to Embed</Title>
          <StyledContentBody>
            <Text>
              Communicating with the embed is possible with{" "}
              <StyledHighlight
                as="a"
                href="https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage"
                $link
              >
                MessagePort
              </StyledHighlight>
              , you should pass an object consist of &quot;json&quot; and &quot;options&quot; key
              where json is a string and options is an object that may contain the following:
              <CodeHighlight
                w={500}
                language="json"
                code={
                  '{\n  theme: "light" | "dark",\n  direction: "TOP" | "RIGHT" | "DOWN" | "LEFT"\n}'
                }
                withCopyButton={false}
              />
            </Text>

            <StyledFrame
              scrolling="no"
              title="Untitled"
              src="https://codepen.io/AykutSarac/embed/rNrVyWP?default-tab=html%2Cresult"
              loading="lazy"
            >
              See the Pen <a href="https://codepen.io/AykutSarac/pen/rNrVyWP">Untitled</a> by Aykut
              Saraç (<a href="https://codepen.io/AykutSarac">@AykutSarac</a>) on{" "}
              <a href="https://codepen.io">CodePen</a>.
            </StyledFrame>
          </StyledContentBody>
        </Paper>
        <Paper bg="white" c="black" p="md" radius="md" withBorder>
          <Title order={4}>◼︎ On Page Load</Title>
          <StyledContentBody>
            <Text>
              <Text>
                ⚠️ <b>Important!</b> - iframe should be defined before the script tag
              </Text>
              <Text>
                ⚠️ <b>Note</b> - Widget is not loaded immediately with the parent page. The widget
                sends its <b>id</b> attribute so you can listen for it as in the example below to
                ensure its loaded and ready to listen for messages.
              </Text>
            </Text>
            <StyledFrame
              title="Untitled"
              src="https://codepen.io/AykutSarac/embed/QWBbpqx?default-tab=html%2Cresult"
              loading="lazy"
            >
              See the Pen <a href="https://codepen.io/AykutSarac/pen/QWBbpqx">Untitled</a> by Aykut
              Saraç (<a href="https://codepen.io/AykutSarac">@AykutSarac</a>) on{" "}
              <a href="https://codepen.io">CodePen</a>.
            </StyledFrame>
          </StyledContentBody>
        </Paper>
      </Stack>
    </Layout>
  );
};

export default Docs;

export const getStaticProps: GetStaticProps<DocsProps> = async () => {
  const docsDir = path.join(process.cwd(), "docs");

  const walk = (dir: string, base = dir): string[] => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let results: string[] = [];

    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) results = results.concat(walk(full, base));
      else if (ent.isFile() && ent.name.endsWith(".md")) {
        const rel = path.relative(base, full).replace(/\\\\/g, "/");
        results.push(rel);
      }
    }

    return results;
  };

  const files = walk(docsDir);

  const active: DocLink[] = [];
  const archived: DocLink[] = [];

  files.forEach(f => {
    const fullPath = path.join(docsDir, f);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(fileContents);

    let href = `/docs/${f.replace(/\.md$/, "")}`;
    const parts = f.split("/");

    // Clean up README links to point to the directory
    if (parts.length > 1 && parts[parts.length - 1] === "README.md") {
      href = `/docs/${parts.slice(0, -1).join("/")}`;
    }

    const title = data.title || parts.slice(-1)[0].replace(/\.md$/, "").replace(/[-_]/g, " ");

    if (parts[0] === "archived") {
      archived.push({ href, title });
    } else {
      active.push({ href, title });
    }
  });

  // sort alphabetically
  active.sort((a, b) => a.title.localeCompare(b.title));
  archived.sort((a, b) => a.title.localeCompare(b.title));

  return {
    props: { active, archived },
  };
};
