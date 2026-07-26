//! Apollo Federation v2.9 directive definitions and helpers.
//!
//! Provides the complete set of Federation directive SDL definitions
//! that can be injected into a schema when missing, plus a helper to
//! produce the `@link` import line.

/// Federation spec version emitted by this library.
pub const FEDERATION_VERSION: &str = "2.9";

/// Standard federation imports used in `@link`.
pub const FEDERATION_IMPORTS: &[&str] = &[
    "@key",
    "@shareable",
    "@external",
    "@provides",
    "@requires",
    "@override",
    "@inaccessible",
    "@tag",
    "@interfaceObject",
    "@authenticated",
    "@requiresScopes",
    "@policy",
    "@cost",
    "@listSize",
];

/// Produce the `extend schema @link(...)` line for Federation.
pub fn federation_link_directive() -> String {
    let imports = FEDERATION_IMPORTS
        .iter()
        .map(|i| format!("\"{}\"", i))
        .collect::<Vec<_>>()
        .join(", ");
    format!(
        "extend schema @link(url: \"https://specs.apollo.dev/federation/v{}\", import: [{}])",
        FEDERATION_VERSION, imports
    )
}

/// Complete Federation v2.9 directive SDL definitions.
///
/// Includes the standard Apollo Federation directives plus
/// custom production directives (@constraint, @cache, @authorize,
/// @mask, @rateLimit) that complement the federation spec.
///
/// Callers can inject this block into an SDL string when the
/// schema does not already contain these definitions.
pub const FEDERATION_DIRECTIVES_SDL: &str = r#"
scalar FieldSet
scalar link__Import

enum link__Purpose {
  """
  `SECURITY` features provide metadata necessary to securely resolve fields.
  """
  SECURITY

  """
  `EXECUTION` features provide metadata necessary for operation execution.
  """
  EXECUTION
}

directive @key(fields: FieldSet!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
directive @requires(fields: FieldSet!) on FIELD_DEFINITION
directive @provides(fields: FieldSet!) on FIELD_DEFINITION
directive @external(reason: String) on FIELD_DEFINITION | OBJECT
directive @shareable on FIELD_DEFINITION | OBJECT
directive @link(url: String!, as: String, for: link__Purpose, import: [link__Import]) repeatable on SCHEMA
directive @tag(name: String!) repeatable on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
directive @override(from: String!, label: String) on FIELD_DEFINITION
directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
directive @interfaceObject on OBJECT
directive @composeDirective(name: String) repeatable on SCHEMA
directive @authenticated on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM
directive @requiresScopes(scopes: [[String!]!]!) on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM
directive @policy(policies: [[String!]!]!) on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM
directive @cost(weight: Int!) on ARGUMENT_DEFINITION | ENUM | FIELD_DEFINITION | INPUT_FIELD_DEFINITION | OBJECT | SCALAR
directive @listSize(assumedSize: Int, slicingArguments: [String!], sizedFields: [String!], requireOneSlicingArgument: Boolean = true) on FIELD_DEFINITION

# Custom validation and performance directives
directive @constraint(pattern: String, min: Int, max: Int, minLength: Int, maxLength: Int) on FIELD_DEFINITION | ARGUMENT_DEFINITION
directive @cache(ttl: Int, scope: String) on FIELD_DEFINITION | OBJECT
directive @authorize(requires: String, roles: [String], scopes: [String]) on FIELD_DEFINITION | OBJECT | INTERFACE
directive @mask(pattern: String, if: String, value: String, maskLevel: String, maskFor: [String]) on FIELD_DEFINITION
directive @rateLimit(limit: Int, window: String, roles: [String]) on FIELD_DEFINITION
"#;

/// Check whether an SDL string already contains federation directive
/// definitions (heuristic: looks for `directive @key`).
pub fn sdl_has_federation_directives(sdl: &str) -> bool {
    sdl.contains("directive @key")
        || sdl.contains("directive @shareable")
        || sdl.contains("directive @link")
}

/// Inject federation directive definitions into an SDL string if they
/// are not already present. The directives are prepended before the
/// existing SDL content.
pub fn ensure_federation_directives(sdl: &str) -> String {
    if sdl_has_federation_directives(sdl) {
        return sdl.to_string();
    }
    // Remove any existing @link line to avoid conflicts, then prepend.
    let cleaned = sdl
        .lines()
        .filter(|l| !l.trim().starts_with("extend schema @link"))
        .collect::<Vec<_>>()
        .join("\n");
    format!("{}\n{}", FEDERATION_DIRECTIVES_SDL.trim(), cleaned.trim())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_federation_link_directive() {
        let link = federation_link_directive();
        assert!(link.contains("@link"));
        assert!(link.contains(FEDERATION_VERSION));
        assert!(link.contains("@key"));
    }

    #[test]
    fn test_sdl_has_federation_directives() {
        assert!(sdl_has_federation_directives(
            "directive @key(fields: FieldSet!) on OBJECT"
        ));
        assert!(sdl_has_federation_directives(
            "directive @shareable on FIELD_DEFINITION"
        ));
        assert!(!sdl_has_federation_directives("type User { id: ID! }"));
    }

    #[test]
    fn test_ensure_federation_directives_adds_when_missing() {
        let sdl = "type User { id: ID! }";
        let result = ensure_federation_directives(sdl);
        assert!(result.contains("directive @key"));
        assert!(result.contains("type User"));
    }

    #[test]
    fn test_ensure_federation_directives_noop_when_present() {
        let sdl = "directive @key(fields: FieldSet!) on OBJECT\ntype User { id: ID! }";
        let result = ensure_federation_directives(sdl);
        assert_eq!(result, sdl);
    }
}
