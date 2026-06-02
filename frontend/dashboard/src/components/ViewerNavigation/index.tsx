import Link from "next/link";
import { Button, Flex, Text } from "@mantine/core";
import styled from "styled-components";
import { FaArrowLeft, FaChevronRight, FaChevronDown } from "react-icons/fa6";

const StyledNavigation = styled.nav`
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 1000;
  background: ${({ theme }) => theme.BACKGROUND_PRIMARY || "rgba(255, 255, 255, 0.95)"};
  color: ${({ theme }) => theme.TEXT_NORMAL || "#000"};
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 8px;
  border: 1px solid ${({ theme }) => theme.GRID_COLOR_PRIMARY || "rgba(0, 0, 0, 0.1)"};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  @media (prefers-color-scheme: dark) {
    background: ${({ theme }) => theme.BACKGROUND_SECONDARY || "rgba(30, 30, 30, 0.95)"};
    border-color: ${({ theme }) => theme.SILVER_DARK || "rgba(255, 255, 255, 0.1)"};
  }
`;

interface ViewerNavigationProps {
  currentViewer: "data" | "schema" | "editor";
}

const examples: any[] = [];

export const ViewerNavigation = ({ currentViewer }: ViewerNavigationProps) => {
  const getNavigationItems = () => {
    switch (currentViewer) {
      case "schema":
        return [{ path: "/editor", label: "Editor" }];
      case "editor":
        return [{ path: "/schema_unification-schema-viewer", label: "Schema Viewer" }];
      default:
        return [];
    }
  };

  const handleExampleSelect = async (fileName: string, label: string) => {
    // Example loading/navigation to the standalone data viewer has been removed.
    // This function is intentionally disabled to avoid referencing the removed data viewer.
    if (typeof window !== "undefined") {
      console.warn("Example selection is disabled. Data viewer navigation has been removed.");
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <StyledNavigation>
      <Flex gap="xs" align="center">
        <Link href="/" passHref>
          <Button variant="subtle" size="xs" leftSection={<FaArrowLeft />} color="gray">
            Home
          </Button>
        </Link>
        {navigationItems.map((item, index) => (
          <div key={`nav-item-${index}`}>
            <Text size="xs" color="dimmed">
              |
            </Text>
            <Link href={item.path} passHref>
              <Button variant="subtle" size="xs" leftSection={<FaChevronRight />} color="blue">
                {item.label}
              </Button>
            </Link>
          </div>
        ))}
        <Text size="xs" color="dimmed">
          |
        </Text>
        <Button variant="subtle" size="xs" color="gray" leftSection={<FaChevronDown />} disabled>
          Examples
        </Button>
      </Flex>
    </StyledNavigation>
  );
};
