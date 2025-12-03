export const federationDirectives = `
scalar FieldSet
scalar _Any

directive @external on FIELD_DEFINITION | OBJECT
directive @requires(fields: FieldSet!) on FIELD_DEFINITION
directive @provides(fields: FieldSet!) on FIELD_DEFINITION
directive @key(fields: FieldSet!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
directive @shareable on OBJECT | FIELD_DEFINITION
directive @tag(name: String!) repeatable on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
directive @override(from: String!) on FIELD_DEFINITION
directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
directive @extends on OBJECT | INTERFACE
directive @composeDirective(name: String!) repeatable on SCHEMA
directive @interfaceObject on OBJECT
directive @authenticated on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM
directive @requiresScopes(scopes: [[Scope!]!]!) on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM

scalar Scope

# Common Custom Scalars
scalar Email
scalar DateTime
scalar Date
scalar JSON
scalar JSONObject
scalar URL
scalar Decimal
`;
