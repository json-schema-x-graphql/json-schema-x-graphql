import { describe, it, expect } from "vitest";
import { buildSchema, parse } from "graphql";
import { federationDirectives } from "./federation-directives";

// The SDL provided by the user in the issue report
const USER_PROVIDED_SDL = `
"""
Physical address
"""
type Address {
  city: String
  street: String
  zipCode: String @external
}

"""
Input for creating a user
"""
input UserInput {
  email: Email
  username: String
}

"""
User UI preferences
"""
type UserPreferences {
  notifications: Boolean
  theme: String
}

"""
Available user roles
"""
enum UserRole {
  ADMIN
  USER
  GUEST
}

"""
A comprehensive example schema demonstrating JSON Schema to GraphQL conversion with Federation support
"""
type User @key(fields: "id") {
  """
User's email address
"""
email: Email! @authenticated
  """
Unique identifier for the user
"""
id: String!
  """
Internal database ID, not exposed to subgraph
"""
internalId: String @inaccessible
  """
User preferences (migrated from legacy service)
"""
preferences: UserPreferences @override(from: "legacy-user-service")
  """
Features available to the user based on tier (requires 'tier' field)
"""
premiumFeatures: [String] @requires(fields: "tier")
  """
User's role in the system
"""
role: UserRole!
  """
User's shipping address
"""
shippingAddress: Address @provides(fields: "zipCode")
  """
User's subscription tier (external field)
"""
tier: String @external
  """
User's unique username
"""
username: String! @shareable
}
`;

describe("User Provided Reproduction Case", () => {
  it("should parse successfully as raw SDL (syntax check)", () => {
    // This checks basic syntax validity (braces, placement of directives, etc.)
    expect(() => parse(USER_PROVIDED_SDL)).not.toThrow();
  });

  it("should build a valid schema when federation directives are included", () => {
    // The editor likely composes these together. We simulate that here.
    // Note: federationDirectives now includes common scalars like Email
    const fullSdl = `
      ${federationDirectives}
      ${USER_PROVIDED_SDL}
    `;

    expect(() => {
      buildSchema(fullSdl);
    }).not.toThrow();
  });

  it("should validate schema with single-line comments (new converter format)", () => {
    // The updated Rust converter now outputs # comments for descriptions
    // to avoid block-string parsing issues in the editor.
    const singleLineCommentSdl = `
      # Physical address
      type Address {
        city: String
        street: String
      }
    `;

    expect(() => parse(singleLineCommentSdl)).not.toThrow();
    expect(() => buildSchema(singleLineCommentSdl)).not.toThrow();
  });

  it("should correctly parse specific federation directives", () => {
    const doc = parse(USER_PROVIDED_SDL);
    const userType = doc.definitions.find((def: any) => def.name.value === "User") as any;

    expect(userType).toBeDefined();

    // Check @key directive on the type itself
    const keyDirective = userType.directives.find((d: any) => d.name.value === "key");
    expect(keyDirective).toBeDefined();
    expect(keyDirective.arguments[0].name.value).toBe("fields");
    expect(keyDirective.arguments[0].value.value).toBe("id");

    // Check @authenticated on email field
    const emailField = userType.fields.find((f: any) => f.name.value === "email");
    expect(emailField.directives.some((d: any) => d.name.value === "authenticated")).toBe(true);

    // Check @inaccessible on internalId field
    const internalIdField = userType.fields.find((f: any) => f.name.value === "internalId");
    expect(internalIdField.directives.some((d: any) => d.name.value === "inaccessible")).toBe(true);

    // Check @override on preferences field
    const preferencesField = userType.fields.find((f: any) => f.name.value === "preferences");
    expect(preferencesField.directives.some((d: any) => d.name.value === "override")).toBe(true);
  });
});
