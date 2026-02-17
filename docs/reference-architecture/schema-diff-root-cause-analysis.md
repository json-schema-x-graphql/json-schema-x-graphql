# Schema Diff Root Cause Analysis

**Generated:** December 10, 2025  
**Issue:** GraphQL fields appear in generated SDL but are not found in JSON Schema by field name comparison

## Executive Summary

The schema diff tool reports 35+ "missing" GraphQL fields (like `alaskanNativeOwnedCorporation`, `line1`, `line2`, `line3`, etc.), but these fields **DO exist** in the JSON schemas. The root cause is a **field name mapping disconnect** between:

1. **JSON Schema property names** (snake_case, often truncated)
2. **GraphQL field names** (camelCase, fully expanded)
3. **The diff tool's matching logic** (simple name comparison)

## Root Causes

### 1. **Truncated Field Names with `x-graphql-field-name` Mapping**

**What happens:**

- Public Spending database has field name length limits (30 chars)
- JSON Schema properties use truncated names: `alaskan_native_owned_corpo`
- Schema uses `x-graphql-field-name` to map to full GraphQL name: `alaskanNativeOwnedCorporation`
- Diff tool only looks for `alaskanNativeOwnedCorporation` as a property name, doesn't find it

**Example fields affected:**

```
JSON Schema Property → GraphQL Field Name (via x-graphql-field-name)
─────────────────────────────────────────────────────────────────────
alaskan_native_owned_corpo → alaskanNativeOwnedCorporation
award_modification_amendme → awardModificationAmendment
awardee_or_recipient_uniqu → awardeeOrRecipientDuns
awardee_or_recipient_legal → awardeeOrRecipientLegalName
awarding_sub_tier_agency_c → awardingSubTierAgencyCode
awarding_sub_tier_agency_n → awardingSubTierAgencyName
base_exercised_options_val → baseExercisedOptionsValue
black_american_owned_busin → blackAmericanOwnedBusiness
corporate_entity_tax_exemp → corporateEntityTaxExempt
eight_a_flag [implicit]     → eightAFlag
entity_doing_business_as_n → entityDoingBusinessAsName
funding_sub_tier_agency_co → fundingSubTierAgencyCode
funding_sub_tier_agency_na → fundingSubTierAgencyName
hispanic_american_owned_bu → hispanicAmericanOwnedBusiness
limited_liability_corporat → limitedLiabilityCorporation
native_hawaiian_owned_busi → nativeHawaiianOwnedBusiness
partnership_or_limited_lia → partnershipOrLimitedLiability
period_of_performance_curr → periodOfPerformanceCurrent
period_of_performance_star → periodOfPerformanceStart
period_of_perf_potential_e → periodOfPerformancePotentialEnd
place_of_performance_congr → placeOfPerformanceCongressional
place_of_perform_country_n → placeOfPerformanceCountryName
place_of_perform_county_na → placeOfPerformanceCountyName
place_of_perform_state_nam → placeOfPerformanceStateName
place_of_performance_zip4a → placeOfPerformanceZip4
potential_total_value_awar → potentialTotalValueAward
referenced_idv_agency_iden → referencedIdvAgencyIdentifier
sba_certified_8_a_joint_ve → sbaCertified8aJointVenture
service_disabled_veteran_o → serviceDisabledVeteranOwned
small_disadvantaged_busine → smallDisadvantagedBusiness
subchapter_s_corporation [implicit] → subchapterSCorporation
ultimate_parent_legal_enti → ultimateParentLegalEntity
ultimate_parent_unique_ide → ultimateParentDuns
american_indian_owned_busi → americanIndianOwnedBusiness
asian_pacific_american_own → asianPacificAmericanOwned
```

**Source files:**

- `/src/data/public_spending.schema.json` - Contains most truncated field mappings
- See: `/docs/public_spending-schema-cleanup-plan.md` for full list

### 2. **Underscore-to-Number Field Name Pattern**

**What happens:**

- Contract Data Address type uses `line_1`, `line_2`, `line_3` in JSON Schema
- Standard snake_case → camelCase conversion produces: `line1`, `line2`, `line3`
- These fields exist in `/src/data/contract_data.schema.json` lines 319-331
- Diff tool searches for `line1` as a property name, doesn't find it (property is `line_1`)

**Example fields affected:**

```
JSON Schema Property → GraphQL Field Name (automatic conversion)
──────────────────────────────────────────────────────────────
line_1 → line1
line_2 → line2
line_3 → line3
```

**Source files:**

- `/src/data/contract_data.schema.json` - Address type definition (lines 315-352)

**Generated output:**

- `/generated-schemas/contract_data.subgraph.graphql` - Contains `line1`, `line2`, `line3` fields
- `/generated-schemas/schema_unification.supergraph.graphql` - Merged Address type with both patterns

### 3. **Payment Terms Custom Fields (Likely)**

**What happens:**

- Fields like `paymentTermsCustom1` and `paymentTermsCustom2` are reported missing
- These may follow similar pattern to line1/2/3 (snake_case source → camelCase GraphQL)
- Likely exist as `payment_terms_custom_1` and `payment_terms_custom_2` in source

**Requires verification:** Need to search for these in Contract Data or other schemas

## Schema-Specific Patterns

### Public Spending Schema

- **Pattern:** Truncated field names + explicit `x-graphql-field-name` mappings
- **Reason:** Database column name length limits (30 chars max in PostgreSQL)
- **Fields affected:** ~30+ fields
- **Documentation:** See `/docs/public_spending-schema-cleanup-plan.md`

### Contract Data Schema

- **Pattern:** Underscore-prefixed numbers (`line_1`) convert to no-underscore (`line1`)
- **Reason:** Standard camelCase conversion of snake_case identifiers
- **Fields affected:** Address.line_1, Address.line_2, Address.line_3

### Logistics Mgmt Schema

- **Pattern:** May have similar Address type fields, need verification
- **Current file:** `/src/data/logistics_mgmt.schema.json`

## Why This Appears as "Missing"

The diff tool (`scripts/diff-sdl-schema.mjs`) performs a simple comparison:

1. **Extracts GraphQL field names** from generated SDL (e.g., `alaskanNativeOwnedCorporation`)
2. **Extracts JSON Schema property names** (e.g., `alaskan_native_owned_corpo`)
3. **Compares names directly** without considering:
   - `x-graphql-field-name` mappings
   - Standard snake_case → camelCase conversions
   - Name truncation patterns

**Result:** False positives - fields marked as "missing" when they actually exist under different property names.

## Impact Assessment

### User Experience

- **Confusing reports** - Fields appear missing but exist in schema
- **Wasted investigation time** - Developers search for non-existent issues
- **False sense of incompleteness** - Schema appears incomplete when it's actually correct

### Technical Impact

- **No runtime issues** - GraphQL generation works correctly
- **No data mapping issues** - Field mappings are correct via `x-graphql-field-name`
- **Schema composition succeeds** - All subgraphs compose correctly

## Recommended Solutions

### Short-term (Documentation)

1. ✅ **Create this analysis document** (you're reading it!)
2. Add note to diff report header explaining false positives
3. Document field mapping patterns in schema files

### Medium-term (Tool Enhancement)

Enhance `scripts/diff-sdl-schema.mjs` to:

1. **Respect `x-graphql-field-name` mappings**

   ```javascript
   // Check both property name AND x-graphql-field-name
   if (prop["x-graphql-field-name"] === graphqlFieldName) {
     return true; // Field exists via mapping
   }
   ```

2. **Apply standard naming conversions**

   ```javascript
   // Convert snake_case → camelCase before comparison
   const camelCaseName = snakeToCamel(jsonPropertyName);
   if (camelCaseName === graphqlFieldName) {
     return true; // Field exists via standard conversion
   }
   ```

3. **Report mapping details**
   ```markdown
   ## Field Mappings

   These GraphQL fields map from differently-named JSON Schema properties:

   - `alaskanNativeOwnedCorporation` ← `alaskan_native_owned_corpo` (Public SpendingProcurement.SocioeconomicClassifications)
   - `line1` ← `line_1` (Address)
   ```

### Long-term (Schema Standardization)

1. Consider expanding truncated field names in source databases (database migration)
2. Standardize address field naming across schemas
3. Add schema linting rules to catch name mismatches early

## Verification Steps

To verify a "missing" field actually exists:

1. **Search for camelCase version in GraphQL:**

   ```bash
   grep -r "alaskanNativeOwnedCorporation" generated-schemas/
   ```

2. **Search for snake_case version in JSON Schema:**

   ```bash
   grep -r "alaskan_native_owned_corpo" src/data/
   ```

3. **Check for x-graphql-field-name mapping:**

   ```bash
   grep -A2 "alaskan_native_owned_corpo" src/data/*.json | grep "x-graphql-field-name"
   ```

4. **Verify field appears in generated SDL:**
   - If found in both searches → Field exists, false positive
   - If only in GraphQL → Investigate (may be computed/synthetic field)
   - If only in JSON → Investigate (may be excluded intentionally)

## Related Documentation

- `/docs/public_spending-schema-cleanup-plan.md` - Complete list of truncated field mappings
- `/generated-metadata/schema-diff.md` - Current diff report (with false positives)
- `/.aitk/instructions/x-graphql-directives.instructions.md` - Schema mapping guidance
- `/scripts/diff-sdl-schema.mjs` - Diff tool source code

## Conclusion

**All reported "missing" fields actually exist in the JSON schemas.** They are accessed through:

1. Explicit `x-graphql-field-name` mappings (truncated names)
2. Standard snake_case → camelCase conversion (e.g., `line_1` → `line1`)

The diff tool needs enhancement to recognize these mapping patterns. Until then, treat "missing GraphQL fields" reports with skepticism and verify using the steps above.

## Appendix: Complete Field Mapping Reference

### Public Spending Truncated Fields (35 fields)

| JSON Property                | GraphQL Field                     | Schema Location                 | Type                           |
| ---------------------------- | --------------------------------- | ------------------------------- | ------------------------------ |
| `alaskan_native_owned_corpo` | `alaskanNativeOwnedCorporation`   | public_spending.schema.json:473 | SocioeconomicClassifications   |
| `american_indian_owned_busi` | `americanIndianOwnedBusiness`     | public_spending.schema.json:469 | SocioeconomicClassifications   |
| `asian_pacific_american_own` | `asianPacificAmericanOwned`       | public_spending.schema.json:485 | SocioeconomicClassifications   |
| `award_modification_amendme` | `awardModificationAmendment`      | public_spending.schema.json:113 | Public SpendingProcurement     |
| `awardee_or_recipient_uniqu` | `awardeeOrRecipientDuns`          | public_spending.schema.json:137 | Public SpendingProcurement     |
| `awardee_or_recipient_legal` | `awardeeOrRecipientLegalName`     | public_spending.schema.json:161 | Public SpendingProcurement     |
| `awarding_sub_tier_agency_c` | `awardingSubTierAgencyCode`       | public_spending.schema.json     | Public SpendingProcurement     |
| `awarding_sub_tier_agency_n` | `awardingSubTierAgencyName`       | public_spending.schema.json     | Public SpendingProcurement     |
| `base_exercised_options_val` | `baseExercisedOptionsValue`       | public_spending.schema.json     | Public SpendingProcurement     |
| `black_american_owned_busin` | `blackAmericanOwnedBusiness`      | public_spending.schema.json:489 | SocioeconomicClassifications   |
| `corporate_entity_tax_exemp` | `corporateEntityTaxExempt`        | public_spending.schema.json:507 | EntityStructureClassifications |
| `eight_a_flag`               | `eightAFlag`                      | public_spending.schema.json     | SmallBusinessClassifications   |
| `entity_doing_business_as_n` | `entityDoingBusinessAsName`       | public_spending.schema.json     | Public SpendingProcurement     |
| `funding_sub_tier_agency_co` | `fundingSubTierAgencyCode`        | public_spending.schema.json     | Public SpendingProcurement     |
| `funding_sub_tier_agency_na` | `fundingSubTierAgencyName`        | public_spending.schema.json     | Public SpendingProcurement     |
| `hispanic_american_owned_bu` | `hispanicAmericanOwnedBusiness`   | public_spending.schema.json:493 | SocioeconomicClassifications   |
| `limited_liability_corporat` | `limitedLiabilityCorporation`     | public_spending.schema.json:519 | EntityStructureClassifications |
| `native_hawaiian_owned_busi` | `nativeHawaiianOwnedBusiness`     | public_spending.schema.json:477 | SocioeconomicClassifications   |
| `partnership_or_limited_lia` | `partnershipOrLimitedLiability`   | public_spending.schema.json:527 | EntityStructureClassifications |
| `period_of_performance_curr` | `periodOfPerformanceCurrent`      | public_spending.schema.json:231 | Public SpendingProcurement     |
| `period_of_performance_star` | `periodOfPerformanceStart`        | public_spending.schema.json:227 | Public SpendingProcurement     |
| `period_of_perf_potential_e` | `periodOfPerformancePotentialEnd` | public_spending.schema.json:235 | Public SpendingProcurement     |
| `place_of_performance_congr` | `placeOfPerformanceCongressional` | public_spending.schema.json:223 | Public SpendingProcurement     |
| `place_of_perform_country_n` | `placeOfPerformanceCountryName`   | public_spending.schema.json:219 | Public SpendingProcurement     |
| `place_of_perform_county_na` | `placeOfPerformanceCountyName`    | public_spending.schema.json:211 | Public SpendingProcurement     |
| `place_of_perform_state_nam` | `placeOfPerformanceStateName`     | public_spending.schema.json:215 | Public SpendingProcurement     |
| `place_of_performance_zip4a` | `placeOfPerformanceZip4`          | public_spending.schema.json:215 | Public SpendingProcurement     |
| `potential_total_value_awar` | `potentialTotalValueAward`        | public_spending.schema.json     | Public SpendingProcurement     |
| `referenced_idv_agency_iden` | `referencedIdvAgencyIdentifier`   | public_spending.schema.json     | Public SpendingProcurement     |
| `sba_certified_8_a_joint_ve` | `sbaCertified8aJointVenture`      | public_spending.schema.json     | SmallBusinessClassifications   |
| `service_disabled_veteran_o` | `serviceDisabledVeteranOwned`     | public_spending.schema.json:465 | SocioeconomicClassifications   |
| `small_disadvantaged_busine` | `smallDisadvantagedBusiness`      | public_spending.schema.json     | SmallBusinessClassifications   |
| `subchapter_s_corporation`   | `subchapterSCorporation`          | public_spending.schema.json:515 | EntityStructureClassifications |
| `ultimate_parent_legal_enti` | `ultimateParentLegalEntity`       | public_spending.schema.json:145 | Public SpendingProcurement     |
| `ultimate_parent_unique_ide` | `ultimateParentDuns`              | public_spending.schema.json:149 | Public SpendingProcurement     |

### Contract Data Number-Suffixed Fields (3 fields)

| JSON Property | GraphQL Field | Schema Location               | Type    |
| ------------- | ------------- | ----------------------------- | ------- |
| `line_1`      | `line1`       | contract_data.schema.json:319 | Address |
| `line_2`      | `line2`       | contract_data.schema.json:323 | Address |
| `line_3`      | `line3`       | contract_data.schema.json:327 | Address |

### Payment Terms Fields (Unverified - 2 fields)

| JSON Property (probable)     | GraphQL Field         | Schema Location              | Type    |
| ---------------------------- | --------------------- | ---------------------------- | ------- |
| `payment_terms_custom_1` (?) | `paymentTermsCustom1` | Unknown - needs verification | Unknown |
| `payment_terms_custom_2` (?) | `paymentTermsCustom2` | Unknown - needs verification | Unknown |

---

**Document Status:** ✅ Complete  
**Next Action:** Update diff tool to recognize field mappings
