# x-graphql-* Annotation Cleanup for Public Spending Schema

## Summary

The `public_spending.schema.json` file was created with redundant x-graphql annotations. Per project conventions, these annotations should only be used when:

1. **Type differs from JSON Schema default**: e.g., `number` → `Decimal`, `string` with `format: "date-time"` → `DateTime`
2. **Field name is truncated**: e.g., `awarding_sub_tier_agency_c` → `awardingSubTierAgencyCode`
3. **Non-null constraints**: Use `x-graphql-field-non-null: true` for required fields

## Fields Requiring x-graphql-field-name (Truncated Names Only)

### Public SpendingProcurement
- `awarding_sub_tier_agency_c` → `awardingSubTierAgencyCode`
- `awarding_sub_tier_agency_n` → `awardingSubTierAgencyName`
- `award_modification_amendme` → `awardModificationAmendment`
- `awardee_or_recipient_uniqu` → `awardeeOrRecipientDuns`
- `ultimate_parent_legal_enti` → `ultimateParentLegalEntity`
- `ultimate_parent_unique_ide` → `ultimateParentDuns`
- `awardee_or_recipient_legal` → `awardeeOrRecipientLegalName`
- `place_of_perform_county_na` → `placeOfPerformanceCountyName`
- `place_of_perform_state_nam` → `placeOfPerformanceStateName`
- `place_of_performance_zip4a` → `placeOfPerformanceZip4`
- `place_of_performance_congr` → `placeOfPerformanceCongressional`
- `place_of_perform_country_n` → `placeOfPerformanceCountryName`
- `period_of_performance_star` → `periodOfPerformanceStart`
- `period_of_performance_curr` → `periodOfPerformanceCurrent`
- `period_of_perf_potential_e` → `periodOfPerformancePotentialEnd`
- `potential_total_value_awar` → `potentialTotalValueAward`
- `base_exercised_options_val` → `baseExercisedOptionsValue`
- `funding_sub_tier_agency_co` → `fundingSubTierAgencyCode`
- `funding_sub_tier_agency_na` → `fundingSubTierAgencyName`
- `referenced_idv_agency_iden` → `referencedIdvAgencyIdentifier`
- `entity_doing_business_as_n` → `entityDoingBusinessAsName`

### SmallBusinessClassifications
- `sba_certified_8_a_joint_ve` → `sbaCertified8aJointVenture`
- `small_disadvantaged_busine` → `smallDisadvantagedBusiness`

### SocioeconomicClassifications
- `service_disabled_veteran_o` → `serviceDisabledVeteranOwned`
- `american_indian_owned_busi` → `americanIndianOwnedBusiness`
- `alaskan_native_owned_corpo` → `alaskanNativeOwnedCorporation`
- `native_hawaiian_owned_busi` → `nativeHawaiianOwnedBusiness`
- `asian_pacific_american_own` → `asianPacificAmericanOwned`
- `black_american_owned_busin` → `blackAmericanOwnedBusiness`
- `hispanic_american_owned_bu` → `hispanicAmericanOwnedBusiness`

### EntityStructureClassifications
- `corporate_entity_tax_exemp` → `corporateEntityTaxExempt`
- `limited_liability_corporat` → `limitedLiabilityCorporation`
- `partnership_or_limited_lia` → `partnershipOrLimitedLiability`

## Fields Requiring x-graphql-field-type (Type Conversions)

- `created_at`: `DateTime` (from `string` with `format: "date-time"`)
- `updated_at`: `DateTime` (from `string` with `format: "date-time"`)
- `federal_action_obligation`: `Decimal` (from `number`)

## Fields Requiring x-graphql-field-non-null

All fields in the `required` array should have `x-graphql-field-non-null: true`:
- `award_procurement_id`
- `submission_id`
- `job_id`
- `row_number`
- `piid`
- `unique_award_key`

## Fields NOT Needing Annotations (Clean snake_case → camelCase)

All other fields convert cleanly via standard snake_case → camelCase transformation and don't need explicit `x-graphql-field-name` annotations:
- `awarding_agency_code` → `awardingAgencyCode`
- `parent_award_id` → `parentAwardId`
- `legal_entity_city_name` → `legalEntityCityName`
- etc.

## Cleanup Script

A cleanup script should:
1. Remove all `x-graphql-field-name` where field converts cleanly via snake_case → camelCase
2. Remove all `x-graphql-field-type: "String"`, `x-graphql-field-type: "Boolean"`, `x-graphql-field-type: "Int"` (these are defaults)
3. Keep only:
   - `x-graphql-field-name` for truncated fields (list above)
   - `x-graphql-field-type` for `DateTime` and `Decimal`
   - `x-graphql-field-non-null` for required fields

This reduces the schema from ~781 lines to ~450 lines while preserving all necessary metadata.
