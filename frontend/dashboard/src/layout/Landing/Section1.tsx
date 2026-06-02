import React from "react";
import Link from "next/link";
import {
  Container,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Button,
  Card,
  Group,
  Badge,
} from "@mantine/core";
import { FaBook, FaFileAlt, FaChevronRight } from "react-icons/fa";

interface Section1Props {
  docs?: string[];
}

const formatTitle = (slug: string) => {
  const parts = slug.split("/");
  const filename = parts[parts.length - 1];
  return filename.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const getDocsByPrefix = (docs: string[], prefix: string, limit = 5) => {
  return docs
    .filter((d) => d.startsWith(prefix) && d !== prefix)
    .sort()
    .slice(0, limit);
};

export const Section1: React.FC<Section1Props> = ({ docs = [] }) => {
  const adrDocs = getDocsByPrefix(docs, "adr/");
  const schemaDocs = getDocsByPrefix(docs, "schema/");
  const mappingDocs = getDocsByPrefix(docs, "mappings/");
  const implementationDocs = getDocsByPrefix(docs, "implementation/");
  const processDocs = getDocsByPrefix(docs, "process/");
  const externalDocs = getDocsByPrefix(docs, "external/");

  return (
    <Container size="xl" py="80">
      <Title
        lh="1.1"
        fz={{
          base: 26,
          xs: 46,
          sm: 52,
        }}
        maw="20ch"
        ta="center"
        order={2}
        c="gray.9"
        mx="auto"
        mb="15"
      >
        Unified Government Contract Data
      </Title>
      <Title
        order={3}
        fw={400}
        c="gray.7"
        px="lg"
        mx="auto"
        ta="center"
        mb={50}
        fz={{ base: 16, sm: 18 }}
        w={{ base: "100%", md: "600" }}
      >
        The Schema Unification Forest project transforms complex government procurement data from
        multiple systems into a unified, interactive visualization platform for better analysis and
        insights.
      </Title>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mt="xl">
        <Stack
          p="lg"
          m="lg"
          maw="360"
          mx="auto"
          style={{
            borderRadius: "17px",
            border: "1px solid #e0e0e0",
          }}
        >
          <Title ta="center" c="black" order={3}>
            Explore Contract Data
          </Title>
          <Text ta="center" c="gray.7">
            Access normalized contract data from Contract Data, Legacy Procurement, and EASi systems
            through our interactive visualizations and exportable reports.
          </Text>
        </Stack>

        <Stack
          p="lg"
          m="lg"
          maw="360"
          mx="auto"
          style={{
            borderRadius: "17px",
            border: "1px solid #e0e0e0",
          }}
        >
          <Title ta="center" c="black" order={3}>
            Understand Schema
          </Title>
          <Text ta="center" c="gray.7">
            Explore the unified schema that normalizes data across government contract systems for
            consistent analysis.
          </Text>
        </Stack>

        <Stack
          p="lg"
          m="lg"
          maw="360"
          mx="auto"
          style={{
            borderRadius: "17px",
            border: "1px solid #e0e0e0",
          }}
        >
          <Title ta="center" c="black" order={3}>
            Interactive Analysis
          </Title>
          <Text ta="center" c="gray.7">
            Navigate through complex contract relationships, export visualizations, and gain
            insights into government procurement processes.
          </Text>
        </Stack>
      </SimpleGrid>

      {/* Documentation Section */}
      <Title order={2} fw={600} c="gray.9" ta="center" mt={80} mb={30} fz={{ base: 24, sm: 32 }}>
        <FaBook style={{ display: "inline", marginRight: "12px" }} />
        Documentation & Resources
      </Title>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" mt="xl">
        {/* Documentation Index */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="lg">
              Documentation Index
            </Text>
            <Badge color="teal" variant="light">
              Docs
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            Browse all documentation and archived content generated from markdown files.
          </Text>
          <Stack gap="xs">
            <Button
              component={Link}
              href="/docs"
              variant="subtle"
              size="xs"
              leftSection={<FaFileAlt />}
              rightSection={<FaChevronRight size={12} />}
              justify="space-between"
              fullWidth
            >
              View All Documentation
            </Button>

            <Button
              component={Link}
              href="/docs/archived"
              variant="subtle"
              size="xs"
              leftSection={<FaFileAlt />}
              rightSection={<FaChevronRight size={12} />}
              justify="space-between"
              fullWidth
            >
              View Archived Docs
            </Button>
          </Stack>
        </Card>

        {/* ADR Section */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="lg">
              Architecture Decisions
            </Text>
            <Badge color="blue" variant="light">
              ADR
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            Architectural Decision Records documenting key technical choices and their rationale.
          </Text>
          <Stack gap="xs">
            {adrDocs.map((doc) => (
              <Button
                key={doc}
                component={Link}
                href={`/docs/${doc}`}
                variant="subtle"
                size="xs"
                leftSection={<FaFileAlt />}
                rightSection={<FaChevronRight size={12} />}
                justify="space-between"
                fullWidth
              >
                {formatTitle(doc)}
              </Button>
            ))}
            <Button component={Link} href="/docs/adr" variant="light" size="xs" mt="xs" fullWidth>
              View All ADRs
            </Button>
          </Stack>
        </Card>

        {/* Schema Documentation */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="lg">
              Schema Documentation
            </Text>
            <Badge color="green" variant="light">
              Guides
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            Comprehensive guides for understanding and working with the Schema Unification Forest
            schemas.
          </Text>
          <Stack gap="xs">
            {schemaDocs.map((doc) => (
              <Button
                key={doc}
                component={Link}
                href={`/docs/${doc}`}
                variant="subtle"
                size="xs"
                leftSection={<FaFileAlt />}
                rightSection={<FaChevronRight size={12} />}
                justify="space-between"
                fullWidth
              >
                {formatTitle(doc)}
              </Button>
            ))}
            <Button
              component={Link}
              href="/docs/schema"
              variant="light"
              size="xs"
              mt="xs"
              fullWidth
            >
              View Schema Docs
            </Button>
          </Stack>
        </Card>

        {/* System Mappings */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="lg">
              System Mappings
            </Text>
            <Badge color="violet" variant="light">
              Mappings
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            Documentation on how different government systems map to the Schema Unification schema.
          </Text>
          <Stack gap="xs">
            {mappingDocs.map((doc) => (
              <Button
                key={doc}
                component={Link}
                href={`/docs/${doc}`}
                variant="subtle"
                size="xs"
                leftSection={<FaFileAlt />}
                rightSection={<FaChevronRight size={12} />}
                justify="space-between"
                fullWidth
              >
                {formatTitle(doc)}
              </Button>
            ))}
            <Button
              component={Link}
              href="/docs/mappings"
              variant="light"
              size="xs"
              mt="xs"
              fullWidth
            >
              View Mappings
            </Button>
          </Stack>
        </Card>

        {/* Additional Resources */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="lg">
              Implementation Details
            </Text>
            <Badge color="orange" variant="light">
              Technical
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            Technical documentation on schema management, transformations, and tooling.
          </Text>
          <Stack gap="xs">
            {implementationDocs.map((doc) => (
              <Button
                key={doc}
                component={Link}
                href={`/docs/${doc}`}
                variant="subtle"
                size="xs"
                leftSection={<FaFileAlt />}
                rightSection={<FaChevronRight size={12} />}
                justify="space-between"
                fullWidth
              >
                {formatTitle(doc)}
              </Button>
            ))}
            <Button
              component={Link}
              href="/docs/implementation"
              variant="light"
              size="xs"
              mt="xs"
              fullWidth
            >
              View Implementation Docs
            </Button>
          </Stack>
        </Card>

        {/* Process & History */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="lg">
              Process & History
            </Text>
            <Badge color="gray" variant="light">
              Info
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            Understanding the evolution and development process of the Schema Unification Forest
            project.
          </Text>
          <Stack gap="xs">
            {processDocs.map((doc) => (
              <Button
                key={doc}
                component={Link}
                href={`/docs/${doc}`}
                variant="subtle"
                size="xs"
                leftSection={<FaFileAlt />}
                rightSection={<FaChevronRight size={12} />}
                justify="space-between"
                fullWidth
              >
                {formatTitle(doc)}
              </Button>
            ))}
            <Button
              component={Link}
              href="/docs/process"
              variant="light"
              size="xs"
              mt="xs"
              fullWidth
            >
              View Process Docs
            </Button>
          </Stack>
        </Card>

        {/* Related Documentation */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="lg">
              External Systems
            </Text>
            <Badge color="pink" variant="light">
              Reference
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mb="md">
            Documentation about external government systems and data sources.
          </Text>
          <Stack gap="xs">
            {externalDocs.map((doc) => (
              <Button
                key={doc}
                component={Link}
                href={`/docs/${doc}`}
                variant="subtle"
                size="xs"
                leftSection={<FaFileAlt />}
                rightSection={<FaChevronRight size={12} />}
                justify="space-between"
                fullWidth
              >
                {formatTitle(doc)}
              </Button>
            ))}
            <Button
              component={Link}
              href="/docs/external"
              variant="light"
              size="xs"
              mt="xs"
              fullWidth
            >
              View External Docs
            </Button>
          </Stack>
        </Card>
      </SimpleGrid>

      {/* Category-level shortcuts (compact) */}
      <Title order={3} fw={500} c="gray.8" ta="center" mt={60} mb={12} fz={{ base: 18, sm: 20 }}>
        Documentation Sections
      </Title>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" mt="xs">
        <Card shadow="xs" padding="sm" radius="md" withBorder>
          <Text fw={600} mb="xs">
            Docs Index
          </Text>
          <Text size="sm" c="dimmed" mb="xs">
            All docs generated from markdown files.
          </Text>
          <Button component={Link} href="/docs" variant="subtle" size="xs" fullWidth>
            View Docs Index
          </Button>
        </Card>

        <Card shadow="xs" padding="sm" radius="md" withBorder>
          <Text fw={600} mb="xs">
            Architecture Decisions (ADR)
          </Text>
          <Text size="sm" c="dimmed" mb="xs">
            Key architectural decisions and rationale.
          </Text>
          <Button component={Link} href="/docs/adr/" variant="subtle" size="xs" fullWidth>
            View ADRs
          </Button>
        </Card>

        <Card shadow="xs" padding="sm" radius="md" withBorder>
          <Text fw={600} mb="xs">
            Schema Documentation
          </Text>
          <Text size="sm" c="dimmed" mb="xs">
            Guides and references for schema authors.
          </Text>
          <Button component={Link} href="/docs/schema/" variant="subtle" size="xs" fullWidth>
            View Schema Docs
          </Button>
        </Card>

        <Card shadow="xs" padding="sm" radius="md" withBorder>
          <Text fw={600} mb="xs">
            System Mappings
          </Text>
          <Text size="sm" c="dimmed" mb="xs">
            How external systems map into the Schema Unification schema.
          </Text>
          <Button component={Link} href="/docs/mappings/" variant="subtle" size="xs" fullWidth>
            View Mappings
          </Button>
        </Card>

        <Card shadow="xs" padding="sm" radius="md" withBorder>
          <Text fw={600} mb="xs">
            External Systems
          </Text>
          <Text size="sm" c="dimmed" mb="xs">
            References for external data sources and integrations.
          </Text>
          <Button component={Link} href="/docs/external/" variant="subtle" size="xs" fullWidth>
            View External Docs
          </Button>
        </Card>

        <Card shadow="xs" padding="sm" radius="md" withBorder>
          <Text fw={600} mb="xs">
            Implementation
          </Text>
          <Text size="sm" c="dimmed" mb="xs">
            Technical implementation notes and guides.
          </Text>
          <Button
            component={Link}
            href="/docs/implementation/"
            variant="subtle"
            size="xs"
            fullWidth
          >
            View Implementation Docs
          </Button>
        </Card>

        <Card shadow="xs" padding="sm" radius="md" withBorder>
          <Text fw={600} mb="xs">
            Process & History
          </Text>
          <Text size="sm" c="dimmed" mb="xs">
            Project evolution, decisions, and quick-starts.
          </Text>
          <Button component={Link} href="/docs/process/" variant="subtle" size="xs" fullWidth>
            View Process Docs
          </Button>
        </Card>
      </SimpleGrid>
    </Container>
  );
};
