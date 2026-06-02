import React from "react";
import { Box, Container, Paper, Stack, Text, Title } from "@mantine/core";
import { NextSeo } from "next-seo";
import { SEO } from "../../constants/seo";
import Layout from "../../layout/PageLayout";

const terms: Record<string, string[]> = {
  "Acceptance of Terms": [
    "By accessing this government system, you agree to comply with all applicable federal laws and regulations.",
    "Unauthorized access or misuse is prohibited and subject to prosecution.",
  ],
  "Service Availability": [
    "Services are provided on an as-is basis.",
    "System availability is subject to maintenance windows and updates.",
  ],
};

const Terms = () => {
  return (
    <Layout>
      <NextSeo
        {...SEO}
        title="Terms of Service - JSON Crack"
        description="JSON Crack Terms of Service"
        canonical="https://jsoncrack.com/legal/terms"
      />
      <Container my={50} size="md" pb="lg">
        <Paper bg="transparent">
          <Title ta="center" c="gray.8">
            Terms of Service
          </Title>
          <Text c="gray.6" ta="center">
            Last updated: No 30, 2024
          </Text>

          <Stack mt={50} my="lg">
            {Object.keys(terms).map((term, index) => (
              <Box component="section" mt="xl" key={index}>
                <Title order={2} mb="xl" c="gray.8">
                  {term}
                </Title>
                {terms[term].map((term) => (
                  <Text mt="md" c="gray.8" key={term} ml={term.startsWith("•") ? 15 : 0}>
                    {term}
                  </Text>
                ))}
              </Box>
            ))}
          </Stack>
        </Paper>
      </Container>
    </Layout>
  );
};

export default Terms;
