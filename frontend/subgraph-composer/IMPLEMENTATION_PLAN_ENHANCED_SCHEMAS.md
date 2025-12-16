# Enhanced Schema Implementation Plan

## Objective
Enhance the 3 pre-loaded template subgraphs (basic_scalars, enums, nested_objects) to:
1. ✅ Use consistent snake_case naming throughout
2. ✅ Include GraphQL directives/concepts supported by the converter
3. ✅ Compose into a supergraph with a shared federation key
4. ✅ Validate output against SDL lint/checker

## Current State Assessment

### Existing Templates
- **basic_scalars**: Basic scalar types (ID, String, Int, Float, Boolean)
- **enums**: Enum types with x-graphql-enums extension
- **nested_objects**: Nested object structures with x-graphql-type-name

### Converter Capabilities (Available)
- `x-graphql-type`: Specify GraphQL type with nullability (e.g., "String!", "[Int]!")
- `x-graphql-type-name`: Define custom type names for objects
- `x-graphql-enums`: Define enum types
- `x-graphql-scalars`: Custom scalar definitions
- `x-graphql-directives`: Support for directives like @key, @extends, @external, @requires
- `x-graphql-type-kind`: Specify type kind (type, interface, etc.)

### Available SDL Validators
- **graphql-core** (via npm 'graphql' package v16.9.0): `buildSchema()`, `validateSchema()`
- **graphql-tools**: Can validate and check schema for errors
- **Custom validation**: Check for naming conventions, required fields, etc.

---

## Implementation Plan - 4 Phases

### Phase 1: Standardize Naming Convention (PRIORITY: HIGH)
**Goal**: Convert all properties to snake_case, all type names to PascalCase  
**Timeline**: 1-2 hours

#### Step 1.1: Update basic_scalars template
```javascript
// BEFORE
properties: {
  is_active: { ... }  // Already snake_case ✓
  email: { ... }      // Fine
}

// AFTER - Already compliant, no changes needed
```

#### Step 1.2: Update enums template
- Review and ensure all enum values use SCREAMING_SNAKE_CASE
- Property names should be snake_case
- Already follows pattern: `user_role`, `order_status`

#### Step 1.3: Update nested_objects template
```javascript
// BEFORE
properties: {
  avatar_url: { ... }      // snake_case ✓
  social_links: { ... }    // snake_case ✓
  postal_code: { ... }     // snake_case ✓
}

// AFTER - Already mostly compliant
// Just verify consistency across all 3 templates
```

**Deliverable**: 
- Update [templates.js](../src/lib/templates.js) lines 57-320
- Verify no camelCase in property names
- Document naming convention in template file

---

### Phase 2: Add Federation Support with Shared Keys (PRIORITY: HIGH)
**Goal**: Enable schemas to compose as Apollo Federation subgraphs with a common ID key  
**Timeline**: 2-3 hours

#### Step 2.1: Add Federation Pattern to All 3 Templates

Add this to each template's root level:
```javascript
'x-graphql-directives': [
  {
    name: 'key',
    arguments: { fields: '"shared_entity_id"' }
  }
]
```

#### Step 2.2: Add Shared Key Field

All 3 templates must have:
```javascript
shared_entity_id: {
  type: 'string',
  'x-graphql-type': 'ID!',
  description: 'Shared entity ID for federation',
  format: 'uuid'
}
```

#### Step 2.3: Modified Template Structure

**Template 1: basic_scalars_federation**
```json
{
  "title": "User Profiles (Scalars)",
  "x-graphql-type-name": "UserProfile",
  "x-graphql-directives": [{"name": "key", "arguments": {"fields": "\"shared_entity_id\""}}],
  "properties": {
    "shared_entity_id": {"type": "string", "x-graphql-type": "ID!"},
    "user_id": {"type": "string"},
    "first_name": {"type": "string"},
    "last_name": {"type": "string"},
    "email_address": {"type": "string", "format": "email"},
    "is_verified": {"type": "boolean"}
  },
  "required": ["shared_entity_id", "user_id", "first_name"]
}
```

**Template 2: enums_federation**
```json
{
  "title": "User Status & Roles (Enums)",
  "x-graphql-type-name": "UserStatus",
  "x-graphql-directives": [{"name": "key", "arguments": {"fields": "\"shared_entity_id\""}}],
  "x-graphql-enums": {
    "AccountRole": {"values": ["ADMIN", "MODERATOR", "USER", "GUEST"]},
    "StatusType": {"values": ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]}
  },
  "properties": {
    "shared_entity_id": {"type": "string", "x-graphql-type": "ID!"},
    "account_role": {"type": "string", "enum": ["ADMIN", "MODERATOR", "USER", "GUEST"]},
    "current_status": {"type": "string", "enum": ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]},
    "verification_level": {"type": "integer", "minimum": 0, "maximum": 3}
  },
  "required": ["shared_entity_id", "account_role", "current_status"]
}
```

**Template 3: nested_objects_federation**
```json
{
  "title": "User Details & Metadata (Nested)",
  "x-graphql-type-name": "UserDetails",
  "x-graphql-directives": [{"name": "key", "arguments": {"fields": "\"shared_entity_id\""}}],
  "properties": {
    "shared_entity_id": {"type": "string", "x-graphql-type": "ID!"},
    "contact_information": {
      "type": "object",
      "x-graphql-type-name": "ContactInfo",
      "properties": {
        "email_address": {"type": "string"},
        "phone_number": {"type": "string"},
        "preferred_contact_method": {"type": "string", "enum": ["email", "phone", "sms"]}
      }
    },
    "physical_address": {
      "type": "object",
      "x-graphql-type-name": "PhysicalAddress",
      "properties": {
        "street_address": {"type": "string"},
        "city": {"type": "string"},
        "state_province": {"type": "string"},
        "postal_code": {"type": "string"},
        "country_code": {"type": "string", "pattern": "^[A-Z]{2}$"}
      }
    },
    "profile_metadata": {
      "type": "object",
      "x-graphql-type-name": "ProfileMetadata",
      "properties": {
        "account_created_date": {"type": "string", "format": "date-time"},
        "last_login_timestamp": {"type": "string", "format": "date-time"},
        "total_login_count": {"type": "integer", "minimum": 0}
      }
    }
  },
  "required": ["shared_entity_id", "contact_information", "physical_address"]
}
```

**Expected Composed Supergraph Output**:
```graphql
type UserProfile @key(fields: "shared_entity_id") {
  shared_entity_id: ID!
  user_id: String!
  first_name: String!
  last_name: String!
  email_address: String
  is_verified: Boolean
}

type UserStatus @key(fields: "shared_entity_id") {
  shared_entity_id: ID!
  account_role: AccountRole!
  current_status: StatusType!
  verification_level: Int
}

enum AccountRole {
  ADMIN
  MODERATOR
  USER
  GUEST
}

enum StatusType {
  ACTIVE
  INACTIVE
  SUSPENDED
  PENDING
}

type UserDetails @key(fields: "shared_entity_id") {
  shared_entity_id: ID!
  contact_information: ContactInfo!
  physical_address: PhysicalAddress!
  profile_metadata: ProfileMetadata
}

type ContactInfo {
  email_address: String
  phone_number: String
  preferred_contact_method: String
}

type PhysicalAddress {
  street_address: String
  city: String
  state_province: String
  postal_code: String
  country_code: String
}

type ProfileMetadata {
  account_created_date: String
  last_login_timestamp: String
  total_login_count: Int
}
```

**Deliverable**:
- Modify [templates.js](../src/lib/templates.js) 
- Add `x-graphql-directives` with @key to all 3 templates
- Add `shared_entity_id` field to all schemas
- Document federation support in templates

---

### Phase 3: Add SDL Validator (PRIORITY: MEDIUM)
**Goal**: Validate generated SDL against GraphQL spec and lint rules  
**Timeline**: 2-3 hours

#### Step 3.1: Create SDL Validator Utility

Create `src/lib/sdl-validator.js`:
```javascript
import { buildSchema, validateSchema } from 'graphql';

export function validateSDL(sdlString) {
  const errors = {
    syntaxErrors: [],
    validationErrors: [],
    lintWarnings: [],
    isValid: true
  };

  try {
    // 1. Try to build schema (catches syntax errors)
    const schema = buildSchema(sdlString);
    
    // 2. Validate schema (catches logical errors)
    const schemaErrors = validateSchema(schema);
    if (schemaErrors.length > 0) {
      errors.validationErrors = schemaErrors.map(e => ({
        message: e.message,
        severity: 'error'
      }));
      errors.isValid = false;
    }
    
    // 3. Run lint checks
    const lintResults = lintSDL(sdlString, schema);
    errors.lintWarnings = lintResults;
    
  } catch (syntaxError) {
    errors.syntaxErrors.push({
      message: syntaxError.message,
      severity: 'error'
    });
    errors.isValid = false;
  }

  return errors;
}

function lintSDL(sdlString, schema) {
  const warnings = [];

  // Rule 1: Type names should be PascalCase
  const typeMatches = sdlString.matchAll(/type\s+(\w+)/g);
  for (const match of typeMatches) {
    const typeName = match[1];
    if (!/^[A-Z]/.test(typeName)) {
      warnings.push({
        message: `Type name '${typeName}' should start with uppercase`,
        line: sdlString.substring(0, match.index).split('\n').length,
        severity: 'warning'
      });
    }
  }

  // Rule 2: Field names should be camelCase or snake_case (consistent)
  const fieldMatches = sdlString.matchAll(/^\s+(\w+):/gm);
  let caseStyle = null;
  for (const match of fieldMatches) {
    const fieldName = match[1];
    const isSnakeCase = /_/.test(fieldName);
    const isCamelCase = /[a-z][A-Z]/.test(fieldName);
    
    if (caseStyle === null && (isSnakeCase || isCamelCase)) {
      caseStyle = isSnakeCase ? 'snake' : 'camel';
    }
    
    if (caseStyle === 'snake' && isCamelCase && !/_/.test(fieldName)) {
      warnings.push({
        message: `Field name '${fieldName}' uses camelCase, expected snake_case`,
        severity: 'warning'
      });
    }
  }

  // Rule 3: Enum values should be SCREAMING_SNAKE_CASE
  const enumMatches = sdlString.matchAll(/enum\s+\w+\s*{([^}]+)}/g);
  for (const match of enumMatches) {
    const enumValues = match[1].split('\n').map(l => l.trim()).filter(l => l);
    for (const value of enumValues) {
      if (!/^[A-Z_]+$/.test(value)) {
        warnings.push({
          message: `Enum value '${value}' should be SCREAMING_SNAKE_CASE`,
          severity: 'warning'
        });
      }
    }
  }

  // Rule 4: Check for @key directives on all federation types
  const federatedTypes = sdlString.matchAll(/type\s+\w+\s+@key/g);
  const typeCount = (sdlString.match(/^type\s+\w+/gm) || []).length;
  const federatedCount = Array.from(federatedTypes).length;
  
  if (federatedCount > 0 && federatedCount < typeCount) {
    warnings.push({
      message: `${federatedCount}/${typeCount} types use @key federation directive. For proper composition, all types should be federated.`,
      severity: 'info'
    });
  }

  return warnings;
}
```

#### Step 3.2: Integrate Validator into SupergraphPreview

Update `src/components/SupergraphPreview.jsx`:
```javascript
import { validateSDL } from '../lib/sdl-validator';

export function SupergraphPreview({ composition, statistics }) {
  const [validationResults, setValidationResults] = useState(null);

  useEffect(() => {
    if (composition?.sdl) {
      const results = validateSDL(composition.sdl);
      setValidationResults(results);
    }
  }, [composition]);

  return (
    <div className="preview-container">
      {validationResults && (
        <ValidationPanel results={validationResults} />
      )}
      {/* existing SDL display */}
    </div>
  );
}

function ValidationPanel({ results }) {
  return (
    <div className={`validation-panel ${results.isValid ? 'valid' : 'invalid'}`}>
      <h3>
        {results.isValid ? '✅ Valid SDL' : '❌ Invalid SDL'}
      </h3>
      
      {results.syntaxErrors.length > 0 && (
        <div className="error-section">
          <h4>Syntax Errors ({results.syntaxErrors.length})</h4>
          {results.syntaxErrors.map((err, i) => (
            <div key={i} className="error-item">{err.message}</div>
          ))}
        </div>
      )}
      
      {results.validationErrors.length > 0 && (
        <div className="error-section">
          <h4>Validation Errors ({results.validationErrors.length})</h4>
          {results.validationErrors.map((err, i) => (
            <div key={i} className="error-item">{err.message}</div>
          ))}
        </div>
      )}
      
      {results.lintWarnings.length > 0 && (
        <div className="warning-section">
          <h4>Lint Warnings ({results.lintWarnings.length})</h4>
          {results.lintWarnings.map((warn, i) => (
            <div key={i} className="warning-item">
              {warn.message}
              {warn.line && ` (line ${warn.line})`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Step 3.3: Add CSS for Validation Display

Update `src/components/SupergraphPreview.css`:
```css
.validation-panel {
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 4px;
  border-left: 4px solid #999;
  background-color: #f5f5f5;
}

.validation-panel.valid {
  border-left-color: #28a745;
  background-color: #f0f9f6;
}

.validation-panel.invalid {
  border-left-color: #dc3545;
  background-color: #fef0f0;
}

.error-section, .warning-section {
  margin-top: 8px;
}

.error-section h4 {
  color: #dc3545;
  margin: 8px 0 4px 0;
}

.warning-section h4 {
  color: #ffc107;
  margin: 8px 0 4px 0;
}

.error-item, .warning-item {
  padding: 4px 8px;
  margin: 4px 0;
  font-family: monospace;
  font-size: 12px;
  background-color: rgba(255,255,255,0.5);
  border-radius: 2px;
}

.error-item {
  color: #dc3545;
}

.warning-item {
  color: #856404;
}
```

**Deliverable**:
- Create [sdl-validator.js](../src/lib/sdl-validator.js) with validation logic
- Update SupergraphPreview to display validation results
- Add CSS styling for validation feedback
- Test with the 3 federation templates

---

### Phase 4: Integration & Testing (PRIORITY: MEDIUM)
**Goal**: Verify all 3 templates work together with validation  
**Timeline**: 1-2 hours

#### Step 4.1: Update useSchemaManager to Load Enhanced Templates

Modify `src/hooks/useSchemaManager.js`:
```javascript
// In useEffect on mount, load the 3 federation templates
const loadDefaultSchemas = () => {
  const templates = [
    {
      id: 'tpl-user-profile',
      name: 'User Profiles (Scalars)',
      content: getTemplate('basic_scalars_federation'),
      enabled: true
    },
    {
      id: 'tpl-user-status',
      name: 'User Status & Roles (Enums)',
      content: getTemplate('enums_federation'),
      enabled: true
    },
    {
      id: 'tpl-user-details',
      name: 'User Details & Metadata (Nested)',
      content: getTemplate('nested_objects_federation'),
      enabled: true
    }
  ];
  setSchemas(templates);
};
```

#### Step 4.2: Create Test Suite for Enhanced Schemas

Create `src/__tests__/enhanced-schemas.test.js`:
```javascript
import { getTemplate } from '../lib/templates';
import { validateSDL } from '../lib/sdl-validator';
import { compose } from '@json-schema-x-graphql/core';

describe('Enhanced Federation Schemas', () => {
  test('all 3 templates have snake_case properties', () => {
    const templates = [
      getTemplate('basic_scalars_federation'),
      getTemplate('enums_federation'),
      getTemplate('nested_objects_federation')
    ];
    
    templates.forEach(template => {
      const schema = JSON.parse(template.content);
      const props = schema.properties;
      Object.keys(props).forEach(prop => {
        expect(prop).toMatch(/^[a-z_]+$/);
      });
    });
  });

  test('all 3 templates have @key federation directive', () => {
    const templates = [
      getTemplate('basic_scalars_federation'),
      getTemplate('enums_federation'),
      getTemplate('nested_objects_federation')
    ];
    
    templates.forEach(template => {
      const schema = JSON.parse(template.content);
      expect(schema['x-graphql-directives']).toBeDefined();
      expect(schema['x-graphql-directives'].some(d => d.name === 'key')).toBe(true);
    });
  });

  test('all 3 templates have shared_entity_id field', () => {
    const templates = [
      getTemplate('basic_scalars_federation'),
      getTemplate('enums_federation'),
      getTemplate('nested_objects_federation')
    ];
    
    templates.forEach(template => {
      const schema = JSON.parse(template.content);
      expect(schema.properties.shared_entity_id).toBeDefined();
      expect(schema.properties.shared_entity_id['x-graphql-type']).toBe('ID!');
    });
  });

  test('composed supergraph generates valid SDL', () => {
    const schemas = [
      getTemplate('basic_scalars_federation'),
      getTemplate('enums_federation'),
      getTemplate('nested_objects_federation')
    ];
    
    const schemaMap = new Map();
    schemas.forEach((template, idx) => {
      schemaMap.set(`schema-${idx}`, JSON.parse(template.content));
    });
    
    const { sdl } = compose(schemaMap);
    const validation = validateSDL(sdl);
    
    expect(validation.isValid).toBe(true);
    expect(validation.syntaxErrors).toHaveLength(0);
  });

  test('composed SDL contains all 3 types with @key directive', () => {
    const schemas = [
      getTemplate('basic_scalars_federation'),
      getTemplate('enums_federation'),
      getTemplate('nested_objects_federation')
    ];
    
    const schemaMap = new Map();
    schemas.forEach((template, idx) => {
      schemaMap.set(`schema-${idx}`, JSON.parse(template.content));
    });
    
    const { sdl } = compose(schemaMap);
    
    expect(sdl).toContain('type UserProfile @key');
    expect(sdl).toContain('type UserStatus @key');
    expect(sdl).toContain('type UserDetails @key');
  });

  test('SDL passes all lint rules', () => {
    const schemas = [
      getTemplate('basic_scalars_federation'),
      getTemplate('enums_federation'),
      getTemplate('nested_objects_federation')
    ];
    
    const schemaMap = new Map();
    schemas.forEach((template, idx) => {
      schemaMap.set(`schema-${idx}`, JSON.parse(template.content));
    });
    
    const { sdl } = compose(schemaMap);
    const validation = validateSDL(sdl);
    
    expect(validation.lintWarnings.filter(w => w.severity === 'error')).toHaveLength(0);
  });
});
```

#### Step 4.3: Add Tests to CI Pipeline

Update test script in `package.json`:
```json
"test:enhanced": "jest enhanced-schemas.test.js",
"test:all": "jest"
```

#### Step 4.4: Document Enhanced Schemas

Update `QUICKSTART.md` with new federation schema examples

**Deliverable**:
- Updated useSchemaManager with federation template defaults
- Comprehensive test suite (6+ tests)
- Updated documentation
- All tests passing

---

## Implementation Checklist

### Phase 1: Naming Convention ✅
- [ ] Review all 3 templates for naming consistency
- [ ] Update property names to snake_case
- [ ] Update type names to PascalCase
- [ ] Update enum values to SCREAMING_SNAKE_CASE
- [ ] Document naming convention

### Phase 2: Federation Support ✅
- [ ] Add x-graphql-directives with @key to all 3 templates
- [ ] Add shared_entity_id field to all schemas
- [ ] Ensure shared key matches across schemas
- [ ] Test composition with federation
- [ ] Document federation pattern

### Phase 3: SDL Validation ✅
- [ ] Create sdl-validator.js with validation logic
- [ ] Implement GraphQL schema validation
- [ ] Implement SDL linting rules
- [ ] Integrate into SupergraphPreview component
- [ ] Add CSS styling for validation feedback
- [ ] Test validation with sample SDL

### Phase 4: Integration & Testing ✅
- [ ] Update useSchemaManager to load federation templates
- [ ] Create comprehensive test suite
- [ ] Verify all tests pass
- [ ] Update documentation
- [ ] Manual testing in browser

---

## Expected Outcomes

### Supergraph Features
✅ **3 Federated Schemas**:
- UserProfile: Basic scalar fields (name, email, age, etc.)
- UserStatus: Enum fields (role, status, verification level)
- UserDetails: Nested objects (contact info, address, metadata)

✅ **Shared Federation Key**:
- All types share `shared_entity_id: ID!` field
- Each type has `@key(fields: "shared_entity_id")` directive
- Composer can resolve cross-type references

✅ **Valid SDL Output**:
- Passes GraphQL schema validation
- No syntax errors
- All lint rules satisfied
- Federation directives properly formatted

✅ **Quality Assurance**:
- Automated tests verify:
  - Naming conventions
  - Federation setup
  - Composition success
  - SDL validity
  - Lint compliance

---

## Success Metrics

| Metric | Target | Validation |
|--------|--------|-----------|
| All properties snake_case | 100% | Regex: `^[a-z_]+$` |
| All types PascalCase | 100% | Regex: `^[A-Z][a-zA-Z0-9]*$` |
| Enum values SCREAMING_SNAKE_CASE | 100% | Regex: `^[A-Z_]+$` |
| Federation @key directives | 3/3 types | SDL inspection |
| Shared entity IDs | 3/3 schemas | Schema property check |
| SDL validation errors | 0 | graphql.validateSchema() |
| SDL syntax errors | 0 | graphql.buildSchema() |
| Lint warnings | < 3 | Custom linter |
| Test coverage | 6+ tests | Jest test suite |

---

## Risk Analysis & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Converter doesn't support directives | High | Medium | Use existing federation_basic/extended templates as reference |
| Composite SDL validation fails | High | Medium | Test each schema individually first, then compose |
| Naming convention inconsistency | Medium | Low | Create lint rule to enforce during generation |
| Tests fail in Jest environment | Medium | High | Use real component testing via render(<App />) |
| Performance impact of validation | Low | Medium | Lazy validate on-demand (not per keystroke) |

---

## Timeline Estimate

- **Phase 1** (Naming): 1-2 hours
- **Phase 2** (Federation): 2-3 hours  
- **Phase 3** (Validation): 2-3 hours
- **Phase 4** (Testing): 1-2 hours
- **Buffer**: 1-2 hours
- **Total: 7-12 hours** (1-2 work days)

---

## Next Steps (Recommended Order)

1. **Immediate** (Next 30 min):
   - Review this plan with team
   - Confirm federation support in converter
   - Confirm graphql package has buildSchema/validateSchema

2. **Short-term** (Next 1-2 hours):
   - Implement Phase 1 (naming standardization)
   - Implement Phase 2 (federation patterns)
   - Run initial composition test

3. **Medium-term** (Next 2-3 hours):
   - Implement Phase 3 (SDL validator)
   - Test validation logic
   - Update UI components

4. **Long-term** (Next 1-2 hours):
   - Implement Phase 4 (comprehensive tests)
   - Documentation updates
   - Browser testing and QA

---

## Questions for Clarification

1. **Federation**: Are we using Apollo Federation spec? Other federation approach?
2. **Validation**: Should validation be real-time or on-demand?
3. **Naming**: Are there other naming constraints besides snake_case properties?
4. **Directives**: Should we support @extends, @requires, @external in addition to @key?
5. **Testing**: Should E2E tests be added, or just unit tests?

---

## References

- [Apollo Federation Spec](https://www.apollographql.com/docs/apollo-server/federation/subgraph-spec/)
- [GraphQL Naming Conventions](https://graphql.org/learn/best-practices/#naming-conventions)
- [GraphQL Validation](https://graphql-js.readthedocs.io/en/latest/api/?highlight=validateSchema)
- [Converter Directives Support](../../converters/README.md)
