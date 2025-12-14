-- 002_unified_model_views.sql
-- Purpose: Create views that project canonical award tables to a Unified Model-shaped representation
--          and compute helpful derived fields. Also provide a materialized view for faster
--          access to derived fields in heavier scenarios.
--
-- Assumptions:
--   - Base tables exist (created by 001_unified_model_demo.sql):
--       unified_model.awards
--       unified_model.award_contacts
--
-- This migration creates:
--   - unified_model.mv_awards_enriched (MATERIALIZED VIEW): canonical awards + derived columns
--   - unified_model.v_awards_unified_model (VIEW): a Unified Model-shaped JSON projection, including nested objects/arrays
--   - unified_model.v_awards_contacts_unified_model (VIEW): simple contact records per award in Unified Model-ish JSON
--
-- Notes:
--   - The JSON projection is intended to mirror a GraphQL schema (Unified Model) using conventional
--     field naming. The actual GraphQL exposure will still be controlled via Hasura metadata.
--   - For derived fields, we use simple heuristics that can be refined over time.
--   - REFRESH MATERIALIZED VIEW CONCURRENTLY requires a unique index; we create a unique
--     index on (id) for the MV to allow concurrent refreshes.

SET client_min_messages = warning;

BEGIN;

-- 1) Materialized view with derived fields for awards
--    This enriches the canonical data with computed, frequently used values.
DROP MATERIALIZED VIEW IF EXISTS unified_model.mv_awards_enriched CASCADE;

CREATE MATERIALIZED VIEW unified_model.mv_awards_enriched AS
SELECT
  a.id,
  a.agency_id,
  a.piid,
  a.referenced_idv_piid,
  a.description_of_contract_requirement,
  a.national_interest_action_code,
  a.base_and_all_options_value,
  a.independent_government_estimate,
  a.obligated_amount,
  a.total_base_and_all_options_value,
  a.approved_date,
  a.last_modified_date,
  a.loc_street_address,
  a.loc_city,
  a.loc_state_code,
  a.zip4a,
  a.contracting_office_agency_code,
  a.contracting_office_agency_id,
  a.contracting_office_agency_name,
  a.funding_requesting_agency_code,
  a.funding_requesting_agency_name,
  a.funding_requesting_office_code,
  a.funding_requesting_office_name,
  a.local_area_set_aside,
  a.solicitation_procedures_code,
  a.solicitation_procedures_description,
  a.type_of_set_aside_code,
  a.vendor_uei,
  a.vendor_uei_legal_business_name,
  a.vendor_co_biz_size_determination_code,
  a.vendor_naics_code,
  a.vendor_psc_code,
  a.is_sba_certified_8a_program_participant,
  a.is_sba_certified_hub_zone,
  a.is_service_related_disabled_veteran_owned_business,
  a.is_women_owned_small_business,

  -- Derived fields
  GREATEST(a.approved_date, a.last_modified_date) AS last_activity_date,
  COALESCE(a.total_base_and_all_options_value, a.base_and_all_options_value, 0::numeric) AS total_value_derived,
  SUBSTRING(COALESCE(a.zip4a, '') FROM 1 FOR 5) AS zip5,
  CASE
    WHEN a.vendor_co_biz_size_determination_code ILIKE 'S%' THEN TRUE
    WHEN a.is_women_owned_small_business
      OR a.is_service_related_disabled_veteran_owned_business
      OR a.is_sba_certified_8a_program_participant
      OR a.is_sba_certified_hub_zone
      THEN TRUE
    ELSE FALSE
  END AS is_small_business_derived,
  CASE
    WHEN a.type_of_set_aside_code IS NOT NULL AND a.type_of_set_aside_code <> '' THEN a.type_of_set_aside_code
    WHEN a.local_area_set_aside THEN 'LOCAL_SET_ASIDE'
    WHEN a.solicitation_procedures_code IN ('B','C','D') THEN a.solicitation_procedures_code
    ELSE 'UNSPECIFIED'
  END AS competition_category,
  SUBSTRING(COALESCE(a.vendor_naics_code, '') FROM 1 FOR 2) AS vendor_naics_sector
FROM unified_model.awards a
WITH NO DATA;

-- Unique index to enable REFRESH MATERIALIZED VIEW CONCURRENTLY
DROP INDEX IF EXISTS unified_model.idx_mv_awards_enriched_id;
CREATE UNIQUE INDEX idx_mv_awards_enriched_id ON unified_model.mv_awards_enriched (id);

-- Initial population
REFRESH MATERIALIZED VIEW unified_model.mv_awards_enriched;

-- 2) Contacts per award as simple Unified Model-shaped JSON
DROP VIEW IF EXISTS unified_model.v_awards_contacts_unified_model CASCADE;

CREATE VIEW unified_model.v_awards_contacts_unified_model AS
SELECT
  ac.id,
  ac.award_id,
  jsonb_build_object(
    'name', ac.name,
    'email', ac.email
  ) AS contact
FROM unified_model.award_contacts ac;

-- 3) Unified Model projection view: one row per award, JSON objects for nested structures
DROP VIEW IF EXISTS unified_model.v_awards_unified_model CASCADE;

CREATE VIEW unified_model.v_awards_unified_model AS
WITH contacts AS (
  SELECT
    ac.award_id,
    jsonb_agg(
      jsonb_build_object(
        'name', ac.name,
        'email', ac.email
      ) ORDER BY ac.id
    ) AS contacts_array
  FROM unified_model.award_contacts ac
  GROUP BY ac.award_id
)
SELECT
  e.id,
  e.piid,

  -- award.award_contract_id
  jsonb_build_object(
    'agencyId', e.agency_id,
    'piid', e.piid
  ) AS award_contract_id,

  -- award.referenced_idv
  jsonb_build_object(
    'piid', e.referenced_idv_piid
  ) AS referenced_idv,

  -- award.contract_data
  jsonb_build_object(
    'descriptionOfContractRequirement', e.description_of_contract_requirement,
    'nationalInterestActionCode', e.national_interest_action_code
  ) AS contract_data,

  -- award.dollar_values
  jsonb_build_object(
    'baseAndAllOptionsValue', e.base_and_all_options_value,
    'independentGovernmentEstimate', e.independent_government_estimate,
    'obligatedAmount', e.obligated_amount
  ) AS dollar_values,

  -- award.total_dollar_values
  jsonb_build_object(
    'totalBaseAndAllOptionsValue', e.total_base_and_all_options_value,
    'totalValueDerived', e.total_value_derived
  ) AS total_dollar_values,

  -- award.transaction_information
  jsonb_build_object(
    'approvedDate', e.approved_date,
    'lastModifiedDate', e.last_modified_date,
    'lastActivityDate', e.last_activity_date
  ) AS transaction_information,

  -- award.place_of_performance
  jsonb_build_object(
    'principalPlace', jsonb_build_object(
      'streetAddress', e.loc_street_address,
      'city', e.loc_city,
      'stateCode', e.loc_state_code,
      'zip5', e.zip5
    )
  ) AS place_of_performance,

  -- award.purchaser_information
  jsonb_build_object(
    'contractingOfficeAgency', jsonb_build_object(
      'code', e.contracting_office_agency_code,
      'id', e.contracting_office_agency_id,
      'name', e.contracting_office_agency_name
    ),
    'fundingRequestingAgency', jsonb_build_object(
      'code', e.funding_requesting_agency_code,
      'name', e.funding_requesting_agency_name
    ),
    'fundingRequestingOffice', jsonb_build_object(
      'code', e.funding_requesting_office_code,
      'name', e.funding_requesting_office_name
    )
  ) AS purchaser_information,

  -- award.competition
  jsonb_build_object(
    'localAreaSetAside', e.local_area_set_aside,
    'solicitationProcedures', jsonb_build_object(
      'code', e.solicitation_procedures_code,
      'description', e.solicitation_procedures_description
    ),
    'typeOfSetAsideCode', e.type_of_set_aside_code,
    'category', e.competition_category
  ) AS competition,

  -- award.vendor
  jsonb_build_object(
    'uei', e.vendor_uei,
    'ueiLegalBusinessName', e.vendor_uei_legal_business_name,
    'contractingOfficerBusinessSizeDetermination', jsonb_build_object(
      'code', e.vendor_co_biz_size_determination_code,
      'isSmallBusinessDerived', e.is_small_business_derived
    ),
    'lineOfBusiness', jsonb_build_object(
      'naicsCode', e.vendor_naics_code,
      'naicsSector', e.vendor_naics_sector,
      'pscCode', e.vendor_psc_code
    ),
    'socioEconomicIndicators', jsonb_build_object(
      'isSbaCertified8aProgramParticipant', e.is_sba_certified_8a_program_participant,
      'isSbaCertifiedHubZone', e.is_sba_certified_hub_zone,
      'isServiceRelatedDisabledVeteranOwnedBusiness', e.is_service_related_disabled_veteran_owned_business,
      'isWomenOwnedSmallBusiness', e.is_women_owned_small_business
    )
  ) AS vendor,

  -- award.contacts (array)
  COALESCE(c.contacts_array, '[]'::jsonb) AS contacts

FROM unified_model.mv_awards_enriched e
LEFT JOIN contacts c
  ON c.award_id = e.id;

-- Helpful comments for operators:
COMMENT ON MATERIALIZED VIEW unified_model.mv_awards_enriched IS
  'Canonical awards with derived fields (zip5, total_value_derived, competition_category, is_small_business_derived, naics sector, etc.). Refresh as schemas or data change.';

COMMENT ON VIEW unified_model.v_awards_unified_model IS
  'Unified Model-shaped projection of awards as JSON objects (nested fields and arrays), suitable for mapping to GraphQL types via Hasura metadata.';

COMMENT ON VIEW unified_model.v_awards_contacts_unified_model IS
  'Unified Model-shaped contacts as JSON per award.';

-- Example maintenance commands (not executed automatically):
--   REFRESH MATERIALIZED VIEW CONCURRENTLY unified_model.mv_awards_enriched;
--   VACUUM (ANALYZE) unified_model.mv_awards_enriched;

COMMIT;
