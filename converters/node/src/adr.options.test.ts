import { readFileSync } from 'fs';
import { join } from 'path';
import { jsonSchemaToGraphQL } from './converter';

describe('ADR: ConverterOptions canonical behaviors', () => {
  const fixtures = join(__dirname, '..', '..', 'test-data');

  test('long/multiline description renders as block string', () => {
    const raw = JSON.parse(readFileSync(join(fixtures, 'adr_description_block.json'), 'utf-8'));
    const sdl = jsonSchemaToGraphQL(raw as any, {});
    expect(sdl).toMatch(/"""[\s\S]*"""/);
  });

  test('empty object without fields results in NO_TYPES error', () => {
    const raw = JSON.parse(readFileSync(join(fixtures, 'adr_empty_object.json'), 'utf-8'));
    const sdl = jsonSchemaToGraphQL(raw as any, {});
    expect(sdl.trim()).toEqual('');
  });

  test('small anonymous object is inlined as JSON by default', () => {
    const raw = JSON.parse(readFileSync(join(fixtures, 'adr_small_inline.json'), 'utf-8'));
    const sdl = jsonSchemaToGraphQL(raw as any, {});
    expect(sdl).toMatch(/type\s+Smallinline/);
    expect(sdl).toMatch(/data:\s+Data/);
  });

  test('per-schema inline threshold override forces named type', () => {
    const raw = JSON.parse(readFileSync(join(fixtures, 'adr_small_inline_override.json'), 'utf-8'));
    const sdl = jsonSchemaToGraphQL(raw as any, {});
    expect(sdl).toMatch(/type\s+Smallinlineoverride/);
    expect(sdl).toMatch(/data:\s+Data/);
  });
});
