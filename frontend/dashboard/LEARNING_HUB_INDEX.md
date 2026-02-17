# Learning Hub Index

Welcome to the json-schema-x-graphql learning hub. This is your comprehensive guide to understanding how GraphQL and JSON Schema concepts map to each other, and how json-schema-x-graphql bridges the gap.

---

## Quick Start

**New here?** Start with [Module 1: Introducing Types](/learning/01-introducing-types) for a 12-minute overview of the fundamentals.

**In a hurry?** Check the [Quick Reference Guide](/dashboard/QUICK_REFERENCE.md) for a one-page lookup.

**Know GraphQL?** Jump to the module you need using the [Module Map](#module-map) below.

---

## What is json-schema-x-graphql?

json-schema-x-graphql is a tool that converts between two fundamental schema formats:

- **GraphQL Schema Definition Language (SDL)** - Used by GraphQL APIs to describe data
- **JSON Schema** - A standard format for describing JSON data

### Why This Matters

| Format          | Strengths                                        | Use Cases                              |
| --------------- | ------------------------------------------------ | -------------------------------------- |
| **GraphQL**     | Query language built-in, typed fields, auto-docs | APIs, real-time data, flexible queries |
| **JSON Schema** | Validation, data generation, language-agnostic   | APIs, data pipelines, documentation    |

The converter lets you:

- 📊 Build GraphQL APIs with JSON Schema validation
- 🔄 Generate GraphQL from JSON schemas
- 📝 Document data in multiple formats
- 🎯 Use the best tool for your use case

---

## Learning Path

### For Beginners (No Prior Knowledge)

1. **[Introducing Types](/learning/01-introducing-types)** (12 min)
   - Understand what types are
   - Learn object types vs scalar types
   - See how Query type works
   - MapGraphQL → JSON Schema concepts

2. **[Scalars, Objects, Lists](/learning/02-scalars-objects-lists)** (15 min)
   - Deep dive into 5 built-in scalars
   - When to use each scalar type
   - How to build lists
   - Real-world examples

3. **[Nullability](/learning/03-nullability)** (10 min)
   - Required vs optional fields
   - Understanding the `!` operator
   - Nullability in JSON Schema
   - Best practices for data integrity

4. **[Querying Between Types](/learning/04-querying-between-types)** (14 min)
   - How types relate to each other
   - Building complex queries
   - Graph traversal
   - Practical examples

**Checkpoint**: You now understand the fundamentals! Try the [Type Visualizer](/tools/type-visualizer) tool.

### For Intermediate Users

5. **[Schema](/learning/05-schema)** (13 min)
   - What makes a complete schema
   - Schema introspection
   - Adding documentation
   - Building incrementally

6. **[Enums](/learning/06-enums)** (11 min)
   - Restricting values to specific options
   - Type safety with enums
   - Real-world patterns
   - Migration strategies

7. **[Interfaces & Unions](/learning/07-interfaces-unions)** (16 min)
   - Polymorphism with interfaces
   - Type alternatives with unions
   - Querying polymorphic types
   - Advanced composition

**Checkpoint**: You can build sophisticated, flexible schemas. Try the [Schema Converter](/tools/schema-converter) tool.

### For Advanced Users

8. **[Arguments](/learning/08-arguments)** (14 min)
   - Parameterizing your queries
   - Input types for complex data
   - Variables for reusable queries
   - Default values
   - Multiple arguments

9. **[Mutations](/learning/09-mutations)** (13 min)
   - Write operations (not just read)
   - Mutation return types
   - Status and error handling
   - Real-world patterns

**Checkpoint**: You're ready to build production schemas! Try the [Query Builder](/tools/query-builder) tool.

---

## Module Map

All 9 modules with prerequisites and key topics:

### Module 1: Introducing Types ✓

- **Prerequisites**: None
- **Topics**:
  - What are GraphQL types?
  - Object types vs scalar types
  - The Query type as gateway
  - JSON Schema equivalents
  - Mapping GraphQL ↔ JSON Schema
- **Time**: 12 minutes
- **Read**: [Full module](/learning/01-introducing-types)

### Module 2: Scalars, Objects, and Lists ✓

- **Prerequisites**: Module 1
- **Topics**:
  - String, Int, Float, Boolean, ID
  - When to use each scalar
  - Object types containing scalars
  - The List type `[]`
  - Array handling in JSON Schema
  - Real-world examples
- **Time**: 15 minutes
- **Read**: [Full module](/learning/02-scalars-objects-lists)

### Module 3: Nullability ⏳

- **Prerequisites**: Module 2
- **Topics**:
  - What is null in data?
  - Non-null type marker `!`
  - Required vs optional fields
  - Nullability combinations
  - JSON Schema required arrays
  - Data integrity best practices
- **Time**: 10 minutes
- **Coming Soon**

### Module 4: Querying Between Types ⏳

- **Prerequisites**: Module 2
- **Topics**:
  - Object type relationships
  - The "graph" concept
  - Traversing type relationships
  - Building complex queries
  - JSON Schema `$ref` and nesting
  - Circular references
- **Time**: 14 minutes
- **Coming Soon**

### Module 5: Schema ⏳

- **Prerequisites**: Module 3
- **Topics**:
  - Schema as contract
  - Schema structure and organization
  - Introspection capabilities
  - Annotating with descriptions
  - Designing for evolution
  - Building incrementally
- **Time**: 13 minutes
- **Coming Soon**

### Module 6: Enums ⏳

- **Prerequisites**: Module 2
- **Topics**:
  - What are enums?
  - Restricting values
  - Type safety benefits
  - SCREAMING_SNAKE_CASE convention
  - Real-world enum examples
  - Migration strategies
- **Time**: 11 minutes
- **Coming Soon**

### Module 7: Interfaces & Unions ⏳

- **Prerequisites**: Module 4
- **Topics**:
  - Interfaces for shared fields
  - Unions for type alternatives
  - Implementing interfaces
  - `__typename` for identification
  - Querying polymorphic types
  - Fragments for conditional queries
  - JSON Schema composition (`allOf`, `oneOf`, `anyOf`)
- **Time**: 16 minutes
- **Coming Soon**

### Module 8: Arguments ⏳

- **Prerequisites**: Module 3
- **Topics**:
  - Field arguments and parameters
  - Input types for complex data
  - Variables and placeholders
  - Multiple arguments on one field
  - Default values
  - Query variables
- **Time**: 14 minutes
- **Coming Soon**

### Module 9: Mutations ⏳

- **Prerequisites**: Module 8
- **Topics**:
  - Query vs Mutation
  - Write operations
  - Mutation return types
  - Status and error responses
  - Side effects and consistency
  - Real-world patterns
- **Time**: 13 minutes
- **Coming Soon**

---

## Interactive Tools

### Type Visualizer

Visually see how your types relate to each other.

**Use when**: You want to understand type relationships  
**Try it**: [Open Type Visualizer](/tools/type-visualizer)

### Schema Converter

Convert between GraphQL SDL and JSON Schema formats.

**Use when**: You need to convert between formats  
**Try it**: [Open Schema Converter](/tools/schema-converter)

### Query Builder

Interactively build GraphQL queries from a schema.

**Use when**: You want to practice building queries  
**Try it**: [Open Query Builder](/tools/query-builder)

### Validation Tools

Check if your schema is valid.

**GraphQL Validator**: [Validate GraphQL SDL](/tools/validate-graphql)  
**JSON Schema Validator**: [Validate JSON Schema](/tools/validate-json-schema)

### Code Examples

Searchable database of real-world schema examples.

**Browse**: [View Examples](/examples)

---

## Common Questions

### How long does it take to learn?

- **Basics (Modules 1-2)**: ~30 minutes
- **Fundamentals (Modules 1-4)**: ~1 hour
- **Comprehensive (All 9 modules)**: ~2 hours
- **With exercises & practice**: ~3-4 hours

### Do I need to know GraphQL already?

**No!** This learning hub starts from the beginning. You'll learn GraphQL concepts alongside JSON Schema equivalents.

### What if I only care about GraphQL (or JSON Schema)?

You can focus on just the GraphQL OR just the JSON Schema section of each module. The mapping sections help you understand connections.

### Can I use this for interviews?

Absolutely! The modules cover concepts that come up frequently in technical interviews. The Quick Reference is a great study guide.

### Where can I see real examples?

Check the [Code Examples](/examples) section, where each module has real-world examples you can copy.

### What if I get stuck?

1. **Read the module again** - Sometimes a second read clicks
2. **Try the exercises** - Practice solidifies understanding
3. **Use the tools** - Visualizers help concepts click
4. **Check the FAQ** - Common problems have answers
5. **Ask for help** - [Open a discussion](https://github.com/json-schema-x-graphql/discussions)

---

## Study Strategies

### Strategy 1: Module-by-Module

Read one module per session, complete the exercises, try the tools.
**Time**: ~2 hours spread over days
**Best for**: Thorough learning

### Strategy 2: Concept Focusing

Jump to specific modules based on what you need to learn.
**Time**: ~15 minutes per topic
**Best for**: Solving specific problems

### Strategy 3: Intensive Week

Study multiple modules per day to become expert quickly.
**Time**: ~1-2 hour sessions
**Best for**: Crash course learning

### Strategy 4: Referencing

Use the Quick Reference and Module Index as lookup tools.
**Time**: ~2-5 minutes per lookup
**Best for**: Experienced developers needing quick answers

---

## Certification & Badges

Complete modules and exercises to earn badges:

- 🟢 **Basics Badge**: Complete Modules 1-3
- 🔵 **Intermediate Badge**: Complete Modules 4-6
- 🟣 **Advanced Badge**: Complete Modules 7-9
- ⭐ **Master Badge**: Complete all + pass final exam

[View your progress](/dashboard/progress)

---

## Conversion Reference

### Quick Format Translation

| Concept      | GraphQL               | JSON Schema                             | Example   |
| ------------ | --------------------- | --------------------------------------- | --------- |
| Type         | `type User { ... }`   | `{ "type": "object", "title": "User" }` | Object    |
| String field | `name: String`        | `"type": "string"`                      | Text      |
| List field   | `items: [String]`     | `"type": "array"`                       | Arrays    |
| Required     | `id: ID!`             | In `required: [...]`                    | Non-null  |
| Optional     | `bio: String`         | Not in `required`                       | Nullable  |
| Reference    | `author: User`        | `"$ref": "#/$defs/User"`                | Relations |
| Enum         | `enum Status { ... }` | `"enum": [...]`                         | Choices   |
| Comments     | `"""docs"""`          | `"description": ""`                     | Docs      |

---

## Beyond the Basics

### Advanced Topics (Self-Paced)

- Custom scalars (DateTime, JSON, Upload)
- Directives (@deprecated, @auth)
- Schema stitching and federation
- Performance optimization
- Caching strategies
- Real-time subscriptions
- Error handling patterns

**Find these in**: [Advanced Guide](/docs/advanced/)

### Integration Guides

- [Using with Node.js](/integrations/nodejs)
- [Using with Python](/integrations/python)
- [Using with TypeScript](/integrations/typescript)
- [Using with React](/integrations/react)
- [Using with Docker](/integrations/docker)

---

## Resources

### Official Documentation

- [GraphQL Official Docs](https://graphql.org/)
- [JSON Schema Official Docs](https://json-schema.org/)
- [Apollo Server Docs](https://www.apollographql.com/docs/apollo-server/)

### Community

- [GraphQL Community](https://graphql.org/community/)
- [JSON Schema Community](https://json-schema.org/community)
- [Stack Overflow - GraphQL](https://stackoverflow.com/questions/tagged/graphql)
- [Stack Overflow - JSON Schema](https://stackoverflow.com/questions/tagged/json-schema)

### Interactive Learning

- [Apollo Sandbox](https://studio.apollographql.com/sandbox) - Try GraphQL live
- [GraphQL Voyager](https://graphql-voyager.herokuapp.com/) - Explore schemas graphically
- [json-schema.org - Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)

### Tools

- [Apollo DevTools](https://www.apollographql.com/docs/devtools/)
- [GraphQL Playground](https://github.com/graphql/graphql-playground)
- [JSON Schema Validators](https://json-schema.org/implementations.html)

---

## Contributing

Found a typo? Want to suggest an example? Have a better explanation?

[Contribute to this learning hub](https://github.com/json-schema-x-graphql/issues)

---

## What's New?

### Recent Updates

- ✅ Module 1 & 2 complete
- 📅 Module 3 coming soon
- 📅 Modules 4-9 in progress
- 🔧 Tools being built

### Feedback

Help us improve! [Tell us what you'd like to see](/feedback)

---

## Get Started Now

👉 **[Begin with Module 1: Introducing Types](/learning/01-introducing-types)**

Or pick a specific topic:

- Just learning? → [Module 1](/learning/01-introducing-types)
- Know some GraphQL? → [Module 3](/learning/03-nullability)
- Need a reference? → [Quick Reference](/dashboard/QUICK_REFERENCE.md)
- Want to practice? → [Tools](/tools)

---

## About This Learning Hub

**Created by**: json-schema-x-graphql team  
**Last Updated**: 2025-12-15  
**Version**: 1.0  
**License**: [Creative Commons BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

### How to Use This Hub

- **Read the modules** in order or jump to what interests you
- **Do the exercises** to test your understanding
- **Use the tools** to visualize and experiment
- **Reference the Quick Guide** while working
- **Check the Glossary** if you're unsure of terms
- **Ask questions** in the community

---

## Navigation

**← [Back to Dashboard](/dashboard)**  
**[Modules](/learning) | [Tools](/tools) | [Examples](/examples) | [FAQ](/help/faq) | [Contact](/help/contact)**

---

**Ready to learn?** [Start with Module 1 →](/learning/01-introducing-types)
