# fix(converter): circular reference protection and enhanced $ref resolution

**Branch:** `fix/node-converter-circular-ref`
**Base:** `main`

## Summary

Implements three Node converter technical-debt fixes from `docs/plans/TECHNICAL_IMPROVEMENTS.md`.

## Changes

- **Circular Reference Protection**: Added `building: Set<string>` to `ConversionContext` and guard in `convertTypeDefinition()` that throws `ConversionError("CIRCULAR_REF")` for self-referencing types.
- **Enhanced `$ref` Resolution**: Added `tryGetProperty()` helper with case-insensitive fallback (`exact → camelToSnake → snakeToCamel`), recursive resolution during path walking, and final-node `$ref` chasing.
- **`$defs` Extraction**: Verified that `jsonSchemaToGraphQLInternal()` already processes `$defs` / `definitions` before the root type.
- **Tests**: Added 28 new tests in `improvements.test.ts` covering circular refs, case-mismatch resolution, and `$defs`.

## Verification

- `npx jest --no-coverage` in `converters/node` → 131 tests pass (7 suites)

## Related

- Addresses technical debt from `docs/plans/TECHNICAL_IMPROVEMENTS.md`
