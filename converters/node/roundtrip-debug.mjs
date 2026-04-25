import { jsonSchemaToGraphQL, graphqlToJsonSchema } from './dist/converter.js';

const initial = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "User",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "name": { "type": "string", "minLength": 1 },
    "email": { "type": "string", "format": "email" },
    "age": { "type": "integer", "minimum": 0 },
    "tags": { "type": "array", "items": { "type": "string" } },
    "metadata": { "type": "object" }
  },
  "required": ["id", "name", "email"]
};

const g1 = jsonSchemaToGraphQL(initial);
const j1 = graphqlToJsonSchema(g1);
const g2 = jsonSchemaToGraphQL(j1);
const j2 = graphqlToJsonSchema(g2);

console.log('=== g1 ===\n' + g1);
console.log('\n=== g2 ===\n' + g2);
console.log('\ng1===g2:', g1 === g2);
console.log('j1===j2:', JSON.stringify(j1) === JSON.stringify(j2));

if (JSON.stringify(j1) !== JSON.stringify(j2)) {
  const k1 = Object.keys(j1);
  const k2 = Object.keys(j2);
  console.log('\nj1 keys:', k1);
  console.log('j2 keys:', k2);
  for (const k of new Set([...k1, ...k2])) {
    const v1 = JSON.stringify(j1[k]);
    const v2 = JSON.stringify(j2[k]);
    if (v1 !== v2) console.log(`DIFF[${k}]:`, v1, '→', v2);
  }
}
