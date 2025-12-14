import React from "react";
import { Container, Title } from "@mantine/core";
import styled from "styled-components";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const StyledMarkdownContainer = styled(Container)`
  padding: 2rem 1rem;
  max-width: 900px;

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 2rem 0 1rem 0;
    color: #202842;
    border-bottom: 2px solid #e9ecef;
    padding-bottom: 0.5rem;
  }

  h2 {
    font-size: 2rem;
    font-weight: 600;
    margin: 1.5rem 0 1rem 0;
    color: #202842;
    border-bottom: 1px solid #e9ecef;
    padding-bottom: 0.5rem;
  }

  h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 1.25rem 0 0.75rem 0;
    color: #202842;
  }

  h4 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem 0;
    color: #202842;
  }

  h5 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem 0;
    color: #202842;
  }

  p {
    font-size: 1rem;
    line-height: 1.7;
    margin: 0.75rem 0;
    color: #4a5568;
  }

  ul,
  ol {
    margin: 0.75rem 0;
    padding-left: 2rem;
    color: #4a5568;

    li {
      margin: 0.5rem 0;
      line-height: 1.6;
    }
  }

  code {
    background: #f7f7f7;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-family: "Courier New", monospace;
    font-size: 0.9em;
    color: #e83e8c;
  }

  pre {
    background: #f7f7f7;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1rem 0;
    border: 1px solid #e9ecef;

    code {
      background: transparent;
      padding: 0;
      color: #202842;
      font-size: 0.9rem;
    }
  }

  blockquote {
    border-left: 4px solid #51cf66;
    padding-left: 1rem;
    margin: 1rem 0;
    color: #4a5568;
    font-style: italic;
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 4px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
    font-size: 0.95rem;

    th {
      background: #f8f9fa;
      padding: 0.75rem;
      text-align: left;
      font-weight: 600;
      border: 1px solid #e9ecef;
      color: #202842;
    }

    td {
      padding: 0.75rem;
      border: 1px solid #e9ecef;
      color: #4a5568;
    }

    tr:nth-child(even) {
      background: #f8f9fa;
    }
  }

  a {
    color: #115fe6;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-bottom 0.2s;

    &:hover {
      border-bottom: 1px solid #115fe6;
    }
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1rem 0;
  }

  hr {
    border: none;
    border-top: 2px solid #e9ecef;
    margin: 2rem 0;
  }

  @media only screen and (max-width: 768px) {
    padding: 1rem 0.5rem;

    h1 {
      font-size: 2rem;
    }

    h2 {
      font-size: 1.5rem;
    }

    pre {
      font-size: 0.85rem;
    }

    table {
      font-size: 0.85rem;
    }
  }
`;

interface MarkdownPageProps {
  content: string;
  title?: string;
}

export const MarkdownPage: React.FC<MarkdownPageProps> = ({ content, title }) => {
  return (
    <StyledMarkdownContainer>
      {title && (
        <Title order={1} mb="xl" c="gray.9">
          {title}
        </Title>
      )}
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </StyledMarkdownContainer>
  );
};
