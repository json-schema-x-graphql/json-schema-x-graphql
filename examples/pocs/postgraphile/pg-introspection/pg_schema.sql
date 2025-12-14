--
-- PostgreSQL database dump
--

\restrict 58UdrhzyW6b1myKF2iHYfyWvjEYUeQcbrIgcSihMBhBAS77Bg8LxbBbEdYsrv6n

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: unified_model; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA unified_model;


ALTER SCHEMA unified_model OWNER TO postgres;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: award_contacts; Type: TABLE; Schema: unified_model; Owner: postgres
--

CREATE TABLE unified_model.award_contacts (
    id bigint NOT NULL,
    award_id bigint NOT NULL,
    name text NOT NULL,
    email text
);


ALTER TABLE unified_model.award_contacts OWNER TO postgres;

--
-- Name: award_contacts_id_seq; Type: SEQUENCE; Schema: unified_model; Owner: postgres
--

CREATE SEQUENCE unified_model.award_contacts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE unified_model.award_contacts_id_seq OWNER TO postgres;

--
-- Name: award_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: unified_model; Owner: postgres
--

ALTER SEQUENCE unified_model.award_contacts_id_seq OWNED BY unified_model.award_contacts.id;


--
-- Name: awards; Type: TABLE; Schema: unified_model; Owner: postgres
--

CREATE TABLE unified_model.awards (
    id bigint NOT NULL,
    agency_id text,
    piid text,
    referenced_idv_piid text,
    description_of_contract_requirement text,
    national_interest_action_code text,
    base_and_all_options_value numeric(20,2),
    independent_government_estimate numeric(20,2),
    obligated_amount numeric(20,2),
    total_base_and_all_options_value numeric(20,2),
    approved_date timestamp with time zone,
    last_modified_date timestamp with time zone,
    loc_street_address text,
    loc_city text,
    loc_state_code text,
    zip4a text,
    contracting_office_agency_code text,
    contracting_office_agency_id text,
    contracting_office_agency_name text,
    funding_requesting_agency_code text,
    funding_requesting_agency_name text,
    funding_requesting_office_code text,
    funding_requesting_office_name text,
    local_area_set_aside boolean DEFAULT false,
    solicitation_procedures_code text,
    solicitation_procedures_description text,
    type_of_set_aside_code text,
    vendor_uei text,
    vendor_uei_legal_business_name text,
    vendor_co_biz_size_determination_code text,
    vendor_naics_code text,
    vendor_psc_code text,
    is_sba_certified_8a_program_participant boolean DEFAULT false,
    is_sba_certified_hub_zone boolean DEFAULT false,
    is_service_related_disabled_veteran_owned_business boolean DEFAULT false,
    is_women_owned_small_business boolean DEFAULT false
);


ALTER TABLE unified_model.awards OWNER TO postgres;

--
-- Name: awards_id_seq; Type: SEQUENCE; Schema: unified_model; Owner: postgres
--

CREATE SEQUENCE unified_model.awards_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE unified_model.awards_id_seq OWNER TO postgres;

--
-- Name: awards_id_seq; Type: SEQUENCE OWNED BY; Schema: unified_model; Owner: postgres
--

ALTER SEQUENCE unified_model.awards_id_seq OWNED BY unified_model.awards.id;


--
-- Name: mv_awards_enriched; Type: MATERIALIZED VIEW; Schema: unified_model; Owner: postgres
--

CREATE MATERIALIZED VIEW unified_model.mv_awards_enriched AS
 SELECT a.id,
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
    GREATEST(a.approved_date, a.last_modified_date) AS last_activity_date,
    COALESCE(a.total_base_and_all_options_value, a.base_and_all_options_value, (0)::numeric) AS total_value_derived,
    SUBSTRING(COALESCE(a.zip4a, ''::text) FROM 1 FOR 5) AS zip5,
        CASE
            WHEN (a.vendor_co_biz_size_determination_code ~~* 'S%'::text) THEN true
            WHEN (a.is_women_owned_small_business OR a.is_service_related_disabled_veteran_owned_business OR a.is_sba_certified_8a_program_participant OR a.is_sba_certified_hub_zone) THEN true
            ELSE false
        END AS is_small_business_derived,
        CASE
            WHEN ((a.type_of_set_aside_code IS NOT NULL) AND (a.type_of_set_aside_code <> ''::text)) THEN a.type_of_set_aside_code
            WHEN a.local_area_set_aside THEN 'LOCAL_SET_ASIDE'::text
            WHEN (a.solicitation_procedures_code = ANY (ARRAY['B'::text, 'C'::text, 'D'::text])) THEN a.solicitation_procedures_code
            ELSE 'UNSPECIFIED'::text
        END AS competition_category,
    SUBSTRING(COALESCE(a.vendor_naics_code, ''::text) FROM 1 FOR 2) AS vendor_naics_sector
   FROM unified_model.awards a
  WITH NO DATA;


ALTER TABLE unified_model.mv_awards_enriched OWNER TO postgres;

--
-- Name: MATERIALIZED VIEW mv_awards_enriched; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON MATERIALIZED VIEW unified_model.mv_awards_enriched IS 'Canonical awards with derived fields (zip5, total_value_derived, competition_category, is_small_business_derived, naics sector, etc.). Refresh as schemas or data change.';


--
-- Name: v_award_contacts; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_award_contacts AS
 SELECT ac.id,
    a.piid,
    ac.name,
    ac.email
   FROM (unified_model.award_contacts ac
     JOIN unified_model.awards a ON ((a.id = ac.award_id)));


ALTER TABLE unified_model.v_award_contacts OWNER TO postgres;

--
-- Name: v_award_contacts_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_award_contacts_typed AS
 SELECT ac.id,
    ac.award_id,
    ac.name,
    ac.email
   FROM unified_model.award_contacts ac;


ALTER TABLE unified_model.v_award_contacts_typed OWNER TO postgres;

--
-- Name: VIEW v_award_contacts_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_award_contacts_typed IS 'Typed row-per-contact view for award.contacts { name, email }';


--
-- Name: v_award_contract_id_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_award_contract_id_typed AS
 SELECT e.id AS award_id,
    e.agency_id,
    e.piid
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_award_contract_id_typed OWNER TO postgres;

--
-- Name: VIEW v_award_contract_id_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_award_contract_id_typed IS 'Typed view for award.award_contract_id { agencyId, piid }';


--
-- Name: v_awards_contacts_unified_model; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_awards_contacts_unified_model AS
 SELECT ac.id,
    ac.award_id,
    jsonb_build_object('name', ac.name, 'email', ac.email) AS contact
   FROM unified_model.award_contacts ac;


ALTER TABLE unified_model.v_awards_contacts_unified_model OWNER TO postgres;

--
-- Name: VIEW v_awards_contacts_unified_model; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_awards_contacts_unified_model IS 'Unified Model-shaped contacts as JSON per award.';


--
-- Name: v_awards_unified_model; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_awards_unified_model AS
 WITH contacts AS (
         SELECT ac.award_id,
            jsonb_agg(jsonb_build_object('name', ac.name, 'email', ac.email) ORDER BY ac.id) AS contacts_array
           FROM unified_model.award_contacts ac
          GROUP BY ac.award_id
        )
 SELECT e.id,
    e.piid,
    jsonb_build_object('agencyId', e.agency_id, 'piid', e.piid) AS award_contract_id,
    jsonb_build_object('piid', e.referenced_idv_piid) AS referenced_idv,
    jsonb_build_object('descriptionOfContractRequirement', e.description_of_contract_requirement, 'nationalInterestActionCode', e.national_interest_action_code) AS contract_data,
    jsonb_build_object('baseAndAllOptionsValue', e.base_and_all_options_value, 'independentGovernmentEstimate', e.independent_government_estimate, 'obligatedAmount', e.obligated_amount) AS dollar_values,
    jsonb_build_object('totalBaseAndAllOptionsValue', e.total_base_and_all_options_value, 'totalValueDerived', e.total_value_derived) AS total_dollar_values,
    jsonb_build_object('approvedDate', e.approved_date, 'lastModifiedDate', e.last_modified_date, 'lastActivityDate', e.last_activity_date) AS transaction_information,
    jsonb_build_object('principalPlace', jsonb_build_object('streetAddress', e.loc_street_address, 'city', e.loc_city, 'stateCode', e.loc_state_code, 'zip5', e.zip5)) AS place_of_performance,
    jsonb_build_object('contractingOfficeAgency', jsonb_build_object('code', e.contracting_office_agency_code, 'id', e.contracting_office_agency_id, 'name', e.contracting_office_agency_name), 'fundingRequestingAgency', jsonb_build_object('code', e.funding_requesting_agency_code, 'name', e.funding_requesting_agency_name), 'fundingRequestingOffice', jsonb_build_object('code', e.funding_requesting_office_code, 'name', e.funding_requesting_office_name)) AS purchaser_information,
    jsonb_build_object('localAreaSetAside', e.local_area_set_aside, 'solicitationProcedures', jsonb_build_object('code', e.solicitation_procedures_code, 'description', e.solicitation_procedures_description), 'typeOfSetAsideCode', e.type_of_set_aside_code, 'category', e.competition_category) AS competition,
    jsonb_build_object('uei', e.vendor_uei, 'ueiLegalBusinessName', e.vendor_uei_legal_business_name, 'contractingOfficerBusinessSizeDetermination', jsonb_build_object('code', e.vendor_co_biz_size_determination_code, 'isSmallBusinessDerived', e.is_small_business_derived), 'lineOfBusiness', jsonb_build_object('naicsCode', e.vendor_naics_code, 'naicsSector', e.vendor_naics_sector, 'pscCode', e.vendor_psc_code), 'socioEconomicIndicators', jsonb_build_object('isSbaCertified8aProgramParticipant', e.is_sba_certified_8a_program_participant, 'isSbaCertifiedHubZone', e.is_sba_certified_hub_zone, 'isServiceRelatedDisabledVeteranOwnedBusiness', e.is_service_related_disabled_veteran_owned_business, 'isWomenOwnedSmallBusiness', e.is_women_owned_small_business)) AS vendor,
    COALESCE(c.contacts_array, '[]'::jsonb) AS contacts
   FROM (unified_model.mv_awards_enriched e
     LEFT JOIN contacts c ON ((c.award_id = e.id)));


ALTER TABLE unified_model.v_awards_unified_model OWNER TO postgres;

--
-- Name: VIEW v_awards_unified_model; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_awards_unified_model IS 'Unified Model-shaped projection of awards as JSON objects (nested fields and arrays), suitable for mapping to GraphQL types via Hasura metadata.';


--
-- Name: v_awards_minimal; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_awards_minimal AS
 SELECT awards.id,
    awards.piid,
    awards.vendor_uei,
    awards.vendor_uei_legal_business_name,
    awards.approved_date,
    awards.obligated_amount,
    awards.total_base_and_all_options_value
   FROM unified_model.awards;


ALTER TABLE unified_model.v_awards_minimal OWNER TO postgres;

--
-- Name: v_awards_typed_base; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_awards_typed_base AS
 SELECT e.id AS award_id,
    e.piid
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_awards_typed_base OWNER TO postgres;

--
-- Name: VIEW v_awards_typed_base; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_awards_typed_base IS 'Minimal typed base for awards; exposes award_id (id) and piid, to be related to component subviews.';


--
-- Name: v_competition_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_competition_typed AS
 SELECT e.id AS award_id,
    e.local_area_set_aside,
    e.solicitation_procedures_code,
    e.solicitation_procedures_description,
    e.type_of_set_aside_code,
    e.competition_category AS category
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_competition_typed OWNER TO postgres;

--
-- Name: VIEW v_competition_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_competition_typed IS 'Typed view for award.competition { localAreaSetAside, solicitationProcedures { code, description }, typeOfSetAsideCode, category }';


--
-- Name: v_contract_data_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_contract_data_typed AS
 SELECT e.id AS award_id,
    e.description_of_contract_requirement,
    e.national_interest_action_code
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_contract_data_typed OWNER TO postgres;

--
-- Name: VIEW v_contract_data_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_contract_data_typed IS 'Typed view for award.contract_data { descriptionOfContractRequirement, nationalInterestActionCode }';


--
-- Name: v_dollar_values_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_dollar_values_typed AS
 SELECT e.id AS award_id,
    e.base_and_all_options_value,
    e.independent_government_estimate,
    e.obligated_amount
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_dollar_values_typed OWNER TO postgres;

--
-- Name: VIEW v_dollar_values_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_dollar_values_typed IS 'Typed view for award.dollar_values { baseAndAllOptionsValue, independentGovernmentEstimate, obligatedAmount }';


--
-- Name: v_place_of_performance_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_place_of_performance_typed AS
 SELECT e.id AS award_id,
    e.loc_street_address AS street_address,
    e.loc_city AS city,
    e.loc_state_code AS state_code,
    e.zip5
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_place_of_performance_typed OWNER TO postgres;

--
-- Name: VIEW v_place_of_performance_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_place_of_performance_typed IS 'Typed view for award.place_of_performance.principal_place { streetAddress, city, stateCode, zip5 }';


--
-- Name: v_purchaser_info_contracting_office_agency_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_purchaser_info_contracting_office_agency_typed AS
 SELECT e.id AS award_id,
    e.contracting_office_agency_code AS code,
    e.contracting_office_agency_id AS id,
    e.contracting_office_agency_name AS name
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_purchaser_info_contracting_office_agency_typed OWNER TO postgres;

--
-- Name: VIEW v_purchaser_info_contracting_office_agency_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_purchaser_info_contracting_office_agency_typed IS 'Typed view for purchaser_information.contracting_office_agency { code, id, name }';


--
-- Name: v_purchaser_info_funding_requesting_agency_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_purchaser_info_funding_requesting_agency_typed AS
 SELECT e.id AS award_id,
    e.funding_requesting_agency_code AS code,
    e.funding_requesting_agency_name AS name
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_purchaser_info_funding_requesting_agency_typed OWNER TO postgres;

--
-- Name: VIEW v_purchaser_info_funding_requesting_agency_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_purchaser_info_funding_requesting_agency_typed IS 'Typed view for purchaser_information.funding_requesting_agency { code, name }';


--
-- Name: v_purchaser_info_funding_requesting_office_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_purchaser_info_funding_requesting_office_typed AS
 SELECT e.id AS award_id,
    e.funding_requesting_office_code AS code,
    e.funding_requesting_office_name AS name
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_purchaser_info_funding_requesting_office_typed OWNER TO postgres;

--
-- Name: VIEW v_purchaser_info_funding_requesting_office_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_purchaser_info_funding_requesting_office_typed IS 'Typed view for purchaser_information.funding_requesting_office { code, name }';


--
-- Name: v_referenced_idv_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_referenced_idv_typed AS
 SELECT e.id AS award_id,
    e.referenced_idv_piid AS piid
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_referenced_idv_typed OWNER TO postgres;

--
-- Name: VIEW v_referenced_idv_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_referenced_idv_typed IS 'Typed view for award.referenced_idv { piid }';


--
-- Name: v_total_dollar_values_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_total_dollar_values_typed AS
 SELECT e.id AS award_id,
    e.total_base_and_all_options_value,
    e.total_value_derived
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_total_dollar_values_typed OWNER TO postgres;

--
-- Name: VIEW v_total_dollar_values_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_total_dollar_values_typed IS 'Typed view for award.total_dollar_values { totalBaseAndAllOptionsValue, totalValueDerived }';


--
-- Name: v_transaction_information_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_transaction_information_typed AS
 SELECT e.id AS award_id,
    e.approved_date,
    e.last_modified_date,
    e.last_activity_date
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_transaction_information_typed OWNER TO postgres;

--
-- Name: VIEW v_transaction_information_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_transaction_information_typed IS 'Typed view for award.transaction_information { approvedDate, lastModifiedDate, lastActivityDate }';


--
-- Name: v_vendor_co_biz_size_determination_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_vendor_co_biz_size_determination_typed AS
 SELECT e.id AS award_id,
    e.vendor_co_biz_size_determination_code AS code,
    e.is_small_business_derived
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_vendor_co_biz_size_determination_typed OWNER TO postgres;

--
-- Name: VIEW v_vendor_co_biz_size_determination_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_vendor_co_biz_size_determination_typed IS 'Typed view for vendor.contracting_officer_business_size_determination { code, isSmallBusinessDerived }';


--
-- Name: v_vendor_line_of_business_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_vendor_line_of_business_typed AS
 SELECT e.id AS award_id,
    e.vendor_naics_code AS naics_code,
    e.vendor_naics_sector AS naics_sector,
    e.vendor_psc_code AS psc_code
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_vendor_line_of_business_typed OWNER TO postgres;

--
-- Name: VIEW v_vendor_line_of_business_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_vendor_line_of_business_typed IS 'Typed view for vendor.line_of_business { naicsCode, naicsSector, pscCode }';


--
-- Name: v_vendor_socio_economic_indicators_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_vendor_socio_economic_indicators_typed AS
 SELECT e.id AS award_id,
    e.is_sba_certified_8a_program_participant,
    e.is_sba_certified_hub_zone,
    e.is_service_related_disabled_veteran_owned_business,
    e.is_women_owned_small_business
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_vendor_socio_economic_indicators_typed OWNER TO postgres;

--
-- Name: VIEW v_vendor_socio_economic_indicators_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_vendor_socio_economic_indicators_typed IS 'Typed view for vendor.socio_economic_indicators { 8a, hubzone, sdvosb, wosb }';


--
-- Name: v_vendor_typed; Type: VIEW; Schema: unified_model; Owner: postgres
--

CREATE VIEW unified_model.v_vendor_typed AS
 SELECT e.id AS award_id,
    e.vendor_uei AS uei,
    e.vendor_uei_legal_business_name AS uei_legal_business_name
   FROM unified_model.mv_awards_enriched e;


ALTER TABLE unified_model.v_vendor_typed OWNER TO postgres;

--
-- Name: VIEW v_vendor_typed; Type: COMMENT; Schema: unified_model; Owner: postgres
--

COMMENT ON VIEW unified_model.v_vendor_typed IS 'Typed view for award.vendor { uei, ueiLegalBusinessName }';


--
-- Name: requisitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.requisitions (
    id integer NOT NULL,
    requisition_number text,
    amendment_number text,
    description text,
    amount numeric
);


ALTER TABLE public.requisitions OWNER TO postgres;

--
-- Name: requisitions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.requisitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.requisitions_id_seq OWNER TO postgres;

--
-- Name: requisitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.requisitions_id_seq OWNED BY public.requisitions.id;


--
-- Name: solicitations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solicitations (
    id integer NOT NULL,
    solicitation_number text,
    amendment_number text,
    title text,
    status text,
    amount numeric
);


ALTER TABLE public.solicitations OWNER TO postgres;

--
-- Name: solicitations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.solicitations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.solicitations_id_seq OWNER TO postgres;

--
-- Name: solicitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.solicitations_id_seq OWNED BY public.solicitations.id;


--
-- Name: award_contacts id; Type: DEFAULT; Schema: unified_model; Owner: postgres
--

ALTER TABLE ONLY unified_model.award_contacts ALTER COLUMN id SET DEFAULT nextval('unified_model.award_contacts_id_seq'::regclass);


--
-- Name: awards id; Type: DEFAULT; Schema: unified_model; Owner: postgres
--

ALTER TABLE ONLY unified_model.awards ALTER COLUMN id SET DEFAULT nextval('unified_model.awards_id_seq'::regclass);


--
-- Name: requisitions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requisitions ALTER COLUMN id SET DEFAULT nextval('public.requisitions_id_seq'::regclass);


--
-- Name: solicitations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitations ALTER COLUMN id SET DEFAULT nextval('public.solicitations_id_seq'::regclass);


--
-- Name: award_contacts award_contacts_pkey; Type: CONSTRAINT; Schema: unified_model; Owner: postgres
--

ALTER TABLE ONLY unified_model.award_contacts
    ADD CONSTRAINT award_contacts_pkey PRIMARY KEY (id);


--
-- Name: awards awards_piid_key; Type: CONSTRAINT; Schema: unified_model; Owner: postgres
--

ALTER TABLE ONLY unified_model.awards
    ADD CONSTRAINT awards_piid_key UNIQUE (piid);


--
-- Name: awards awards_pkey; Type: CONSTRAINT; Schema: unified_model; Owner: postgres
--

ALTER TABLE ONLY unified_model.awards
    ADD CONSTRAINT awards_pkey PRIMARY KEY (id);


--
-- Name: requisitions requisitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requisitions
    ADD CONSTRAINT requisitions_pkey PRIMARY KEY (id);


--
-- Name: solicitations solicitations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitations
    ADD CONSTRAINT solicitations_pkey PRIMARY KEY (id);


--
-- Name: idx_award_contacts_award_id; Type: INDEX; Schema: unified_model; Owner: postgres
--

CREATE INDEX idx_award_contacts_award_id ON unified_model.award_contacts USING btree (award_id);


--
-- Name: idx_awards_approved_date; Type: INDEX; Schema: unified_model; Owner: postgres
--

CREATE INDEX idx_awards_approved_date ON unified_model.awards USING btree (approved_date);


--
-- Name: idx_awards_piid; Type: INDEX; Schema: unified_model; Owner: postgres
--

CREATE INDEX idx_awards_piid ON unified_model.awards USING btree (piid);


--
-- Name: idx_awards_state; Type: INDEX; Schema: unified_model; Owner: postgres
--

CREATE INDEX idx_awards_state ON unified_model.awards USING btree (loc_state_code);


--
-- Name: idx_awards_vendor_naics; Type: INDEX; Schema: unified_model; Owner: postgres
--

CREATE INDEX idx_awards_vendor_naics ON unified_model.awards USING btree (vendor_naics_code);


--
-- Name: idx_awards_vendor_uei; Type: INDEX; Schema: unified_model; Owner: postgres
--

CREATE INDEX idx_awards_vendor_uei ON unified_model.awards USING btree (vendor_uei);


--
-- Name: idx_mv_awards_enriched_id; Type: INDEX; Schema: unified_model; Owner: postgres
--

CREATE UNIQUE INDEX idx_mv_awards_enriched_id ON unified_model.mv_awards_enriched USING btree (id);


--
-- Name: award_contacts award_contacts_award_id_fkey; Type: FK CONSTRAINT; Schema: unified_model; Owner: postgres
--

ALTER TABLE ONLY unified_model.award_contacts
    ADD CONSTRAINT award_contacts_award_id_fkey FOREIGN KEY (award_id) REFERENCES unified_model.awards(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 58UdrhzyW6b1myKF2iHYfyWvjEYUeQcbrIgcSihMBhBAS77Bg8LxbBbEdYsrv6n

