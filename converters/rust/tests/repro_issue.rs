use json_schema_graphql_converter::graphql_to_json::convert;
use json_schema_graphql_converter::types::ConversionOptions;

#[test]
fn test_repro_parsing_issue() {
    let schema = r#"
"Physical address"
type Address {
  city: String
  street: String
  zipCode: String @external
}

"Input for creating a user"
input UserInput {
  email: Email
  username: String
}

"User UI preferences"
type UserPreferences {
  notifications: Boolean
  theme: String
}

"Available user roles"
enum UserRole {
  ADMIN
  USER
  GUEST
}

"A comprehensive example schema demonstrating JSON Schema to GraphQL conversion with Federation support"
type User @key(fields: "id") {
  "User's email address"
email: Email!
  "Unique identifier for the user"
id: String!
  "Internal database ID, not exposed to subgraph"
internalId: String
  "User preferences (migrated from legacy service)"
preferences: UserPreferences
  "Features available to the user based on tier (requires 'tier' field)"
premiumFeatures: [String] @requires(fields: "tier")
  "User's role in the system"
role: UserRole!
  "User's shipping address"
shippingAddress: Address @provides(fields: "zipCode")
  "User's subscription tier (external field)"
tier: String @external
  "User's unique username"
username: String!
}
"#;

    let options = ConversionOptions::default();
    let result = convert(schema, &options);

    if let Err(e) = &result {
        println!("Error details: {:?}", e);
    }

    assert!(result.is_ok(), "Failed to parse schema: {:?}", result.err());
}
