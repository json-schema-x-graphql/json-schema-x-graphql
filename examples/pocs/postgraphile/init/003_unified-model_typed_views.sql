-- 003_unified_model_typed_views.sql
--
-- Create typed Unified Model component views (normalize nested JSON into typed subviews)
--
-- Context:
--   Earlier migrations created:
--     - unified_model.mv_awards_enriched         (MATERIALIZED VIEW with derived fields)
--     - unified_model.v_awards_unified_model              (JSON-based Unified Model projection)
--     - unified_model.v_awards_contacts_unified_model     (contacts as JSON)
--
-- Goal:
--   Provide strictly-typed SQL views for each Unified Model “value object” so the GraphQL
--   layer (via HML) can map 1:1 to the Unified Model SDL using relationships instead of JSON.
--
-- Notes:
--   - All 1:1 components are keyed by award_id (backed by mv_awards_enriched.id)
--   - Arrays (contacts) are expressed as row-per-contact views keyed by award_id
--   - Field names are snake_case here; you can alias to Unified Model’s GraphQL names in HML
--
-- Run order:
--   This migration assumes 002_unified_model_views.sql has already created mv_awards_enriched
--   and the award_contacts table.
--
-- Safety:
--   Views are created with CREATE OR REPLACE VIEW and dropped first with IF EXISTS.

SET client_min_messages = warning;

BEGIN;

-- Ensure schema exists
CREATE SCHEMA IF NOT EXISTS unified_model;

-- -----------------------------------------------------------------------------
-- Award (root) — minimal typed base
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS unified_model.v_awards_typed_base CASCADE;
CREATE OR REPLACE VIEW unified_model.v_awards_typed_base AS
SELECT
  e.id              AS award_id,
  e.piid            AS piid
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_awards_typed_base IS
  'Minimal typed base for awards; exposes award_id (id) and piid, to be related to component subviews.';

-- -----------------------------------------------------------------------------
-- award.award_contract_id
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS unified_model.v_award_contract_id_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_award_contract_id_typed AS
SELECT
  e.id           AS award_id,
  e.agency_id    AS agency_id,
  e.piid         AS piid
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_award_contract_id_typed IS
  'Typed view for award.award_contract_id { agencyId, piid }';

-- -----------------------------------------------------------------------------
-- award.referenced_idv
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS unified_model.v_referenced_idv_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_referenced_idv_typed AS
SELECT
  e.id                  AS award_id,
  e.referenced_idv_piid AS piid
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_referenced_idv_typed IS
  'Typed view for award.referenced_idv { piid }';

-- -----------------------------------------------------------------------------
-- award.contract_data
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS unified_model.v_contract_data_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_contract_data_typed AS
SELECT
  e.id           AS award_id,
  e.description_of_contract_requirement AS description_of_contract_requirement,
  e.national_interest_action_code       AS national_interest_action_code
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_contract_data_typed IS
  'Typed view for award.contract_data { descriptionOfContractRequirement, nationalInterestActionCode }';

-- -----------------------------------------------------------------------------
-- award.dollar_values
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS unified_model.v_dollar_values_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_dollar_values_typed AS
SELECT
  e.id                               AS award_id,
  e.base_and_all_options_value       AS base_and_all_options_value,
  e.independent_government_estimate  AS independent_government_estimate,
  e.obligated_amount                 AS obligated_amount
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_dollar_values_typed IS
  'Typed view for award.dollar_values { baseAndAllOptionsValue, independentGovernmentEstimate, obligatedAmount }';

-- -----------------------------------------------------------------------------
-- award.total_dollar_values
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS unified_model.v_total_dollar_values_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_total_dollar_values_typed AS
SELECT
  e.id                                 AS award_id,
  e.total_base_and_all_options_value   AS total_base_and_all_options_value,
  e.total_value_derived                AS total_value_derived
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_total_dollar_values_typed IS
  'Typed view for award.total_dollar_values { totalBaseAndAllOptionsValue, totalValueDerived }';

-- -----------------------------------------------------------------------------
-- award.transaction_information
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS unified_model.v_transaction_information_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_transaction_information_typed AS
SELECT
  e.id                AS award_id,
  e.approved_date     AS approved_date,
  e.last_modified_date AS last_modified_date,
  e.last_activity_date AS last_activity_date
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_transaction_information_typed IS
  'Typed view for award.transaction_information { approvedDate, lastModifiedDate, lastActivityDate }';

-- -----------------------------------------------------------------------------
-- award.place_of_performance.principal_place
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS unified_model.v_place_of_performance_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_place_of_performance_typed AS
SELECT
  e.id               AS award_id,
  e.loc_street_address AS street_address,
  e.loc_city           AS city,
  e.loc_state_code     AS state_code,
  e.zip5               AS zip5
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_place_of_performance_typed IS
  'Typed view for award.place_of_performance.principal_place { streetAddress, city, stateCode, zip5 }';

-- -----------------------------------------------------------------------------
-- award.purchaser_information.contracting_office_agency
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS unified_model.v_purchaser_info_contracting_office_agency_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_purchaser_info_contracting_office_agency_typed AS
SELECT
  e.id                              AS award_id,
  e.contracting_office_agency_code  AS code,
  e.contracting_office_agency_id    AS id,
  e.contracting_office_agency_name  AS name
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_purchaser_info_contracting_office_agency_typed IS
  'Typed view for purchaser_information.contracting_office_agency { code, id, name }';

-- -----------------------------------------------------------------------------
-- award.purchaser_information.funding_requesting_agency
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS unified_model.v_purchaser_info_funding_requesting_agency_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_purchaser_info_funding_requesting_agency_typed AS
SELECT
  e.id                             AS award_id,
  e.funding_requesting_agency_code AS code,
  e.funding_requesting_agency_name AS name
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_purchaser_info_funding_requesting_agency_typed IS
  'Typed view for purchaser_information.funding_requesting_agency { code, name }';

-- -----------------------------------------------------------------------------
-- award.purchaser_information.funding_requesting_office
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS unified_model.v_purchaser_info_funding_requesting_office_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_purchaser_info_funding_requesting_office_typed AS
SELECT
  e.id                              AS award_id,
  e.funding_requesting_office_code  AS code,
  e.funding_requesting_office_name  AS name
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_purchaser_info_funding_requesting_office_typed IS
  'Typed view for purchaser_information.funding_requesting_office { code, name }';

-- -----------------------------------------------------------------------------
-- award.competition
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS unified_model.v_competition_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_competition_typed AS
SELECT
  e.id                                AS award_id,
  e.local_area_set_aside              AS local_area_set_aside,
  e.solicitation_procedures_code      AS solicitation_procedures_code,
  e.solicitation_procedures_description AS solicitation_procedures_description,
  e.type_of_set_aside_code            AS type_of_set_aside_code,
  e.competition_category              AS category
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_competition_typed IS
  'Typed view for award.competition { localAreaSetAside, solicitationProcedures { code, description }, typeOfSetAsideCode, category }';

-- -----------------------------------------------------------------------------
-- award.vendor
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS unified_model.v_vendor_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_vendor_typed AS
SELECT
  e.id                           AS award_id,
  e.vendor_uei                   AS uei,
  e.vendor_uei_legal_business_name AS uei_legal_business_name
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_vendor_typed IS
  'Typed view for award.vendor { uei, ueiLegalBusinessName }';

-- award.vendor.contracting_officer_business_size_determination
DROP VIEW IF EXISTS unified_model.v_vendor_co_biz_size_determination_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_vendor_co_biz_size_determination_typed AS
SELECT
  e.id                                   AS award_id,
  e.vendor_co_biz_size_determination_code AS code,
  e.is_small_business_derived            AS is_small_business_derived
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_vendor_co_biz_size_determination_typed IS
  'Typed view for vendor.contracting_officer_business_size_determination { code, isSmallBusinessDerived }';

-- award.vendor.line_of_business
DROP VIEW IF EXISTS unified_model.v_vendor_line_of_business_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_vendor_line_of_business_typed AS
SELECT
  e.id              AS award_id,
  e.vendor_naics_code  AS naics_code,
  e.vendor_naics_sector AS naics_sector,
  e.vendor_psc_code    AS psc_code
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_vendor_line_of_business_typed IS
  'Typed view for vendor.line_of_business { naicsCode, naicsSector, pscCode }';

-- award.vendor.socio_economic_indicators
DROP VIEW IF EXISTS unified_model.v_vendor_socio_economic_indicators_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_vendor_socio_economic_indicators_typed AS
SELECT
  e.id                                            AS award_id,
  e.is_sba_certified_8a_program_participant       AS is_sba_certified_8a_program_participant,
  e.is_sba_certified_hub_zone                     AS is_sba_certified_hub_zone,
  e.is_service_related_disabled_veteran_owned_business AS is_service_related_disabled_veteran_owned_business,
  e.is_women_owned_small_business                 AS is_women_owned_small_business
FROM unified_model.mv_awards_enriched e;

COMMENT ON VIEW unified_model.v_vendor_socio_economic_indicators_typed IS
  'Typed view for vendor.socio_economic_indicators { 8a, hubzone, sdvosb, wosb }';

-- -----------------------------------------------------------------------------
-- award.contacts (row-per-contact)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS unified_model.v_award_contacts_typed CASCADE;
CREATE OR REPLACE VIEW unified_model.v_award_contacts_typed AS
SELECT
  ac.id        AS id,
  ac.award_id  AS award_id,
  ac.name      AS name,
  ac.email     AS email
FROM unified_model.award_contacts ac;

COMMENT ON VIEW unified_model.v_award_contacts_typed IS
  'Typed row-per-contact view for award.contacts { name, email }';

COMMIT;
