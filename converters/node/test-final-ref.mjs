import { jsonSchemaToGraphQL } from "./dist/converter.js";

const schema = {
  type: "object",
  "x-graphql-type-name": "Root",
  properties: {
    address: { $ref: "#/$defs/AddressRef" },
  },
  $defs: {
    AddressRef: {
      $ref: "#/$defs/Address",
      "x-graphql-type-name": "AddressRef",
    },
    Address: {
      type: "object",
      "x-graphql-type-name": "Address",
      properties: {
        street: { type: "string" },
      },
    },
  },
};

const result = jsonSchemaToGraphQL(schema);
console.log(result);
