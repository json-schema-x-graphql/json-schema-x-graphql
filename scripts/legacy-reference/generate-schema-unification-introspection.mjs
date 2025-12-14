#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { buildSchema, getIntrospectionQuery, graphql } from 'graphql';

export async function generateIntrospection({ sdlPath, outDir } = {}) {
  const schemaPath = sdlPath || path.join(process.cwd(), 'src', 'data', 'schema_unification.graphql');
  const outputDir = outDir || path.join(process.cwd(), 'public', 'data');
  const outputPath = path.join(outputDir, 'schema_unification-introspection.json');
  const sdlOutputPath = path.join(outputDir, 'schema_unification.graphql');

  const sdl = await fs.readFile(schemaPath, 'utf8');
  const schema = buildSchema(sdl);

  const result = await graphql({ schema, source: getIntrospectionQuery() });

  if (result.errors) {
    throw new Error(result.errors.map((error) => error.message).join('\n'));
  }

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
  await fs.writeFile(sdlOutputPath, sdl);

  // eslint-disable-next-line no-console
  console.log(`GraphQL introspection written to ${path.relative(process.cwd(), outputPath)}`);
  // eslint-disable-next-line no-console
  console.log(`GraphQL SDL copied to ${path.relative(process.cwd(), sdlOutputPath)}`);
  return { introspection: outputPath, sdl: sdlOutputPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateIntrospection().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[generate-schema_unification-introspection]', error);
    process.exit(1);
  });
}
