-- unified_model demo schema and seed data
-- This script initializes a simple Unified Model-shaped schema under the `unified_model` schema
-- and seeds a few awards with nested contacts. It’s designed for local demos
-- and will run automatically when placed under docker-entrypoint-initdb.d.

-- Safety and predictable execution
SET client_min_messages = warning;

BEGIN;

-- Create a dedicated schema
CREATE SCHEMA IF NOT EXISTS unified_model;
SET search_path = unified_model, public;

-- Core Award table (flattened columns reflecting the Unified Model view)
-- Nested value objects are represented as columns with clear prefixes.
CREATE TABLE IF NOT EXISTS awards (
  id BIGSERIAL PRIMARY KEY,

  -- award.award_contract_id
  agency_id TEXT,
  piid TEXT UNIQUE,

  -- award.referenced_idv
  referenced_idv_piid TEXT,

  -- award.contract_data
  description_of_contract_requirement TEXT,
  national_interest_action_code TEXT,

  -- award.dollar_values
  base_and_all_options_value NUMERIC(20,2),
  independent_government_estimate NUMERIC(20,2),
  obligated_amount NUMERIC(20,2),

  -- award.total_dollar_values
  total_base_and_all_options_value NUMERIC(20,2),

  -- award.transaction_information
  approved_date TIMESTAMPTZ,
  last_modified_date TIMESTAMPTZ,

  -- award.place_of_performance.principal_place + zip_code
  loc_street_address TEXT,
  loc_city TEXT,
  loc_state_code TEXT,
  zip4a TEXT,

  -- award.purchaser_information.contracting_office_agency
  contracting_office_agency_code TEXT,
  contracting_office_agency_id TEXT,
  contracting_office_agency_name TEXT,

  -- award.purchaser_information.funding_requesting_agency
  funding_requesting_agency_code TEXT,
  funding_requesting_agency_name TEXT,

  -- award.purchaser_information.funding_requesting_office
  funding_requesting_office_code TEXT,
  funding_requesting_office_name TEXT,

  -- award.competition
  local_area_set_aside BOOLEAN DEFAULT FALSE,
  solicitation_procedures_code TEXT,
  solicitation_procedures_description TEXT,
  type_of_set_aside_code TEXT,

  -- award.vendor
  vendor_uei TEXT,
  vendor_uei_legal_business_name TEXT,

  -- award.vendor.contracting_officer_business_size_determination
  vendor_co_biz_size_determination_code TEXT,

  -- award.vendor.line_of_business
  vendor_naics_code TEXT,
  vendor_psc_code TEXT,

  -- award.vendor.socio_economic_indicators
  is_sba_certified_8a_program_participant BOOLEAN DEFAULT FALSE,
  is_sba_certified_hub_zone BOOLEAN DEFAULT FALSE,
  is_service_related_disabled_veteran_owned_business BOOLEAN DEFAULT FALSE,
  is_women_owned_small_business BOOLEAN DEFAULT FALSE
);

-- Contacts (award.contacts[])
CREATE TABLE IF NOT EXISTS award_contacts (
  id BIGSERIAL PRIMARY KEY,
  award_id BIGINT NOT NULL REFERENCES unified_model.awards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_awards_piid ON awards (piid);
CREATE INDEX IF NOT EXISTS idx_awards_vendor_uei ON awards (vendor_uei);
CREATE INDEX IF NOT EXISTS idx_awards_vendor_naics ON awards (vendor_naics_code);
CREATE INDEX IF NOT EXISTS idx_awards_state ON awards (loc_state_code);
CREATE INDEX IF NOT EXISTS idx_awards_approved_date ON awards (approved_date);
CREATE INDEX IF NOT EXISTS idx_award_contacts_award_id ON award_contacts (award_id);

-- Seed data
-- Award 1
INSERT INTO awards (
  agency_id, piid, referenced_idv_piid,
  description_of_contract_requirement, national_interest_action_code,
  base_and_all_options_value, independent_government_estimate, obligated_amount,
  total_base_and_all_options_value,
  approved_date, last_modified_date,
  loc_street_address, loc_city, loc_state_code, zip4a,
  contracting_office_agency_code, contracting_office_agency_id, contracting_office_agency_name,
  funding_requesting_agency_code, funding_requesting_agency_name,
  funding_requesting_office_code, funding_requesting_office_name,
  local_area_set_aside, solicitation_procedures_code, solicitation_procedures_description, type_of_set_aside_code,
  vendor_uei, vendor_uei_legal_business_name, vendor_co_biz_size_determination_code,
  vendor_naics_code, vendor_psc_code,
  is_sba_certified_8a_program_participant, is_sba_certified_hub_zone,
  is_service_related_disabled_veteran_owned_business, is_women_owned_small_business
) VALUES (
  '123', '70ABC12345', 'IDV-001',
  'Cloud infrastructure support services', 'COV',
  1000000.00, 950000.00, 250000.00,
  1000000.00,
  '2024-07-01T15:23:00Z', '2024-07-15T09:00:00Z',
  '1600 Pennsylvania Ave NW', 'Washington', 'DC', '20500',
  '1234', '1234', 'General Services Administration',
  '013', 'Department of Commerce',
  '013-45', 'Office of Digital Services',
  FALSE, 'B', 'Full and open competition', 'WOSB',
  'UEI-ALPHA1', 'Acme Cloud LLC', 'S',
  '541512', 'D301',
  FALSE, FALSE,
  FALSE, TRUE
);

-- Contacts for Award 1
INSERT INTO award_contacts (award_id, name, email)
SELECT id, 'Jane Doe', 'jane.doe@example.com' FROM awards WHERE piid = '70ABC12345';
INSERT INTO award_contacts (award_id, name, email)
SELECT id, 'John Smith', 'john.smith@example.com' FROM awards WHERE piid = '70ABC12345';

-- Award 2
INSERT INTO awards (
  agency_id, piid, referenced_idv_piid,
  description_of_contract_requirement, national_interest_action_code,
  base_and_all_options_value, independent_government_estimate, obligated_amount,
  total_base_and_all_options_value,
  approved_date, last_modified_date,
  loc_street_address, loc_city, loc_state_code, zip4a,
  contracting_office_agency_code, contracting_office_agency_id, contracting_office_agency_name,
  funding_requesting_agency_code, funding_requesting_agency_name,
  funding_requesting_office_code, funding_requesting_office_name,
  local_area_set_aside, solicitation_procedures_code, solicitation_procedures_description, type_of_set_aside_code,
  vendor_uei, vendor_uei_legal_business_name, vendor_co_biz_size_determination_code,
  vendor_naics_code, vendor_psc_code,
  is_sba_certified_8a_program_participant, is_sba_certified_hub_zone,
  is_service_related_disabled_veteran_owned_business, is_women_owned_small_business
) VALUES (
  '987', '12DEF67890', 'IDV-XYZ',
  'Cybersecurity assessment and monitoring', 'NIA',
  2000000.00, 2100000.00, 500000.00,
  2000000.00,
  '2024-05-15T10:00:00Z', '2024-08-20T12:00:00Z',
  '1 Infinite Loop', 'Cupertino', 'CA', '95014',
  '9876', '9876', 'Department of Defense',
  '097', 'Department of Defense',
  '097-XYZ', 'Defense Digital Service',
  TRUE, 'S', 'Simplified acquisition', 'HUBZONE',
  'UEI-BRAVO2', 'Secure Bytes Inc.', 'L',
  '541519', 'D310',
  FALSE, TRUE,
  FALSE, FALSE
);

-- Contacts for Award 2
INSERT INTO award_contacts (award_id, name, email)
SELECT id, 'Alice Nguyen', 'alice.nguyen@example.com' FROM awards WHERE piid = '12DEF67890';
INSERT INTO award_contacts (award_id, name, email)
SELECT id, 'Bob Lee', 'bob.lee@example.com' FROM awards WHERE piid = '12DEF67890';

-- Award 3
INSERT INTO awards (
  agency_id, piid, referenced_idv_piid,
  description_of_contract_requirement, national_interest_action_code,
  base_and_all_options_value, independent_government_estimate, obligated_amount,
  total_base_and_all_options_value,
  approved_date, last_modified_date,
  loc_street_address, loc_city, loc_state_code, zip4a,
  contracting_office_agency_code, contracting_office_agency_id, contracting_office_agency_name,
  funding_requesting_agency_code, funding_requesting_agency_name,
  funding_requesting_office_code, funding_requesting_office_name,
  local_area_set_aside, solicitation_procedures_code, solicitation_procedures_description, type_of_set_aside_code,
  vendor_uei, vendor_uei_legal_business_name, vendor_co_biz_size_determination_code,
  vendor_naics_code, vendor_psc_code,
  is_sba_certified_8a_program_participant, is_sba_certified_hub_zone,
  is_service_related_disabled_veteran_owned_business, is_women_owned_small_business
) VALUES (
  '555', 'PIID-003', 'IDV-003',
  'Application modernization and migration', 'OTH',
  1500000.00, 1400000.00, 300000.00,
  1500000.00,
  '2024-03-10T09:30:00Z', '2024-06-01T18:00:00Z',
  '500 Main St', 'Austin', 'TX', '73301',
  '5555', '5555', 'Department of Veterans Affairs',
  '036', 'Department of Veterans Affairs',
  '036-ITS', 'Office of Information & Tech',
  FALSE, 'C', 'Competitive with exclusions', 'SDVOSB',
  'UEI-CHARLIE3', 'Veterans 8A Solutions', 'S',
  '541511', 'D305',
  TRUE, FALSE,
  TRUE, FALSE
);

-- Contacts for Award 3
INSERT INTO award_contacts (award_id, name, email)
SELECT id, 'Carlos Diaz', 'carlos.diaz@example.com' FROM awards WHERE piid = 'PIID-003';
INSERT INTO award_contacts (award_id, name, email)
SELECT id, 'Priya Patel', 'priya.patel@example.com' FROM awards WHERE piid = 'PIID-003';

COMMIT;

-- Optional: simple views to help with quick exploration
-- These views don’t change structure but can be handy when browsing in tools.
CREATE OR REPLACE VIEW unified_model.v_awards_minimal AS
SELECT
  id,
  piid,
  vendor_uei,
  vendor_uei_legal_business_name,
  approved_date,
  obligated_amount,
  total_base_and_all_options_value
FROM unified_model.awards;

CREATE OR REPLACE VIEW unified_model.v_award_contacts AS
SELECT
  ac.id,
  a.piid,
  ac.name,
  ac.email
FROM unified_model.award_contacts ac
JOIN unified_model.awards a ON a.id = ac.award_id;
