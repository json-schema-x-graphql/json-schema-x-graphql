import React from "react";
import { Box, Container, Paper, Stack, Text, Title } from "@mantine/core";
import { NextSeo } from "next-seo";
import { SEO } from "../../constants/seo";
import Layout from "../../layout/PageLayout";

const privacy: Record<string, string[]> = {
  "Information Collection": [
    "This is a government information system. Usage may be monitored and recorded.",
    "By using this system, you consent to such monitoring and recording.",
  ],
  "Data Usage": [
    "Data is used solely for authorized federal purposes.",
    "All data handling complies with federal privacy regulations.",
  ],
};

const Privacy = () => {
  return (
    <Layout>
      <NextSeo
        {...SEO}
        title="Privacy Policy - JSON Crack"
        description="JSON Crack Privacy Policy"
        canonical="https://jsoncrack.com/legal/privacy"
      />
      <Container my={50} size="md" pb="lg">
        <Paper bg="transparent">
          <Title ta="center" c="gray.8">
            Privacy Policy
          </Title>
          <Text c="gray.6" ta="center">
            Last updated: Feb 5, 2025
          </Text>

          <Stack mt={50} my="lg">
            {Object.keys(privacy).map((term, index) => (
              <Box component="section" mt="xl" key={index}>
                <Title order={2} mb="xl" c="gray.8">
                  {term}
                </Title>
                {privacy[term].map(term => (
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

export default Privacy;
