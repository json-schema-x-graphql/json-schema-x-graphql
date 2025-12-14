import React from "react";
import { Container, Divider, Text } from "@mantine/core";
import dayjs from "dayjs";

export const Footer = () => {
  return (
    <Container w="100%" mt={60} px={60} pb="xl" bg="black" fluid>
      <Divider color="gray.3" mb="xl" mx={-60} />
      <Text fz="sm" c="dimmed" ta="center">
        © {dayjs().get("year")} GSA Technology Transformation Services
      </Text>
    </Container>
  );
};
