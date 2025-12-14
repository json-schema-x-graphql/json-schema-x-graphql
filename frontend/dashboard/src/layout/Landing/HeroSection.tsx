import React from "react";
import { Oxygen } from "next/font/google";
import Link from "next/link";
import { Stack, Flex, Button } from "@mantine/core";
import styled from "styled-components";
import { FaChevronRight, FaGithub, FaStar } from "react-icons/fa6";

const oxygen = Oxygen({
  subsets: ["latin-ext"],
  weight: ["700"],
});

const StyledHeroSection = styled.main`
  position: relative;

  &:before {
    position: absolute;
    content: "";
    width: 100%;
    height: 100%;
    background-size: 40px 40px;
    background-image:
      linear-gradient(to right, #f7f7f7 1px, transparent 1px),
      linear-gradient(to bottom, #f7f7f7 1px, transparent 1px);
    image-rendering: pixelated;
    -webkit-mask-image: linear-gradient(to bottom, transparent, 0%, white, 98%, transparent);
    mask-image: linear-gradient(to bottom, transparent, 0%, white, 98%, transparent);
  }

  @media only screen and (max-width: 1240px) {
    flex-direction: column;
  }
`;

const StyledHeroSectionBody = styled.div`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  padding: 6rem 10% 4rem;
  overflow: hidden;
  text-align: center;
  gap: 60px;
  min-height: 40vh;

  @media only screen and (max-width: 768px) {
    padding: 6em 16px;
    padding-top: 10vh;
  }
`;

const StyledHeroTitle = styled.h1`
  position: relative;
  font-size: 2.3rem;
  font-weight: 700;
  display: inline;
  color: #120f43;
  width: fit-content;
  line-height: 1.15;
  max-width: 30rem;
  font-family: ${oxygen.style.fontFamily};

  @media only screen and (min-width: 576px) {
    font-size: 3.4rem;
    max-width: 34rem;
  }

  @media only screen and (min-width: 992px) {
    font-size: 3.8rem;
    max-width: 40rem;
  }

  @media only screen and (min-width: 1400px) {
    font-size: 4.2rem;
    max-width: 50rem;
  }
`;

const StyledHeroText = styled.h2`
  font-size: 14px;
  color: #4a5568;
  font-weight: 400;
  max-width: 75%;
  margin-top: 1rem;
  text-align: center;

  strong {
    font-weight: 400;
    color: #115fe6;
  }

  @media only screen and (min-width: 576px) {
    font-size: 18px;
    max-width: 80%;
  }

  @media only screen and (min-width: 1400px) {
    font-size: 18px;
    max-width: 60%;
  }
`;

const StyledVersionSection = styled.div`
  /* Use theme-aware background to ensure the navigation and buttons have sufficient contrast
     in both light and dark modes. Fall back to white if theme values are not present. */
  background: ${({ theme }) => theme.BACKGROUND_SECONDARY || "white"};
  color: ${({ theme }) => theme.TEXT_NORMAL || "#2e3338"};
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid ${({ theme }) => theme.GRID_COLOR_PRIMARY || "#e9ecef"};
  max-width: 600px;
  width: 100%;

  @media only screen and (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const StyledVersionTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: #202842;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const StyledVersionDescription = styled.p`
  font-size: 0.95rem;
  color: #4a5568;
  line-height: 1.6;
  margin: 0 0 1rem 0;
`;

const StyledBenefitsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem 0;

  li {
    font-size: 0.9rem;
    color: #4a5568;
    padding: 0.4rem 0;
    display: flex;
    align-items: start;
    gap: 0.5rem;

    &:before {
      content: "✓";
      color: #51cf66;
      font-weight: bold;
      margin-top: 0.1rem;
    }
  }
`;

const StyledBadge = styled.span<{ variant?: "stable" | "draft" }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${props => (props.variant === "draft" ? "#f59f00" : "#51cf66")};
  color: white;
`;

export const HeroSection = ({ stars = 0 }) => {
  return (
    <StyledHeroSection>
      <StyledHeroSectionBody>
        <Stack flex="1" miw={250} mx="auto" align="center">
          <Link
            href="https://github.com/GSA-TTS/enterprise-schema-unification"
            target="_blank"
            rel="noopener"
          >
            <Button
              variant="default"
              radius="xl"
              ta="left"
              leftSection={<FaGithub size="18" />}
              rightSection={
                <Flex ml="sm" c="dimmed" align="center" gap="4">
                  <FaStar />
                  {stars.toLocaleString("en-US")}
                </Flex>
              }
            >
              GitHub
            </Button>
          </Link>

          <StyledHeroTitle>
            Federal Procurement Data Fabric (FPDF) v2.0 by Schema Unification Forest Project with GraphQL
            Extensions
          </StyledHeroTitle>
          <StyledHeroText>
            The <strong>Federal Procurement Data Fabric (FPDF) v2.0</strong> by Schema Unification Forest
            Project provides interactive visualization tools for government contract data, powered
            by advanced GraphQL extensions. Explore normalized contract records from Contract Data, Legacy Procurement,
            and EASi systems, and examine the unified <strong>schema_unification.schema.json</strong> data
            structure that enables cross-system analysis, reporting, and modern API/dashboard
            applications.
          </StyledHeroText>

          <StyledVersionSection>
            <StyledVersionTitle>
              FPDF v2.0: Unified API & Dashboard Model{" "}
              <StyledBadge variant="stable">Stable</StyledBadge>
            </StyledVersionTitle>
            <StyledVersionDescription>
              Enhanced definitions-based schema optimized for GraphQL APIs, dashboards, and advanced
              querying with typed system extensions.
            </StyledVersionDescription>
            <StyledBenefitsList>
              <li>Typed, structured system extensions (Contract Data, Legacy Procurement, EASi)</li>
              <li>GraphQL-optimized with rich type definitions</li>
              <li>Advanced querying and filtering capabilities</li>
              <li>Better IDE auto-completion and type safety</li>
              <li>Designed for modern API and dashboard applications</li>
            </StyledBenefitsList>
            <Flex gap="sm" direction="column">
              {/* Schema viewer button - bold unique purple */}
              <Button
                component="a"
                variant="filled"
                style={{
                  background: "#7c3aed",
                  color: "#ffffff",
                  fontWeight: 700,
                }}
                href="/schema_unification-schema-viewer"
                size="md"
                radius="md"
                rightSection={<FaChevronRight />}
                fullWidth
              >
                FPDF v2.0 Schema Viewer
              </Button>

              {/* GraphQL Voyager (canonical) - bold unique teal */}
              <Button
                component="a"
                variant="filled"
                style={{
                  background: "#0ea5a4",
                  color: "#ffffff",
                  fontWeight: 700,
                }}
                href="/graphql?mode=canonical"
                size="md"
                radius="md"
                rightSection={<FaChevronRight />}
                fullWidth
              >
                FPDF v2.0 GraphQL Schema (Voyager)
              </Button>

              {/* GraphQL Editor - bold unique orange */}
              <Button
                component="a"
                variant="filled"
                style={{
                  background: "#f97316",
                  color: "#ffffff",
                  fontWeight: 700,
                }}
                href="/graphql-editor"
                size="md"
                radius="md"
                rightSection={<FaChevronRight />}
                fullWidth
              >
                Open GraphQL Editor
              </Button>
            </Flex>
          </StyledVersionSection>
        </Stack>
      </StyledHeroSectionBody>
    </StyledHeroSection>
  );
};
