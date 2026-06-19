#!/usr/bin/env node

// Simple test script for GraphQL Mesh federation
const fetch = require("node-fetch");

async function testFederation() {
  try {
    const response = await fetch("http://localhost:5052/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "{ __typename }",
      }),
    });

    const result = await response.json();
    console.log("Federation test result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Federation test failed:", error.message);
  }
}

testFederation();
