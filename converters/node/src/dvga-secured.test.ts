import { jsonSchemaToGraphQL } from "./converter";
import { readFileSync } from "fs";
import { join } from "path";

describe("DVGA Secured Schema Conversion", () => {
  test("generates security directives correctly", () => {
    const schemaPath = join(__dirname, "../../../examples/dvga-secured.schema.json");
    const jsonSchema = JSON.parse(readFileSync(schemaPath, "utf-8"));
    
    const sdl = jsonSchemaToGraphQL(jsonSchema, { includeOperationalTypes: true });
    
    // Check Root Query protections
    expect(sdl).toContain('me: User @authenticated');
    expect(sdl).toContain('auditLogs: [AuditLog] @requiresScopes(scopes: [["read:admin", "read:audit"]])');
    expect(sdl).toContain('document(id: string): Document');
    
    // Check Root Mutation protections
    expect(sdl).toContain('deleteUser(id: string): Boolean @requiresScopes(scopes: [["write:admin"]])');
    expect(sdl).toContain('generateExpensiveReport: String @authenticated');
    
    // Check Type/Field level protections
    expect(sdl).toContain('type Document @policy(policies: [["viewer_can_read_document"]]) @key(fields: "id")');
    
    // Ensure inaccessible works
    expect(sdl).toContain('privateToken: String @inaccessible');
  });
});
