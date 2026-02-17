# Troubleshooting Guide - JSON Schema ↔ GraphQL Editors

Quick fixes for common issues in the Loro and Yjs Monaco demos.

---

## 🔴 GraphQL Editor Shows "Cannot parse the schema!"

### Symptoms

- Conversion appears to succeed (no error alert)
- GraphQL visual editor shows red error message
- Console shows "Cannot parse the schema!"

### Common Causes

#### 1. Invalid GraphQL Syntax

**Check for:**

- Missing or extra commas
- Invalid directive syntax
- Incorrectly formatted descriptions
- Unbalanced brackets/braces

**Solution:**

```bash
# Check console logs for generated SDL
console.log("Generated GraphQL:", graphqlOutput);

# Common issues:
# ❌ Missing closing quote in description
"This is a description
type User {

# ✅ Properly closed description
"This is a description"
type User {
```

#### 2. Undefined Type References

**Check for:**

- Field types that reference undefined types
- Enum types not in $defs
- Missing type definitions

**Example Problem:**

```json
{
  "role": {
    "x-graphql-field-type": "UserRole"
  }
}
// But UserRole is not defined in $defs!
```

**Solution:**
Add enum to `$defs`:

```json
{
  "$defs": {
    "user_role": {
      "type": "string",
      "enum": ["ADMIN", "USER"],
      "x-graphql-type-name": "UserRole",
      "x-graphql-type-kind": "ENUM"
    }
  }
}
```

#### 3. Invalid Directive Arguments

**Check for:**

- Directive arguments without proper quotes
- Invalid directive names
- Missing required arguments

**Example Problem:**

```graphql
type User @key(fields: id) # Missing quotes around "id"
```

**Solution:**
Ensure `x-graphql-federation-keys` format is correct:

```json
{
  "x-graphql-federation-keys": [
    {
      "fields": "id" // This will generate: @key(fields: "id")
    }
  ]
}
```

---

## 🔴 Editor Not Populating After Conversion

### Symptoms

- Click "Convert to GraphQL →"
- Alert shows success or no error
- GraphQL editor panel remains blank or shows old content

### Solutions

#### 1. Check Loro/Yjs Initialization

**Verify:**

```javascript
// Should see in console:
"📝 Updating Loro document with GraphQL SDL";
"✅ Updated Loro: deleted X chars, inserted Y chars";
```

**If missing:**

1. Click "Initialize Loro" button first
2. Enter username and document ID
3. Then try conversion again

#### 2. Check for Console Errors

**Look for:**

```
❌ GraphQLVisualEditor: Failed to set schema
❌ Conversion failed:
```

**Action:**

- Read error message details
- Check if JSON Schema is valid
- Verify all required fields are present

#### 3. Refresh and Retry

**Quick Fix:**

1. Save your JSON Schema (copy to clipboard)
2. Refresh page (Cmd+R / Ctrl+R)
3. Click "Initialize Loro"
4. Paste JSON Schema back
5. Try conversion again

---

## 🔴 Conversion Failed Alerts

### "Failed to convert JSON Schema to GraphQL: Unexpected token..."

**Cause:** Invalid JSON syntax

**Check:**

- Missing commas between properties
- Trailing commas (not allowed in JSON)
- Unmatched brackets/braces
- Unclosed strings

**Quick Fix:**
Use a JSON validator:

```bash
# Command line
cat schema.json | jq .

# Or use online: https://jsonlint.com/
```

### "Failed to convert property 'fieldName': ..."

**Cause:** Invalid property configuration

**Common Issues:**

```json
// ❌ Bad: No type specified
{
  "username": {
    "x-graphql-field-name": "username"
    // Missing: type, x-graphql-field-type, or $ref
  }
}

// ✅ Good: Type specified
{
  "username": {
    "type": "string",
    "x-graphql-field-name": "username"
  }
}
```

---

## 🔴 Enums Not Converting

### Symptoms

- Enum defined in $defs
- Not appearing in GraphQL output
- No error message

### Solution

**Ensure all required fields:**

```json
{
  "$defs": {
    "status_enum": {
      // ✅ Required: type and enum
      "type": "string",
      "enum": ["ACTIVE", "INACTIVE"],

      // ✅ Required: GraphQL type name
      "x-graphql-type-name": "Status",

      // ✅ Required: Type kind
      "x-graphql-type-kind": "ENUM"
    }
  }
}
```

**Then reference it:**

```json
{
  "status": {
    "type": "string",
    "enum": ["ACTIVE", "INACTIVE"],
    "x-graphql-field-type": "Status" // Match the type name above
  }
}
```

---

## 🔴 Federation Directives Not Appearing

### Symptoms

- `x-graphql-federation-keys` defined
- `@key` directive not in output

### Check Format

**❌ Wrong:**

```json
{
  "x-graphql-federation-keys": "id" // String, not array
}
```

**✅ Correct:**

```json
{
  "x-graphql-federation-keys": [
    {
      "fields": "id",
      "resolvable": true
    }
  ]
}
```

### Multiple Keys

```json
{
  "x-graphql-federation-keys": [
    { "fields": "id" },
    { "fields": "sku organizationId" } // Compound key
  ]
}
```

**Generates:**

```graphql
type Product @key(fields: "id") @key(fields: "sku organizationId") {
  # fields
}
```

---

## 🔴 Field Arguments Not Working

### Symptoms

- `x-graphql-field-arguments` defined
- Arguments not in generated SDL

### Check Format

**✅ Correct:**

```json
{
  "posts": {
    "type": "array",
    "items": { "$ref": "#/$defs/post" },
    "x-graphql-field-arguments": [
      {
        "name": "limit",
        "type": "Int",
        "description": "Max items",
        "default-value": 10
      },
      {
        "name": "offset",
        "type": "Int",
        "default-value": 0
      }
    ]
  }
}
```

**Generates:**

```graphql
posts(limit: Int = 10, offset: Int = 0): [Post]
```

---

## 🔴 Non-Null (!) Not Appearing

### Symptoms

- Fields should be required
- No `!` in GraphQL output

### Solutions

#### Option 1: Use x-graphql-field-non-null

```json
{
  "username": {
    "type": "string",
    "x-graphql-field-non-null": true // Explicit
  }
}
```

#### Option 2: Use required array

```json
{
  "required": ["username", "email"],
  "properties": {
    "username": { "type": "string" },
    "email": { "type": "string" }
  }
}
```

**Both generate:**

```graphql
username: String!
email: String!
```

---

## 🔴 Console Shows Errors But No Alert

### What to Check

1. **Open DevTools Console** (F12 or Cmd+Option+I)
2. **Look for red errors:**
   ```
   ❌ Conversion failed: ...
   ❌ GraphQLVisualEditor: Failed to set schema
   ```
3. **Check warnings:**
   ```
   ⚠️ No loroDoc available - conversion won't be saved!
   ```

### Common Patterns

**Pattern:** "No loroDoc available"
**Fix:** Click "Initialize Loro" button first

**Pattern:** "Failed to set schema"
**Fix:** Generated SDL has syntax errors, check format

**Pattern:** Network errors
**Fix:** Check if WebSocket server is running (Yjs only)

---

## 🔴 WebSocket Connection Failed (Yjs Demo Only)

### Symptoms

- Status shows "Disconnected"
- Console shows WebSocket errors
- Changes don't sync

### Solution

1. **Check WebSocket Server:**

   ```bash
   # Default: ws://localhost:1234
   # Verify server is running
   ```

2. **Update WebSocket URL:**

   ```bash
   # Set environment variable
   export VITE_WS_URL=ws://your-server:port

   # Or edit store.ts:
   const wsUrl = 'ws://localhost:1234';
   ```

3. **Fallback to Loro:**
   - Loro works offline (no WebSocket needed)
   - Use Loro demo for local testing

---

## 🔴 Changes Not Syncing

### For Loro Demo

**Symptom:** Edits in JSON Schema don't update GraphQL

**Check:**

1. Is Loro initialized? (Green status indicator)
2. Check console for update logs
3. Try disconnecting and reconnecting

### For Yjs Demo

**Symptom:** Other users don't see changes

**Check:**

1. WebSocket connection status
2. Same room name for all users
3. Network connectivity
4. Check console for sync errors

---

## 🔴 Type Definitions Missing in Output

### Symptoms

- Types defined in $defs
- Not appearing in GraphQL SDL

### Causes & Solutions

#### 1. Missing x-graphql-type-name

```json
// ❌ Won't convert
{
  "$defs": {
    "profile": {
      "type": "object",
      "properties": {...}
      // Missing: x-graphql-type-name
    }
  }
}

// ✅ Will convert
{
  "$defs": {
    "profile": {
      "type": "object",
      "x-graphql-type-name": "Profile",  // Added
      "properties": {...}
    }
  }
}
```

#### 2. Not Referenced in Properties

Types in $defs must be referenced:

```json
{
  "properties": {
    "profile": {
      "$ref": "#/$defs/profile" // Reference it
    }
  }
}
```

---

## 📋 Debug Checklist

When conversion fails, check in order:

1. **JSON Validity**
   - [ ] No syntax errors
   - [ ] All quotes properly closed
   - [ ] Brackets/braces balanced

2. **Required Extensions**
   - [ ] `x-graphql-type-name` on root and $defs types
   - [ ] `x-graphql-field-type` or `type` on all fields
   - [ ] `x-graphql-type-kind` on enums

3. **Type References**
   - [ ] All referenced types are defined
   - [ ] Enum names match between definition and usage
   - [ ] $ref paths are correct

4. **CRDT Status**
   - [ ] Loro/Yjs initialized (green indicator)
   - [ ] Console shows update logs
   - [ ] No connection errors

5. **Generated Output**
   - [ ] Check console for generated SDL
   - [ ] Look for syntax errors in output
   - [ ] Verify all types are present

---

## 🆘 Still Having Issues?

### 1. Check Example Schema

Look at the working example:

```bash
cat frontend/demos/example-schema.json
```

### 2. Review Documentation

- `X_GRAPHQL_QUICK_REFERENCE.md` - Extension usage
- `CONVERSION_FIX_SUMMARY.md` - Technical details
- `schema/x-graphql-extensions.schema.json` - Full spec

### 3. Enable Debug Logging

Already enabled! Check console for:

```
📝 GraphQLVisualEditor: value prop changed
🔄 Starting conversion: json-to-graphql
📤 Generated GraphQL SDL: ...
✅ Updated Loro: ...
```

### 4. Test with Simple Schema

Start minimal and add complexity:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Test",
  "type": "object",
  "x-graphql-type-name": "Test",
  "properties": {
    "id": {
      "type": "string",
      "x-graphql-field-type": "ID",
      "x-graphql-field-non-null": true
    }
  }
}
```

If this works, gradually add features from your complex schema.

---

## 📞 Getting Help

Include in bug reports:

1. **Browser Console Logs** (full error messages)
2. **Input JSON Schema** (what you're converting)
3. **Expected Output** (what you wanted)
4. **Actual Output** (what you got)
5. **Steps to Reproduce**

---

**Last Updated:** 2024  
**For More Help:** See `CONVERSION_FIX_SUMMARY.md`
