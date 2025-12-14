--
-- PostgreSQL database dump
--

-- Dumped from database version 13.8
-- Dumped by pg_dump version 13.8

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
-- Name: agency_types; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agency_types AS ENUM (
    'awarding',
    'funding'
);


--
-- Name: generation_agency_types; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.generation_agency_types AS ENUM (
    'awarding',
    'funding'
);


--
-- Name: generation_file_formats; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.generation_file_formats AS ENUM (
    'csv',
    'txt'
);


--
-- Name: generation_file_types; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.generation_file_types AS ENUM (
    'D1',
    'D2'
);


--
-- Name: label_types; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.label_types AS ENUM (
    'requirement',
    'type'
);


--
-- Name: legacy_procurementance_listing_num(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.legacy_procurementance_listing_num(text) RETURNS text
    LANGUAGE plpgsql
    AS $_$
        BEGIN
            $1 = TRIM($1);
            RETURN TRIM(LEFT($1, POSITION(' ' IN $1)));
        EXCEPTION WHEN others THEN
            return NULL;
        END;
        $_$;


--
-- Name: legacy_procurementance_listing_num_loop(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.legacy_procurementance_listing_num_loop(text) RETURNS text
    LANGUAGE plpgsql
    AS $_$
        DECLARE
            s TEXT;
            i TEXT;
        BEGIN
            FOREACH i IN ARRAY regexp_split_to_array($1, ';')
            LOOP
                s := CONCAT(s, ', ', cfda_num(i));
            END LOOP;
            RETURN RIGHT(s, -2);
        EXCEPTION WHEN others THEN
            return NULL;
        END;
        $_$;


--
-- Name: legacy_procurementance_listing_word(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.legacy_procurementance_listing_word(text) RETURNS text
    LANGUAGE plpgsql
    AS $_$
        BEGIN
            $1 = TRIM($1);
            RETURN TRIM(RIGHT($1, LENGTH($1)-POSITION(' ' IN $1)));
        EXCEPTION WHEN others THEN
            return NULL;
        END;
        $_$;


--
-- Name: legacy_procurementance_listing_word_loop(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.legacy_procurementance_listing_word_loop(text) RETURNS text
    LANGUAGE plpgsql
    AS $_$
        DECLARE
            s TEXT;
            i TEXT;
        BEGIN
            FOREACH i IN ARRAY regexp_split_to_array($1, ';')
            LOOP
                s := CONCAT(s, ', ', cfda_word(i));
            END LOOP;
            RETURN RIGHT(s, -2);
        EXCEPTION WHEN others THEN
            return NULL;
        END;
        $_$;


--
-- Name: cast_as_date(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cast_as_date(text) RETURNS date
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$select cast($1 as DATE)$_$;


--
-- Name: compile_fabs_business_categories(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compile_fabs_business_categories(business_types text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
    AS $$
        declare
            bc_arr text[];
        begin

        -- BUSINESS (FOR-PROFIT ORGANIZATION)
            if business_types ~ '(R|23)'
            then
                bc_arr := bc_arr || array['small_business'];
            end if;

            if business_types ~ '(Q|22)'
            then
                bc_arr := bc_arr || array['other_than_small_business'];
            end if;

            if bc_arr && array['small_business', 'other_than_small_business']
            then
                bc_arr := bc_arr || array['category_business'];
            end if;

        -- NON-PROFIT
            if business_types ~ '(M|N|12)'
            then
                bc_arr := bc_arr || array['nonprofit'];
            end if;

        -- HIGHER EDUCATION
            if business_types ~ '(H|06)'
            then
                bc_arr := bc_arr || array['public_institution_of_higher_education'];
            end if;

            if business_types ~ '(O|20)'
            then
                bc_arr := bc_arr || array['private_institution_of_higher_education'];
            end if;

            if business_types ~ '(T|U|V|S)'
            then
                bc_arr := bc_arr || array['minority_serving_institution_of_higher_education'];
            end if;

            if bc_arr && array[
                'public_institution_of_higher_education',
                'private_institution_of_higher_education',
                'minority_serving_institution_of_higher_education'
            ]
            then
                bc_arr := bc_arr || array['higher_education'];
            end if;

        -- GOVERNMENT
            if business_types ~ '(A|00)'
            then
                bc_arr := bc_arr || array['regional_and_state_government'];
            end if;

            if business_types ~ '(E)'
            then
                bc_arr := bc_arr || array['regional_organization'];
            end if;

            if business_types ~ '(F)'
            then
                bc_arr := bc_arr || array['us_territory_or_possession'];
            end if;

            if business_types ~ '(B|C|D|G|01|02|04|05)'
            then
                bc_arr := bc_arr || array['local_government'];
            end if;

            if business_types ~ '(I|J|K|11)'
            then
                bc_arr := bc_arr || array['indian_native_american_tribal_government'];
            end if;

            if business_types ~ '(L)'
            then
                bc_arr := bc_arr || array['authorities_and_commissions'];
            end if;

            if bc_arr && array[
                'regional_and_state_government',
                'us_territory_or_possession',
                'local_government',
                'indian_native_american_tribal_government',
                'authorities_and_commissions',
                'regional_organization'
            ]
            then
                bc_arr := bc_arr || array['government'];
            end if;

        -- INDIVIDUALS
            if business_types ~ '(P|21)'
            then
                bc_arr := bc_arr || array['individuals'];
            end if;

            -- Sort and return the array.
            return array(select unnest(bc_arr) order by 1);
        end;
        $$;


--
-- Name: fy(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fy(raw_date date) RETURNS integer
    LANGUAGE plpgsql
    AS $$
        DECLARE result INTEGER;
        DECLARE month_num INTEGER;
        BEGIN 
            month_num := EXTRACT(MONTH from raw_date);
            result := EXTRACT(YEAR FROM raw_date);
            IF month_num > 9    
            THEN
              result := result + 1;
            END IF;
            RETURN result;
        END;
        $$;


--
-- Name: is_date(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_date(str text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
        BEGIN
            perform CAST(str AS DATE);
            return TRUE;
        EXCEPTION WHEN others THEN
            return FALSE;
        END;
        $$;


--
-- Name: is_zero(numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_zero(numeric) RETURNS integer
    LANGUAGE plpgsql
    AS $_$
        BEGIN
            perform CAST($1 AS NUMERIC);
            CASE WHEN $1 <> 0
                THEN return 1;
                ELSE return 0;
            END CASE;
        EXCEPTION WHEN others THEN
            return 0;
        END;
        $_$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: application_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.application_type (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    application_type_id integer NOT NULL,
    application_name text NOT NULL
);


--
-- Name: application_type_application_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.application_type_application_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: application_type_application_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.application_type_application_type_id_seq OWNED BY public.application_type.application_type_id;


--
-- Name: appropriation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appropriation (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    appropriation_id integer NOT NULL,
    submission_id integer NOT NULL,
    job_id integer NOT NULL,
    row_number integer NOT NULL,
    adjustments_to_unobligated_cpe numeric,
    agency_identifier text,
    allocation_transfer_agency text,
    availability_type_code text,
    beginning_period_of_availa text,
    borrowing_authority_amount_cpe numeric,
    budget_authority_appropria_cpe numeric,
    total_budgetary_resources_cpe numeric,
    budget_authority_unobligat_fyb numeric,
    contract_authority_amount_cpe numeric,
    deobligations_recoveries_r_cpe numeric,
    ending_period_of_availabil text,
    gross_outlay_amount_by_tas_cpe numeric,
    main_account_code text,
    obligations_incurred_total_cpe numeric,
    other_budgetary_resources_cpe numeric,
    spending_authority_from_of_cpe numeric,
    status_of_budgetary_resour_cpe numeric,
    sub_account_code text,
    unobligated_balance_cpe numeric,
    tas text NOT NULL,
    account_num integer,
    display_tas text
);


--
-- Name: appropriation_appropriation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appropriation_appropriation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appropriation_appropriation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appropriation_appropriation_id_seq OWNED BY public.appropriation.appropriation_id;


--
-- Name: legacy_procurementance_listing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legacy_procurementance_listing (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    legacy_procurementance_listing_id integer NOT NULL,
    program_number text NOT NULL,
    program_title text,
    popular_name text,
    federal_agency text,
    "authorization" text,
    objectives text,
    types_of_legacy_procurementance text,
    uses_and_use_restrictions text,
    applicant_eligibility text,
    beneficiary_eligibility text,
    credentials_documentation text,
    preapplication_coordination text,
    application_procedures text,
    award_procedure text,
    deadlines text,
    range_of_approval_disapproval_time text,
    website_address text,
    formula_and_matching_requirements text,
    length_and_time_phasing_of_legacy_procurementance text,
    reports text,
    audits text,
    records text,
    account_identification text,
    obligations text,
    range_and_average_of_financial_legacy_procurementance text,
    appeals text,
    renewals text,
    program_accomplishments text,
    regulations_guidelines_and_literature text,
    regional_or_local_office text,
    headquarters_office text,
    related_programs text,
    examples_of_funded_projects text,
    criteria_for_selecting_proposals text,
    url text,
    recovery text,
    omb_agency_code text,
    omb_bureau_code text,
    published_date text,
    archived_date text
);


--
-- Name: legacy_procurementance_listing_legacy_procurementance_listing_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.legacy_procurementance_listing_legacy_procurementance_listing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: legacy_procurementance_listing_legacy_procurementance_listing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.legacy_procurementance_listing_legacy_procurementance_listing_id_seq OWNED BY public.legacy_procurementance_listing.legacy_procurementance_listing_id;


--
-- Name: award_financial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.award_financial (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    award_financial_id bigint NOT NULL,
    submission_id integer NOT NULL,
    job_id integer NOT NULL,
    row_number integer NOT NULL,
    agency_identifier text,
    allocation_transfer_agency text,
    availability_type_code text,
    beginning_period_of_availa text,
    by_direct_reimbursable_fun text,
    deobligations_recov_by_awa_cpe numeric,
    ending_period_of_availabil text,
    fain text,
    gross_outlay_amount_by_awa_cpe numeric,
    gross_outlay_amount_by_awa_fyb numeric,
    gross_outlays_delivered_or_cpe numeric,
    gross_outlays_delivered_or_fyb numeric,
    gross_outlays_undelivered_cpe numeric,
    gross_outlays_undelivered_fyb numeric,
    main_account_code text,
    object_class text,
    obligations_delivered_orde_cpe numeric,
    obligations_delivered_orde_fyb numeric,
    obligations_incurred_byawa_cpe numeric,
    obligations_undelivered_or_cpe numeric,
    obligations_undelivered_or_fyb numeric,
    parent_award_id text,
    piid text,
    program_activity_code text,
    program_activity_name text,
    sub_account_code text,
    transaction_obligated_amou numeric,
    uri text,
    ussgl480100_undelivered_or_cpe numeric,
    ussgl480100_undelivered_or_fyb numeric,
    ussgl480200_undelivered_or_cpe numeric,
    ussgl480200_undelivered_or_fyb numeric,
    ussgl483100_undelivered_or_cpe numeric,
    ussgl483200_undelivered_or_cpe numeric,
    ussgl487100_downward_adjus_cpe numeric,
    ussgl487200_downward_adjus_cpe numeric,
    ussgl488100_upward_adjustm_cpe numeric,
    ussgl488200_upward_adjustm_cpe numeric,
    ussgl490100_delivered_orde_cpe numeric,
    ussgl490100_delivered_orde_fyb numeric,
    ussgl490200_delivered_orde_cpe numeric,
    ussgl490800_authority_outl_cpe numeric,
    ussgl490800_authority_outl_fyb numeric,
    ussgl493100_delivered_orde_cpe numeric,
    ussgl497100_downward_adjus_cpe numeric,
    ussgl497200_downward_adjus_cpe numeric,
    ussgl498100_upward_adjustm_cpe numeric,
    ussgl498200_upward_adjustm_cpe numeric,
    tas text NOT NULL,
    account_num integer,
    general_ledger_post_date date,
    display_tas text,
    disaster_emergency_fund_code text,
    program_activity_reporting_key text,
    prior_year_adjustment text,
    ussgl480110_rein_undel_ord_cpe numeric,
    ussgl490110_rein_deliv_ord_cpe numeric,
    ussgl480210_rein_undel_obs_cpe numeric,
    ussgl497210_down_adj_refun_cpe numeric
);


--
-- Name: award_financial_legacy_procurementance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.award_financial_legacy_procurementance (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    award_financial_legacy_procurementance_id bigint NOT NULL,
    submission_id integer NOT NULL,
    job_id integer NOT NULL,
    row_number integer NOT NULL,
    action_date text,
    action_type text,
    legacy_procurementance_type text,
    award_description text,
    awardee_or_recipient_legal text,
    awardee_or_recipient_duns text,
    awarding_agency_code text,
    awarding_agency_name text,
    awarding_office_code text,
    awarding_office_name text,
    awarding_sub_tier_agency_c text,
    awarding_sub_tier_agency_n text,
    award_modification_amendme text,
    business_funds_indicator text,
    business_types text,
    legacy_procurementance_listing_number text,
    legacy_procurementance_listing_title text,
    correction_delete_indicatr text,
    face_value_loan_guarantee text,
    fain text,
    federal_action_obligation numeric,
    fiscal_year_and_quarter_co text,
    funding_agency_code text,
    funding_agency_name text,
    funding_office_name text,
    funding_office_code text,
    funding_sub_tier_agency_co text,
    funding_sub_tier_agency_na text,
    legal_entity_address_line1 text,
    legal_entity_address_line2 text,
    legal_entity_address_line3 text,
    legal_entity_city_code text,
    legal_entity_city_name text,
    legal_entity_congressional text,
    legal_entity_country_code text,
    legal_entity_county_code text,
    legal_entity_county_name text,
    legal_entity_foreign_city text,
    legal_entity_foreign_posta text,
    legal_entity_foreign_provi text,
    legal_entity_state_code text,
    legal_entity_state_name text,
    legal_entity_zip5 text,
    legal_entity_zip_last4 text,
    non_federal_funding_amount text,
    original_loan_subsidy_cost text,
    period_of_performance_curr text,
    period_of_performance_star text,
    place_of_performance_city text,
    place_of_performance_code text,
    place_of_performance_congr text,
    place_of_perform_country_c text,
    place_of_perform_county_na text,
    place_of_performance_forei text,
    place_of_perform_state_nam text,
    place_of_performance_zip4a text,
    record_type text,
    sai_number text,
    total_funding_amount text,
    uri text,
    legal_entity_country_name text,
    place_of_perform_country_n text,
    place_of_perform_county_co text,
    action_type_description text,
    legacy_procurementance_type_desc text,
    business_funds_ind_desc text,
    business_types_desc text,
    correction_delete_ind_desc text,
    record_type_description text,
    ultimate_parent_legal_enti text,
    ultimate_parent_duns text,
    afa_generated_unique text,
    unique_award_key text,
    place_of_performance_scope text,
    awardee_or_recipient_uei text,
    funding_opportunity_goals text,
    funding_opportunity_number text,
    indirect_federal_sharing numeric,
    ultimate_parent_uei text
);


--
-- Name: award_financial_legacy_procurementance_award_financial_legacy_procurementance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.award_financial_legacy_procurementance_award_financial_legacy_procurementance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: award_financial_legacy_procurementance_award_financial_legacy_procurementance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.award_financial_legacy_procurementance_award_financial_legacy_procurementance_id_seq OWNED BY public.award_financial_legacy_procurementance.award_financial_legacy_procurementance_id;


--
-- Name: award_financial_award_financial_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.award_financial_award_financial_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: award_financial_award_financial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.award_financial_award_financial_id_seq OWNED BY public.award_financial.award_financial_id;


--
-- Name: award_procurement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.award_procurement (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    award_procurement_id bigint NOT NULL,
    submission_id integer NOT NULL,
    job_id integer NOT NULL,
    row_number integer NOT NULL,
    piid text,
    awarding_sub_tier_agency_c text,
    awarding_sub_tier_agency_n text,
    awarding_agency_code text,
    awarding_agency_name text,
    parent_award_id text,
    award_modification_amendme text,
    type_of_contract_pricing text,
    contract_award_type text,
    naics text,
    naics_description text,
    awardee_or_recipient_uniqu text,
    ultimate_parent_legal_enti text,
    ultimate_parent_unique_ide text,
    award_description text,
    place_of_performance_zip4a text,
    place_of_performance_congr text,
    awardee_or_recipient_legal text,
    legal_entity_city_name text,
    legal_entity_state_descrip text,
    legal_entity_zip4 text,
    legal_entity_congressional text,
    legal_entity_address_line1 text,
    legal_entity_address_line2 text,
    legal_entity_address_line3 text,
    legal_entity_country_code text,
    legal_entity_country_name text,
    period_of_performance_star text,
    period_of_performance_curr text,
    period_of_perf_potential_e text,
    ordering_period_end_date text,
    action_date text,
    action_type text,
    federal_action_obligation numeric,
    current_total_value_award text,
    potential_total_value_awar text,
    funding_sub_tier_agency_co text,
    funding_sub_tier_agency_na text,
    funding_office_code text,
    funding_office_name text,
    awarding_office_code text,
    awarding_office_name text,
    referenced_idv_agency_iden text,
    funding_agency_code text,
    funding_agency_name text,
    place_of_performance_locat text,
    place_of_performance_state text,
    place_of_perform_country_c text,
    idv_type text,
    entity_doing_business_as_n text,
    entity_phone_number text,
    entity_fax_number text,
    multiple_or_single_award_i text,
    type_of_idc text,
    a_76_fair_act_action text,
    dod_claimant_program_code text,
    clinger_cohen_act_planning text,
    commercial_item_acquisitio text,
    commercial_item_test_progr text,
    consolidated_contract text,
    contingency_humanitarian_o text,
    contract_bundling text,
    contract_financing text,
    contracting_officers_deter text,
    cost_accounting_standards text,
    cost_or_pricing_data text,
    country_of_product_or_serv text,
    construction_wage_rate_req text,
    evaluated_preference text,
    extent_competed text,
    contract_opp_notice text,
    foreign_funding text,
    government_furnished_prope text,
    information_technology_com text,
    interagency_contracting_au text,
    local_area_set_aside text,
    major_program text,
    purchase_card_as_payment_m text,
    multi_year_contract text,
    national_interest_action text,
    number_of_actions text,
    number_of_offers_received text,
    other_statutory_authority text,
    performance_based_service text,
    place_of_manufacture text,
    price_evaluation_adjustmen text,
    product_or_service_code text,
    program_acronym text,
    other_than_full_and_open_c text,
    recovered_materials_sustai text,
    research text,
    sea_transportation text,
    labor_standards text,
    solicitation_identifier text,
    solicitation_procedures text,
    fair_opportunity_limited_s text,
    subcontracting_plan text,
    program_system_or_equipmen text,
    type_set_aside text,
    epa_designated_product text,
    materials_supplies_article text,
    transaction_number text,
    sam_exception text,
    referenced_idv_modificatio text,
    undefinitized_action text,
    domestic_or_foreign_entity text,
    award_or_idv_flag text,
    place_of_perform_country_n text,
    place_of_perform_county_na text,
    place_of_perform_state_nam text,
    referenced_idv_agency_name text,
    referenced_idv_type text,
    referenced_mult_or_single text,
    base_and_all_options_value text,
    base_exercised_options_val text,
    cage_code text,
    inherently_government_func text,
    organizational_type text,
    number_of_employees text,
    annual_revenue text,
    total_obligated_amount text,
    a_76_fair_act_action_desc text,
    action_type_description text,
    clinger_cohen_act_pla_desc text,
    commercial_item_acqui_desc text,
    commercial_item_test_desc text,
    consolidated_contract_desc text,
    construction_wage_rat_desc text,
    contingency_humanitar_desc text,
    contract_award_type_desc text,
    contract_bundling_descrip text,
    contract_financing_descrip text,
    contracting_officers_desc text,
    cost_accounting_stand_desc text,
    cost_or_pricing_data_desc text,
    country_of_product_or_desc text,
    dod_claimant_prog_cod_desc text,
    domestic_or_foreign_e_desc text,
    epa_designated_produc_desc text,
    evaluated_preference_desc text,
    extent_compete_description text,
    fair_opportunity_limi_desc text,
    contract_opp_notice_desc text,
    foreign_funding_desc text,
    government_furnished_desc text,
    idv_type_description text,
    information_technolog_desc text,
    inherently_government_desc text,
    interagency_contract_desc text,
    labor_standards_descrip text,
    last_modified text,
    legal_entity_state_code text,
    local_area_set_aside_desc text,
    materials_supplies_descrip text,
    multi_year_contract_desc text,
    multiple_or_single_aw_desc text,
    national_interest_desc text,
    other_than_full_and_o_desc text,
    performance_based_se_desc text,
    place_of_manufacture_desc text,
    place_of_performance_city text,
    product_or_service_co_desc text,
    program_system_or_equ_desc text,
    purchase_card_as_paym_desc text,
    recovered_materials_s_desc text,
    referenced_idv_type_desc text,
    referenced_mult_or_si_desc text,
    research_description text,
    sam_exception_description text,
    sea_transportation_desc text,
    solicitation_procedur_desc text,
    subcontracting_plan_desc text,
    type_of_contract_pric_desc text,
    type_of_idc_description text,
    type_set_aside_description text,
    undefinitized_action_desc text,
    solicitation_date text,
    detached_award_proc_unique text,
    unique_award_key text,
    additional_reporting text,
    awardee_or_recipient_uei text,
    ultimate_parent_uei text,
    small_business_competitive boolean,
    city_local_government boolean,
    county_local_government boolean,
    inter_municipal_local_gove boolean,
    local_government_owned boolean,
    municipality_local_governm boolean,
    school_district_local_gove boolean,
    township_local_government boolean,
    us_state_government boolean,
    us_federal_government boolean,
    federal_agency boolean,
    federally_funded_research boolean,
    us_tribal_government boolean,
    foreign_government boolean,
    community_developed_corpor boolean,
    labor_surplus_area_firm boolean,
    corporate_entity_not_tax_e boolean,
    corporate_entity_tax_exemp boolean,
    partnership_or_limited_lia boolean,
    sole_proprietorship boolean,
    small_agricultural_coopera boolean,
    international_organization boolean,
    us_government_entity boolean,
    emerging_small_business boolean,
    c8a_program_participant boolean,
    sba_certified_8_a_joint_ve boolean,
    dot_certified_disadvantage boolean,
    self_certified_small_disad boolean,
    historically_underutilized boolean,
    small_disadvantaged_busine boolean,
    the_ability_one_program boolean,
    historically_black_college boolean,
    c1862_land_grant_college boolean,
    c1890_land_grant_college boolean,
    c1994_land_grant_college boolean,
    minority_institution boolean,
    private_university_or_coll boolean,
    school_of_forestry boolean,
    state_controlled_instituti boolean,
    tribal_college boolean,
    veterinary_college boolean,
    educational_institution boolean,
    alaskan_native_servicing_i boolean,
    community_development_corp boolean,
    native_hawaiian_servicing boolean,
    domestic_shelter boolean,
    manufacturer_of_goods boolean,
    hospital_flag boolean,
    veterinary_hospital boolean,
    hispanic_servicing_institu boolean,
    foundation boolean,
    woman_owned_business boolean,
    minority_owned_business boolean,
    women_owned_small_business boolean,
    economically_disadvantaged boolean,
    joint_venture_women_owned boolean,
    joint_venture_economically boolean,
    veteran_owned_business boolean,
    service_disabled_veteran_o boolean,
    contracts boolean,
    grants boolean,
    receives_contracts_and_gra boolean,
    airport_authority boolean,
    council_of_governments boolean,
    housing_authorities_public boolean,
    interstate_entity boolean,
    planning_commission boolean,
    port_authority boolean,
    transit_authority boolean,
    subchapter_s_corporation boolean,
    limited_liability_corporat boolean,
    foreign_owned_and_located boolean,
    american_indian_owned_busi boolean,
    alaskan_native_owned_corpo boolean,
    indian_tribe_federally_rec boolean,
    native_hawaiian_owned_busi boolean,
    tribally_owned_business boolean,
    asian_pacific_american_own boolean,
    black_american_owned_busin boolean,
    hispanic_american_owned_bu boolean,
    native_american_owned_busi boolean,
    subcontinent_asian_asian_i boolean,
    other_minority_owned_busin boolean,
    for_profit_organization boolean,
    nonprofit_organization boolean,
    other_not_for_profit_organ boolean,
    us_local_government boolean
);


--
-- Name: award_procurement_award_procurement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.award_procurement_award_procurement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: award_procurement_award_procurement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.award_procurement_award_procurement_id_seq OWNED BY public.award_procurement.award_procurement_id;


--
-- Name: banner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banner (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    banner_id integer NOT NULL,
    start_date date,
    end_date date,
    block_certification boolean,
    message text,
    application_type_id integer,
    banner_type text NOT NULL,
    header text
);


--
-- Name: cd_city_grouped; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cd_city_grouped (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    cd_city_grouped_id integer NOT NULL,
    city_name text,
    state_abbreviation text,
    congressional_district_no text,
    city_code text
);


--
-- Name: cd_city_grouped_cd_city_grouped_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cd_city_grouped_cd_city_grouped_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cd_city_grouped_cd_city_grouped_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cd_city_grouped_cd_city_grouped_id_seq OWNED BY public.cd_city_grouped.cd_city_grouped_id;


--
-- Name: cd_county_grouped; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cd_county_grouped (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    cd_county_grouped_id integer NOT NULL,
    county_number text,
    state_abbreviation text,
    congressional_district_no text
);


--
-- Name: cd_county_grouped_cd_county_grouped_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cd_county_grouped_cd_county_grouped_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cd_county_grouped_cd_county_grouped_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cd_county_grouped_cd_county_grouped_id_seq OWNED BY public.cd_county_grouped.cd_county_grouped_id;


--
-- Name: cd_state_grouped; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cd_state_grouped (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    cd_state_grouped_id integer NOT NULL,
    state_abbreviation text,
    congressional_district_no text
);


--
-- Name: cd_state_grouped_cd_state_grouped_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cd_state_grouped_cd_state_grouped_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cd_state_grouped_cd_state_grouped_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cd_state_grouped_cd_state_grouped_id_seq OWNED BY public.cd_state_grouped.cd_state_grouped_id;


--
-- Name: cd_zips_grouped; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cd_zips_grouped (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    cd_zips_grouped_id integer NOT NULL,
    zip5 text,
    state_abbreviation text,
    congressional_district_no text
);


--
-- Name: cd_zips_grouped_cd_zips_grouped_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cd_zips_grouped_cd_zips_grouped_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cd_zips_grouped_cd_zips_grouped_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cd_zips_grouped_cd_zips_grouped_id_seq OWNED BY public.cd_zips_grouped.cd_zips_grouped_id;


--
-- Name: cd_zips_grouped_historical; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cd_zips_grouped_historical (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    cd_zips_grouped_historical_id integer NOT NULL,
    zip5 text,
    state_abbreviation text,
    congressional_district_no text
);


--
-- Name: cd_zips_grouped_historical_cd_zips_grouped_historical_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cd_zips_grouped_historical_cd_zips_grouped_historical_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cd_zips_grouped_historical_cd_zips_grouped_historical_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cd_zips_grouped_historical_cd_zips_grouped_historical_id_seq OWNED BY public.cd_zips_grouped_historical.cd_zips_grouped_historical_id;


--
-- Name: certify_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certify_history (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    certify_history_id integer NOT NULL,
    submission_id integer,
    user_id integer
);


--
-- Name: certify_history_certify_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.certify_history_certify_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: certify_history_certify_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.certify_history_certify_history_id_seq OWNED BY public.certify_history.certify_history_id;


--
-- Name: cgac; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cgac (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    cgac_id integer NOT NULL,
    cgac_code text NOT NULL,
    agency_name text,
    icon_name text
);


--
-- Name: cgac_cgac_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cgac_cgac_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cgac_cgac_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cgac_cgac_id_seq OWNED BY public.cgac.cgac_id;


--
-- Name: city_code; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.city_code (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    city_code_id integer NOT NULL,
    feature_name text,
    feature_class text,
    city_code text,
    state_code text,
    county_number text,
    county_name text,
    latitude text,
    longitude text
);


--
-- Name: city_code_city_code_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.city_code_city_code_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: city_code_city_code_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.city_code_city_code_id_seq OWNED BY public.city_code.city_code_id;


--
-- Name: comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    comment_id integer NOT NULL,
    submission_id integer NOT NULL,
    file_type_id integer,
    comment text NOT NULL
);


--
-- Name: comment_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comment_comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comment_comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comment_comment_id_seq OWNED BY public.comment.comment_id;


--
-- Name: country_code; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.country_code (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    country_code_id integer NOT NULL,
    country_code text NOT NULL,
    country_name text NOT NULL,
    territory_free_state boolean DEFAULT false NOT NULL,
    country_code_2_char text
);


--
-- Name: country_code_country_code_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.country_code_country_code_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: country_code_country_code_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.country_code_country_code_id_seq OWNED BY public.country_code.country_code_id;


--
-- Name: county_code; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.county_code (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    county_code_id integer NOT NULL,
    county_number text,
    county_name text,
    state_code text
);


--
-- Name: county_code_county_code_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.county_code_county_code_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: county_code_county_code_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.county_code_county_code_id_seq OWNED BY public.county_code.county_code_id;


--
-- Name: defc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.defc (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    defc_id integer NOT NULL,
    code text NOT NULL,
    "group" text,
    public_laws text[],
    public_law_short_titles text[],
    urls text[],
    is_valid boolean DEFAULT true NOT NULL,
    earliest_pl_action_date timestamp without time zone
);


--
-- Name: defc_defc_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.defc_defc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: defc_defc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.defc_defc_id_seq OWNED BY public.defc.defc_id;


--
-- Name: detached_award_procurement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detached_award_procurement (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    detached_award_procurement_id bigint NOT NULL,
    detached_award_proc_unique text NOT NULL,
    piid text,
    agency_id text,
    awarding_sub_tier_agency_c text,
    awarding_sub_tier_agency_n text,
    awarding_agency_code text,
    awarding_agency_name text,
    parent_award_id text,
    award_modification_amendme text,
    type_of_contract_pricing text,
    type_of_contract_pric_desc text,
    contract_award_type text,
    contract_award_type_desc text,
    naics text,
    naics_description text,
    awardee_or_recipient_uniqu text,
    ultimate_parent_legal_enti text,
    ultimate_parent_unique_ide text,
    award_description text,
    place_of_performance_zip4a text,
    place_of_perform_city_name text,
    place_of_perform_county_na text,
    place_of_performance_congr text,
    awardee_or_recipient_legal text,
    legal_entity_city_name text,
    legal_entity_state_code text,
    legal_entity_state_descrip text,
    legal_entity_zip4 text,
    legal_entity_congressional text,
    legal_entity_address_line1 text,
    legal_entity_address_line2 text,
    legal_entity_address_line3 text,
    legal_entity_country_code text,
    legal_entity_country_name text,
    period_of_performance_star text,
    period_of_performance_curr text,
    period_of_perf_potential_e text,
    ordering_period_end_date text,
    action_date text,
    action_type text,
    action_type_description text,
    federal_action_obligation numeric,
    current_total_value_award text,
    potential_total_value_awar text,
    funding_sub_tier_agency_co text,
    funding_sub_tier_agency_na text,
    funding_office_code text,
    funding_office_name text,
    awarding_office_code text,
    awarding_office_name text,
    referenced_idv_agency_iden text,
    referenced_idv_agency_desc text,
    funding_agency_code text,
    funding_agency_name text,
    place_of_performance_locat text,
    place_of_performance_state text,
    place_of_perfor_state_desc text,
    place_of_perform_country_c text,
    place_of_perf_country_desc text,
    idv_type text,
    idv_type_description text,
    referenced_idv_type text,
    referenced_idv_type_desc text,
    vendor_doing_as_business_n text,
    vendor_phone_number text,
    vendor_fax_number text,
    multiple_or_single_award_i text,
    multiple_or_single_aw_desc text,
    referenced_mult_or_single text,
    referenced_mult_or_si_desc text,
    type_of_idc text,
    type_of_idc_description text,
    a_76_fair_act_action text,
    a_76_fair_act_action_desc text,
    dod_claimant_program_code text,
    dod_claimant_prog_cod_desc text,
    clinger_cohen_act_planning text,
    clinger_cohen_act_pla_desc text,
    commercial_item_acquisitio text,
    commercial_item_acqui_desc text,
    commercial_item_test_progr text,
    commercial_item_test_desc text,
    consolidated_contract text,
    consolidated_contract_desc text,
    contingency_humanitarian_o text,
    contingency_humanitar_desc text,
    contract_bundling text,
    contract_bundling_descrip text,
    contract_financing text,
    contract_financing_descrip text,
    contracting_officers_deter text,
    contracting_officers_desc text,
    cost_accounting_standards text,
    cost_accounting_stand_desc text,
    cost_or_pricing_data text,
    cost_or_pricing_data_desc text,
    country_of_product_or_serv text,
    country_of_product_or_desc text,
    construction_wage_rate_req text,
    construction_wage_rat_desc text,
    evaluated_preference text,
    evaluated_preference_desc text,
    extent_competed text,
    extent_compete_description text,
    fed_biz_opps text,
    fed_biz_opps_description text,
    foreign_funding text,
    foreign_funding_desc text,
    government_furnished_prope text,
    government_furnished_desc text,
    information_technology_com text,
    information_technolog_desc text,
    interagency_contracting_au text,
    interagency_contract_desc text,
    local_area_set_aside text,
    local_area_set_aside_desc text,
    major_program text,
    purchase_card_as_payment_m text,
    purchase_card_as_paym_desc text,
    multi_year_contract text,
    multi_year_contract_desc text,
    national_interest_action text,
    national_interest_desc text,
    number_of_actions text,
    number_of_offers_received text,
    other_statutory_authority text,
    performance_based_service text,
    performance_based_se_desc text,
    place_of_manufacture text,
    place_of_manufacture_desc text,
    price_evaluation_adjustmen text,
    product_or_service_code text,
    product_or_service_co_desc text,
    program_acronym text,
    other_than_full_and_open_c text,
    other_than_full_and_o_desc text,
    recovered_materials_sustai text,
    recovered_materials_s_desc text,
    research text,
    research_description text,
    sea_transportation text,
    sea_transportation_desc text,
    labor_standards text,
    labor_standards_descrip text,
    solicitation_identifier text,
    solicitation_procedures text,
    solicitation_procedur_desc text,
    fair_opportunity_limited_s text,
    fair_opportunity_limi_desc text,
    subcontracting_plan text,
    subcontracting_plan_desc text,
    program_system_or_equipmen text,
    program_system_or_equ_desc text,
    type_set_aside text,
    type_set_aside_description text,
    epa_designated_product text,
    epa_designated_produc_desc text,
    materials_supplies_article text,
    materials_supplies_descrip text,
    transaction_number text,
    sam_exception text,
    sam_exception_description text,
    referenced_idv_modificatio text,
    undefinitized_action text,
    undefinitized_action_desc text,
    domestic_or_foreign_entity text,
    domestic_or_foreign_e_desc text,
    pulled_from text,
    last_modified text,
    annual_revenue text,
    division_name text,
    division_number_or_office text,
    number_of_employees text,
    vendor_alternate_name text,
    vendor_alternate_site_code text,
    vendor_enabled text,
    vendor_legal_org_name text,
    vendor_location_disabled_f text,
    vendor_site_code text,
    initial_report_date text,
    base_and_all_options_value text,
    base_exercised_options_val text,
    total_obligated_amount text,
    place_of_perform_country_n text,
    place_of_perform_state_nam text,
    referenced_idv_agency_name text,
    award_or_idv_flag text,
    legal_entity_county_code text,
    legal_entity_county_name text,
    legal_entity_zip5 text,
    legal_entity_zip_last4 text,
    place_of_perform_county_co text,
    place_of_performance_zip5 text,
    place_of_perform_zip_last4 text,
    cage_code text,
    inherently_government_func text,
    organizational_type text,
    business_categories text[],
    inherently_government_desc text,
    unique_award_key text,
    solicitation_date text,
    high_comp_officer1_amount text,
    high_comp_officer1_full_na text,
    high_comp_officer2_amount text,
    high_comp_officer2_full_na text,
    high_comp_officer3_amount text,
    high_comp_officer3_full_na text,
    high_comp_officer4_amount text,
    high_comp_officer4_full_na text,
    high_comp_officer5_amount text,
    high_comp_officer5_full_na text,
    additional_reporting text,
    awardee_or_recipient_uei text,
    ultimate_parent_uei text,
    small_business_competitive boolean,
    city_local_government boolean,
    county_local_government boolean,
    inter_municipal_local_gove boolean,
    local_government_owned boolean,
    municipality_local_governm boolean,
    school_district_local_gove boolean,
    township_local_government boolean,
    us_state_government boolean,
    us_federal_government boolean,
    federal_agency boolean,
    federally_funded_research boolean,
    us_tribal_government boolean,
    foreign_government boolean,
    community_developed_corpor boolean,
    labor_surplus_area_firm boolean,
    corporate_entity_not_tax_e boolean,
    corporate_entity_tax_exemp boolean,
    partnership_or_limited_lia boolean,
    sole_proprietorship boolean,
    small_agricultural_coopera boolean,
    international_organization boolean,
    us_government_entity boolean,
    emerging_small_business boolean,
    c8a_program_participant boolean,
    sba_certified_8_a_joint_ve boolean,
    dot_certified_disadvantage boolean,
    self_certified_small_disad boolean,
    historically_underutilized boolean,
    small_disadvantaged_busine boolean,
    the_ability_one_program boolean,
    historically_black_college boolean,
    c1862_land_grant_college boolean,
    c1890_land_grant_college boolean,
    c1994_land_grant_college boolean,
    minority_institution boolean,
    private_university_or_coll boolean,
    school_of_forestry boolean,
    state_controlled_instituti boolean,
    tribal_college boolean,
    veterinary_college boolean,
    educational_institution boolean,
    alaskan_native_servicing_i boolean,
    community_development_corp boolean,
    native_hawaiian_servicing boolean,
    domestic_shelter boolean,
    manufacturer_of_goods boolean,
    hospital_flag boolean,
    veterinary_hospital boolean,
    hispanic_servicing_institu boolean,
    foundation boolean,
    woman_owned_business boolean,
    minority_owned_business boolean,
    women_owned_small_business boolean,
    economically_disadvantaged boolean,
    joint_venture_women_owned boolean,
    joint_venture_economically boolean,
    veteran_owned_business boolean,
    service_disabled_veteran_o boolean,
    contracts boolean,
    grants boolean,
    receives_contracts_and_gra boolean,
    airport_authority boolean,
    council_of_governments boolean,
    housing_authorities_public boolean,
    interstate_entity boolean,
    planning_commission boolean,
    port_authority boolean,
    transit_authority boolean,
    subchapter_s_corporation boolean,
    limited_liability_corporat boolean,
    foreign_owned_and_located boolean,
    american_indian_owned_busi boolean,
    alaskan_native_owned_corpo boolean,
    indian_tribe_federally_rec boolean,
    native_hawaiian_owned_busi boolean,
    tribally_owned_business boolean,
    asian_pacific_american_own boolean,
    black_american_owned_busin boolean,
    hispanic_american_owned_bu boolean,
    native_american_owned_busi boolean,
    subcontinent_asian_asian_i boolean,
    other_minority_owned_busin boolean,
    for_profit_organization boolean,
    nonprofit_organization boolean,
    other_not_for_profit_organ boolean,
    us_local_government boolean,
    entity_data_source text,
    approved_date text,
    closed_date text,
    domestic_parent_uei text,
    domestic_parent_uei_name text,
    fee_paid_for_use_of_serv text,
    idv_number_of_offers_recie text,
    idv_type_of_set_aside text,
    immediate_parent_uei text,
    immediate_parent_uei_name text,
    self_cert_hub_zone_joint boolean,
    source_selection_process text,
    total_estimated_order_val text,
    uei_legal_business_name text,
    small_business_joint_venture boolean,
    ser_disabvet_own_bus_join_ven boolean,
    sba_cert_women_own_small_bus boolean,
    sba_cert_econ_disadv_wosb boolean
);


--
-- Name: detached_award_procurement_detached_award_procurement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detached_award_procurement_detached_award_procurement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detached_award_procurement_detached_award_procurement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detached_award_procurement_detached_award_procurement_id_seq OWNED BY public.detached_award_procurement.detached_award_procurement_id;


--
-- Name: email_template; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_template (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    email_template_id integer NOT NULL,
    template_type_id integer,
    subject text,
    content text
);


--
-- Name: email_template_email_template_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_template_email_template_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_template_email_template_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_template_email_template_id_seq OWNED BY public.email_template.email_template_id;


--
-- Name: email_template_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_template_type (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    email_template_type_id integer NOT NULL,
    name text,
    description text
);


--
-- Name: email_template_type_email_template_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_template_type_email_template_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_template_type_email_template_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_template_type_email_template_type_id_seq OWNED BY public.email_template_type.email_template_type_id;


--
-- Name: email_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_token (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    email_token_id integer NOT NULL,
    token text,
    salt text
);


--
-- Name: email_token_email_token_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_token_email_token_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_token_email_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_token_email_token_id_seq OWNED BY public.email_token.email_token_id;


--
-- Name: error_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_metadata (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    error_metadata_id integer NOT NULL,
    job_id integer,
    filename text,
    field_name text,
    error_type_id integer,
    occurrences integer,
    first_row integer,
    rule_failed text,
    file_type_id integer,
    target_file_type_id integer,
    original_rule_label text,
    severity_id integer
);


--
-- Name: error_metadata_error_metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.error_metadata_error_metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: error_metadata_error_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.error_metadata_error_metadata_id_seq OWNED BY public.error_metadata.error_metadata_id;


--
-- Name: error_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_type (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    error_type_id integer NOT NULL,
    name text,
    description text
);


--
-- Name: error_type_error_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.error_type_error_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: error_type_error_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.error_type_error_type_id_seq OWNED BY public.error_type.error_type_id;


--
-- Name: external_data_load_date; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_data_load_date (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    external_data_load_date_id integer NOT NULL,
    last_load_date_start timestamp without time zone,
    external_data_type_id integer,
    last_load_date_end timestamp without time zone
);


--
-- Name: external_data_load_date_external_data_load_date_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_data_load_date_external_data_load_date_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: external_data_load_date_external_data_load_date_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_data_load_date_external_data_load_date_id_seq OWNED BY public.external_data_load_date.external_data_load_date_id;


--
-- Name: external_data_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_data_type (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    external_data_type_id integer NOT NULL,
    name text,
    description text
);


--
-- Name: external_data_type_external_data_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_data_type_external_data_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: external_data_type_external_data_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_data_type_external_data_type_id_seq OWNED BY public.external_data_type.external_data_type_id;


--
-- Name: fabs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fabs (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    fabs_id bigint NOT NULL,
    submission_id integer NOT NULL,
    job_id integer NOT NULL,
    row_number integer NOT NULL,
    action_date text,
    action_type text,
    legacy_procurementance_type text,
    award_description text,
    awardee_or_recipient_legal text,
    awardee_or_recipient_uniqu text,
    awarding_office_code text,
    awarding_sub_tier_agency_c text,
    award_modification_amendme text,
    business_funds_indicator text,
    business_types text,
    legacy_procurementance_listing_number text,
    correction_delete_indicatr text,
    face_value_loan_guarantee numeric,
    fain text,
    federal_action_obligation numeric,
    funding_office_code text,
    funding_sub_tier_agency_co text,
    legal_entity_address_line1 text,
    legal_entity_address_line2 text,
    legal_entity_country_code text,
    legal_entity_foreign_city text,
    legal_entity_foreign_posta text,
    legal_entity_foreign_provi text,
    legal_entity_zip5 text,
    legal_entity_zip_last4 text,
    non_federal_funding_amount numeric,
    original_loan_subsidy_cost numeric,
    period_of_performance_curr text,
    period_of_performance_star text,
    place_of_performance_code text,
    place_of_performance_congr text,
    place_of_perform_country_c text,
    place_of_performance_forei text,
    place_of_performance_zip4a text,
    record_type integer,
    sai_number text,
    uri text,
    is_valid boolean DEFAULT false NOT NULL,
    afa_generated_unique text NOT NULL,
    legal_entity_congressional text,
    unique_award_key text,
    uei text,
    ultimate_parent_uei text,
    funding_opportunity_goals text,
    funding_opportunity_number text,
    indirect_federal_sharing numeric,
    awarding_agency_code text
);


--
-- Name: fabs_fabs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fabs_fabs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fabs_fabs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fabs_fabs_id_seq OWNED BY public.fabs.fabs_id;


--
-- Name: field_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_type (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    field_type_id integer NOT NULL,
    name text,
    description text
);


--
-- Name: field_type_field_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.field_type_field_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: field_type_field_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.field_type_field_type_id_seq OWNED BY public.field_type.field_type_id;


--
-- Name: file; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    file_id integer NOT NULL,
    job_id integer,
    filename text,
    file_status_id integer,
    headers_missing text,
    headers_duplicated text
);


--
-- Name: file_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_columns (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    file_column_id integer NOT NULL,
    file_id integer,
    field_types_id integer,
    name text,
    name_short text,
    description text,
    required boolean,
    padded_flag boolean DEFAULT false NOT NULL,
    length integer,
    unified_model_name text
);


--
-- Name: file_columns_file_column_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.file_columns_file_column_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: file_columns_file_column_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.file_columns_file_column_id_seq OWNED BY public.file_columns.file_column_id;


--
-- Name: file_file_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.file_file_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: file_file_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.file_file_id_seq OWNED BY public.file.file_id;


--
-- Name: file_generation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_generation (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    file_generation_id integer NOT NULL,
    request_date date NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    agency_code text NOT NULL,
    agency_type public.generation_agency_types DEFAULT 'awarding'::public.generation_agency_types NOT NULL,
    file_type public.generation_file_types DEFAULT 'D1'::public.generation_file_types NOT NULL,
    file_path text,
    is_cached_file boolean NOT NULL,
    file_format public.generation_file_formats DEFAULT 'csv'::public.generation_file_formats NOT NULL,
    element_numbers boolean DEFAULT false NOT NULL
);


--
-- Name: file_generation_file_generation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.file_generation_file_generation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: file_generation_file_generation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.file_generation_file_generation_id_seq OWNED BY public.file_generation.file_generation_id;


--
-- Name: file_generation_task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_generation_task (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    file_generation_task_id integer NOT NULL,
    generation_task_key text,
    job_id integer
);


--
-- Name: file_generation_task_file_generation_task_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.file_generation_task_file_generation_task_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: file_generation_task_file_generation_task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.file_generation_task_file_generation_task_id_seq OWNED BY public.file_generation_task.file_generation_task_id;


--
-- Name: file_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_status (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    file_status_id integer NOT NULL,
    name text,
    description text
);


--
-- Name: file_status_file_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.file_status_file_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: file_status_file_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.file_status_file_status_id_seq OWNED BY public.file_status.file_status_id;


--
-- Name: file_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_type (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    file_type_id integer NOT NULL,
    name text,
    description text,
    letter_name text,
    file_order integer
);


--
-- Name: file_type_file_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.file_type_file_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: file_type_file_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.file_type_file_type_id_seq OWNED BY public.file_type.file_type_id;


--
-- Name: flex_field; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flex_field (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    flex_field_id bigint NOT NULL,
    submission_id integer NOT NULL,
    job_id integer NOT NULL,
    row_number integer NOT NULL,
    header text,
    cell text,
    file_type_id integer
);


--
-- Name: flex_field_flex_field_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.flex_field_flex_field_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flex_field_flex_field_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.flex_field_flex_field_id_seq OWNED BY public.flex_field.flex_field_id;


--
-- Name: format_change_date; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.format_change_date (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    format_change_id integer NOT NULL,
    name text,
    description text,
    change_date timestamp without time zone
);


--
-- Name: format_change_date_format_change_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.format_change_date_format_change_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: format_change_date_format_change_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.format_change_date_format_change_id_seq OWNED BY public.format_change_date.format_change_id;


--
-- Name: frec; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.frec (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    frec_id integer NOT NULL,
    frec_code text,
    agency_name text,
    cgac_id integer NOT NULL,
    icon_name text
);


--
-- Name: frec_frec_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.frec_frec_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: frec_frec_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.frec_frec_id_seq OWNED BY public.frec.frec_id;


--
-- Name: funding_opportunity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.funding_opportunity (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    funding_opportunity_id integer NOT NULL,
    funding_opportunity_number text NOT NULL,
    title text,
    legacy_procurementance_listing_numbers text[],
    agency_name text,
    status text,
    open_date date,
    close_date date,
    doc_type text,
    internal_id integer
);


--
-- Name: funding_opportunity_funding_opportunity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.funding_opportunity_funding_opportunity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: funding_opportunity_funding_opportunity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.funding_opportunity_funding_opportunity_id_seq OWNED BY public.funding_opportunity.funding_opportunity_id;


--
-- Name: gtas_boc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gtas_boc (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    gtas_boc_id integer NOT NULL,
    agency_identifier text,
    allocation_transfer_agency text,
    availability_type_code text,
    beginning_period_of_availa text,
    ending_period_of_availabil text,
    main_account_code text NOT NULL,
    sub_account_code text NOT NULL,
    tas text NOT NULL,
    display_tas text,
    fiscal_year integer NOT NULL,
    period integer NOT NULL,
    ussgl_number text,
    dollar_amount numeric,
    debit_credit text,
    begin_end text,
    authority_type text,
    reimbursable_flag text,
    apportionment_cat_code text,
    apportionment_cat_b_prog text,
    program_report_cat_number text,
    federal_nonfederal text,
    trading_partner_agency_ide text,
    trading_partner_mac text,
    year_of_budget_auth_code text,
    availability_time text,
    bea_category text,
    borrowing_source text,
    exchange_or_nonexchange text,
    custodial_noncustodial text,
    budget_impact text,
    prior_year_adjustment_code text,
    credit_cohort_year integer,
    disaster_emergency_fund_code text,
    reduction_type text,
    budget_object_class text,
    budget_bureau_code text,
    atb_submission_status text,
    atb_upload_user text,
    atb_update_datetime timestamp without time zone
);


--
-- Name: gtas_boc_gtas_boc_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gtas_boc_gtas_boc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gtas_boc_gtas_boc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gtas_boc_gtas_boc_id_seq OWNED BY public.gtas_boc.gtas_boc_id;


--
-- Name: historic_duns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historic_duns (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    duns_id integer NOT NULL,
    awardee_or_recipient_uniqu text,
    legal_business_name text,
    dba_name text,
    activation_date date,
    registration_date date,
    expiration_date date,
    last_sam_mod_date date,
    address_line_1 text,
    address_line_2 text,
    city text,
    state text,
    zip text,
    zip4 text,
    country_code text,
    congressional_district text,
    business_types_codes text[],
    ultimate_parent_unique_ide text,
    ultimate_parent_legal_enti text,
    high_comp_officer1_amount text,
    high_comp_officer1_full_na text,
    high_comp_officer2_amount text,
    high_comp_officer2_full_na text,
    high_comp_officer3_amount text,
    high_comp_officer3_full_na text,
    high_comp_officer4_amount text,
    high_comp_officer4_full_na text,
    high_comp_officer5_amount text,
    high_comp_officer5_full_na text,
    business_types text[],
    uei text,
    ultimate_parent_uei text,
    entity_structure text
);


--
-- Name: historic_duns_duns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historic_duns_duns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historic_duns_duns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historic_duns_duns_id_seq OWNED BY public.historic_duns.duns_id;


--
-- Name: job; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    job_id integer NOT NULL,
    filename text,
    job_status_id integer,
    job_type_id integer,
    submission_id integer,
    file_type_id integer,
    original_filename text,
    file_size bigint,
    number_of_rows integer,
    number_of_rows_valid integer,
    number_of_errors integer DEFAULT 0 NOT NULL,
    number_of_warnings integer DEFAULT 0 NOT NULL,
    error_message text,
    end_date date,
    start_date date,
    user_id integer,
    last_validated timestamp without time zone,
    file_generation_id integer,
    progress numeric DEFAULT '0'::numeric NOT NULL
);


--
-- Name: job_dependency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_dependency (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    dependency_id integer NOT NULL,
    job_id integer,
    prerequisite_id integer
);


--
-- Name: job_dependency_dependency_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_dependency_dependency_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: job_dependency_dependency_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_dependency_dependency_id_seq OWNED BY public.job_dependency.dependency_id;


--
-- Name: job_job_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_job_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: job_job_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_job_id_seq OWNED BY public.job.job_id;


--
-- Name: job_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_status (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    job_status_id integer NOT NULL,
    name text,
    description text
);


--
-- Name: job_status_job_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_status_job_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: job_status_job_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_status_job_status_id_seq OWNED BY public.job_status.job_status_id;


--
-- Name: job_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_type (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    job_type_id integer NOT NULL,
    name text,
    description text
);


--
-- Name: job_type_job_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_type_job_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: job_type_job_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_type_job_type_id_seq OWNED BY public.job_type.job_type_id;


--
-- Name: object_class; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.object_class (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    object_class_id integer NOT NULL,
    object_class_code text NOT NULL,
    object_class_name text
);


--
-- Name: object_class_object_class_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.object_class_object_class_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: object_class_object_class_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.object_class_object_class_id_seq OWNED BY public.object_class.object_class_id;


--
-- Name: object_class_program_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.object_class_program_activity (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    object_class_program_activity_id bigint NOT NULL,
    submission_id integer NOT NULL,
    job_id integer NOT NULL,
    row_number integer NOT NULL,
    agency_identifier text,
    allocation_transfer_agency text,
    availability_type_code text,
    beginning_period_of_availa text,
    by_direct_reimbursable_fun text,
    deobligations_recov_by_pro_cpe numeric,
    ending_period_of_availabil text,
    gross_outlay_amount_by_pro_cpe numeric,
    gross_outlay_amount_by_pro_fyb numeric,
    gross_outlays_delivered_or_cpe numeric,
    gross_outlays_delivered_or_fyb numeric,
    gross_outlays_undelivered_cpe numeric,
    gross_outlays_undelivered_fyb numeric,
    main_account_code text,
    object_class text,
    obligations_delivered_orde_cpe numeric,
    obligations_delivered_orde_fyb numeric,
    obligations_incurred_by_pr_cpe numeric,
    obligations_undelivered_or_cpe numeric,
    obligations_undelivered_or_fyb numeric,
    program_activity_code text,
    program_activity_name text,
    sub_account_code text,
    ussgl480100_undelivered_or_cpe numeric,
    ussgl480100_undelivered_or_fyb numeric,
    ussgl480200_undelivered_or_cpe numeric,
    ussgl480200_undelivered_or_fyb numeric,
    ussgl483100_undelivered_or_cpe numeric,
    ussgl483200_undelivered_or_cpe numeric,
    ussgl487100_downward_adjus_cpe numeric,
    ussgl487200_downward_adjus_cpe numeric,
    ussgl488100_upward_adjustm_cpe numeric,
    ussgl488200_upward_adjustm_cpe numeric,
    ussgl490100_delivered_orde_cpe numeric,
    ussgl490100_delivered_orde_fyb numeric,
    ussgl490200_delivered_orde_cpe numeric,
    ussgl490800_authority_outl_cpe numeric,
    ussgl490800_authority_outl_fyb numeric,
    ussgl493100_delivered_orde_cpe numeric,
    ussgl497100_downward_adjus_cpe numeric,
    ussgl497200_downward_adjus_cpe numeric,
    ussgl498100_upward_adjustm_cpe numeric,
    ussgl498200_upward_adjustm_cpe numeric,
    tas text NOT NULL,
    account_num integer,
    display_tas text,
    disaster_emergency_fund_code text,
    program_activity_reporting_key text,
    prior_year_adjustment text,
    ussgl480110_rein_undel_ord_cpe numeric,
    ussgl490110_rein_deliv_ord_cpe numeric,
    ussgl480210_rein_undel_obs_cpe numeric,
    ussgl497210_down_adj_refun_cpe numeric
);


--
-- Name: object_class_program_activity_object_class_program_activity_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.object_class_program_activity_object_class_program_activity_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: object_class_program_activity_object_class_program_activity_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.object_class_program_activity_object_class_program_activity_seq OWNED BY public.object_class_program_activity.object_class_program_activity_id;


--
-- Name: office; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.office (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    office_id integer NOT NULL,
    office_code text NOT NULL,
    office_name text,
    sub_tier_code text NOT NULL,
    agency_code text NOT NULL,
    contract_awards_office boolean DEFAULT false NOT NULL,
    contract_funding_office boolean DEFAULT false NOT NULL,
    financial_legacy_procurementance_awards_office boolean DEFAULT false NOT NULL,
    financial_legacy_procurementance_funding_office boolean DEFAULT false NOT NULL,
    effective_start_date date,
    effective_end_date date
);


--
-- Name: office_office_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.office_office_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: office_office_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.office_office_id_seq OWNED BY public.office.office_id;


--
-- Name: permission_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_type (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    permission_type_id integer NOT NULL,
    name text,
    description text
);


--
-- Name: permission_type_permission_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permission_type_permission_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permission_type_permission_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permission_type_permission_type_id_seq OWNED BY public.permission_type.permission_type_id;


--
-- Name: program_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_activity (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    program_activity_id integer NOT NULL,
    fiscal_year_period text NOT NULL,
    agency_id text NOT NULL,
    allocation_transfer_id text,
    account_number text NOT NULL,
    program_activity_code text NOT NULL,
    program_activity_name text NOT NULL
);


--
-- Name: program_activity_park; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_activity_park (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    program_activity_park_id integer NOT NULL,
    fiscal_year integer NOT NULL,
    period integer NOT NULL,
    agency_id text NOT NULL,
    allocation_transfer_id text,
    main_account_number text NOT NULL,
    sub_account_number text,
    park_code text NOT NULL,
    park_name text NOT NULL
);


--
-- Name: program_activity_park_program_activity_park_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.program_activity_park_program_activity_park_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: program_activity_park_program_activity_park_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.program_activity_park_program_activity_park_id_seq OWNED BY public.program_activity_park.program_activity_park_id;


--
-- Name: program_activity_program_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.program_activity_program_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: program_activity_program_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.program_activity_program_activity_id_seq OWNED BY public.program_activity.program_activity_id;


--
-- Name: publish_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publish_history (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    publish_history_id integer NOT NULL,
    submission_id integer,
    user_id integer
);


--
-- Name: publish_history_publish_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.publish_history_publish_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: publish_history_publish_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.publish_history_publish_history_id_seq OWNED BY public.publish_history.publish_history_id;


--
-- Name: publish_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publish_status (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    publish_status_id integer NOT NULL,
    name text,
    description text
);


--
-- Name: publish_status_publish_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.publish_status_publish_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: publish_status_publish_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.publish_status_publish_status_id_seq OWNED BY public.publish_status.publish_status_id;


--
-- Name: published_appropriation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.published_appropriation (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    published_appropriation_id integer NOT NULL,
    submission_id integer NOT NULL,
    job_id integer,
    row_number integer,
    adjustments_to_unobligated_cpe numeric,
    agency_identifier text,
    allocation_transfer_agency text,
    availability_type_code text,
    beginning_period_of_availa text,
    borrowing_authority_amount_cpe numeric,
    budget_authority_appropria_cpe numeric,
    total_budgetary_resources_cpe numeric,
    budget_authority_unobligat_fyb numeric,
    contract_authority_amount_cpe numeric,
    deobligations_recoveries_r_cpe numeric,
    ending_period_of_availabil text,
    gross_outlay_amount_by_tas_cpe numeric,
    main_account_code text,
    obligations_incurred_total_cpe numeric,
    other_budgetary_resources_cpe numeric,
    spending_authority_from_of_cpe numeric,
    status_of_budgetary_resour_cpe numeric,
    sub_account_code text,
    unobligated_balance_cpe numeric,
    tas text,
    account_num integer,
    display_tas text
);


--
-- Name: published_appropriation_published_appropriation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.published_appropriation_published_appropriation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: published_appropriation_published_appropriation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.published_appropriation_published_appropriation_id_seq OWNED BY public.published_appropriation.published_appropriation_id;


--
-- Name: published_award_financial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.published_award_financial (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    published_award_financial_id bigint NOT NULL,
    submission_id integer NOT NULL,
    job_id integer,
    row_number integer,
    agency_identifier text,
    allocation_transfer_agency text,
    availability_type_code text,
    beginning_period_of_availa text,
    by_direct_reimbursable_fun text,
    deobligations_recov_by_awa_cpe numeric,
    ending_period_of_availabil text,
    fain text,
    gross_outlay_amount_by_awa_cpe numeric,
    gross_outlay_amount_by_awa_fyb numeric,
    gross_outlays_delivered_or_cpe numeric,
    gross_outlays_delivered_or_fyb numeric,
    gross_outlays_undelivered_cpe numeric,
    gross_outlays_undelivered_fyb numeric,
    main_account_code text,
    object_class text,
    obligations_delivered_orde_cpe numeric,
    obligations_delivered_orde_fyb numeric,
    obligations_incurred_byawa_cpe numeric,
    obligations_undelivered_or_cpe numeric,
    obligations_undelivered_or_fyb numeric,
    parent_award_id text,
    piid text,
    program_activity_code text,
    program_activity_name text,
    sub_account_code text,
    transaction_obligated_amou numeric,
    uri text,
    ussgl480100_undelivered_or_cpe numeric,
    ussgl480100_undelivered_or_fyb numeric,
    ussgl480200_undelivered_or_cpe numeric,
    ussgl480200_undelivered_or_fyb numeric,
    ussgl483100_undelivered_or_cpe numeric,
    ussgl483200_undelivered_or_cpe numeric,
    ussgl487100_downward_adjus_cpe numeric,
    ussgl487200_downward_adjus_cpe numeric,
    ussgl488100_upward_adjustm_cpe numeric,
    ussgl488200_upward_adjustm_cpe numeric,
    ussgl490100_delivered_orde_cpe numeric,
    ussgl490100_delivered_orde_fyb numeric,
    ussgl490200_delivered_orde_cpe numeric,
    ussgl490800_authority_outl_cpe numeric,
    ussgl490800_authority_outl_fyb numeric,
    ussgl493100_delivered_orde_cpe numeric,
    ussgl497100_downward_adjus_cpe numeric,
    ussgl497200_downward_adjus_cpe numeric,
    ussgl498100_upward_adjustm_cpe numeric,
    ussgl498200_upward_adjustm_cpe numeric,
    tas text,
    account_num integer,
    general_ledger_post_date date,
    display_tas text,
    disaster_emergency_fund_code text,
    program_activity_reporting_key text,
    prior_year_adjustment text,
    ussgl480110_rein_undel_ord_cpe numeric,
    ussgl490110_rein_deliv_ord_cpe numeric,
    ussgl480210_rein_undel_obs_cpe numeric,
    ussgl497210_down_adj_refun_cpe numeric
);


--
-- Name: published_award_financial_legacy_procurementance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.published_award_financial_legacy_procurementance (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    published_award_financial_legacy_procurementance_id bigint NOT NULL,
    afa_generated_unique text,
    submission_id integer NOT NULL,
    job_id integer,
    row_number integer,
    action_date text,
    action_type text,
    action_type_description text,
    legacy_procurementance_type text,
    legacy_procurementance_type_desc text,
    award_description text,
    awardee_or_recipient_legal text,
    awardee_or_recipient_duns text,
    awarding_agency_code text,
    awarding_agency_name text,
    awarding_office_code text,
    awarding_office_name text,
    awarding_sub_tier_agency_c text,
    awarding_sub_tier_agency_n text,
    award_modification_amendme text,
    business_funds_indicator text,
    business_funds_ind_desc text,
    business_types text,
    business_types_desc text,
    legacy_procurementance_listing_number text,
    legacy_procurementance_listing_title text,
    correction_delete_indicatr text,
    correction_delete_ind_desc text,
    face_value_loan_guarantee text,
    fain text,
    federal_action_obligation numeric,
    fiscal_year_and_quarter_co text,
    funding_agency_code text,
    funding_agency_name text,
    funding_office_name text,
    funding_office_code text,
    funding_sub_tier_agency_co text,
    funding_sub_tier_agency_na text,
    legal_entity_address_line1 text,
    legal_entity_address_line2 text,
    legal_entity_address_line3 text,
    legal_entity_city_code text,
    legal_entity_city_name text,
    legal_entity_congressional text,
    legal_entity_country_code text,
    legal_entity_county_code text,
    legal_entity_county_name text,
    legal_entity_foreign_city text,
    legal_entity_foreign_posta text,
    legal_entity_foreign_provi text,
    legal_entity_state_code text,
    legal_entity_state_name text,
    legal_entity_zip5 text,
    legal_entity_zip_last4 text,
    non_federal_funding_amount text,
    original_loan_subsidy_cost text,
    period_of_performance_curr text,
    period_of_performance_star text,
    place_of_performance_city text,
    place_of_performance_code text,
    place_of_performance_congr text,
    place_of_perform_country_c text,
    place_of_perform_county_na text,
    place_of_performance_forei text,
    place_of_perform_state_nam text,
    place_of_performance_zip4a text,
    record_type text,
    record_type_description text,
    sai_number text,
    total_funding_amount text,
    ultimate_parent_legal_enti text,
    ultimate_parent_duns text,
    uri text,
    place_of_perform_county_co text,
    place_of_perform_country_n text,
    legal_entity_country_name text,
    unique_award_key text,
    place_of_performance_scope text,
    awardee_or_recipient_uei text,
    funding_opportunity_goals text,
    funding_opportunity_number text,
    indirect_federal_sharing numeric,
    ultimate_parent_uei text
);


--
-- Name: published_award_financial_ass_published_award_financial_ass_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.published_award_financial_ass_published_award_financial_ass_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: published_award_financial_ass_published_award_financial_ass_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.published_award_financial_ass_published_award_financial_ass_seq OWNED BY public.published_award_financial_legacy_procurementance.published_award_financial_legacy_procurementance_id;


--
-- Name: published_award_financial_published_award_financial_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.published_award_financial_published_award_financial_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: published_award_financial_published_award_financial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.published_award_financial_published_award_financial_id_seq OWNED BY public.published_award_financial.published_award_financial_id;


--
-- Name: published_award_procurement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.published_award_procurement (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    published_award_procurement_id bigint NOT NULL,
    detached_award_proc_unique text,
    submission_id integer NOT NULL,
    job_id integer,
    row_number integer,
    piid text,
    awarding_sub_tier_agency_c text,
    awarding_sub_tier_agency_n text,
    awarding_agency_code text,
    awarding_agency_name text,
    parent_award_id text,
    award_modification_amendme text,
    type_of_contract_pricing text,
    type_of_contract_pric_desc text,
    contract_award_type text,
    contract_award_type_desc text,
    naics text,
    naics_description text,
    awardee_or_recipient_uniqu text,
    ultimate_parent_legal_enti text,
    ultimate_parent_unique_ide text,
    award_description text,
    place_of_performance_zip4a text,
    place_of_performance_city text,
    place_of_performance_congr text,
    awardee_or_recipient_legal text,
    legal_entity_city_name text,
    legal_entity_state_code text,
    legal_entity_state_descrip text,
    legal_entity_zip4 text,
    legal_entity_congressional text,
    legal_entity_address_line1 text,
    legal_entity_address_line2 text,
    legal_entity_address_line3 text,
    legal_entity_country_code text,
    legal_entity_country_name text,
    period_of_performance_star text,
    period_of_performance_curr text,
    period_of_perf_potential_e text,
    ordering_period_end_date text,
    action_date text,
    action_type text,
    action_type_description text,
    federal_action_obligation numeric,
    current_total_value_award text,
    potential_total_value_awar text,
    funding_sub_tier_agency_co text,
    funding_sub_tier_agency_na text,
    funding_office_code text,
    funding_office_name text,
    awarding_office_code text,
    awarding_office_name text,
    referenced_idv_agency_iden text,
    funding_agency_code text,
    funding_agency_name text,
    place_of_performance_locat text,
    place_of_performance_state text,
    place_of_perform_country_c text,
    idv_type text,
    idv_type_description text,
    entity_doing_business_as_n text,
    entity_phone_number text,
    entity_fax_number text,
    multiple_or_single_award_i text,
    multiple_or_single_aw_desc text,
    referenced_mult_or_single text,
    referenced_mult_or_si_desc text,
    type_of_idc text,
    type_of_idc_description text,
    a_76_fair_act_action text,
    a_76_fair_act_action_desc text,
    dod_claimant_program_code text,
    dod_claimant_prog_cod_desc text,
    clinger_cohen_act_planning text,
    clinger_cohen_act_pla_desc text,
    commercial_item_acquisitio text,
    commercial_item_acqui_desc text,
    commercial_item_test_progr text,
    commercial_item_test_desc text,
    consolidated_contract text,
    consolidated_contract_desc text,
    contingency_humanitarian_o text,
    contingency_humanitar_desc text,
    contract_bundling text,
    contract_bundling_descrip text,
    contract_financing text,
    contract_financing_descrip text,
    contracting_officers_deter text,
    contracting_officers_desc text,
    cost_accounting_standards text,
    cost_accounting_stand_desc text,
    cost_or_pricing_data text,
    cost_or_pricing_data_desc text,
    country_of_product_or_serv text,
    country_of_product_or_desc text,
    construction_wage_rate_req text,
    construction_wage_rat_desc text,
    evaluated_preference text,
    evaluated_preference_desc text,
    extent_competed text,
    extent_compete_description text,
    contract_opp_notice text,
    contract_opp_notice_desc text,
    foreign_funding text,
    foreign_funding_desc text,
    government_furnished_prope text,
    government_furnished_desc text,
    information_technology_com text,
    information_technolog_desc text,
    interagency_contracting_au text,
    interagency_contract_desc text,
    local_area_set_aside text,
    local_area_set_aside_desc text,
    major_program text,
    purchase_card_as_payment_m text,
    purchase_card_as_paym_desc text,
    multi_year_contract text,
    multi_year_contract_desc text,
    national_interest_action text,
    national_interest_desc text,
    number_of_actions text,
    number_of_offers_received text,
    other_statutory_authority text,
    performance_based_service text,
    performance_based_se_desc text,
    place_of_manufacture text,
    place_of_manufacture_desc text,
    price_evaluation_adjustmen text,
    product_or_service_code text,
    product_or_service_co_desc text,
    program_acronym text,
    other_than_full_and_open_c text,
    other_than_full_and_o_desc text,
    recovered_materials_sustai text,
    recovered_materials_s_desc text,
    research text,
    research_description text,
    sea_transportation text,
    sea_transportation_desc text,
    labor_standards text,
    labor_standards_descrip text,
    solicitation_identifier text,
    solicitation_date text,
    solicitation_procedures text,
    solicitation_procedur_desc text,
    fair_opportunity_limited_s text,
    fair_opportunity_limi_desc text,
    subcontracting_plan text,
    subcontracting_plan_desc text,
    program_system_or_equipmen text,
    program_system_or_equ_desc text,
    type_set_aside text,
    type_set_aside_description text,
    epa_designated_product text,
    epa_designated_produc_desc text,
    materials_supplies_article text,
    materials_supplies_descrip text,
    transaction_number text,
    sam_exception text,
    sam_exception_description text,
    referenced_idv_modificatio text,
    undefinitized_action text,
    undefinitized_action_desc text,
    domestic_or_foreign_entity text,
    domestic_or_foreign_e_desc text,
    referenced_idv_type text,
    referenced_idv_type_desc text,
    referenced_idv_agency_name text,
    award_or_idv_flag text,
    place_of_perform_country_n text,
    place_of_perform_state_nam text,
    place_of_perform_county_na text,
    base_exercised_options_val text,
    base_and_all_options_value text,
    cage_code text,
    inherently_government_func text,
    inherently_government_desc text,
    organizational_type text,
    number_of_employees text,
    annual_revenue text,
    total_obligated_amount text,
    last_modified text,
    unique_award_key text,
    additional_reporting text,
    awardee_or_recipient_uei text,
    ultimate_parent_uei text,
    small_business_competitive boolean,
    city_local_government boolean,
    county_local_government boolean,
    inter_municipal_local_gove boolean,
    local_government_owned boolean,
    municipality_local_governm boolean,
    school_district_local_gove boolean,
    township_local_government boolean,
    us_state_government boolean,
    us_federal_government boolean,
    federal_agency boolean,
    federally_funded_research boolean,
    us_tribal_government boolean,
    foreign_government boolean,
    community_developed_corpor boolean,
    labor_surplus_area_firm boolean,
    corporate_entity_not_tax_e boolean,
    corporate_entity_tax_exemp boolean,
    partnership_or_limited_lia boolean,
    sole_proprietorship boolean,
    small_agricultural_coopera boolean,
    international_organization boolean,
    us_government_entity boolean,
    emerging_small_business boolean,
    c8a_program_participant boolean,
    sba_certified_8_a_joint_ve boolean,
    dot_certified_disadvantage boolean,
    self_certified_small_disad boolean,
    historically_underutilized boolean,
    small_disadvantaged_busine boolean,
    the_ability_one_program boolean,
    historically_black_college boolean,
    c1862_land_grant_college boolean,
    c1890_land_grant_college boolean,
    c1994_land_grant_college boolean,
    minority_institution boolean,
    private_university_or_coll boolean,
    school_of_forestry boolean,
    state_controlled_instituti boolean,
    tribal_college boolean,
    veterinary_college boolean,
    educational_institution boolean,
    alaskan_native_servicing_i boolean,
    community_development_corp boolean,
    native_hawaiian_servicing boolean,
    domestic_shelter boolean,
    manufacturer_of_goods boolean,
    hospital_flag boolean,
    veterinary_hospital boolean,
    hispanic_servicing_institu boolean,
    foundation boolean,
    woman_owned_business boolean,
    minority_owned_business boolean,
    women_owned_small_business boolean,
    economically_disadvantaged boolean,
    joint_venture_women_owned boolean,
    joint_venture_economically boolean,
    veteran_owned_business boolean,
    service_disabled_veteran_o boolean,
    contracts boolean,
    grants boolean,
    receives_contracts_and_gra boolean,
    airport_authority boolean,
    council_of_governments boolean,
    housing_authorities_public boolean,
    interstate_entity boolean,
    planning_commission boolean,
    port_authority boolean,
    transit_authority boolean,
    subchapter_s_corporation boolean,
    limited_liability_corporat boolean,
    foreign_owned_and_located boolean,
    american_indian_owned_busi boolean,
    alaskan_native_owned_corpo boolean,
    indian_tribe_federally_rec boolean,
    native_hawaiian_owned_busi boolean,
    tribally_owned_business boolean,
    asian_pacific_american_own boolean,
    black_american_owned_busin boolean,
    hispanic_american_owned_bu boolean,
    native_american_owned_busi boolean,
    subcontinent_asian_asian_i boolean,
    other_minority_owned_busin boolean,
    for_profit_organization boolean,
    nonprofit_organization boolean,
    other_not_for_profit_organ boolean,
    us_local_government boolean
);


--
-- Name: published_award_procurement_published_award_procurement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.published_award_procurement_published_award_procurement_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: published_award_procurement_published_award_procurement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.published_award_procurement_published_award_procurement_id_seq OWNED BY public.published_award_procurement.published_award_procurement_id;


--
-- Name: published_comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.published_comment (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    published_comment_id integer NOT NULL,
    submission_id integer NOT NULL,
    file_type_id integer,
    comment text NOT NULL
);


--
-- Name: published_comment_published_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.published_comment_published_comment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: published_comment_published_comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.published_comment_published_comment_id_seq OWNED BY public.published_comment.published_comment_id;


--
-- Name: published_error_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.published_error_metadata (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    published_error_metadata_id integer NOT NULL,
    job_id integer,
    filename text,
    field_name text,
    error_type_id integer,
    occurrences integer,
    first_row integer,
    rule_failed text,
    file_type_id integer,
    target_file_type_id integer,
    original_rule_label text,
    severity_id integer
);


--
-- Name: published_error_metadata_published_error_metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.published_error_metadata_published_error_metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: published_error_metadata_published_error_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.published_error_metadata_published_error_metadata_id_seq OWNED BY public.published_error_metadata.published_error_metadata_id;


--
-- Name: published_fabs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.published_fabs (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    published_fabs_id bigint NOT NULL,
    action_date text,
    action_type text,
    legacy_procurementance_type text,
    award_description text,
    awardee_or_recipient_legal text,
    awardee_or_recipient_uniqu text,
    awarding_agency_code text,
    awarding_office_code text,
    awarding_sub_tier_agency_c text,
    award_modification_amendme text,
    business_funds_indicator text,
    business_types text,
    legacy_procurementance_listing_number text,
    correction_delete_indicatr text,
    face_value_loan_guarantee numeric,
    fain text,
    federal_action_obligation numeric,
    fiscal_year_and_quarter_co text,
    funding_agency_code text,
    funding_office_code text,
    funding_sub_tier_agency_co text,
    legal_entity_address_line1 text,
    legal_entity_address_line2 text,
    legal_entity_address_line3 text,
    legal_entity_country_code text,
    legal_entity_foreign_city text,
    legal_entity_foreign_posta text,
    legal_entity_foreign_provi text,
    legal_entity_zip5 text,
    legal_entity_zip_last4 text,
    non_federal_funding_amount numeric,
    original_loan_subsidy_cost numeric,
    period_of_performance_curr text,
    period_of_performance_star text,
    place_of_performance_code text,
    place_of_performance_congr text,
    place_of_perform_country_c text,
    place_of_performance_forei text,
    place_of_performance_zip4a text,
    record_type integer,
    sai_number text,
    uri text,
    total_funding_amount text,
    legal_entity_congressional text,
    legacy_procurementance_listing_title text,
    awarding_agency_name text,
    awarding_sub_tier_agency_n text,
    funding_agency_name text,
    funding_sub_tier_agency_na text,
    is_historical boolean,
    place_of_perform_county_na text,
    place_of_perform_state_nam text,
    place_of_performance_city text,
    legal_entity_city_name text,
    legal_entity_county_code text,
    legal_entity_county_name text,
    legal_entity_state_code text,
    legal_entity_state_name text,
    modified_at timestamp without time zone,
    afa_generated_unique text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    awarding_office_name text,
    funding_office_name text,
    legal_entity_city_code text,
    legal_entity_foreign_descr text,
    legal_entity_country_name text,
    place_of_perform_country_n text,
    place_of_perform_county_co text,
    submission_id numeric,
    place_of_perfor_state_code text,
    place_of_performance_zip5 text,
    place_of_perform_zip_last4 text,
    business_categories text[],
    action_type_description text,
    legacy_procurementance_type_desc text,
    business_funds_ind_desc text,
    business_types_desc text,
    correction_delete_ind_desc text,
    record_type_description text,
    ultimate_parent_legal_enti text,
    ultimate_parent_unique_ide text,
    unique_award_key text,
    high_comp_officer1_amount text,
    high_comp_officer1_full_na text,
    high_comp_officer2_amount text,
    high_comp_officer2_full_na text,
    high_comp_officer3_amount text,
    high_comp_officer3_full_na text,
    high_comp_officer4_amount text,
    high_comp_officer4_full_na text,
    high_comp_officer5_amount text,
    high_comp_officer5_full_na text,
    place_of_performance_scope text,
    uei text,
    ultimate_parent_uei text,
    funding_opportunity_goals text,
    funding_opportunity_number text,
    indirect_federal_sharing numeric
);


--
-- Name: published_fabs_published_fabs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.published_fabs_published_fabs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: published_fabs_published_fabs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.published_fabs_published_fabs_id_seq OWNED BY public.published_fabs.published_fabs_id;


--
-- Name: published_files_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.published_files_history (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    published_files_history_id integer NOT NULL,
    publish_history_id integer,
    certify_history_id integer,
    submission_id integer,
    filename text,
    file_type_id integer,
    warning_filename text,
    comment text
);


--
-- Name: published_files_history_published_files_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.published_files_history_published_files_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: published_files_history_published_files_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.published_files_history_published_files_history_id_seq OWNED BY public.published_files_history.published_files_history_id;


--
-- Name: published_flex_field; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.published_flex_field (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    published_flex_field_id bigint NOT NULL,
    submission_id integer NOT NULL,
    job_id integer,
    row_number integer,
    header text,
    cell text,
    file_type_id integer
);


--
-- Name: published_flex_field_published_flex_field_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.published_flex_field_published_flex_field_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: published_flex_field_published_flex_field_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.published_flex_field_published_flex_field_id_seq OWNED BY public.published_flex_field.published_flex_field_id;


--
-- Name: published_object_class_program_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.published_object_class_program_activity (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    published_object_class_program_activity_id bigint NOT NULL,
    submission_id integer NOT NULL,
    job_id integer,
    row_number integer,
    agency_identifier text,
    allocation_transfer_agency text,
    availability_type_code text,
    beginning_period_of_availa text,
    by_direct_reimbursable_fun text,
    deobligations_recov_by_pro_cpe numeric,
    ending_period_of_availabil text,
    gross_outlay_amount_by_pro_cpe numeric,
    gross_outlay_amount_by_pro_fyb numeric,
    gross_outlays_delivered_or_cpe numeric,
    gross_outlays_delivered_or_fyb numeric,
    gross_outlays_undelivered_cpe numeric,
    gross_outlays_undelivered_fyb numeric,
    main_account_code text,
    object_class text,
    obligations_delivered_orde_cpe numeric,
    obligations_delivered_orde_fyb numeric,
    obligations_incurred_by_pr_cpe numeric,
    obligations_undelivered_or_cpe numeric,
    obligations_undelivered_or_fyb numeric,
    program_activity_code text,
    program_activity_name text,
    sub_account_code text,
    ussgl480100_undelivered_or_cpe numeric,
    ussgl480100_undelivered_or_fyb numeric,
    ussgl480200_undelivered_or_cpe numeric,
    ussgl480200_undelivered_or_fyb numeric,
    ussgl483100_undelivered_or_cpe numeric,
    ussgl483200_undelivered_or_cpe numeric,
    ussgl487100_downward_adjus_cpe numeric,
    ussgl487200_downward_adjus_cpe numeric,
    ussgl488100_upward_adjustm_cpe numeric,
    ussgl488200_upward_adjustm_cpe numeric,
    ussgl490100_delivered_orde_cpe numeric,
    ussgl490100_delivered_orde_fyb numeric,
    ussgl490200_delivered_orde_cpe numeric,
    ussgl490800_authority_outl_cpe numeric,
    ussgl490800_authority_outl_fyb numeric,
    ussgl493100_delivered_orde_cpe numeric,
    ussgl497100_downward_adjus_cpe numeric,
    ussgl497200_downward_adjus_cpe numeric,
    ussgl498100_upward_adjustm_cpe numeric,
    ussgl498200_upward_adjustm_cpe numeric,
    tas text,
    account_num integer,
    display_tas text,
    disaster_emergency_fund_code text,
    program_activity_reporting_key text,
    prior_year_adjustment text,
    ussgl480110_rein_undel_ord_cpe numeric,
    ussgl490110_rein_deliv_ord_cpe numeric,
    ussgl480210_rein_undel_obs_cpe numeric,
    ussgl497210_down_adj_refun_cpe numeric
);


--
-- Name: published_object_class_progra_published_object_class_progra_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.published_object_class_progra_published_object_class_progra_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: published_object_class_progra_published_object_class_progra_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.published_object_class_progra_published_object_class_progra_seq OWNED BY public.published_object_class_program_activity.published_object_class_program_activity_id;


--
-- Name: published_total_obligations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.published_total_obligations (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    published_total_obligations_id integer NOT NULL,
    submission_id integer NOT NULL,
    total_obligations numeric,
    total_proc_obligations numeric,
    total_asst_obligations numeric
);


--
-- Name: published_total_obligations_published_total_obligations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.published_total_obligations_published_total_obligations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: published_total_obligations_published_total_obligations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.published_total_obligations_published_total_obligations_id_seq OWNED BY public.published_total_obligations.published_total_obligations_id;


--
-- Name: revalidation_threshold; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revalidation_threshold (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    revalidation_date timestamp without time zone NOT NULL
);


--
-- Name: rule_impact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rule_impact (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    rule_impact_id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL
);


--
-- Name: rule_impact_rule_impact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rule_impact_rule_impact_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rule_impact_rule_impact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rule_impact_rule_impact_id_seq OWNED BY public.rule_impact.rule_impact_id;


--
-- Name: rule_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rule_settings (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    rule_settings_id integer NOT NULL,
    agency_code text,
    priority integer NOT NULL,
    impact_id integer NOT NULL,
    file_id integer,
    rule_label text NOT NULL,
    target_file_id integer
);


--
-- Name: rule_settings_rule_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rule_settings_rule_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rule_settings_rule_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rule_settings_rule_settings_id_seq OWNED BY public.rule_settings.rule_settings_id;


--
-- Name: rule_severity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rule_severity (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    rule_severity_id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL
);


--
-- Name: rule_severity_rule_severity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rule_severity_rule_severity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rule_severity_rule_severity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rule_severity_rule_severity_id_seq OWNED BY public.rule_severity.rule_severity_id;


--
-- Name: rule_sql; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rule_sql (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    rule_sql_id integer NOT NULL,
    rule_sql text NOT NULL,
    rule_label text,
    rule_error_message text NOT NULL,
    rule_cross_file_flag boolean NOT NULL,
    file_id integer,
    rule_severity_id integer NOT NULL,
    target_file_id integer,
    query_name text,
    expected_value text,
    category text,
    sensitive boolean DEFAULT false NOT NULL
);


--
-- Name: rule_sql_rule_sql_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rule_sql_rule_sql_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rule_sql_rule_sql_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rule_sql_rule_sql_id_seq OWNED BY public.rule_sql.rule_sql_id;


--
-- Name: sam_recipient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sam_recipient (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    sam_recipient_id integer NOT NULL,
    awardee_or_recipient_uniqu text,
    legal_business_name text,
    activation_date date,
    deactivation_date date,
    expiration_date date,
    last_sam_mod_date date,
    registration_date date,
    ultimate_parent_legal_enti text,
    ultimate_parent_unique_ide text,
    address_line_1 text,
    address_line_2 text,
    business_types_codes text[],
    city text,
    congressional_district text,
    country_code text,
    state text,
    zip text,
    zip4 text,
    dba_name text,
    entity_structure text,
    high_comp_officer1_amount text,
    high_comp_officer1_full_na text,
    high_comp_officer2_amount text,
    high_comp_officer2_full_na text,
    high_comp_officer3_amount text,
    high_comp_officer3_full_na text,
    high_comp_officer4_amount text,
    high_comp_officer4_full_na text,
    high_comp_officer5_amount text,
    high_comp_officer5_full_na text,
    last_exec_comp_mod_date date,
    historic boolean DEFAULT false,
    business_types text[],
    uei text,
    ultimate_parent_uei text
);


--
-- Name: sam_recipient_sam_recipient_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sam_recipient_sam_recipient_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sam_recipient_sam_recipient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sam_recipient_sam_recipient_id_seq OWNED BY public.sam_recipient.sam_recipient_id;


--
-- Name: sam_recipient_unregistered; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sam_recipient_unregistered (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    sam_recipient_unreg_id integer NOT NULL,
    uei text,
    legal_business_name text,
    address_line_1 text,
    address_line_2 text,
    city text,
    state text,
    zip text,
    zip4 text,
    country_code text,
    congressional_district text
);


--
-- Name: sam_recipient_unregistered_sam_recipient_unreg_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sam_recipient_unregistered_sam_recipient_unreg_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sam_recipient_unregistered_sam_recipient_unreg_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sam_recipient_unregistered_sam_recipient_unreg_id_seq OWNED BY public.sam_recipient_unregistered.sam_recipient_unreg_id;


--
-- Name: sam_subcontract; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sam_subcontract (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    sam_subcontract_id integer NOT NULL,
    subaward_report_id integer,
    subaward_report_number text,
    unique_award_key text,
    date_submitted date,
    contract_agency_code text,
    contract_idv_agency_code text,
    award_number text,
    award_amount text,
    action_date date,
    uei text,
    legal_business_name text,
    parent_uei text,
    parent_legal_business_name text,
    dba_name text,
    legal_entity_country_code text,
    legal_entity_country_name text,
    legal_entity_state_code text,
    legal_entity_state_name text,
    legal_entity_address_line1 text,
    legal_entity_address_line2 text,
    legal_entity_city_name text,
    legal_entity_zip_code text,
    legal_entity_congressional text,
    ppop_country_code text,
    ppop_country_name text,
    ppop_state_code text,
    ppop_state_name text,
    ppop_address_line1 text,
    ppop_city_name text,
    ppop_zip_code text,
    ppop_congressional_district text,
    business_types_codes text[],
    business_types_names text[],
    description text,
    high_comp_officer1_full_na text,
    high_comp_officer1_amount text,
    high_comp_officer2_full_na text,
    high_comp_officer2_amount text,
    high_comp_officer3_full_na text,
    high_comp_officer3_amount text,
    high_comp_officer4_full_na text,
    high_comp_officer4_amount text,
    high_comp_officer5_full_na text,
    high_comp_officer5_amount text
);


--
-- Name: sam_subcontract_sam_subcontract_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sam_subcontract_sam_subcontract_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sam_subcontract_sam_subcontract_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sam_subcontract_sam_subcontract_id_seq OWNED BY public.sam_subcontract.sam_subcontract_id;


--
-- Name: sam_subgrant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sam_subgrant (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    sam_subgrant_id integer NOT NULL,
    subaward_report_id integer,
    subaward_report_number text,
    unique_award_key text,
    date_submitted date,
    award_number text,
    award_amount text,
    action_date date,
    uei text,
    legal_business_name text,
    parent_uei text,
    parent_legal_business_name text,
    dba_name text,
    legal_entity_country_code text,
    legal_entity_country_name text,
    legal_entity_state_code text,
    legal_entity_state_name text,
    legal_entity_address_line1 text,
    legal_entity_address_line2 text,
    legal_entity_city_name text,
    legal_entity_zip_code text,
    legal_entity_congressional text,
    ppop_country_code text,
    ppop_country_name text,
    ppop_state_code text,
    ppop_state_name text,
    ppop_address_line1 text,
    ppop_city_name text,
    ppop_zip_code text,
    ppop_congressional_district text,
    business_types_codes text[],
    business_types_names text[],
    description text,
    high_comp_officer1_full_na text,
    high_comp_officer1_amount text,
    high_comp_officer2_full_na text,
    high_comp_officer2_amount text,
    high_comp_officer3_full_na text,
    high_comp_officer3_amount text,
    high_comp_officer4_full_na text,
    high_comp_officer4_amount text,
    high_comp_officer5_full_na text,
    high_comp_officer5_amount text
);


--
-- Name: sam_subgrant_sam_subgrant_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sam_subgrant_sam_subgrant_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sam_subgrant_sam_subgrant_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sam_subgrant_sam_subgrant_id_seq OWNED BY public.sam_subgrant.sam_subgrant_id;


--
-- Name: session_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_map (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    session_id integer NOT NULL,
    uid text,
    data text,
    expiration integer
);


--
-- Name: session_map_session_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.session_map_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: session_map_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.session_map_session_id_seq OWNED BY public.session_map.session_id;


--
-- Name: sf_133; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sf_133 (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    sf133_id bigint NOT NULL,
    agency_identifier text NOT NULL,
    allocation_transfer_agency text,
    availability_type_code text,
    beginning_period_of_availa text,
    ending_period_of_availabil text,
    main_account_code text NOT NULL,
    sub_account_code text NOT NULL,
    tas text NOT NULL,
    fiscal_year integer NOT NULL,
    period integer NOT NULL,
    line integer NOT NULL,
    amount numeric DEFAULT '0'::numeric NOT NULL,
    account_num integer,
    display_tas text,
    disaster_emergency_fund_code text
);


--
-- Name: sf_133_sf133_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sf_133_sf133_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sf_133_sf133_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sf_133_sf133_id_seq OWNED BY public.sf_133.sf133_id;


--
-- Name: sqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sqs (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    sqs_id integer NOT NULL,
    message integer NOT NULL,
    attributes text
);


--
-- Name: sqs_sqs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sqs_sqs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sqs_sqs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sqs_sqs_id_seq OWNED BY public.sqs.sqs_id;


--
-- Name: state_congressional; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.state_congressional (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    state_congressional_id integer NOT NULL,
    state_code text,
    congressional_district_no text,
    census_year integer
);


--
-- Name: state_congressional_state_congressional_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.state_congressional_state_congressional_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: state_congressional_state_congressional_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.state_congressional_state_congressional_id_seq OWNED BY public.state_congressional.state_congressional_id;


--
-- Name: states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.states (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    states_id integer NOT NULL,
    state_code text,
    state_name text,
    fips_code text
);


--
-- Name: states_states_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.states_states_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: states_states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.states_states_id_seq OWNED BY public.states.states_id;


--
-- Name: sub_tier_agency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_tier_agency (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    sub_tier_agency_id integer NOT NULL,
    sub_tier_agency_code text NOT NULL,
    sub_tier_agency_name text,
    cgac_id integer NOT NULL,
    priority integer DEFAULT 2 NOT NULL,
    frec_id integer,
    is_frec boolean DEFAULT false NOT NULL
);


--
-- Name: sub_tier_agency_sub_tier_agency_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sub_tier_agency_sub_tier_agency_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sub_tier_agency_sub_tier_agency_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sub_tier_agency_sub_tier_agency_id_seq OWNED BY public.sub_tier_agency.sub_tier_agency_id;


--
-- Name: subaward; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subaward (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    id bigint NOT NULL,
    unique_award_key text,
    award_id text,
    parent_award_id text,
    award_amount text,
    action_date text,
    fy text,
    awarding_agency_code text,
    awarding_agency_name text,
    awarding_sub_tier_agency_c text,
    awarding_sub_tier_agency_n text,
    awarding_office_code text,
    awarding_office_name text,
    funding_agency_code text,
    funding_agency_name text,
    funding_sub_tier_agency_co text,
    funding_sub_tier_agency_na text,
    funding_office_code text,
    funding_office_name text,
    awardee_or_recipient_uniqu text,
    awardee_or_recipient_legal text,
    dba_name text,
    ultimate_parent_unique_ide text,
    ultimate_parent_legal_enti text,
    legal_entity_country_code text,
    legal_entity_country_name text,
    legal_entity_address_line1 text,
    legal_entity_city_name text,
    legal_entity_state_code text,
    legal_entity_state_name text,
    legal_entity_zip text,
    legal_entity_congressional text,
    legal_entity_foreign_posta text,
    business_types text,
    place_of_perform_city_name text,
    place_of_perform_state_code text,
    place_of_perform_state_name text,
    place_of_performance_zip text,
    place_of_perform_congressio text,
    place_of_perform_country_co text,
    place_of_perform_country_na text,
    award_description text,
    naics text,
    naics_description text,
    legacy_procurementance_listing_numbers text,
    legacy_procurementance_listing_titles text,
    subaward_type text,
    subaward_report_year text,
    subaward_report_month text,
    subaward_number text,
    subaward_amount text,
    sub_action_date text,
    sub_awardee_or_recipient_uniqu text,
    sub_awardee_or_recipient_legal text,
    sub_dba_name text,
    sub_ultimate_parent_unique_ide text,
    sub_ultimate_parent_legal_enti text,
    sub_legal_entity_country_code text,
    sub_legal_entity_country_name text,
    sub_legal_entity_address_line1 text,
    sub_legal_entity_city_name text,
    sub_legal_entity_state_code text,
    sub_legal_entity_state_name text,
    sub_legal_entity_zip text,
    sub_legal_entity_congressional text,
    sub_legal_entity_foreign_posta text,
    sub_business_types text,
    sub_place_of_perform_city_name text,
    sub_place_of_perform_state_code text,
    sub_place_of_perform_state_name text,
    sub_place_of_performance_zip text,
    sub_place_of_perform_congressio text,
    sub_place_of_perform_country_co text,
    sub_place_of_perform_country_na text,
    subaward_description text,
    sub_high_comp_officer1_full_na text,
    sub_high_comp_officer1_amount text,
    sub_high_comp_officer2_full_na text,
    sub_high_comp_officer2_amount text,
    sub_high_comp_officer3_full_na text,
    sub_high_comp_officer3_amount text,
    sub_high_comp_officer4_full_na text,
    sub_high_comp_officer4_amount text,
    sub_high_comp_officer5_full_na text,
    sub_high_comp_officer5_amount text,
    prime_id integer,
    internal_id text,
    date_submitted text,
    report_type text,
    transaction_type text,
    program_title text,
    contract_agency_code text,
    contract_idv_agency_code text,
    grant_funding_agency_id text,
    grant_funding_agency_name text,
    federal_agency_name text,
    treasury_symbol text,
    dunsplus4 text,
    recovery_model_q1 text,
    recovery_model_q2 text,
    compensation_q1 text,
    compensation_q2 text,
    high_comp_officer1_full_na text,
    high_comp_officer1_amount text,
    high_comp_officer2_full_na text,
    high_comp_officer2_amount text,
    high_comp_officer3_full_na text,
    high_comp_officer3_amount text,
    high_comp_officer4_full_na text,
    high_comp_officer4_amount text,
    high_comp_officer5_full_na text,
    high_comp_officer5_amount text,
    sub_id integer,
    sub_parent_id integer,
    sub_federal_agency_id text,
    sub_federal_agency_name text,
    sub_funding_agency_id text,
    sub_funding_agency_name text,
    sub_funding_office_id text,
    sub_funding_office_name text,
    sub_naics text,
    sub_legacy_procurementance_listing_numbers text,
    sub_dunsplus4 text,
    sub_recovery_subcontract_amt text,
    sub_recovery_model_q1 text,
    sub_recovery_model_q2 text,
    sub_compensation_q1 text,
    sub_compensation_q2 text,
    place_of_perform_street text,
    sub_place_of_perform_street text,
    awardee_or_recipient_uei text,
    sub_awardee_or_recipient_uei text,
    sub_ultimate_parent_uei text,
    ultimate_parent_uei text,
    legal_entity_county_code text,
    legal_entity_county_name text,
    place_of_performance_county_code text,
    place_of_performance_county_name text,
    sub_legal_entity_county_code text,
    sub_legal_entity_county_name text,
    sub_place_of_performance_county_code text,
    sub_place_of_performance_county_name text
);


--
-- Name: subaward_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subaward_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subaward_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subaward_id_seq OWNED BY public.subaward.id;


--
-- Name: submission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submission (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    submission_id integer NOT NULL,
    user_id integer,
    cgac_code text,
    reporting_start_date date,
    reporting_end_date date,
    is_quarter_format boolean DEFAULT false NOT NULL,
    number_of_errors integer DEFAULT 0 NOT NULL,
    number_of_warnings integer DEFAULT 0 NOT NULL,
    publish_status_id integer,
    publishable boolean DEFAULT false NOT NULL,
    reporting_fiscal_period integer DEFAULT 0 NOT NULL,
    reporting_fiscal_year integer DEFAULT 0 NOT NULL,
    is_fabs boolean DEFAULT false NOT NULL,
    publishing_user_id integer,
    frec_code text,
    test_submission boolean DEFAULT false NOT NULL,
    published_submission_ids integer[] DEFAULT '{}'::integer[],
    certified boolean DEFAULT false NOT NULL
);


--
-- Name: submission_sub_tier_affiliation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submission_sub_tier_affiliation (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    submission_sub_tier_affiliation_id integer NOT NULL,
    submission_id integer,
    sub_tier_agency_id integer
);


--
-- Name: submission_sub_tier_affiliati_submission_sub_tier_affiliati_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.submission_sub_tier_affiliati_submission_sub_tier_affiliati_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: submission_sub_tier_affiliati_submission_sub_tier_affiliati_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.submission_sub_tier_affiliati_submission_sub_tier_affiliati_seq OWNED BY public.submission_sub_tier_affiliation.submission_sub_tier_affiliation_id;


--
-- Name: submission_submission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.submission_submission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: submission_submission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.submission_submission_id_seq OWNED BY public.submission.submission_id;


--
-- Name: submission_updated_at_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.submission_updated_at_view AS
 SELECT temp.submission_id,
    max(temp.updated_at) AS updated_at
   FROM ( SELECT sub.submission_id,
            sub.updated_at
           FROM public.submission sub
        UNION
         SELECT job.submission_id,
            job.updated_at
           FROM public.job,
            public.submission sub_2
          WHERE (job.submission_id = sub_2.submission_id)) temp
  GROUP BY temp.submission_id;


--
-- Name: submission_window_schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submission_window_schedule (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    submission_window_schedule_id integer NOT NULL,
    year integer NOT NULL,
    period integer NOT NULL,
    period_start timestamp without time zone,
    publish_deadline timestamp without time zone,
    certification_deadline timestamp without time zone
);


--
-- Name: submission_window_schedule_submission_window_schedule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.submission_window_schedule_submission_window_schedule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: submission_window_schedule_submission_window_schedule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.submission_window_schedule_submission_window_schedule_id_seq OWNED BY public.submission_window_schedule.submission_window_schedule_id;


--
-- Name: submission_window_window_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.submission_window_window_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: submission_window_window_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.submission_window_window_id_seq OWNED BY public.banner.banner_id;


--
-- Name: tas_failed_edits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tas_failed_edits (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    tas_failed_edits_id integer NOT NULL,
    agency_identifier text,
    allocation_transfer_agency text,
    availability_type_code text,
    beginning_period_of_availa text,
    ending_period_of_availabil text,
    main_account_code text,
    sub_account_code text,
    tas text NOT NULL,
    display_tas text NOT NULL,
    fiscal_year integer NOT NULL,
    period integer NOT NULL,
    fr_entity_type text,
    fr_entity_description text,
    edit_number text,
    edit_id text,
    severity text,
    atb_submission_status text,
    approved_override_exists boolean
);


--
-- Name: tas_failed_edits_tas_failed_edits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tas_failed_edits_tas_failed_edits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tas_failed_edits_tas_failed_edits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tas_failed_edits_tas_failed_edits_id_seq OWNED BY public.tas_failed_edits.tas_failed_edits_id;


--
-- Name: tas_lookup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tas_lookup (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    tas_id integer NOT NULL,
    allocation_transfer_agency text,
    agency_identifier text,
    beginning_period_of_availa text,
    ending_period_of_availabil text,
    availability_type_code text,
    main_account_code text,
    sub_account_code text,
    account_num integer NOT NULL,
    internal_end_date date,
    internal_start_date date NOT NULL,
    financial_indicator2 text,
    fr_entity_description text,
    fr_entity_type text,
    account_title text,
    budget_bureau_code text,
    budget_bureau_name text,
    budget_function_code text,
    budget_function_title text,
    budget_subfunction_code text,
    budget_subfunction_title text,
    reporting_agency_aid text,
    reporting_agency_name text,
    display_tas text,
    tas text NOT NULL
);


--
-- Name: tas_lookup_tas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tas_lookup_tas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tas_lookup_tas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tas_lookup_tas_id_seq OWNED BY public.tas_lookup.tas_id;


--
-- Name: total_obligations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.total_obligations (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    total_obligations_id integer NOT NULL,
    submission_id integer NOT NULL,
    total_obligations numeric,
    total_proc_obligations numeric,
    total_asst_obligations numeric
);


--
-- Name: total_obligations_total_obligations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.total_obligations_total_obligations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: total_obligations_total_obligations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.total_obligations_total_obligations_id_seq OWNED BY public.total_obligations.total_obligations_id;


--
-- Name: user_affiliation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_affiliation (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    user_id integer NOT NULL,
    cgac_id integer,
    permission_type_id integer,
    frec_id integer,
    user_affiliation_id integer NOT NULL
);


--
-- Name: user_affiliation_user_affiliation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_affiliation_user_affiliation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_affiliation_user_affiliation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_affiliation_user_affiliation_id_seq OWNED BY public.user_affiliation.user_affiliation_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    user_id integer NOT NULL,
    username text,
    email text,
    name text,
    title text,
    password_hash text,
    salt text,
    skip_guide boolean DEFAULT false NOT NULL,
    website_admin boolean DEFAULT false NOT NULL
);


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: validation_label; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.validation_label (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    validation_label_id integer NOT NULL,
    label text,
    error_message text,
    file_id integer,
    column_name text,
    label_type public.label_types
);


--
-- Name: validation_label_validation_label_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.validation_label_validation_label_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: validation_label_validation_label_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.validation_label_validation_label_id_seq OWNED BY public.validation_label.validation_label_id;


--
-- Name: zip_city; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zip_city (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    zip_city_id integer NOT NULL,
    zip_code text,
    city_name text,
    state_code text,
    preferred_city_name text
);


--
-- Name: zip_city_zip_city_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zip_city_zip_city_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zip_city_zip_city_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zip_city_zip_city_id_seq OWNED BY public.zip_city.zip_city_id;


--
-- Name: zips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zips (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    zips_id integer NOT NULL,
    zip5 text,
    zip_last4 text,
    state_abbreviation text,
    county_number text,
    congressional_district_no text
);


--
-- Name: zips_grouped; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zips_grouped (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    zips_grouped_id integer NOT NULL,
    zip5 text,
    state_abbreviation text,
    county_number text,
    congressional_district_no text
);


--
-- Name: zips_grouped_historical; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zips_grouped_historical (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    zips_grouped_historical_id integer NOT NULL,
    zip5 text,
    state_abbreviation text,
    county_number text,
    congressional_district_no text
);


--
-- Name: zips_grouped_historical_zips_grouped_historical_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zips_grouped_historical_zips_grouped_historical_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zips_grouped_historical_zips_grouped_historical_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zips_grouped_historical_zips_grouped_historical_id_seq OWNED BY public.zips_grouped_historical.zips_grouped_historical_id;


--
-- Name: zips_grouped_zips_grouped_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zips_grouped_zips_grouped_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zips_grouped_zips_grouped_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zips_grouped_zips_grouped_id_seq OWNED BY public.zips_grouped.zips_grouped_id;


--
-- Name: zips_historical; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zips_historical (
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    zips_historical_id integer NOT NULL,
    zip5 text,
    zip_last4 text,
    state_abbreviation text,
    county_number text,
    congressional_district_no text
);


--
-- Name: zips_historical_zips_historical_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zips_historical_zips_historical_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zips_historical_zips_historical_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zips_historical_zips_historical_id_seq OWNED BY public.zips_historical.zips_historical_id;


--
-- Name: zips_zips_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zips_zips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zips_zips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zips_zips_id_seq OWNED BY public.zips.zips_id;


--
-- Name: application_type application_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_type ALTER COLUMN application_type_id SET DEFAULT nextval('public.application_type_application_type_id_seq'::regclass);


--
-- Name: appropriation appropriation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appropriation ALTER COLUMN appropriation_id SET DEFAULT nextval('public.appropriation_appropriation_id_seq'::regclass);


--
-- Name: legacy_procurementance_listing legacy_procurementance_listing_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_procurementance_listing ALTER COLUMN legacy_procurementance_listing_id SET DEFAULT nextval('public.legacy_procurementance_listing_legacy_procurementance_listing_id_seq'::regclass);


--
-- Name: award_financial award_financial_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_financial ALTER COLUMN award_financial_id SET DEFAULT nextval('public.award_financial_award_financial_id_seq'::regclass);


--
-- Name: award_financial_legacy_procurementance award_financial_legacy_procurementance_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_financial_legacy_procurementance ALTER COLUMN award_financial_legacy_procurementance_id SET DEFAULT nextval('public.award_financial_legacy_procurementance_award_financial_legacy_procurementance_id_seq'::regclass);


--
-- Name: award_procurement award_procurement_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_procurement ALTER COLUMN award_procurement_id SET DEFAULT nextval('public.award_procurement_award_procurement_id_seq'::regclass);


--
-- Name: banner banner_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banner ALTER COLUMN banner_id SET DEFAULT nextval('public.submission_window_window_id_seq'::regclass);


--
-- Name: cd_city_grouped cd_city_grouped_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cd_city_grouped ALTER COLUMN cd_city_grouped_id SET DEFAULT nextval('public.cd_city_grouped_cd_city_grouped_id_seq'::regclass);


--
-- Name: cd_county_grouped cd_county_grouped_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cd_county_grouped ALTER COLUMN cd_county_grouped_id SET DEFAULT nextval('public.cd_county_grouped_cd_county_grouped_id_seq'::regclass);


--
-- Name: cd_state_grouped cd_state_grouped_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cd_state_grouped ALTER COLUMN cd_state_grouped_id SET DEFAULT nextval('public.cd_state_grouped_cd_state_grouped_id_seq'::regclass);


--
-- Name: cd_zips_grouped cd_zips_grouped_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cd_zips_grouped ALTER COLUMN cd_zips_grouped_id SET DEFAULT nextval('public.cd_zips_grouped_cd_zips_grouped_id_seq'::regclass);


--
-- Name: cd_zips_grouped_historical cd_zips_grouped_historical_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cd_zips_grouped_historical ALTER COLUMN cd_zips_grouped_historical_id SET DEFAULT nextval('public.cd_zips_grouped_historical_cd_zips_grouped_historical_id_seq'::regclass);


--
-- Name: certify_history certify_history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certify_history ALTER COLUMN certify_history_id SET DEFAULT nextval('public.certify_history_certify_history_id_seq'::regclass);


--
-- Name: cgac cgac_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cgac ALTER COLUMN cgac_id SET DEFAULT nextval('public.cgac_cgac_id_seq'::regclass);


--
-- Name: city_code city_code_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.city_code ALTER COLUMN city_code_id SET DEFAULT nextval('public.city_code_city_code_id_seq'::regclass);


--
-- Name: comment comment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment ALTER COLUMN comment_id SET DEFAULT nextval('public.comment_comment_id_seq'::regclass);


--
-- Name: country_code country_code_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_code ALTER COLUMN country_code_id SET DEFAULT nextval('public.country_code_country_code_id_seq'::regclass);


--
-- Name: county_code county_code_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.county_code ALTER COLUMN county_code_id SET DEFAULT nextval('public.county_code_county_code_id_seq'::regclass);


--
-- Name: defc defc_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.defc ALTER COLUMN defc_id SET DEFAULT nextval('public.defc_defc_id_seq'::regclass);


--
-- Name: detached_award_procurement detached_award_procurement_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detached_award_procurement ALTER COLUMN detached_award_procurement_id SET DEFAULT nextval('public.detached_award_procurement_detached_award_procurement_id_seq'::regclass);


--
-- Name: email_template email_template_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template ALTER COLUMN email_template_id SET DEFAULT nextval('public.email_template_email_template_id_seq'::regclass);


--
-- Name: email_template_type email_template_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template_type ALTER COLUMN email_template_type_id SET DEFAULT nextval('public.email_template_type_email_template_type_id_seq'::regclass);


--
-- Name: email_token email_token_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_token ALTER COLUMN email_token_id SET DEFAULT nextval('public.email_token_email_token_id_seq'::regclass);


--
-- Name: error_metadata error_metadata_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_metadata ALTER COLUMN error_metadata_id SET DEFAULT nextval('public.error_metadata_error_metadata_id_seq'::regclass);


--
-- Name: error_type error_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_type ALTER COLUMN error_type_id SET DEFAULT nextval('public.error_type_error_type_id_seq'::regclass);


--
-- Name: external_data_load_date external_data_load_date_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_data_load_date ALTER COLUMN external_data_load_date_id SET DEFAULT nextval('public.external_data_load_date_external_data_load_date_id_seq'::regclass);


--
-- Name: external_data_type external_data_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_data_type ALTER COLUMN external_data_type_id SET DEFAULT nextval('public.external_data_type_external_data_type_id_seq'::regclass);


--
-- Name: fabs fabs_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fabs ALTER COLUMN fabs_id SET DEFAULT nextval('public.fabs_fabs_id_seq'::regclass);


--
-- Name: field_type field_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_type ALTER COLUMN field_type_id SET DEFAULT nextval('public.field_type_field_type_id_seq'::regclass);


--
-- Name: file file_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file ALTER COLUMN file_id SET DEFAULT nextval('public.file_file_id_seq'::regclass);


--
-- Name: file_columns file_column_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_columns ALTER COLUMN file_column_id SET DEFAULT nextval('public.file_columns_file_column_id_seq'::regclass);


--
-- Name: file_generation file_generation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_generation ALTER COLUMN file_generation_id SET DEFAULT nextval('public.file_generation_file_generation_id_seq'::regclass);


--
-- Name: file_generation_task file_generation_task_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_generation_task ALTER COLUMN file_generation_task_id SET DEFAULT nextval('public.file_generation_task_file_generation_task_id_seq'::regclass);


--
-- Name: file_status file_status_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_status ALTER COLUMN file_status_id SET DEFAULT nextval('public.file_status_file_status_id_seq'::regclass);


--
-- Name: file_type file_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_type ALTER COLUMN file_type_id SET DEFAULT nextval('public.file_type_file_type_id_seq'::regclass);


--
-- Name: flex_field flex_field_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flex_field ALTER COLUMN flex_field_id SET DEFAULT nextval('public.flex_field_flex_field_id_seq'::regclass);


--
-- Name: format_change_date format_change_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.format_change_date ALTER COLUMN format_change_id SET DEFAULT nextval('public.format_change_date_format_change_id_seq'::regclass);


--
-- Name: frec frec_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frec ALTER COLUMN frec_id SET DEFAULT nextval('public.frec_frec_id_seq'::regclass);


--
-- Name: funding_opportunity funding_opportunity_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funding_opportunity ALTER COLUMN funding_opportunity_id SET DEFAULT nextval('public.funding_opportunity_funding_opportunity_id_seq'::regclass);


--
-- Name: gtas_boc gtas_boc_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gtas_boc ALTER COLUMN gtas_boc_id SET DEFAULT nextval('public.gtas_boc_gtas_boc_id_seq'::regclass);


--
-- Name: historic_duns duns_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historic_duns ALTER COLUMN duns_id SET DEFAULT nextval('public.historic_duns_duns_id_seq'::regclass);


--
-- Name: job job_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job ALTER COLUMN job_id SET DEFAULT nextval('public.job_job_id_seq'::regclass);


--
-- Name: job_dependency dependency_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_dependency ALTER COLUMN dependency_id SET DEFAULT nextval('public.job_dependency_dependency_id_seq'::regclass);


--
-- Name: job_status job_status_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_status ALTER COLUMN job_status_id SET DEFAULT nextval('public.job_status_job_status_id_seq'::regclass);


--
-- Name: job_type job_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_type ALTER COLUMN job_type_id SET DEFAULT nextval('public.job_type_job_type_id_seq'::regclass);


--
-- Name: object_class object_class_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.object_class ALTER COLUMN object_class_id SET DEFAULT nextval('public.object_class_object_class_id_seq'::regclass);


--
-- Name: object_class_program_activity object_class_program_activity_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.object_class_program_activity ALTER COLUMN object_class_program_activity_id SET DEFAULT nextval('public.object_class_program_activity_object_class_program_activity_seq'::regclass);


--
-- Name: office office_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.office ALTER COLUMN office_id SET DEFAULT nextval('public.office_office_id_seq'::regclass);


--
-- Name: permission_type permission_type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_type ALTER COLUMN permission_type_id SET DEFAULT nextval('public.permission_type_permission_type_id_seq'::regclass);


--
-- Name: program_activity program_activity_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_activity ALTER COLUMN program_activity_id SET DEFAULT nextval('public.program_activity_program_activity_id_seq'::regclass);


--
-- Name: program_activity_park program_activity_park_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_activity_park ALTER COLUMN program_activity_park_id SET DEFAULT nextval('public.program_activity_park_program_activity_park_id_seq'::regclass);


--
-- Name: publish_history publish_history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publish_history ALTER COLUMN publish_history_id SET DEFAULT nextval('public.publish_history_publish_history_id_seq'::regclass);


--
-- Name: publish_status publish_status_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publish_status ALTER COLUMN publish_status_id SET DEFAULT nextval('public.publish_status_publish_status_id_seq'::regclass);


--
-- Name: published_appropriation published_appropriation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_appropriation ALTER COLUMN published_appropriation_id SET DEFAULT nextval('public.published_appropriation_published_appropriation_id_seq'::regclass);


--
-- Name: published_award_financial published_award_financial_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_award_financial ALTER COLUMN published_award_financial_id SET DEFAULT nextval('public.published_award_financial_published_award_financial_id_seq'::regclass);


--
-- Name: published_award_financial_legacy_procurementance published_award_financial_legacy_procurementance_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_award_financial_legacy_procurementance ALTER COLUMN published_award_financial_legacy_procurementance_id SET DEFAULT nextval('public.published_award_financial_ass_published_award_financial_ass_seq'::regclass);


--
-- Name: published_award_procurement published_award_procurement_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_award_procurement ALTER COLUMN published_award_procurement_id SET DEFAULT nextval('public.published_award_procurement_published_award_procurement_id_seq'::regclass);


--
-- Name: published_comment published_comment_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_comment ALTER COLUMN published_comment_id SET DEFAULT nextval('public.published_comment_published_comment_id_seq'::regclass);


--
-- Name: published_error_metadata published_error_metadata_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_error_metadata ALTER COLUMN published_error_metadata_id SET DEFAULT nextval('public.published_error_metadata_published_error_metadata_id_seq'::regclass);


--
-- Name: published_fabs published_fabs_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_fabs ALTER COLUMN published_fabs_id SET DEFAULT nextval('public.published_fabs_published_fabs_id_seq'::regclass);


--
-- Name: published_files_history published_files_history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_files_history ALTER COLUMN published_files_history_id SET DEFAULT nextval('public.published_files_history_published_files_history_id_seq'::regclass);


--
-- Name: published_flex_field published_flex_field_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_flex_field ALTER COLUMN published_flex_field_id SET DEFAULT nextval('public.published_flex_field_published_flex_field_id_seq'::regclass);


--
-- Name: published_object_class_program_activity published_object_class_program_activity_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_object_class_program_activity ALTER COLUMN published_object_class_program_activity_id SET DEFAULT nextval('public.published_object_class_progra_published_object_class_progra_seq'::regclass);


--
-- Name: published_total_obligations published_total_obligations_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_total_obligations ALTER COLUMN published_total_obligations_id SET DEFAULT nextval('public.published_total_obligations_published_total_obligations_id_seq'::regclass);


--
-- Name: rule_impact rule_impact_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_impact ALTER COLUMN rule_impact_id SET DEFAULT nextval('public.rule_impact_rule_impact_id_seq'::regclass);


--
-- Name: rule_settings rule_settings_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_settings ALTER COLUMN rule_settings_id SET DEFAULT nextval('public.rule_settings_rule_settings_id_seq'::regclass);


--
-- Name: rule_severity rule_severity_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_severity ALTER COLUMN rule_severity_id SET DEFAULT nextval('public.rule_severity_rule_severity_id_seq'::regclass);


--
-- Name: rule_sql rule_sql_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_sql ALTER COLUMN rule_sql_id SET DEFAULT nextval('public.rule_sql_rule_sql_id_seq'::regclass);


--
-- Name: sam_recipient sam_recipient_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sam_recipient ALTER COLUMN sam_recipient_id SET DEFAULT nextval('public.sam_recipient_sam_recipient_id_seq'::regclass);


--
-- Name: sam_recipient_unregistered sam_recipient_unreg_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sam_recipient_unregistered ALTER COLUMN sam_recipient_unreg_id SET DEFAULT nextval('public.sam_recipient_unregistered_sam_recipient_unreg_id_seq'::regclass);


--
-- Name: sam_subcontract sam_subcontract_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sam_subcontract ALTER COLUMN sam_subcontract_id SET DEFAULT nextval('public.sam_subcontract_sam_subcontract_id_seq'::regclass);


--
-- Name: sam_subgrant sam_subgrant_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sam_subgrant ALTER COLUMN sam_subgrant_id SET DEFAULT nextval('public.sam_subgrant_sam_subgrant_id_seq'::regclass);


--
-- Name: session_map session_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_map ALTER COLUMN session_id SET DEFAULT nextval('public.session_map_session_id_seq'::regclass);


--
-- Name: sf_133 sf133_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sf_133 ALTER COLUMN sf133_id SET DEFAULT nextval('public.sf_133_sf133_id_seq'::regclass);


--
-- Name: sqs sqs_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sqs ALTER COLUMN sqs_id SET DEFAULT nextval('public.sqs_sqs_id_seq'::regclass);


--
-- Name: state_congressional state_congressional_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_congressional ALTER COLUMN state_congressional_id SET DEFAULT nextval('public.state_congressional_state_congressional_id_seq'::regclass);


--
-- Name: states states_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states ALTER COLUMN states_id SET DEFAULT nextval('public.states_states_id_seq'::regclass);


--
-- Name: sub_tier_agency sub_tier_agency_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_tier_agency ALTER COLUMN sub_tier_agency_id SET DEFAULT nextval('public.sub_tier_agency_sub_tier_agency_id_seq'::regclass);


--
-- Name: subaward id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subaward ALTER COLUMN id SET DEFAULT nextval('public.subaward_id_seq'::regclass);


--
-- Name: submission submission_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission ALTER COLUMN submission_id SET DEFAULT nextval('public.submission_submission_id_seq'::regclass);


--
-- Name: submission_sub_tier_affiliation submission_sub_tier_affiliation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission_sub_tier_affiliation ALTER COLUMN submission_sub_tier_affiliation_id SET DEFAULT nextval('public.submission_sub_tier_affiliati_submission_sub_tier_affiliati_seq'::regclass);


--
-- Name: submission_window_schedule submission_window_schedule_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission_window_schedule ALTER COLUMN submission_window_schedule_id SET DEFAULT nextval('public.submission_window_schedule_submission_window_schedule_id_seq'::regclass);


--
-- Name: tas_failed_edits tas_failed_edits_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tas_failed_edits ALTER COLUMN tas_failed_edits_id SET DEFAULT nextval('public.tas_failed_edits_tas_failed_edits_id_seq'::regclass);


--
-- Name: tas_lookup tas_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tas_lookup ALTER COLUMN tas_id SET DEFAULT nextval('public.tas_lookup_tas_id_seq'::regclass);


--
-- Name: total_obligations total_obligations_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.total_obligations ALTER COLUMN total_obligations_id SET DEFAULT nextval('public.total_obligations_total_obligations_id_seq'::regclass);


--
-- Name: user_affiliation user_affiliation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_affiliation ALTER COLUMN user_affiliation_id SET DEFAULT nextval('public.user_affiliation_user_affiliation_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: validation_label validation_label_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_label ALTER COLUMN validation_label_id SET DEFAULT nextval('public.validation_label_validation_label_id_seq'::regclass);


--
-- Name: zip_city zip_city_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zip_city ALTER COLUMN zip_city_id SET DEFAULT nextval('public.zip_city_zip_city_id_seq'::regclass);


--
-- Name: zips zips_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zips ALTER COLUMN zips_id SET DEFAULT nextval('public.zips_zips_id_seq'::regclass);


--
-- Name: zips_grouped zips_grouped_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zips_grouped ALTER COLUMN zips_grouped_id SET DEFAULT nextval('public.zips_grouped_zips_grouped_id_seq'::regclass);


--
-- Name: zips_grouped_historical zips_grouped_historical_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zips_grouped_historical ALTER COLUMN zips_grouped_historical_id SET DEFAULT nextval('public.zips_grouped_historical_zips_grouped_historical_id_seq'::regclass);


--
-- Name: zips_historical zips_historical_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zips_historical ALTER COLUMN zips_historical_id SET DEFAULT nextval('public.zips_historical_zips_historical_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
90e58540d4da
\.


--
-- Data for Name: application_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.application_type (created_at, updated_at, application_type_id, application_name) FROM stdin;
\.


--
-- Data for Name: appropriation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appropriation (created_at, updated_at, appropriation_id, submission_id, job_id, row_number, adjustments_to_unobligated_cpe, agency_identifier, allocation_transfer_agency, availability_type_code, beginning_period_of_availa, borrowing_authority_amount_cpe, budget_authority_appropria_cpe, total_budgetary_resources_cpe, budget_authority_unobligat_fyb, contract_authority_amount_cpe, deobligations_recoveries_r_cpe, ending_period_of_availabil, gross_outlay_amount_by_tas_cpe, main_account_code, obligations_incurred_total_cpe, other_budgetary_resources_cpe, spending_authority_from_of_cpe, status_of_budgetary_resour_cpe, sub_account_code, unobligated_balance_cpe, tas, account_num, display_tas) FROM stdin;
\.


--
-- Data for Name: legacy_procurementance_listing; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.legacy_procurementance_listing (created_at, updated_at, legacy_procurementance_listing_id, program_number, program_title, popular_name, federal_agency, "authorization", objectives, types_of_legacy_procurementance, uses_and_use_restrictions, applicant_eligibility, beneficiary_eligibility, credentials_documentation, preapplication_coordination, application_procedures, award_procedure, deadlines, range_of_approval_disapproval_time, website_address, formula_and_matching_requirements, length_and_time_phasing_of_legacy_procurementance, reports, audits, records, account_identification, obligations, range_and_average_of_financial_legacy_procurementance, appeals, renewals, program_accomplishments, regulations_guidelines_and_literature, regional_or_local_office, headquarters_office, related_programs, examples_of_funded_projects, criteria_for_selecting_proposals, url, recovery, omb_agency_code, omb_bureau_code, published_date, archived_date) FROM stdin;
\.


--
-- Data for Name: award_financial; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.award_financial (created_at, updated_at, award_financial_id, submission_id, job_id, row_number, agency_identifier, allocation_transfer_agency, availability_type_code, beginning_period_of_availa, by_direct_reimbursable_fun, deobligations_recov_by_awa_cpe, ending_period_of_availabil, fain, gross_outlay_amount_by_awa_cpe, gross_outlay_amount_by_awa_fyb, gross_outlays_delivered_or_cpe, gross_outlays_delivered_or_fyb, gross_outlays_undelivered_cpe, gross_outlays_undelivered_fyb, main_account_code, object_class, obligations_delivered_orde_cpe, obligations_delivered_orde_fyb, obligations_incurred_byawa_cpe, obligations_undelivered_or_cpe, obligations_undelivered_or_fyb, parent_award_id, piid, program_activity_code, program_activity_name, sub_account_code, transaction_obligated_amou, uri, ussgl480100_undelivered_or_cpe, ussgl480100_undelivered_or_fyb, ussgl480200_undelivered_or_cpe, ussgl480200_undelivered_or_fyb, ussgl483100_undelivered_or_cpe, ussgl483200_undelivered_or_cpe, ussgl487100_downward_adjus_cpe, ussgl487200_downward_adjus_cpe, ussgl488100_upward_adjustm_cpe, ussgl488200_upward_adjustm_cpe, ussgl490100_delivered_orde_cpe, ussgl490100_delivered_orde_fyb, ussgl490200_delivered_orde_cpe, ussgl490800_authority_outl_cpe, ussgl490800_authority_outl_fyb, ussgl493100_delivered_orde_cpe, ussgl497100_downward_adjus_cpe, ussgl497200_downward_adjus_cpe, ussgl498100_upward_adjustm_cpe, ussgl498200_upward_adjustm_cpe, tas, account_num, general_ledger_post_date, display_tas, disaster_emergency_fund_code, program_activity_reporting_key, prior_year_adjustment, ussgl480110_rein_undel_ord_cpe, ussgl490110_rein_deliv_ord_cpe, ussgl480210_rein_undel_obs_cpe, ussgl497210_down_adj_refun_cpe) FROM stdin;
\.


--
-- Data for Name: award_financial_legacy_procurementance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.award_financial_legacy_procurementance (created_at, updated_at, award_financial_legacy_procurementance_id, submission_id, job_id, row_number, action_date, action_type, legacy_procurementance_type, award_description, awardee_or_recipient_legal, awardee_or_recipient_duns, awarding_agency_code, awarding_agency_name, awarding_office_code, awarding_office_name, awarding_sub_tier_agency_c, awarding_sub_tier_agency_n, award_modification_amendme, business_funds_indicator, business_types, legacy_procurementance_listing_number, legacy_procurementance_listing_title, correction_delete_indicatr, face_value_loan_guarantee, fain, federal_action_obligation, fiscal_year_and_quarter_co, funding_agency_code, funding_agency_name, funding_office_name, funding_office_code, funding_sub_tier_agency_co, funding_sub_tier_agency_na, legal_entity_address_line1, legal_entity_address_line2, legal_entity_address_line3, legal_entity_city_code, legal_entity_city_name, legal_entity_congressional, legal_entity_country_code, legal_entity_county_code, legal_entity_county_name, legal_entity_foreign_city, legal_entity_foreign_posta, legal_entity_foreign_provi, legal_entity_state_code, legal_entity_state_name, legal_entity_zip5, legal_entity_zip_last4, non_federal_funding_amount, original_loan_subsidy_cost, period_of_performance_curr, period_of_performance_star, place_of_performance_city, place_of_performance_code, place_of_performance_congr, place_of_perform_country_c, place_of_perform_county_na, place_of_performance_forei, place_of_perform_state_nam, place_of_performance_zip4a, record_type, sai_number, total_funding_amount, uri, legal_entity_country_name, place_of_perform_country_n, place_of_perform_county_co, action_type_description, legacy_procurementance_type_desc, business_funds_ind_desc, business_types_desc, correction_delete_ind_desc, record_type_description, ultimate_parent_legal_enti, ultimate_parent_duns, afa_generated_unique, unique_award_key, place_of_performance_scope, awardee_or_recipient_uei, funding_opportunity_goals, funding_opportunity_number, indirect_federal_sharing, ultimate_parent_uei) FROM stdin;
\.


--
-- Data for Name: award_procurement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.award_procurement (created_at, updated_at, award_procurement_id, submission_id, job_id, row_number, piid, awarding_sub_tier_agency_c, awarding_sub_tier_agency_n, awarding_agency_code, awarding_agency_name, parent_award_id, award_modification_amendme, type_of_contract_pricing, contract_award_type, naics, naics_description, awardee_or_recipient_uniqu, ultimate_parent_legal_enti, ultimate_parent_unique_ide, award_description, place_of_performance_zip4a, place_of_performance_congr, awardee_or_recipient_legal, legal_entity_city_name, legal_entity_state_descrip, legal_entity_zip4, legal_entity_congressional, legal_entity_address_line1, legal_entity_address_line2, legal_entity_address_line3, legal_entity_country_code, legal_entity_country_name, period_of_performance_star, period_of_performance_curr, period_of_perf_potential_e, ordering_period_end_date, action_date, action_type, federal_action_obligation, current_total_value_award, potential_total_value_awar, funding_sub_tier_agency_co, funding_sub_tier_agency_na, funding_office_code, funding_office_name, awarding_office_code, awarding_office_name, referenced_idv_agency_iden, funding_agency_code, funding_agency_name, place_of_performance_locat, place_of_performance_state, place_of_perform_country_c, idv_type, entity_doing_business_as_n, entity_phone_number, entity_fax_number, multiple_or_single_award_i, type_of_idc, a_76_fair_act_action, dod_claimant_program_code, clinger_cohen_act_planning, commercial_item_acquisitio, commercial_item_test_progr, consolidated_contract, contingency_humanitarian_o, contract_bundling, contract_financing, contracting_officers_deter, cost_accounting_standards, cost_or_pricing_data, country_of_product_or_serv, construction_wage_rate_req, evaluated_preference, extent_competed, contract_opp_notice, foreign_funding, government_furnished_prope, information_technology_com, interagency_contracting_au, local_area_set_aside, major_program, purchase_card_as_payment_m, multi_year_contract, national_interest_action, number_of_actions, number_of_offers_received, other_statutory_authority, performance_based_service, place_of_manufacture, price_evaluation_adjustmen, product_or_service_code, program_acronym, other_than_full_and_open_c, recovered_materials_sustai, research, sea_transportation, labor_standards, solicitation_identifier, solicitation_procedures, fair_opportunity_limited_s, subcontracting_plan, program_system_or_equipmen, type_set_aside, epa_designated_product, materials_supplies_article, transaction_number, sam_exception, referenced_idv_modificatio, undefinitized_action, domestic_or_foreign_entity, award_or_idv_flag, place_of_perform_country_n, place_of_perform_county_na, place_of_perform_state_nam, referenced_idv_agency_name, referenced_idv_type, referenced_mult_or_single, base_and_all_options_value, base_exercised_options_val, cage_code, inherently_government_func, organizational_type, number_of_employees, annual_revenue, total_obligated_amount, a_76_fair_act_action_desc, action_type_description, clinger_cohen_act_pla_desc, commercial_item_acqui_desc, commercial_item_test_desc, consolidated_contract_desc, construction_wage_rat_desc, contingency_humanitar_desc, contract_award_type_desc, contract_bundling_descrip, contract_financing_descrip, contracting_officers_desc, cost_accounting_stand_desc, cost_or_pricing_data_desc, country_of_product_or_desc, dod_claimant_prog_cod_desc, domestic_or_foreign_e_desc, epa_designated_produc_desc, evaluated_preference_desc, extent_compete_description, fair_opportunity_limi_desc, contract_opp_notice_desc, foreign_funding_desc, government_furnished_desc, idv_type_description, information_technolog_desc, inherently_government_desc, interagency_contract_desc, labor_standards_descrip, last_modified, legal_entity_state_code, local_area_set_aside_desc, materials_supplies_descrip, multi_year_contract_desc, multiple_or_single_aw_desc, national_interest_desc, other_than_full_and_o_desc, performance_based_se_desc, place_of_manufacture_desc, place_of_performance_city, product_or_service_co_desc, program_system_or_equ_desc, purchase_card_as_paym_desc, recovered_materials_s_desc, referenced_idv_type_desc, referenced_mult_or_si_desc, research_description, sam_exception_description, sea_transportation_desc, solicitation_procedur_desc, subcontracting_plan_desc, type_of_contract_pric_desc, type_of_idc_description, type_set_aside_description, undefinitized_action_desc, solicitation_date, detached_award_proc_unique, unique_award_key, additional_reporting, awardee_or_recipient_uei, ultimate_parent_uei, small_business_competitive, city_local_government, county_local_government, inter_municipal_local_gove, local_government_owned, municipality_local_governm, school_district_local_gove, township_local_government, us_state_government, us_federal_government, federal_agency, federally_funded_research, us_tribal_government, foreign_government, community_developed_corpor, labor_surplus_area_firm, corporate_entity_not_tax_e, corporate_entity_tax_exemp, partnership_or_limited_lia, sole_proprietorship, small_agricultural_coopera, international_organization, us_government_entity, emerging_small_business, c8a_program_participant, sba_certified_8_a_joint_ve, dot_certified_disadvantage, self_certified_small_disad, historically_underutilized, small_disadvantaged_busine, the_ability_one_program, historically_black_college, c1862_land_grant_college, c1890_land_grant_college, c1994_land_grant_college, minority_institution, private_university_or_coll, school_of_forestry, state_controlled_instituti, tribal_college, veterinary_college, educational_institution, alaskan_native_servicing_i, community_development_corp, native_hawaiian_servicing, domestic_shelter, manufacturer_of_goods, hospital_flag, veterinary_hospital, hispanic_servicing_institu, foundation, woman_owned_business, minority_owned_business, women_owned_small_business, economically_disadvantaged, joint_venture_women_owned, joint_venture_economically, veteran_owned_business, service_disabled_veteran_o, contracts, grants, receives_contracts_and_gra, airport_authority, council_of_governments, housing_authorities_public, interstate_entity, planning_commission, port_authority, transit_authority, subchapter_s_corporation, limited_liability_corporat, foreign_owned_and_located, american_indian_owned_busi, alaskan_native_owned_corpo, indian_tribe_federally_rec, native_hawaiian_owned_busi, tribally_owned_business, asian_pacific_american_own, black_american_owned_busin, hispanic_american_owned_bu, native_american_owned_busi, subcontinent_asian_asian_i, other_minority_owned_busin, for_profit_organization, nonprofit_organization, other_not_for_profit_organ, us_local_government) FROM stdin;
\.


--
-- Data for Name: banner; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.banner (created_at, updated_at, banner_id, start_date, end_date, block_certification, message, application_type_id, banner_type, header) FROM stdin;
\.


--
-- Data for Name: cd_city_grouped; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cd_city_grouped (created_at, updated_at, cd_city_grouped_id, city_name, state_abbreviation, congressional_district_no, city_code) FROM stdin;
\.


--
-- Data for Name: cd_county_grouped; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cd_county_grouped (created_at, updated_at, cd_county_grouped_id, county_number, state_abbreviation, congressional_district_no) FROM stdin;
\.


--
-- Data for Name: cd_state_grouped; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cd_state_grouped (created_at, updated_at, cd_state_grouped_id, state_abbreviation, congressional_district_no) FROM stdin;
\.


--
-- Data for Name: cd_zips_grouped; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cd_zips_grouped (created_at, updated_at, cd_zips_grouped_id, zip5, state_abbreviation, congressional_district_no) FROM stdin;
\.


--
-- Data for Name: cd_zips_grouped_historical; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cd_zips_grouped_historical (created_at, updated_at, cd_zips_grouped_historical_id, zip5, state_abbreviation, congressional_district_no) FROM stdin;
\.


--
-- Data for Name: certify_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.certify_history (created_at, updated_at, certify_history_id, submission_id, user_id) FROM stdin;
\.


--
-- Data for Name: cgac; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cgac (created_at, updated_at, cgac_id, cgac_code, agency_name, icon_name) FROM stdin;
\.


--
-- Data for Name: city_code; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.city_code (created_at, updated_at, city_code_id, feature_name, feature_class, city_code, state_code, county_number, county_name, latitude, longitude) FROM stdin;
\.


--
-- Data for Name: comment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comment (created_at, updated_at, comment_id, submission_id, file_type_id, comment) FROM stdin;
\.


--
-- Data for Name: country_code; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.country_code (created_at, updated_at, country_code_id, country_code, country_name, territory_free_state, country_code_2_char) FROM stdin;
\.


--
-- Data for Name: county_code; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.county_code (created_at, updated_at, county_code_id, county_number, county_name, state_code) FROM stdin;
\.


--
-- Data for Name: defc; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.defc (created_at, updated_at, defc_id, code, "group", public_laws, public_law_short_titles, urls, is_valid, earliest_pl_action_date) FROM stdin;
\.


--
-- Data for Name: detached_award_procurement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.detached_award_procurement (created_at, updated_at, detached_award_procurement_id, detached_award_proc_unique, piid, agency_id, awarding_sub_tier_agency_c, awarding_sub_tier_agency_n, awarding_agency_code, awarding_agency_name, parent_award_id, award_modification_amendme, type_of_contract_pricing, type_of_contract_pric_desc, contract_award_type, contract_award_type_desc, naics, naics_description, awardee_or_recipient_uniqu, ultimate_parent_legal_enti, ultimate_parent_unique_ide, award_description, place_of_performance_zip4a, place_of_perform_city_name, place_of_perform_county_na, place_of_performance_congr, awardee_or_recipient_legal, legal_entity_city_name, legal_entity_state_code, legal_entity_state_descrip, legal_entity_zip4, legal_entity_congressional, legal_entity_address_line1, legal_entity_address_line2, legal_entity_address_line3, legal_entity_country_code, legal_entity_country_name, period_of_performance_star, period_of_performance_curr, period_of_perf_potential_e, ordering_period_end_date, action_date, action_type, action_type_description, federal_action_obligation, current_total_value_award, potential_total_value_awar, funding_sub_tier_agency_co, funding_sub_tier_agency_na, funding_office_code, funding_office_name, awarding_office_code, awarding_office_name, referenced_idv_agency_iden, referenced_idv_agency_desc, funding_agency_code, funding_agency_name, place_of_performance_locat, place_of_performance_state, place_of_perfor_state_desc, place_of_perform_country_c, place_of_perf_country_desc, idv_type, idv_type_description, referenced_idv_type, referenced_idv_type_desc, vendor_doing_as_business_n, vendor_phone_number, vendor_fax_number, multiple_or_single_award_i, multiple_or_single_aw_desc, referenced_mult_or_single, referenced_mult_or_si_desc, type_of_idc, type_of_idc_description, a_76_fair_act_action, a_76_fair_act_action_desc, dod_claimant_program_code, dod_claimant_prog_cod_desc, clinger_cohen_act_planning, clinger_cohen_act_pla_desc, commercial_item_acquisitio, commercial_item_acqui_desc, commercial_item_test_progr, commercial_item_test_desc, consolidated_contract, consolidated_contract_desc, contingency_humanitarian_o, contingency_humanitar_desc, contract_bundling, contract_bundling_descrip, contract_financing, contract_financing_descrip, contracting_officers_deter, contracting_officers_desc, cost_accounting_standards, cost_accounting_stand_desc, cost_or_pricing_data, cost_or_pricing_data_desc, country_of_product_or_serv, country_of_product_or_desc, construction_wage_rate_req, construction_wage_rat_desc, evaluated_preference, evaluated_preference_desc, extent_competed, extent_compete_description, fed_biz_opps, fed_biz_opps_description, foreign_funding, foreign_funding_desc, government_furnished_prope, government_furnished_desc, information_technology_com, information_technolog_desc, interagency_contracting_au, interagency_contract_desc, local_area_set_aside, local_area_set_aside_desc, major_program, purchase_card_as_payment_m, purchase_card_as_paym_desc, multi_year_contract, multi_year_contract_desc, national_interest_action, national_interest_desc, number_of_actions, number_of_offers_received, other_statutory_authority, performance_based_service, performance_based_se_desc, place_of_manufacture, place_of_manufacture_desc, price_evaluation_adjustmen, product_or_service_code, product_or_service_co_desc, program_acronym, other_than_full_and_open_c, other_than_full_and_o_desc, recovered_materials_sustai, recovered_materials_s_desc, research, research_description, sea_transportation, sea_transportation_desc, labor_standards, labor_standards_descrip, solicitation_identifier, solicitation_procedures, solicitation_procedur_desc, fair_opportunity_limited_s, fair_opportunity_limi_desc, subcontracting_plan, subcontracting_plan_desc, program_system_or_equipmen, program_system_or_equ_desc, type_set_aside, type_set_aside_description, epa_designated_product, epa_designated_produc_desc, materials_supplies_article, materials_supplies_descrip, transaction_number, sam_exception, sam_exception_description, referenced_idv_modificatio, undefinitized_action, undefinitized_action_desc, domestic_or_foreign_entity, domestic_or_foreign_e_desc, pulled_from, last_modified, annual_revenue, division_name, division_number_or_office, number_of_employees, vendor_alternate_name, vendor_alternate_site_code, vendor_enabled, vendor_legal_org_name, vendor_location_disabled_f, vendor_site_code, initial_report_date, base_and_all_options_value, base_exercised_options_val, total_obligated_amount, place_of_perform_country_n, place_of_perform_state_nam, referenced_idv_agency_name, award_or_idv_flag, legal_entity_county_code, legal_entity_county_name, legal_entity_zip5, legal_entity_zip_last4, place_of_perform_county_co, place_of_performance_zip5, place_of_perform_zip_last4, cage_code, inherently_government_func, organizational_type, business_categories, inherently_government_desc, unique_award_key, solicitation_date, high_comp_officer1_amount, high_comp_officer1_full_na, high_comp_officer2_amount, high_comp_officer2_full_na, high_comp_officer3_amount, high_comp_officer3_full_na, high_comp_officer4_amount, high_comp_officer4_full_na, high_comp_officer5_amount, high_comp_officer5_full_na, additional_reporting, awardee_or_recipient_uei, ultimate_parent_uei, small_business_competitive, city_local_government, county_local_government, inter_municipal_local_gove, local_government_owned, municipality_local_governm, school_district_local_gove, township_local_government, us_state_government, us_federal_government, federal_agency, federally_funded_research, us_tribal_government, foreign_government, community_developed_corpor, labor_surplus_area_firm, corporate_entity_not_tax_e, corporate_entity_tax_exemp, partnership_or_limited_lia, sole_proprietorship, small_agricultural_coopera, international_organization, us_government_entity, emerging_small_business, c8a_program_participant, sba_certified_8_a_joint_ve, dot_certified_disadvantage, self_certified_small_disad, historically_underutilized, small_disadvantaged_busine, the_ability_one_program, historically_black_college, c1862_land_grant_college, c1890_land_grant_college, c1994_land_grant_college, minority_institution, private_university_or_coll, school_of_forestry, state_controlled_instituti, tribal_college, veterinary_college, educational_institution, alaskan_native_servicing_i, community_development_corp, native_hawaiian_servicing, domestic_shelter, manufacturer_of_goods, hospital_flag, veterinary_hospital, hispanic_servicing_institu, foundation, woman_owned_business, minority_owned_business, women_owned_small_business, economically_disadvantaged, joint_venture_women_owned, joint_venture_economically, veteran_owned_business, service_disabled_veteran_o, contracts, grants, receives_contracts_and_gra, airport_authority, council_of_governments, housing_authorities_public, interstate_entity, planning_commission, port_authority, transit_authority, subchapter_s_corporation, limited_liability_corporat, foreign_owned_and_located, american_indian_owned_busi, alaskan_native_owned_corpo, indian_tribe_federally_rec, native_hawaiian_owned_busi, tribally_owned_business, asian_pacific_american_own, black_american_owned_busin, hispanic_american_owned_bu, native_american_owned_busi, subcontinent_asian_asian_i, other_minority_owned_busin, for_profit_organization, nonprofit_organization, other_not_for_profit_organ, us_local_government, entity_data_source, approved_date, closed_date, domestic_parent_uei, domestic_parent_uei_name, fee_paid_for_use_of_serv, idv_number_of_offers_recie, idv_type_of_set_aside, immediate_parent_uei, immediate_parent_uei_name, self_cert_hub_zone_joint, source_selection_process, total_estimated_order_val, uei_legal_business_name, small_business_joint_venture, ser_disabvet_own_bus_join_ven, sba_cert_women_own_small_bus, sba_cert_econ_disadv_wosb) FROM stdin;
\.


--
-- Data for Name: email_template; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_template (created_at, updated_at, email_template_id, template_type_id, subject, content) FROM stdin;
\.


--
-- Data for Name: email_template_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_template_type (created_at, updated_at, email_template_type_id, name, description) FROM stdin;
\.


--
-- Data for Name: email_token; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_token (created_at, updated_at, email_token_id, token, salt) FROM stdin;
\.


--
-- Data for Name: error_metadata; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.error_metadata (created_at, updated_at, error_metadata_id, job_id, filename, field_name, error_type_id, occurrences, first_row, rule_failed, file_type_id, target_file_type_id, original_rule_label, severity_id) FROM stdin;
\.


--
-- Data for Name: error_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.error_type (created_at, updated_at, error_type_id, name, description) FROM stdin;
\.


--
-- Data for Name: external_data_load_date; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.external_data_load_date (created_at, updated_at, external_data_load_date_id, last_load_date_start, external_data_type_id, last_load_date_end) FROM stdin;
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	1	\N	15	\N
\.


--
-- Data for Name: external_data_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.external_data_type (created_at, updated_at, external_data_type_id, name, description) FROM stdin;
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	1	usps_download	external data load type for downloading zip files
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	2	program_activity_upload	program activity file loaded into S3
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	3	legacy_procurementance_listing	GSA Assistance Listing loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	4	agency	IAE agency data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	5	tas	FRB CARS/TAS data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	6	city	USGS city data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	7	congressional_district	USPS congressional district data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	8	country_code	country code data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	9	county_code	USGS county code data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	10	recipient	Entity Management DUNS/UEI data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	11	executive_compensation	Entity Management executive compensation data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	12	contract_data	Contract Data data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	13	gtas	FRB gtas/sf-133 data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	14	object_class	OMB object class data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	15	office	GSA office data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	16	program_activity	OMB program activity data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	17	state_code	state code data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	18	subaward	Entity Management subaward data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	19	zip_code	USPS zip code data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	20	defc	disaster emergency fund code data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	21	failed_tas	TAS failing edits data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	22	funding_opportunity_number	Funding Opportunity Number data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	23	gtas_boc	GTAS BOC data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	24	park	PARK data loaded
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	25	park_upload	PARK file loaded into S3
2025-12-04 14:11:16.113795	2025-12-04 14:11:16.113795	26	fabs_extract	FABS extract for Entity Management generated
\.


--
-- Data for Name: fabs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fabs (created_at, updated_at, fabs_id, submission_id, job_id, row_number, action_date, action_type, legacy_procurementance_type, award_description, awardee_or_recipient_legal, awardee_or_recipient_uniqu, awarding_office_code, awarding_sub_tier_agency_c, award_modification_amendme, business_funds_indicator, business_types, legacy_procurementance_listing_number, correction_delete_indicatr, face_value_loan_guarantee, fain, federal_action_obligation, funding_office_code, funding_sub_tier_agency_co, legal_entity_address_line1, legal_entity_address_line2, legal_entity_country_code, legal_entity_foreign_city, legal_entity_foreign_posta, legal_entity_foreign_provi, legal_entity_zip5, legal_entity_zip_last4, non_federal_funding_amount, original_loan_subsidy_cost, period_of_performance_curr, period_of_performance_star, place_of_performance_code, place_of_performance_congr, place_of_perform_country_c, place_of_performance_forei, place_of_performance_zip4a, record_type, sai_number, uri, is_valid, afa_generated_unique, legal_entity_congressional, unique_award_key, uei, ultimate_parent_uei, funding_opportunity_goals, funding_opportunity_number, indirect_federal_sharing, awarding_agency_code) FROM stdin;
\.


--
-- Data for Name: field_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.field_type (created_at, updated_at, field_type_id, name, description) FROM stdin;
\.


--
-- Data for Name: file; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file (created_at, updated_at, file_id, job_id, filename, file_status_id, headers_missing, headers_duplicated) FROM stdin;
\.


--
-- Data for Name: file_columns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file_columns (created_at, updated_at, file_column_id, file_id, field_types_id, name, name_short, description, required, padded_flag, length, unified_model_name) FROM stdin;
\.


--
-- Data for Name: file_generation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file_generation (created_at, updated_at, file_generation_id, request_date, start_date, end_date, agency_code, agency_type, file_type, file_path, is_cached_file, file_format, element_numbers) FROM stdin;
\.


--
-- Data for Name: file_generation_task; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file_generation_task (created_at, updated_at, file_generation_task_id, generation_task_key, job_id) FROM stdin;
\.


--
-- Data for Name: file_status; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file_status (created_at, updated_at, file_status_id, name, description) FROM stdin;
\.


--
-- Data for Name: file_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.file_type (created_at, updated_at, file_type_id, name, description, letter_name, file_order) FROM stdin;
\.


--
-- Data for Name: flex_field; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flex_field (created_at, updated_at, flex_field_id, submission_id, job_id, row_number, header, cell, file_type_id) FROM stdin;
\.


--
-- Data for Name: format_change_date; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.format_change_date (created_at, updated_at, format_change_id, name, description, change_date) FROM stdin;
\.


--
-- Data for Name: frec; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.frec (created_at, updated_at, frec_id, frec_code, agency_name, cgac_id, icon_name) FROM stdin;
\.


--
-- Data for Name: funding_opportunity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.funding_opportunity (created_at, updated_at, funding_opportunity_id, funding_opportunity_number, title, legacy_procurementance_listing_numbers, agency_name, status, open_date, close_date, doc_type, internal_id) FROM stdin;
\.


--
-- Data for Name: gtas_boc; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gtas_boc (created_at, updated_at, gtas_boc_id, agency_identifier, allocation_transfer_agency, availability_type_code, beginning_period_of_availa, ending_period_of_availabil, main_account_code, sub_account_code, tas, display_tas, fiscal_year, period, ussgl_number, dollar_amount, debit_credit, begin_end, authority_type, reimbursable_flag, apportionment_cat_code, apportionment_cat_b_prog, program_report_cat_number, federal_nonfederal, trading_partner_agency_ide, trading_partner_mac, year_of_budget_auth_code, availability_time, bea_category, borrowing_source, exchange_or_nonexchange, custodial_noncustodial, budget_impact, prior_year_adjustment_code, credit_cohort_year, disaster_emergency_fund_code, reduction_type, budget_object_class, budget_bureau_code, atb_submission_status, atb_upload_user, atb_update_datetime) FROM stdin;
\.


--
-- Data for Name: historic_duns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.historic_duns (created_at, updated_at, duns_id, awardee_or_recipient_uniqu, legal_business_name, dba_name, activation_date, registration_date, expiration_date, last_sam_mod_date, address_line_1, address_line_2, city, state, zip, zip4, country_code, congressional_district, business_types_codes, ultimate_parent_unique_ide, ultimate_parent_legal_enti, high_comp_officer1_amount, high_comp_officer1_full_na, high_comp_officer2_amount, high_comp_officer2_full_na, high_comp_officer3_amount, high_comp_officer3_full_na, high_comp_officer4_amount, high_comp_officer4_full_na, high_comp_officer5_amount, high_comp_officer5_full_na, business_types, uei, ultimate_parent_uei, entity_structure) FROM stdin;
\.


--
-- Data for Name: job; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job (created_at, updated_at, job_id, filename, job_status_id, job_type_id, submission_id, file_type_id, original_filename, file_size, number_of_rows, number_of_rows_valid, number_of_errors, number_of_warnings, error_message, end_date, start_date, user_id, last_validated, file_generation_id, progress) FROM stdin;
\.


--
-- Data for Name: job_dependency; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_dependency (created_at, updated_at, dependency_id, job_id, prerequisite_id) FROM stdin;
\.


--
-- Data for Name: job_status; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_status (created_at, updated_at, job_status_id, name, description) FROM stdin;
\.


--
-- Data for Name: job_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_type (created_at, updated_at, job_type_id, name, description) FROM stdin;
\.


--
-- Data for Name: object_class; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.object_class (created_at, updated_at, object_class_id, object_class_code, object_class_name) FROM stdin;
\.


--
-- Data for Name: object_class_program_activity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.object_class_program_activity (created_at, updated_at, object_class_program_activity_id, submission_id, job_id, row_number, agency_identifier, allocation_transfer_agency, availability_type_code, beginning_period_of_availa, by_direct_reimbursable_fun, deobligations_recov_by_pro_cpe, ending_period_of_availabil, gross_outlay_amount_by_pro_cpe, gross_outlay_amount_by_pro_fyb, gross_outlays_delivered_or_cpe, gross_outlays_delivered_or_fyb, gross_outlays_undelivered_cpe, gross_outlays_undelivered_fyb, main_account_code, object_class, obligations_delivered_orde_cpe, obligations_delivered_orde_fyb, obligations_incurred_by_pr_cpe, obligations_undelivered_or_cpe, obligations_undelivered_or_fyb, program_activity_code, program_activity_name, sub_account_code, ussgl480100_undelivered_or_cpe, ussgl480100_undelivered_or_fyb, ussgl480200_undelivered_or_cpe, ussgl480200_undelivered_or_fyb, ussgl483100_undelivered_or_cpe, ussgl483200_undelivered_or_cpe, ussgl487100_downward_adjus_cpe, ussgl487200_downward_adjus_cpe, ussgl488100_upward_adjustm_cpe, ussgl488200_upward_adjustm_cpe, ussgl490100_delivered_orde_cpe, ussgl490100_delivered_orde_fyb, ussgl490200_delivered_orde_cpe, ussgl490800_authority_outl_cpe, ussgl490800_authority_outl_fyb, ussgl493100_delivered_orde_cpe, ussgl497100_downward_adjus_cpe, ussgl497200_downward_adjus_cpe, ussgl498100_upward_adjustm_cpe, ussgl498200_upward_adjustm_cpe, tas, account_num, display_tas, disaster_emergency_fund_code, program_activity_reporting_key, prior_year_adjustment, ussgl480110_rein_undel_ord_cpe, ussgl490110_rein_deliv_ord_cpe, ussgl480210_rein_undel_obs_cpe, ussgl497210_down_adj_refun_cpe) FROM stdin;
\.


--
-- Data for Name: office; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.office (created_at, updated_at, office_id, office_code, office_name, sub_tier_code, agency_code, contract_awards_office, contract_funding_office, financial_legacy_procurementance_awards_office, financial_legacy_procurementance_funding_office, effective_start_date, effective_end_date) FROM stdin;
\.


--
-- Data for Name: permission_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permission_type (created_at, updated_at, permission_type_id, name, description) FROM stdin;
\.


--
-- Data for Name: program_activity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.program_activity (created_at, updated_at, program_activity_id, fiscal_year_period, agency_id, allocation_transfer_id, account_number, program_activity_code, program_activity_name) FROM stdin;
\.


--
-- Data for Name: program_activity_park; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.program_activity_park (created_at, updated_at, program_activity_park_id, fiscal_year, period, agency_id, allocation_transfer_id, main_account_number, sub_account_number, park_code, park_name) FROM stdin;
\.


--
-- Data for Name: publish_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.publish_history (created_at, updated_at, publish_history_id, submission_id, user_id) FROM stdin;
\.


--
-- Data for Name: publish_status; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.publish_status (created_at, updated_at, publish_status_id, name, description) FROM stdin;
\.


--
-- Data for Name: published_appropriation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.published_appropriation (created_at, updated_at, published_appropriation_id, submission_id, job_id, row_number, adjustments_to_unobligated_cpe, agency_identifier, allocation_transfer_agency, availability_type_code, beginning_period_of_availa, borrowing_authority_amount_cpe, budget_authority_appropria_cpe, total_budgetary_resources_cpe, budget_authority_unobligat_fyb, contract_authority_amount_cpe, deobligations_recoveries_r_cpe, ending_period_of_availabil, gross_outlay_amount_by_tas_cpe, main_account_code, obligations_incurred_total_cpe, other_budgetary_resources_cpe, spending_authority_from_of_cpe, status_of_budgetary_resour_cpe, sub_account_code, unobligated_balance_cpe, tas, account_num, display_tas) FROM stdin;
\.


--
-- Data for Name: published_award_financial; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.published_award_financial (created_at, updated_at, published_award_financial_id, submission_id, job_id, row_number, agency_identifier, allocation_transfer_agency, availability_type_code, beginning_period_of_availa, by_direct_reimbursable_fun, deobligations_recov_by_awa_cpe, ending_period_of_availabil, fain, gross_outlay_amount_by_awa_cpe, gross_outlay_amount_by_awa_fyb, gross_outlays_delivered_or_cpe, gross_outlays_delivered_or_fyb, gross_outlays_undelivered_cpe, gross_outlays_undelivered_fyb, main_account_code, object_class, obligations_delivered_orde_cpe, obligations_delivered_orde_fyb, obligations_incurred_byawa_cpe, obligations_undelivered_or_cpe, obligations_undelivered_or_fyb, parent_award_id, piid, program_activity_code, program_activity_name, sub_account_code, transaction_obligated_amou, uri, ussgl480100_undelivered_or_cpe, ussgl480100_undelivered_or_fyb, ussgl480200_undelivered_or_cpe, ussgl480200_undelivered_or_fyb, ussgl483100_undelivered_or_cpe, ussgl483200_undelivered_or_cpe, ussgl487100_downward_adjus_cpe, ussgl487200_downward_adjus_cpe, ussgl488100_upward_adjustm_cpe, ussgl488200_upward_adjustm_cpe, ussgl490100_delivered_orde_cpe, ussgl490100_delivered_orde_fyb, ussgl490200_delivered_orde_cpe, ussgl490800_authority_outl_cpe, ussgl490800_authority_outl_fyb, ussgl493100_delivered_orde_cpe, ussgl497100_downward_adjus_cpe, ussgl497200_downward_adjus_cpe, ussgl498100_upward_adjustm_cpe, ussgl498200_upward_adjustm_cpe, tas, account_num, general_ledger_post_date, display_tas, disaster_emergency_fund_code, program_activity_reporting_key, prior_year_adjustment, ussgl480110_rein_undel_ord_cpe, ussgl490110_rein_deliv_ord_cpe, ussgl480210_rein_undel_obs_cpe, ussgl497210_down_adj_refun_cpe) FROM stdin;
\.


--
-- Data for Name: published_award_financial_legacy_procurementance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.published_award_financial_legacy_procurementance (created_at, updated_at, published_award_financial_legacy_procurementance_id, afa_generated_unique, submission_id, job_id, row_number, action_date, action_type, action_type_description, legacy_procurementance_type, legacy_procurementance_type_desc, award_description, awardee_or_recipient_legal, awardee_or_recipient_duns, awarding_agency_code, awarding_agency_name, awarding_office_code, awarding_office_name, awarding_sub_tier_agency_c, awarding_sub_tier_agency_n, award_modification_amendme, business_funds_indicator, business_funds_ind_desc, business_types, business_types_desc, legacy_procurementance_listing_number, legacy_procurementance_listing_title, correction_delete_indicatr, correction_delete_ind_desc, face_value_loan_guarantee, fain, federal_action_obligation, fiscal_year_and_quarter_co, funding_agency_code, funding_agency_name, funding_office_name, funding_office_code, funding_sub_tier_agency_co, funding_sub_tier_agency_na, legal_entity_address_line1, legal_entity_address_line2, legal_entity_address_line3, legal_entity_city_code, legal_entity_city_name, legal_entity_congressional, legal_entity_country_code, legal_entity_county_code, legal_entity_county_name, legal_entity_foreign_city, legal_entity_foreign_posta, legal_entity_foreign_provi, legal_entity_state_code, legal_entity_state_name, legal_entity_zip5, legal_entity_zip_last4, non_federal_funding_amount, original_loan_subsidy_cost, period_of_performance_curr, period_of_performance_star, place_of_performance_city, place_of_performance_code, place_of_performance_congr, place_of_perform_country_c, place_of_perform_county_na, place_of_performance_forei, place_of_perform_state_nam, place_of_performance_zip4a, record_type, record_type_description, sai_number, total_funding_amount, ultimate_parent_legal_enti, ultimate_parent_duns, uri, place_of_perform_county_co, place_of_perform_country_n, legal_entity_country_name, unique_award_key, place_of_performance_scope, awardee_or_recipient_uei, funding_opportunity_goals, funding_opportunity_number, indirect_federal_sharing, ultimate_parent_uei) FROM stdin;
\.


--
-- Data for Name: published_award_procurement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.published_award_procurement (created_at, updated_at, published_award_procurement_id, detached_award_proc_unique, submission_id, job_id, row_number, piid, awarding_sub_tier_agency_c, awarding_sub_tier_agency_n, awarding_agency_code, awarding_agency_name, parent_award_id, award_modification_amendme, type_of_contract_pricing, type_of_contract_pric_desc, contract_award_type, contract_award_type_desc, naics, naics_description, awardee_or_recipient_uniqu, ultimate_parent_legal_enti, ultimate_parent_unique_ide, award_description, place_of_performance_zip4a, place_of_performance_city, place_of_performance_congr, awardee_or_recipient_legal, legal_entity_city_name, legal_entity_state_code, legal_entity_state_descrip, legal_entity_zip4, legal_entity_congressional, legal_entity_address_line1, legal_entity_address_line2, legal_entity_address_line3, legal_entity_country_code, legal_entity_country_name, period_of_performance_star, period_of_performance_curr, period_of_perf_potential_e, ordering_period_end_date, action_date, action_type, action_type_description, federal_action_obligation, current_total_value_award, potential_total_value_awar, funding_sub_tier_agency_co, funding_sub_tier_agency_na, funding_office_code, funding_office_name, awarding_office_code, awarding_office_name, referenced_idv_agency_iden, funding_agency_code, funding_agency_name, place_of_performance_locat, place_of_performance_state, place_of_perform_country_c, idv_type, idv_type_description, entity_doing_business_as_n, entity_phone_number, entity_fax_number, multiple_or_single_award_i, multiple_or_single_aw_desc, referenced_mult_or_single, referenced_mult_or_si_desc, type_of_idc, type_of_idc_description, a_76_fair_act_action, a_76_fair_act_action_desc, dod_claimant_program_code, dod_claimant_prog_cod_desc, clinger_cohen_act_planning, clinger_cohen_act_pla_desc, commercial_item_acquisitio, commercial_item_acqui_desc, commercial_item_test_progr, commercial_item_test_desc, consolidated_contract, consolidated_contract_desc, contingency_humanitarian_o, contingency_humanitar_desc, contract_bundling, contract_bundling_descrip, contract_financing, contract_financing_descrip, contracting_officers_deter, contracting_officers_desc, cost_accounting_standards, cost_accounting_stand_desc, cost_or_pricing_data, cost_or_pricing_data_desc, country_of_product_or_serv, country_of_product_or_desc, construction_wage_rate_req, construction_wage_rat_desc, evaluated_preference, evaluated_preference_desc, extent_competed, extent_compete_description, contract_opp_notice, contract_opp_notice_desc, foreign_funding, foreign_funding_desc, government_furnished_prope, government_furnished_desc, information_technology_com, information_technolog_desc, interagency_contracting_au, interagency_contract_desc, local_area_set_aside, local_area_set_aside_desc, major_program, purchase_card_as_payment_m, purchase_card_as_paym_desc, multi_year_contract, multi_year_contract_desc, national_interest_action, national_interest_desc, number_of_actions, number_of_offers_received, other_statutory_authority, performance_based_service, performance_based_se_desc, place_of_manufacture, place_of_manufacture_desc, price_evaluation_adjustmen, product_or_service_code, product_or_service_co_desc, program_acronym, other_than_full_and_open_c, other_than_full_and_o_desc, recovered_materials_sustai, recovered_materials_s_desc, research, research_description, sea_transportation, sea_transportation_desc, labor_standards, labor_standards_descrip, solicitation_identifier, solicitation_date, solicitation_procedures, solicitation_procedur_desc, fair_opportunity_limited_s, fair_opportunity_limi_desc, subcontracting_plan, subcontracting_plan_desc, program_system_or_equipmen, program_system_or_equ_desc, type_set_aside, type_set_aside_description, epa_designated_product, epa_designated_produc_desc, materials_supplies_article, materials_supplies_descrip, transaction_number, sam_exception, sam_exception_description, referenced_idv_modificatio, undefinitized_action, undefinitized_action_desc, domestic_or_foreign_entity, domestic_or_foreign_e_desc, referenced_idv_type, referenced_idv_type_desc, referenced_idv_agency_name, award_or_idv_flag, place_of_perform_country_n, place_of_perform_state_nam, place_of_perform_county_na, base_exercised_options_val, base_and_all_options_value, cage_code, inherently_government_func, inherently_government_desc, organizational_type, number_of_employees, annual_revenue, total_obligated_amount, last_modified, unique_award_key, additional_reporting, awardee_or_recipient_uei, ultimate_parent_uei, small_business_competitive, city_local_government, county_local_government, inter_municipal_local_gove, local_government_owned, municipality_local_governm, school_district_local_gove, township_local_government, us_state_government, us_federal_government, federal_agency, federally_funded_research, us_tribal_government, foreign_government, community_developed_corpor, labor_surplus_area_firm, corporate_entity_not_tax_e, corporate_entity_tax_exemp, partnership_or_limited_lia, sole_proprietorship, small_agricultural_coopera, international_organization, us_government_entity, emerging_small_business, c8a_program_participant, sba_certified_8_a_joint_ve, dot_certified_disadvantage, self_certified_small_disad, historically_underutilized, small_disadvantaged_busine, the_ability_one_program, historically_black_college, c1862_land_grant_college, c1890_land_grant_college, c1994_land_grant_college, minority_institution, private_university_or_coll, school_of_forestry, state_controlled_instituti, tribal_college, veterinary_college, educational_institution, alaskan_native_servicing_i, community_development_corp, native_hawaiian_servicing, domestic_shelter, manufacturer_of_goods, hospital_flag, veterinary_hospital, hispanic_servicing_institu, foundation, woman_owned_business, minority_owned_business, women_owned_small_business, economically_disadvantaged, joint_venture_women_owned, joint_venture_economically, veteran_owned_business, service_disabled_veteran_o, contracts, grants, receives_contracts_and_gra, airport_authority, council_of_governments, housing_authorities_public, interstate_entity, planning_commission, port_authority, transit_authority, subchapter_s_corporation, limited_liability_corporat, foreign_owned_and_located, american_indian_owned_busi, alaskan_native_owned_corpo, indian_tribe_federally_rec, native_hawaiian_owned_busi, tribally_owned_business, asian_pacific_american_own, black_american_owned_busin, hispanic_american_owned_bu, native_american_owned_busi, subcontinent_asian_asian_i, other_minority_owned_busin, for_profit_organization, nonprofit_organization, other_not_for_profit_organ, us_local_government) FROM stdin;
\.


--
-- Data for Name: published_comment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.published_comment (created_at, updated_at, published_comment_id, submission_id, file_type_id, comment) FROM stdin;
\.


--
-- Data for Name: published_error_metadata; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.published_error_metadata (created_at, updated_at, published_error_metadata_id, job_id, filename, field_name, error_type_id, occurrences, first_row, rule_failed, file_type_id, target_file_type_id, original_rule_label, severity_id) FROM stdin;
\.


--
-- Data for Name: published_fabs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.published_fabs (created_at, updated_at, published_fabs_id, action_date, action_type, legacy_procurementance_type, award_description, awardee_or_recipient_legal, awardee_or_recipient_uniqu, awarding_agency_code, awarding_office_code, awarding_sub_tier_agency_c, award_modification_amendme, business_funds_indicator, business_types, legacy_procurementance_listing_number, correction_delete_indicatr, face_value_loan_guarantee, fain, federal_action_obligation, fiscal_year_and_quarter_co, funding_agency_code, funding_office_code, funding_sub_tier_agency_co, legal_entity_address_line1, legal_entity_address_line2, legal_entity_address_line3, legal_entity_country_code, legal_entity_foreign_city, legal_entity_foreign_posta, legal_entity_foreign_provi, legal_entity_zip5, legal_entity_zip_last4, non_federal_funding_amount, original_loan_subsidy_cost, period_of_performance_curr, period_of_performance_star, place_of_performance_code, place_of_performance_congr, place_of_perform_country_c, place_of_performance_forei, place_of_performance_zip4a, record_type, sai_number, uri, total_funding_amount, legal_entity_congressional, legacy_procurementance_listing_title, awarding_agency_name, awarding_sub_tier_agency_n, funding_agency_name, funding_sub_tier_agency_na, is_historical, place_of_perform_county_na, place_of_perform_state_nam, place_of_performance_city, legal_entity_city_name, legal_entity_county_code, legal_entity_county_name, legal_entity_state_code, legal_entity_state_name, modified_at, afa_generated_unique, is_active, awarding_office_name, funding_office_name, legal_entity_city_code, legal_entity_foreign_descr, legal_entity_country_name, place_of_perform_country_n, place_of_perform_county_co, submission_id, place_of_perfor_state_code, place_of_performance_zip5, place_of_perform_zip_last4, business_categories, action_type_description, legacy_procurementance_type_desc, business_funds_ind_desc, business_types_desc, correction_delete_ind_desc, record_type_description, ultimate_parent_legal_enti, ultimate_parent_unique_ide, unique_award_key, high_comp_officer1_amount, high_comp_officer1_full_na, high_comp_officer2_amount, high_comp_officer2_full_na, high_comp_officer3_amount, high_comp_officer3_full_na, high_comp_officer4_amount, high_comp_officer4_full_na, high_comp_officer5_amount, high_comp_officer5_full_na, place_of_performance_scope, uei, ultimate_parent_uei, funding_opportunity_goals, funding_opportunity_number, indirect_federal_sharing) FROM stdin;
\.


--
-- Data for Name: published_files_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.published_files_history (created_at, updated_at, published_files_history_id, publish_history_id, certify_history_id, submission_id, filename, file_type_id, warning_filename, comment) FROM stdin;
\.


--
-- Data for Name: published_flex_field; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.published_flex_field (created_at, updated_at, published_flex_field_id, submission_id, job_id, row_number, header, cell, file_type_id) FROM stdin;
\.


--
-- Data for Name: published_object_class_program_activity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.published_object_class_program_activity (created_at, updated_at, published_object_class_program_activity_id, submission_id, job_id, row_number, agency_identifier, allocation_transfer_agency, availability_type_code, beginning_period_of_availa, by_direct_reimbursable_fun, deobligations_recov_by_pro_cpe, ending_period_of_availabil, gross_outlay_amount_by_pro_cpe, gross_outlay_amount_by_pro_fyb, gross_outlays_delivered_or_cpe, gross_outlays_delivered_or_fyb, gross_outlays_undelivered_cpe, gross_outlays_undelivered_fyb, main_account_code, object_class, obligations_delivered_orde_cpe, obligations_delivered_orde_fyb, obligations_incurred_by_pr_cpe, obligations_undelivered_or_cpe, obligations_undelivered_or_fyb, program_activity_code, program_activity_name, sub_account_code, ussgl480100_undelivered_or_cpe, ussgl480100_undelivered_or_fyb, ussgl480200_undelivered_or_cpe, ussgl480200_undelivered_or_fyb, ussgl483100_undelivered_or_cpe, ussgl483200_undelivered_or_cpe, ussgl487100_downward_adjus_cpe, ussgl487200_downward_adjus_cpe, ussgl488100_upward_adjustm_cpe, ussgl488200_upward_adjustm_cpe, ussgl490100_delivered_orde_cpe, ussgl490100_delivered_orde_fyb, ussgl490200_delivered_orde_cpe, ussgl490800_authority_outl_cpe, ussgl490800_authority_outl_fyb, ussgl493100_delivered_orde_cpe, ussgl497100_downward_adjus_cpe, ussgl497200_downward_adjus_cpe, ussgl498100_upward_adjustm_cpe, ussgl498200_upward_adjustm_cpe, tas, account_num, display_tas, disaster_emergency_fund_code, program_activity_reporting_key, prior_year_adjustment, ussgl480110_rein_undel_ord_cpe, ussgl490110_rein_deliv_ord_cpe, ussgl480210_rein_undel_obs_cpe, ussgl497210_down_adj_refun_cpe) FROM stdin;
\.


--
-- Data for Name: published_total_obligations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.published_total_obligations (created_at, updated_at, published_total_obligations_id, submission_id, total_obligations, total_proc_obligations, total_asst_obligations) FROM stdin;
\.


--
-- Data for Name: revalidation_threshold; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.revalidation_threshold (created_at, updated_at, revalidation_date) FROM stdin;
\N	\N	2017-02-22 00:00:00
\.


--
-- Data for Name: rule_impact; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rule_impact (created_at, updated_at, rule_impact_id, name, description) FROM stdin;
\.


--
-- Data for Name: rule_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rule_settings (created_at, updated_at, rule_settings_id, agency_code, priority, impact_id, file_id, rule_label, target_file_id) FROM stdin;
\.


--
-- Data for Name: rule_severity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rule_severity (created_at, updated_at, rule_severity_id, name, description) FROM stdin;
\.


--
-- Data for Name: rule_sql; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rule_sql (created_at, updated_at, rule_sql_id, rule_sql, rule_label, rule_error_message, rule_cross_file_flag, file_id, rule_severity_id, target_file_id, query_name, expected_value, category, sensitive) FROM stdin;
\.


--
-- Data for Name: sam_recipient; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sam_recipient (created_at, updated_at, sam_recipient_id, awardee_or_recipient_uniqu, legal_business_name, activation_date, deactivation_date, expiration_date, last_sam_mod_date, registration_date, ultimate_parent_legal_enti, ultimate_parent_unique_ide, address_line_1, address_line_2, business_types_codes, city, congressional_district, country_code, state, zip, zip4, dba_name, entity_structure, high_comp_officer1_amount, high_comp_officer1_full_na, high_comp_officer2_amount, high_comp_officer2_full_na, high_comp_officer3_amount, high_comp_officer3_full_na, high_comp_officer4_amount, high_comp_officer4_full_na, high_comp_officer5_amount, high_comp_officer5_full_na, last_exec_comp_mod_date, historic, business_types, uei, ultimate_parent_uei) FROM stdin;
\.


--
-- Data for Name: sam_recipient_unregistered; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sam_recipient_unregistered (created_at, updated_at, sam_recipient_unreg_id, uei, legal_business_name, address_line_1, address_line_2, city, state, zip, zip4, country_code, congressional_district) FROM stdin;
\.


--
-- Data for Name: sam_subcontract; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sam_subcontract (created_at, updated_at, sam_subcontract_id, subaward_report_id, subaward_report_number, unique_award_key, date_submitted, contract_agency_code, contract_idv_agency_code, award_number, award_amount, action_date, uei, legal_business_name, parent_uei, parent_legal_business_name, dba_name, legal_entity_country_code, legal_entity_country_name, legal_entity_state_code, legal_entity_state_name, legal_entity_address_line1, legal_entity_address_line2, legal_entity_city_name, legal_entity_zip_code, legal_entity_congressional, ppop_country_code, ppop_country_name, ppop_state_code, ppop_state_name, ppop_address_line1, ppop_city_name, ppop_zip_code, ppop_congressional_district, business_types_codes, business_types_names, description, high_comp_officer1_full_na, high_comp_officer1_amount, high_comp_officer2_full_na, high_comp_officer2_amount, high_comp_officer3_full_na, high_comp_officer3_amount, high_comp_officer4_full_na, high_comp_officer4_amount, high_comp_officer5_full_na, high_comp_officer5_amount) FROM stdin;
\.


--
-- Data for Name: sam_subgrant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sam_subgrant (created_at, updated_at, sam_subgrant_id, subaward_report_id, subaward_report_number, unique_award_key, date_submitted, award_number, award_amount, action_date, uei, legal_business_name, parent_uei, parent_legal_business_name, dba_name, legal_entity_country_code, legal_entity_country_name, legal_entity_state_code, legal_entity_state_name, legal_entity_address_line1, legal_entity_address_line2, legal_entity_city_name, legal_entity_zip_code, legal_entity_congressional, ppop_country_code, ppop_country_name, ppop_state_code, ppop_state_name, ppop_address_line1, ppop_city_name, ppop_zip_code, ppop_congressional_district, business_types_codes, business_types_names, description, high_comp_officer1_full_na, high_comp_officer1_amount, high_comp_officer2_full_na, high_comp_officer2_amount, high_comp_officer3_full_na, high_comp_officer3_amount, high_comp_officer4_full_na, high_comp_officer4_amount, high_comp_officer5_full_na, high_comp_officer5_amount) FROM stdin;
\.


--
-- Data for Name: session_map; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.session_map (created_at, updated_at, session_id, uid, data, expiration) FROM stdin;
\.


--
-- Data for Name: sf_133; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sf_133 (created_at, updated_at, sf133_id, agency_identifier, allocation_transfer_agency, availability_type_code, beginning_period_of_availa, ending_period_of_availabil, main_account_code, sub_account_code, tas, fiscal_year, period, line, amount, account_num, display_tas, disaster_emergency_fund_code) FROM stdin;
\.


--
-- Data for Name: sqs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sqs (created_at, updated_at, sqs_id, message, attributes) FROM stdin;
\.


--
-- Data for Name: state_congressional; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.state_congressional (created_at, updated_at, state_congressional_id, state_code, congressional_district_no, census_year) FROM stdin;
\.


--
-- Data for Name: states; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.states (created_at, updated_at, states_id, state_code, state_name, fips_code) FROM stdin;
\.


--
-- Data for Name: sub_tier_agency; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sub_tier_agency (created_at, updated_at, sub_tier_agency_id, sub_tier_agency_code, sub_tier_agency_name, cgac_id, priority, frec_id, is_frec) FROM stdin;
\.


--
-- Data for Name: subaward; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subaward (created_at, updated_at, id, unique_award_key, award_id, parent_award_id, award_amount, action_date, fy, awarding_agency_code, awarding_agency_name, awarding_sub_tier_agency_c, awarding_sub_tier_agency_n, awarding_office_code, awarding_office_name, funding_agency_code, funding_agency_name, funding_sub_tier_agency_co, funding_sub_tier_agency_na, funding_office_code, funding_office_name, awardee_or_recipient_uniqu, awardee_or_recipient_legal, dba_name, ultimate_parent_unique_ide, ultimate_parent_legal_enti, legal_entity_country_code, legal_entity_country_name, legal_entity_address_line1, legal_entity_city_name, legal_entity_state_code, legal_entity_state_name, legal_entity_zip, legal_entity_congressional, legal_entity_foreign_posta, business_types, place_of_perform_city_name, place_of_perform_state_code, place_of_perform_state_name, place_of_performance_zip, place_of_perform_congressio, place_of_perform_country_co, place_of_perform_country_na, award_description, naics, naics_description, legacy_procurementance_listing_numbers, legacy_procurementance_listing_titles, subaward_type, subaward_report_year, subaward_report_month, subaward_number, subaward_amount, sub_action_date, sub_awardee_or_recipient_uniqu, sub_awardee_or_recipient_legal, sub_dba_name, sub_ultimate_parent_unique_ide, sub_ultimate_parent_legal_enti, sub_legal_entity_country_code, sub_legal_entity_country_name, sub_legal_entity_address_line1, sub_legal_entity_city_name, sub_legal_entity_state_code, sub_legal_entity_state_name, sub_legal_entity_zip, sub_legal_entity_congressional, sub_legal_entity_foreign_posta, sub_business_types, sub_place_of_perform_city_name, sub_place_of_perform_state_code, sub_place_of_perform_state_name, sub_place_of_performance_zip, sub_place_of_perform_congressio, sub_place_of_perform_country_co, sub_place_of_perform_country_na, subaward_description, sub_high_comp_officer1_full_na, sub_high_comp_officer1_amount, sub_high_comp_officer2_full_na, sub_high_comp_officer2_amount, sub_high_comp_officer3_full_na, sub_high_comp_officer3_amount, sub_high_comp_officer4_full_na, sub_high_comp_officer4_amount, sub_high_comp_officer5_full_na, sub_high_comp_officer5_amount, prime_id, internal_id, date_submitted, report_type, transaction_type, program_title, contract_agency_code, contract_idv_agency_code, grant_funding_agency_id, grant_funding_agency_name, federal_agency_name, treasury_symbol, dunsplus4, recovery_model_q1, recovery_model_q2, compensation_q1, compensation_q2, high_comp_officer1_full_na, high_comp_officer1_amount, high_comp_officer2_full_na, high_comp_officer2_amount, high_comp_officer3_full_na, high_comp_officer3_amount, high_comp_officer4_full_na, high_comp_officer4_amount, high_comp_officer5_full_na, high_comp_officer5_amount, sub_id, sub_parent_id, sub_federal_agency_id, sub_federal_agency_name, sub_funding_agency_id, sub_funding_agency_name, sub_funding_office_id, sub_funding_office_name, sub_naics, sub_legacy_procurementance_listing_numbers, sub_dunsplus4, sub_recovery_subcontract_amt, sub_recovery_model_q1, sub_recovery_model_q2, sub_compensation_q1, sub_compensation_q2, place_of_perform_street, sub_place_of_perform_street, awardee_or_recipient_uei, sub_awardee_or_recipient_uei, sub_ultimate_parent_uei, ultimate_parent_uei, legal_entity_county_code, legal_entity_county_name, place_of_performance_county_code, place_of_performance_county_name, sub_legal_entity_county_code, sub_legal_entity_county_name, sub_place_of_performance_county_code, sub_place_of_performance_county_name) FROM stdin;
\.


--
-- Data for Name: submission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.submission (created_at, updated_at, submission_id, user_id, cgac_code, reporting_start_date, reporting_end_date, is_quarter_format, number_of_errors, number_of_warnings, publish_status_id, publishable, reporting_fiscal_period, reporting_fiscal_year, is_fabs, publishing_user_id, frec_code, test_submission, published_submission_ids, certified) FROM stdin;
\.


--
-- Data for Name: submission_sub_tier_affiliation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.submission_sub_tier_affiliation (created_at, updated_at, submission_sub_tier_affiliation_id, submission_id, sub_tier_agency_id) FROM stdin;
\.


--
-- Data for Name: submission_window_schedule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.submission_window_schedule (created_at, updated_at, submission_window_schedule_id, year, period, period_start, publish_deadline, certification_deadline) FROM stdin;
\.


--
-- Data for Name: tas_failed_edits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tas_failed_edits (created_at, updated_at, tas_failed_edits_id, agency_identifier, allocation_transfer_agency, availability_type_code, beginning_period_of_availa, ending_period_of_availabil, main_account_code, sub_account_code, tas, display_tas, fiscal_year, period, fr_entity_type, fr_entity_description, edit_number, edit_id, severity, atb_submission_status, approved_override_exists) FROM stdin;
\.


--
-- Data for Name: tas_lookup; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tas_lookup (created_at, updated_at, tas_id, allocation_transfer_agency, agency_identifier, beginning_period_of_availa, ending_period_of_availabil, availability_type_code, main_account_code, sub_account_code, account_num, internal_end_date, internal_start_date, financial_indicator2, fr_entity_description, fr_entity_type, account_title, budget_bureau_code, budget_bureau_name, budget_function_code, budget_function_title, budget_subfunction_code, budget_subfunction_title, reporting_agency_aid, reporting_agency_name, display_tas, tas) FROM stdin;
\.


--
-- Data for Name: total_obligations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.total_obligations (created_at, updated_at, total_obligations_id, submission_id, total_obligations, total_proc_obligations, total_asst_obligations) FROM stdin;
\.


--
-- Data for Name: user_affiliation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_affiliation (created_at, updated_at, user_id, cgac_id, permission_type_id, frec_id, user_affiliation_id) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (created_at, updated_at, user_id, username, email, name, title, password_hash, salt, skip_guide, website_admin) FROM stdin;
\.


--
-- Data for Name: validation_label; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.validation_label (created_at, updated_at, validation_label_id, label, error_message, file_id, column_name, label_type) FROM stdin;
\.


--
-- Data for Name: zip_city; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zip_city (created_at, updated_at, zip_city_id, zip_code, city_name, state_code, preferred_city_name) FROM stdin;
\.


--
-- Data for Name: zips; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zips (created_at, updated_at, zips_id, zip5, zip_last4, state_abbreviation, county_number, congressional_district_no) FROM stdin;
\.


--
-- Data for Name: zips_grouped; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zips_grouped (created_at, updated_at, zips_grouped_id, zip5, state_abbreviation, county_number, congressional_district_no) FROM stdin;
\.


--
-- Data for Name: zips_grouped_historical; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zips_grouped_historical (created_at, updated_at, zips_grouped_historical_id, zip5, state_abbreviation, county_number, congressional_district_no) FROM stdin;
\.


--
-- Data for Name: zips_historical; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zips_historical (created_at, updated_at, zips_historical_id, zip5, zip_last4, state_abbreviation, county_number, congressional_district_no) FROM stdin;
\.


--
-- Name: application_type_application_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.application_type_application_type_id_seq', 1, false);


--
-- Name: appropriation_appropriation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appropriation_appropriation_id_seq', 1, false);


--
-- Name: legacy_procurementance_listing_legacy_procurementance_listing_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.legacy_procurementance_listing_legacy_procurementance_listing_id_seq', 1, false);


--
-- Name: award_financial_legacy_procurementance_award_financial_legacy_procurementance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.award_financial_legacy_procurementance_award_financial_legacy_procurementance_id_seq', 1, false);


--
-- Name: award_financial_award_financial_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.award_financial_award_financial_id_seq', 1, false);


--
-- Name: award_procurement_award_procurement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.award_procurement_award_procurement_id_seq', 1, false);


--
-- Name: cd_city_grouped_cd_city_grouped_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cd_city_grouped_cd_city_grouped_id_seq', 1, false);


--
-- Name: cd_county_grouped_cd_county_grouped_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cd_county_grouped_cd_county_grouped_id_seq', 1, false);


--
-- Name: cd_state_grouped_cd_state_grouped_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cd_state_grouped_cd_state_grouped_id_seq', 1, false);


--
-- Name: cd_zips_grouped_cd_zips_grouped_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cd_zips_grouped_cd_zips_grouped_id_seq', 1, false);


--
-- Name: cd_zips_grouped_historical_cd_zips_grouped_historical_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cd_zips_grouped_historical_cd_zips_grouped_historical_id_seq', 1, false);


--
-- Name: certify_history_certify_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.certify_history_certify_history_id_seq', 1, false);


--
-- Name: cgac_cgac_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cgac_cgac_id_seq', 1, false);


--
-- Name: city_code_city_code_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.city_code_city_code_id_seq', 1, false);


--
-- Name: comment_comment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comment_comment_id_seq', 1, false);


--
-- Name: country_code_country_code_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.country_code_country_code_id_seq', 1, false);


--
-- Name: county_code_county_code_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.county_code_county_code_id_seq', 1, false);


--
-- Name: defc_defc_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.defc_defc_id_seq', 1, false);


--
-- Name: detached_award_procurement_detached_award_procurement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.detached_award_procurement_detached_award_procurement_id_seq', 1, false);


--
-- Name: email_template_email_template_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_template_email_template_id_seq', 1, false);


--
-- Name: email_template_type_email_template_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_template_type_email_template_type_id_seq', 1, false);


--
-- Name: email_token_email_token_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_token_email_token_id_seq', 1, false);


--
-- Name: error_metadata_error_metadata_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.error_metadata_error_metadata_id_seq', 1, false);


--
-- Name: error_type_error_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.error_type_error_type_id_seq', 1, false);


--
-- Name: external_data_load_date_external_data_load_date_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.external_data_load_date_external_data_load_date_id_seq', 1, true);


--
-- Name: external_data_type_external_data_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.external_data_type_external_data_type_id_seq', 1, false);


--
-- Name: fabs_fabs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fabs_fabs_id_seq', 1, false);


--
-- Name: field_type_field_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.field_type_field_type_id_seq', 1, false);


--
-- Name: file_columns_file_column_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.file_columns_file_column_id_seq', 1, false);


--
-- Name: file_file_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.file_file_id_seq', 1, false);


--
-- Name: file_generation_file_generation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.file_generation_file_generation_id_seq', 1, false);


--
-- Name: file_generation_task_file_generation_task_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.file_generation_task_file_generation_task_id_seq', 1, false);


--
-- Name: file_status_file_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.file_status_file_status_id_seq', 1, false);


--
-- Name: file_type_file_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.file_type_file_type_id_seq', 1, false);


--
-- Name: flex_field_flex_field_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.flex_field_flex_field_id_seq', 1, false);


--
-- Name: format_change_date_format_change_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.format_change_date_format_change_id_seq', 1, false);


--
-- Name: frec_frec_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.frec_frec_id_seq', 1, false);


--
-- Name: funding_opportunity_funding_opportunity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.funding_opportunity_funding_opportunity_id_seq', 1, false);


--
-- Name: gtas_boc_gtas_boc_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.gtas_boc_gtas_boc_id_seq', 1, false);


--
-- Name: historic_duns_duns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.historic_duns_duns_id_seq', 1, false);


--
-- Name: job_dependency_dependency_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.job_dependency_dependency_id_seq', 1, false);


--
-- Name: job_job_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.job_job_id_seq', 1, false);


--
-- Name: job_status_job_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.job_status_job_status_id_seq', 1, false);


--
-- Name: job_type_job_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.job_type_job_type_id_seq', 1, false);


--
-- Name: object_class_object_class_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.object_class_object_class_id_seq', 1, false);


--
-- Name: object_class_program_activity_object_class_program_activity_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.object_class_program_activity_object_class_program_activity_seq', 1, false);


--
-- Name: office_office_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.office_office_id_seq', 1, false);


--
-- Name: permission_type_permission_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.permission_type_permission_type_id_seq', 1, false);


--
-- Name: program_activity_park_program_activity_park_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.program_activity_park_program_activity_park_id_seq', 1, false);


--
-- Name: program_activity_program_activity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.program_activity_program_activity_id_seq', 1, false);


--
-- Name: publish_history_publish_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.publish_history_publish_history_id_seq', 1, false);


--
-- Name: publish_status_publish_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.publish_status_publish_status_id_seq', 1, false);


--
-- Name: published_appropriation_published_appropriation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.published_appropriation_published_appropriation_id_seq', 1, false);


--
-- Name: published_award_financial_ass_published_award_financial_ass_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.published_award_financial_ass_published_award_financial_ass_seq', 1, false);


--
-- Name: published_award_financial_published_award_financial_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.published_award_financial_published_award_financial_id_seq', 1, false);


--
-- Name: published_award_procurement_published_award_procurement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.published_award_procurement_published_award_procurement_id_seq', 1, false);


--
-- Name: published_comment_published_comment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.published_comment_published_comment_id_seq', 1, false);


--
-- Name: published_error_metadata_published_error_metadata_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.published_error_metadata_published_error_metadata_id_seq', 1, false);


--
-- Name: published_fabs_published_fabs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.published_fabs_published_fabs_id_seq', 1, false);


--
-- Name: published_files_history_published_files_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.published_files_history_published_files_history_id_seq', 1, false);


--
-- Name: published_flex_field_published_flex_field_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.published_flex_field_published_flex_field_id_seq', 1, false);


--
-- Name: published_object_class_progra_published_object_class_progra_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.published_object_class_progra_published_object_class_progra_seq', 1, false);


--
-- Name: published_total_obligations_published_total_obligations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.published_total_obligations_published_total_obligations_id_seq', 1, false);


--
-- Name: rule_impact_rule_impact_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rule_impact_rule_impact_id_seq', 1, false);


--
-- Name: rule_settings_rule_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rule_settings_rule_settings_id_seq', 1, false);


--
-- Name: rule_severity_rule_severity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rule_severity_rule_severity_id_seq', 1, false);


--
-- Name: rule_sql_rule_sql_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rule_sql_rule_sql_id_seq', 1, false);


--
-- Name: sam_recipient_sam_recipient_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sam_recipient_sam_recipient_id_seq', 1, false);


--
-- Name: sam_recipient_unregistered_sam_recipient_unreg_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sam_recipient_unregistered_sam_recipient_unreg_id_seq', 1, false);


--
-- Name: sam_subcontract_sam_subcontract_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sam_subcontract_sam_subcontract_id_seq', 1, false);


--
-- Name: sam_subgrant_sam_subgrant_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sam_subgrant_sam_subgrant_id_seq', 1, false);


--
-- Name: session_map_session_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.session_map_session_id_seq', 1, false);


--
-- Name: sf_133_sf133_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sf_133_sf133_id_seq', 1, false);


--
-- Name: sqs_sqs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sqs_sqs_id_seq', 1, false);


--
-- Name: state_congressional_state_congressional_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.state_congressional_state_congressional_id_seq', 1, false);


--
-- Name: states_states_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.states_states_id_seq', 1, false);


--
-- Name: sub_tier_agency_sub_tier_agency_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sub_tier_agency_sub_tier_agency_id_seq', 1, false);


--
-- Name: subaward_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subaward_id_seq', 1, false);


--
-- Name: submission_sub_tier_affiliati_submission_sub_tier_affiliati_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.submission_sub_tier_affiliati_submission_sub_tier_affiliati_seq', 1, false);


--
-- Name: submission_submission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.submission_submission_id_seq', 1, false);


--
-- Name: submission_window_schedule_submission_window_schedule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.submission_window_schedule_submission_window_schedule_id_seq', 1, false);


--
-- Name: submission_window_window_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.submission_window_window_id_seq', 1, false);


--
-- Name: tas_failed_edits_tas_failed_edits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tas_failed_edits_tas_failed_edits_id_seq', 1, false);


--
-- Name: tas_lookup_tas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tas_lookup_tas_id_seq', 1, false);


--
-- Name: total_obligations_total_obligations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.total_obligations_total_obligations_id_seq', 1, false);


--
-- Name: user_affiliation_user_affiliation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_affiliation_user_affiliation_id_seq', 1, false);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_user_id_seq', 1, false);


--
-- Name: validation_label_validation_label_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.validation_label_validation_label_id_seq', 1, false);


--
-- Name: zip_city_zip_city_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zip_city_zip_city_id_seq', 1, false);


--
-- Name: zips_grouped_historical_zips_grouped_historical_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zips_grouped_historical_zips_grouped_historical_id_seq', 1, false);


--
-- Name: zips_grouped_zips_grouped_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zips_grouped_zips_grouped_id_seq', 1, false);


--
-- Name: zips_historical_zips_historical_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zips_historical_zips_historical_id_seq', 1, false);


--
-- Name: zips_zips_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zips_zips_id_seq', 1, false);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: application_type application_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_type
    ADD CONSTRAINT application_type_pkey PRIMARY KEY (application_type_id);


--
-- Name: appropriation appropriation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appropriation
    ADD CONSTRAINT appropriation_pkey PRIMARY KEY (appropriation_id);


--
-- Name: legacy_procurementance_listing legacy_procurementance_listing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legacy_procurementance_listing
    ADD CONSTRAINT legacy_procurementance_listing_pkey PRIMARY KEY (legacy_procurementance_listing_id);


--
-- Name: award_financial_legacy_procurementance award_financial_legacy_procurementance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_financial_legacy_procurementance
    ADD CONSTRAINT award_financial_legacy_procurementance_pkey PRIMARY KEY (award_financial_legacy_procurementance_id);


--
-- Name: award_financial award_financial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_financial
    ADD CONSTRAINT award_financial_pkey PRIMARY KEY (award_financial_id);


--
-- Name: award_procurement award_procurement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_procurement
    ADD CONSTRAINT award_procurement_pkey PRIMARY KEY (award_procurement_id);


--
-- Name: cd_city_grouped cd_city_grouped_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cd_city_grouped
    ADD CONSTRAINT cd_city_grouped_pkey PRIMARY KEY (cd_city_grouped_id);


--
-- Name: cd_county_grouped cd_county_grouped_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cd_county_grouped
    ADD CONSTRAINT cd_county_grouped_pkey PRIMARY KEY (cd_county_grouped_id);


--
-- Name: cd_state_grouped cd_state_grouped_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cd_state_grouped
    ADD CONSTRAINT cd_state_grouped_pkey PRIMARY KEY (cd_state_grouped_id);


--
-- Name: cd_zips_grouped_historical cd_zips_grouped_historical_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cd_zips_grouped_historical
    ADD CONSTRAINT cd_zips_grouped_historical_pkey PRIMARY KEY (cd_zips_grouped_historical_id);


--
-- Name: cd_zips_grouped cd_zips_grouped_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cd_zips_grouped
    ADD CONSTRAINT cd_zips_grouped_pkey PRIMARY KEY (cd_zips_grouped_id);


--
-- Name: certify_history certify_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certify_history
    ADD CONSTRAINT certify_history_pkey PRIMARY KEY (certify_history_id);


--
-- Name: cgac cgac_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cgac
    ADD CONSTRAINT cgac_pkey PRIMARY KEY (cgac_id);


--
-- Name: city_code city_code_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.city_code
    ADD CONSTRAINT city_code_pkey PRIMARY KEY (city_code_id);


--
-- Name: comment comment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT comment_pkey PRIMARY KEY (comment_id);


--
-- Name: country_code country_code_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.country_code
    ADD CONSTRAINT country_code_pkey PRIMARY KEY (country_code_id);


--
-- Name: county_code county_code_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.county_code
    ADD CONSTRAINT county_code_pkey PRIMARY KEY (county_code_id);


--
-- Name: defc defc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.defc
    ADD CONSTRAINT defc_pkey PRIMARY KEY (defc_id);


--
-- Name: detached_award_procurement detached_award_procurement_detached_award_proc_unique_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detached_award_procurement
    ADD CONSTRAINT detached_award_procurement_detached_award_proc_unique_key UNIQUE (detached_award_proc_unique);


--
-- Name: detached_award_procurement detached_award_procurement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detached_award_procurement
    ADD CONSTRAINT detached_award_procurement_pkey PRIMARY KEY (detached_award_procurement_id);


--
-- Name: email_template email_template_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template
    ADD CONSTRAINT email_template_pkey PRIMARY KEY (email_template_id);


--
-- Name: email_template_type email_template_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template_type
    ADD CONSTRAINT email_template_type_pkey PRIMARY KEY (email_template_type_id);


--
-- Name: email_token email_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_token
    ADD CONSTRAINT email_token_pkey PRIMARY KEY (email_token_id);


--
-- Name: error_metadata error_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_metadata
    ADD CONSTRAINT error_metadata_pkey PRIMARY KEY (error_metadata_id);


--
-- Name: error_type error_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_type
    ADD CONSTRAINT error_type_pkey PRIMARY KEY (error_type_id);


--
-- Name: external_data_load_date external_data_load_date_external_data_type_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_data_load_date
    ADD CONSTRAINT external_data_load_date_external_data_type_id_key UNIQUE (external_data_type_id);


--
-- Name: external_data_load_date external_data_load_date_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_data_load_date
    ADD CONSTRAINT external_data_load_date_pkey PRIMARY KEY (external_data_load_date_id);


--
-- Name: external_data_type external_data_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_data_type
    ADD CONSTRAINT external_data_type_pkey PRIMARY KEY (external_data_type_id);


--
-- Name: fabs fabs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fabs
    ADD CONSTRAINT fabs_pkey PRIMARY KEY (fabs_id);


--
-- Name: field_type field_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_type
    ADD CONSTRAINT field_type_pkey PRIMARY KEY (field_type_id);


--
-- Name: file_columns file_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_columns
    ADD CONSTRAINT file_columns_pkey PRIMARY KEY (file_column_id);


--
-- Name: file_generation file_generation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_generation
    ADD CONSTRAINT file_generation_pkey PRIMARY KEY (file_generation_id);


--
-- Name: file_generation_task file_generation_task_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_generation_task
    ADD CONSTRAINT file_generation_task_pkey PRIMARY KEY (file_generation_task_id);


--
-- Name: file file_job_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file
    ADD CONSTRAINT file_job_id_key UNIQUE (job_id);


--
-- Name: file file_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file
    ADD CONSTRAINT file_pkey PRIMARY KEY (file_id);


--
-- Name: file_status file_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_status
    ADD CONSTRAINT file_status_pkey PRIMARY KEY (file_status_id);


--
-- Name: file_type file_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_type
    ADD CONSTRAINT file_type_pkey PRIMARY KEY (file_type_id);


--
-- Name: flex_field flex_field_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flex_field
    ADD CONSTRAINT flex_field_pkey PRIMARY KEY (flex_field_id);


--
-- Name: format_change_date format_change_date_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.format_change_date
    ADD CONSTRAINT format_change_date_pkey PRIMARY KEY (format_change_id);


--
-- Name: frec frec_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frec
    ADD CONSTRAINT frec_pkey PRIMARY KEY (frec_id);


--
-- Name: funding_opportunity funding_opportunity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funding_opportunity
    ADD CONSTRAINT funding_opportunity_pkey PRIMARY KEY (funding_opportunity_id);


--
-- Name: gtas_boc gtas_boc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gtas_boc
    ADD CONSTRAINT gtas_boc_pkey PRIMARY KEY (gtas_boc_id);


--
-- Name: historic_duns historic_duns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historic_duns
    ADD CONSTRAINT historic_duns_pkey PRIMARY KEY (duns_id);


--
-- Name: job_dependency job_dependency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_dependency
    ADD CONSTRAINT job_dependency_pkey PRIMARY KEY (dependency_id);


--
-- Name: job job_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job
    ADD CONSTRAINT job_pkey PRIMARY KEY (job_id);


--
-- Name: job_status job_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_status
    ADD CONSTRAINT job_status_pkey PRIMARY KEY (job_status_id);


--
-- Name: job_type job_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_type
    ADD CONSTRAINT job_type_pkey PRIMARY KEY (job_type_id);


--
-- Name: object_class object_class_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.object_class
    ADD CONSTRAINT object_class_pkey PRIMARY KEY (object_class_id);


--
-- Name: object_class_program_activity object_class_program_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.object_class_program_activity
    ADD CONSTRAINT object_class_program_activity_pkey PRIMARY KEY (object_class_program_activity_id);


--
-- Name: office office_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.office
    ADD CONSTRAINT office_pkey PRIMARY KEY (office_id);


--
-- Name: permission_type permission_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_type
    ADD CONSTRAINT permission_type_pkey PRIMARY KEY (permission_type_id);


--
-- Name: program_activity_park program_activity_park_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_activity_park
    ADD CONSTRAINT program_activity_park_pkey PRIMARY KEY (program_activity_park_id);


--
-- Name: program_activity program_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_activity
    ADD CONSTRAINT program_activity_pkey PRIMARY KEY (program_activity_id);


--
-- Name: publish_history publish_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publish_history
    ADD CONSTRAINT publish_history_pkey PRIMARY KEY (publish_history_id);


--
-- Name: publish_status publish_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publish_status
    ADD CONSTRAINT publish_status_pkey PRIMARY KEY (publish_status_id);


--
-- Name: published_appropriation published_appropriation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_appropriation
    ADD CONSTRAINT published_appropriation_pkey PRIMARY KEY (published_appropriation_id);


--
-- Name: published_award_financial_legacy_procurementance published_award_financial_legacy_procurementance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_award_financial_legacy_procurementance
    ADD CONSTRAINT published_award_financial_legacy_procurementance_pkey PRIMARY KEY (published_award_financial_legacy_procurementance_id);


--
-- Name: published_award_financial published_award_financial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_award_financial
    ADD CONSTRAINT published_award_financial_pkey PRIMARY KEY (published_award_financial_id);


--
-- Name: published_award_procurement published_award_procurement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_award_procurement
    ADD CONSTRAINT published_award_procurement_pkey PRIMARY KEY (published_award_procurement_id);


--
-- Name: published_comment published_comment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_comment
    ADD CONSTRAINT published_comment_pkey PRIMARY KEY (published_comment_id);


--
-- Name: published_error_metadata published_error_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_error_metadata
    ADD CONSTRAINT published_error_metadata_pkey PRIMARY KEY (published_error_metadata_id);


--
-- Name: published_fabs published_fabs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_fabs
    ADD CONSTRAINT published_fabs_pkey PRIMARY KEY (published_fabs_id);


--
-- Name: published_files_history published_files_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_files_history
    ADD CONSTRAINT published_files_history_pkey PRIMARY KEY (published_files_history_id);


--
-- Name: published_flex_field published_flex_field_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_flex_field
    ADD CONSTRAINT published_flex_field_pkey PRIMARY KEY (published_flex_field_id);


--
-- Name: published_object_class_program_activity published_object_class_program_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_object_class_program_activity
    ADD CONSTRAINT published_object_class_program_activity_pkey PRIMARY KEY (published_object_class_program_activity_id);


--
-- Name: published_total_obligations published_total_obligations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_total_obligations
    ADD CONSTRAINT published_total_obligations_pkey PRIMARY KEY (published_total_obligations_id);


--
-- Name: revalidation_threshold revalidation_threshold_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revalidation_threshold
    ADD CONSTRAINT revalidation_threshold_pkey PRIMARY KEY (revalidation_date);


--
-- Name: rule_impact rule_impact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_impact
    ADD CONSTRAINT rule_impact_pkey PRIMARY KEY (rule_impact_id);


--
-- Name: rule_settings rule_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_settings
    ADD CONSTRAINT rule_settings_pkey PRIMARY KEY (rule_settings_id);


--
-- Name: rule_severity rule_severity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_severity
    ADD CONSTRAINT rule_severity_pkey PRIMARY KEY (rule_severity_id);


--
-- Name: rule_sql rule_sql_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_sql
    ADD CONSTRAINT rule_sql_pkey PRIMARY KEY (rule_sql_id);


--
-- Name: sam_recipient sam_recipient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sam_recipient
    ADD CONSTRAINT sam_recipient_pkey PRIMARY KEY (sam_recipient_id);


--
-- Name: sam_recipient_unregistered sam_recipient_unregistered_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sam_recipient_unregistered
    ADD CONSTRAINT sam_recipient_unregistered_pkey PRIMARY KEY (sam_recipient_unreg_id);


--
-- Name: sam_recipient_unregistered sam_recipient_unregistered_uei_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sam_recipient_unregistered
    ADD CONSTRAINT sam_recipient_unregistered_uei_key UNIQUE (uei);


--
-- Name: sam_subcontract sam_subcontract_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sam_subcontract
    ADD CONSTRAINT sam_subcontract_pkey PRIMARY KEY (sam_subcontract_id);


--
-- Name: sam_subgrant sam_subgrant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sam_subgrant
    ADD CONSTRAINT sam_subgrant_pkey PRIMARY KEY (sam_subgrant_id);


--
-- Name: session_map session_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_map
    ADD CONSTRAINT session_map_pkey PRIMARY KEY (session_id);


--
-- Name: sf_133 sf_133_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sf_133
    ADD CONSTRAINT sf_133_pkey PRIMARY KEY (sf133_id);


--
-- Name: sqs sqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sqs
    ADD CONSTRAINT sqs_pkey PRIMARY KEY (sqs_id);


--
-- Name: state_congressional state_congressional_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_congressional
    ADD CONSTRAINT state_congressional_pkey PRIMARY KEY (state_congressional_id);


--
-- Name: states states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_pkey PRIMARY KEY (states_id);


--
-- Name: sub_tier_agency sub_tier_agency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_tier_agency
    ADD CONSTRAINT sub_tier_agency_pkey PRIMARY KEY (sub_tier_agency_id);


--
-- Name: subaward subaward_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subaward
    ADD CONSTRAINT subaward_pkey PRIMARY KEY (id);


--
-- Name: submission submission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission
    ADD CONSTRAINT submission_pkey PRIMARY KEY (submission_id);


--
-- Name: submission_sub_tier_affiliation submission_sub_tier_affiliation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission_sub_tier_affiliation
    ADD CONSTRAINT submission_sub_tier_affiliation_pkey PRIMARY KEY (submission_sub_tier_affiliation_id);


--
-- Name: banner submission_window_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banner
    ADD CONSTRAINT submission_window_pkey PRIMARY KEY (banner_id);


--
-- Name: submission_window_schedule submission_window_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission_window_schedule
    ADD CONSTRAINT submission_window_schedule_pkey PRIMARY KEY (submission_window_schedule_id);


--
-- Name: tas_failed_edits tas_failed_edits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tas_failed_edits
    ADD CONSTRAINT tas_failed_edits_pkey PRIMARY KEY (tas_failed_edits_id);


--
-- Name: tas_lookup tas_lookup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tas_lookup
    ADD CONSTRAINT tas_lookup_pkey PRIMARY KEY (tas_id);


--
-- Name: total_obligations total_obligations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.total_obligations
    ADD CONSTRAINT total_obligations_pkey PRIMARY KEY (total_obligations_id);


--
-- Name: zips_historical uniq_hist_zip5_zip_last4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zips_historical
    ADD CONSTRAINT uniq_hist_zip5_zip_last4 UNIQUE (zip5, zip_last4);


--
-- Name: published_comment uniq_pub_comment_submission_file_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_comment
    ADD CONSTRAINT uniq_pub_comment_submission_file_type UNIQUE (submission_id, file_type_id);


--
-- Name: comment uniq_submission_file_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT uniq_submission_file_type UNIQUE (submission_id, file_type_id);


--
-- Name: zips uniq_zip5_zip_last4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zips
    ADD CONSTRAINT uniq_zip5_zip_last4 UNIQUE (zip5, zip_last4);


--
-- Name: user_affiliation user_affiliation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_affiliation
    ADD CONSTRAINT user_affiliation_pkey PRIMARY KEY (user_affiliation_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: validation_label validation_label_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_label
    ADD CONSTRAINT validation_label_pkey PRIMARY KEY (validation_label_id);


--
-- Name: zip_city zip_city_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zip_city
    ADD CONSTRAINT zip_city_pkey PRIMARY KEY (zip_city_id);


--
-- Name: zips_grouped_historical zips_grouped_historical_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zips_grouped_historical
    ADD CONSTRAINT zips_grouped_historical_pkey PRIMARY KEY (zips_grouped_historical_id);


--
-- Name: zips_grouped zips_grouped_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zips_grouped
    ADD CONSTRAINT zips_grouped_pkey PRIMARY KEY (zips_grouped_id);


--
-- Name: zips_historical zips_historical_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zips_historical
    ADD CONSTRAINT zips_historical_pkey PRIMARY KEY (zips_historical_id);


--
-- Name: zips zips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zips
    ADD CONSTRAINT zips_pkey PRIMARY KEY (zips_id);


--
-- Name: ix_af_atc_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_af_atc_upper ON public.award_financial USING btree (upper(availability_type_code));


--
-- Name: ix_af_defc_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_af_defc_upper ON public.award_financial USING btree (upper(disaster_emergency_fund_code));


--
-- Name: ix_af_dr_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_af_dr_upper ON public.award_financial USING btree (upper(by_direct_reimbursable_fun));


--
-- Name: ix_af_fain_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_af_fain_upper ON public.award_financial USING btree (upper(fain));


--
-- Name: ix_af_pan_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_af_pan_upper ON public.award_financial USING btree (upper(program_activity_name));


--
-- Name: ix_af_parent_award_id_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_af_parent_award_id_upper ON public.award_financial USING btree (upper(parent_award_id));


--
-- Name: ix_af_park_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_af_park_upper ON public.award_financial USING btree (upper(program_activity_reporting_key));


--
-- Name: ix_af_piid_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_af_piid_upper ON public.award_financial USING btree (upper(piid));


--
-- Name: ix_af_pya_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_af_pya_upper ON public.award_financial USING btree (upper(prior_year_adjustment));


--
-- Name: ix_af_uri_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_af_uri_upper ON public.award_financial USING btree (upper(uri));


--
-- Name: ix_afa_fain_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_afa_fain_upper ON public.award_financial_legacy_procurementance USING btree (upper(fain));


--
-- Name: ix_ap_awarding_sub_tier_agency_c_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ap_awarding_sub_tier_agency_c_upper ON public.award_procurement USING btree (upper(awarding_sub_tier_agency_c));


--
-- Name: ix_ap_parent_award_id_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ap_parent_award_id_upper ON public.award_procurement USING btree (upper(parent_award_id));


--
-- Name: ix_ap_piid_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ap_piid_upper ON public.award_procurement USING btree (upper(piid));


--
-- Name: ix_appropriation_account_num; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_appropriation_account_num ON public.appropriation USING btree (account_num);


--
-- Name: ix_appropriation_account_num_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_appropriation_account_num_submission_id ON public.appropriation USING btree (account_num, submission_id);


--
-- Name: ix_appropriation_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_appropriation_job_id ON public.appropriation USING btree (job_id);


--
-- Name: ix_appropriation_row_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_appropriation_row_number ON public.appropriation USING btree (row_number);


--
-- Name: ix_appropriation_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_appropriation_submission_id ON public.appropriation USING btree (submission_id);


--
-- Name: ix_appropriation_tas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_appropriation_tas ON public.appropriation USING btree (tas);


--
-- Name: ix_legacy_procurementance_listing_archived_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_legacy_procurementance_listing_archived_date ON public.legacy_procurementance_listing USING btree (archived_date);


--
-- Name: ix_legacy_procurementance_listing_program_number_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_legacy_procurementance_listing_program_number_upper ON public.legacy_procurementance_listing USING btree (upper(program_number));


--
-- Name: ix_legacy_procurementance_listing_published_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_legacy_procurementance_listing_published_date ON public.legacy_procurementance_listing USING btree (published_date);


--
-- Name: ix_award_financial_account_num; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_account_num ON public.award_financial USING btree (account_num);


--
-- Name: ix_award_financial_agency_identifier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_agency_identifier ON public.award_financial USING btree (agency_identifier);


--
-- Name: ix_award_financial_allocation_transfer_agency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_allocation_transfer_agency ON public.award_financial USING btree (allocation_transfer_agency);


--
-- Name: ix_award_financial_legacy_procurementance_action_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_action_date ON public.award_financial_legacy_procurementance USING btree (action_date);


--
-- Name: ix_award_financial_legacy_procurementance_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_action_type ON public.award_financial_legacy_procurementance USING btree (action_type);


--
-- Name: ix_award_financial_legacy_procurementance_legacy_procurementance_listing_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_legacy_procurementance_listing_number ON public.award_financial_legacy_procurementance USING btree (legacy_procurementance_listing_number);


--
-- Name: ix_award_financial_legacy_procurementance_legacy_procurementance_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_legacy_procurementance_type ON public.award_financial_legacy_procurementance USING btree (legacy_procurementance_type);


--
-- Name: ix_award_financial_legacy_procurementance_awardee_or_recipient_duns; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_awardee_or_recipient_duns ON public.award_financial_legacy_procurementance USING btree (awardee_or_recipient_duns);


--
-- Name: ix_award_financial_legacy_procurementance_awardee_or_recipient_uei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_awardee_or_recipient_uei ON public.award_financial_legacy_procurementance USING btree (awardee_or_recipient_uei);


--
-- Name: ix_award_financial_legacy_procurementance_awarding_agency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_awarding_agency_code ON public.award_financial_legacy_procurementance USING btree (awarding_agency_code);


--
-- Name: ix_award_financial_legacy_procurementance_awarding_sub_tier_agency_c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_awarding_sub_tier_agency_c ON public.award_financial_legacy_procurementance USING btree (awarding_sub_tier_agency_c);


--
-- Name: ix_award_financial_legacy_procurementance_correction_delete_indicatr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_correction_delete_indicatr ON public.award_financial_legacy_procurementance USING btree (correction_delete_indicatr);


--
-- Name: ix_award_financial_legacy_procurementance_fain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_fain ON public.award_financial_legacy_procurementance USING btree (fain);


--
-- Name: ix_award_financial_legacy_procurementance_federal_action_obligation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_federal_action_obligation ON public.award_financial_legacy_procurementance USING btree (federal_action_obligation);


--
-- Name: ix_award_financial_legacy_procurementance_funding_agency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_funding_agency_code ON public.award_financial_legacy_procurementance USING btree (funding_agency_code);


--
-- Name: ix_award_financial_legacy_procurementance_funding_sub_tier_agency_co; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_funding_sub_tier_agency_co ON public.award_financial_legacy_procurementance USING btree (funding_sub_tier_agency_co);


--
-- Name: ix_award_financial_legacy_procurementance_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_job_id ON public.award_financial_legacy_procurementance USING btree (job_id);


--
-- Name: ix_award_financial_legacy_procurementance_record_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_record_type ON public.award_financial_legacy_procurementance USING btree (record_type);


--
-- Name: ix_award_financial_legacy_procurementance_row_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_row_number ON public.award_financial_legacy_procurementance USING btree (row_number);


--
-- Name: ix_award_financial_legacy_procurementance_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_submission_id ON public.award_financial_legacy_procurementance USING btree (submission_id);


--
-- Name: ix_award_financial_legacy_procurementance_uri; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_legacy_procurementance_uri ON public.award_financial_legacy_procurementance USING btree (uri);


--
-- Name: ix_award_financial_fain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_fain ON public.award_financial USING btree (fain);


--
-- Name: ix_award_financial_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_job_id ON public.award_financial USING btree (job_id);


--
-- Name: ix_award_financial_main_account_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_main_account_code ON public.award_financial USING btree (main_account_code);


--
-- Name: ix_award_financial_object_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_object_class ON public.award_financial USING btree (object_class);


--
-- Name: ix_award_financial_parent_award_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_parent_award_id ON public.award_financial USING btree (parent_award_id);


--
-- Name: ix_award_financial_piid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_piid ON public.award_financial USING btree (piid);


--
-- Name: ix_award_financial_program_activity_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_program_activity_code ON public.award_financial USING btree (program_activity_code);


--
-- Name: ix_award_financial_row_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_row_number ON public.award_financial USING btree (row_number);


--
-- Name: ix_award_financial_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_submission_id ON public.award_financial USING btree (submission_id);


--
-- Name: ix_award_financial_tas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_tas ON public.award_financial USING btree (tas);


--
-- Name: ix_award_financial_tas_oc_pa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_tas_oc_pa ON public.award_financial USING btree (tas, object_class, program_activity_code);


--
-- Name: ix_award_financial_uri; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_financial_uri ON public.award_financial USING btree (uri);


--
-- Name: ix_award_procurement_action_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_procurement_action_date ON public.award_procurement USING btree (action_date);


--
-- Name: ix_award_procurement_awardee_or_recipient_uei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_procurement_awardee_or_recipient_uei ON public.award_procurement USING btree (awardee_or_recipient_uei);


--
-- Name: ix_award_procurement_awardee_or_recipient_uniqu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_procurement_awardee_or_recipient_uniqu ON public.award_procurement USING btree (awardee_or_recipient_uniqu);


--
-- Name: ix_award_procurement_awarding_agency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_procurement_awarding_agency_code ON public.award_procurement USING btree (awarding_agency_code);


--
-- Name: ix_award_procurement_awarding_sub_tier_agency_c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_procurement_awarding_sub_tier_agency_c ON public.award_procurement USING btree (awarding_sub_tier_agency_c);


--
-- Name: ix_award_procurement_funding_agency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_procurement_funding_agency_code ON public.award_procurement USING btree (funding_agency_code);


--
-- Name: ix_award_procurement_funding_sub_tier_agency_co; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_procurement_funding_sub_tier_agency_co ON public.award_procurement USING btree (funding_sub_tier_agency_co);


--
-- Name: ix_award_procurement_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_procurement_job_id ON public.award_procurement USING btree (job_id);


--
-- Name: ix_award_procurement_parent_award_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_procurement_parent_award_id ON public.award_procurement USING btree (parent_award_id);


--
-- Name: ix_award_procurement_piid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_procurement_piid ON public.award_procurement USING btree (piid);


--
-- Name: ix_award_procurement_row_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_procurement_row_number ON public.award_procurement USING btree (row_number);


--
-- Name: ix_award_procurement_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_award_procurement_submission_id ON public.award_procurement USING btree (submission_id);


--
-- Name: ix_cd_city_grouped_city_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cd_city_grouped_city_code ON public.cd_city_grouped USING btree (city_code);


--
-- Name: ix_cd_city_grouped_city_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cd_city_grouped_city_name ON public.cd_city_grouped USING btree (city_name);


--
-- Name: ix_cd_city_grouped_state_abbreviation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cd_city_grouped_state_abbreviation ON public.cd_city_grouped USING btree (state_abbreviation);


--
-- Name: ix_cd_county_grouped_county_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cd_county_grouped_county_number ON public.cd_county_grouped USING btree (county_number);


--
-- Name: ix_cd_county_grouped_state_abbreviation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cd_county_grouped_state_abbreviation ON public.cd_county_grouped USING btree (state_abbreviation);


--
-- Name: ix_cd_state_grouped_state_abbreviation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cd_state_grouped_state_abbreviation ON public.cd_state_grouped USING btree (state_abbreviation);


--
-- Name: ix_cd_zips_grouped_historical_state_abbreviation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cd_zips_grouped_historical_state_abbreviation ON public.cd_zips_grouped_historical USING btree (state_abbreviation);


--
-- Name: ix_cd_zips_grouped_historical_zip5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cd_zips_grouped_historical_zip5 ON public.cd_zips_grouped_historical USING btree (zip5);


--
-- Name: ix_cd_zips_grouped_state_abbreviation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cd_zips_grouped_state_abbreviation ON public.cd_zips_grouped USING btree (state_abbreviation);


--
-- Name: ix_cd_zips_grouped_zip5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cd_zips_grouped_zip5 ON public.cd_zips_grouped USING btree (zip5);


--
-- Name: ix_cgac_cgac_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_cgac_cgac_code ON public.cgac USING btree (cgac_code);


--
-- Name: ix_city_code_city_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_city_code_city_code ON public.city_code USING btree (city_code);


--
-- Name: ix_city_code_state_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_city_code_state_code ON public.city_code USING btree (state_code);


--
-- Name: ix_country_code2_upp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_country_code2_upp ON public.country_code USING btree (upper(country_code_2_char));


--
-- Name: ix_country_code_country_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_country_code_country_code ON public.country_code USING btree (country_code);


--
-- Name: ix_country_code_country_code_2_char; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_country_code_country_code_2_char ON public.country_code USING btree (country_code_2_char);


--
-- Name: ix_country_code_upp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_country_code_upp ON public.country_code USING btree (upper(country_code));


--
-- Name: ix_county_code_county_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_county_code_county_number ON public.county_code USING btree (county_number);


--
-- Name: ix_county_code_state_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_county_code_state_code ON public.county_code USING btree (state_code);


--
-- Name: ix_dap_awardee_or_recipient_uei_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dap_awardee_or_recipient_uei_upper ON public.detached_award_procurement USING btree (upper(awardee_or_recipient_uei));


--
-- Name: ix_dap_awarding_sub_tier_agency_c_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dap_awarding_sub_tier_agency_c_upper ON public.detached_award_procurement USING btree (upper(awarding_sub_tier_agency_c));


--
-- Name: ix_dap_pai_upp_trans; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dap_pai_upp_trans ON public.detached_award_procurement USING btree (upper(translate(parent_award_id, '-'::text, ''::text)));


--
-- Name: ix_dap_parent_award_id_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dap_parent_award_id_upper ON public.detached_award_procurement USING btree (upper(parent_award_id));


--
-- Name: ix_dap_piid_upp_trans; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dap_piid_upp_trans ON public.detached_award_procurement USING btree (upper(translate(piid, '-'::text, ''::text)));


--
-- Name: ix_dap_piid_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dap_piid_upper ON public.detached_award_procurement USING btree (upper(piid));


--
-- Name: ix_dap_puei_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dap_puei_upper ON public.detached_award_procurement USING btree (upper(ultimate_parent_uei));


--
-- Name: ix_dap_uak_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dap_uak_upper ON public.detached_award_procurement USING btree (upper(unique_award_key));


--
-- Name: ix_dap_uei_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_dap_uei_upper ON public.detached_award_procurement USING btree (upper(awardee_or_recipient_uei));


--
-- Name: ix_defc_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_defc_code ON public.defc USING btree (code);


--
-- Name: ix_detached_award_procurement_action_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_detached_award_procurement_action_date ON public.detached_award_procurement USING btree (action_date);


--
-- Name: ix_detached_award_procurement_awardee_or_recipient_uei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_detached_award_procurement_awardee_or_recipient_uei ON public.detached_award_procurement USING btree (awardee_or_recipient_uei);


--
-- Name: ix_detached_award_procurement_awardee_or_recipient_uniqu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_detached_award_procurement_awardee_or_recipient_uniqu ON public.detached_award_procurement USING btree (awardee_or_recipient_uniqu);


--
-- Name: ix_detached_award_procurement_awarding_agency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_detached_award_procurement_awarding_agency_code ON public.detached_award_procurement USING btree (awarding_agency_code);


--
-- Name: ix_detached_award_procurement_awarding_sub_tier_agency_c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_detached_award_procurement_awarding_sub_tier_agency_c ON public.detached_award_procurement USING btree (awarding_sub_tier_agency_c);


--
-- Name: ix_detached_award_procurement_funding_agency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_detached_award_procurement_funding_agency_code ON public.detached_award_procurement USING btree (funding_agency_code);


--
-- Name: ix_detached_award_procurement_funding_sub_tier_agency_co; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_detached_award_procurement_funding_sub_tier_agency_co ON public.detached_award_procurement USING btree (funding_sub_tier_agency_co);


--
-- Name: ix_detached_award_procurement_parent_award_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_detached_award_procurement_parent_award_id ON public.detached_award_procurement USING btree (parent_award_id);


--
-- Name: ix_detached_award_procurement_piid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_detached_award_procurement_piid ON public.detached_award_procurement USING btree (piid);


--
-- Name: ix_detached_award_procurement_pulled_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_detached_award_procurement_pulled_from ON public.detached_award_procurement USING btree (pulled_from);


--
-- Name: ix_detached_award_procurement_ultimate_parent_uei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_detached_award_procurement_ultimate_parent_uei ON public.detached_award_procurement USING btree (ultimate_parent_uei);


--
-- Name: ix_detached_award_procurement_ultimate_parent_unique_ide; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_detached_award_procurement_ultimate_parent_unique_ide ON public.detached_award_procurement USING btree (ultimate_parent_unique_ide);


--
-- Name: ix_detached_award_procurement_unique_award_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_detached_award_procurement_unique_award_key ON public.detached_award_procurement USING btree (unique_award_key);


--
-- Name: ix_detached_award_procurement_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_detached_award_procurement_updated_at ON public.detached_award_procurement USING btree (updated_at);


--
-- Name: ix_fabs_action_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_action_date ON public.fabs USING btree (action_date);


--
-- Name: ix_fabs_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_action_type ON public.fabs USING btree (action_type);


--
-- Name: ix_fabs_afa_generated_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_afa_generated_unique ON public.fabs USING btree (afa_generated_unique);


--
-- Name: ix_fabs_afa_generated_unique_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_afa_generated_unique_upper ON public.fabs USING btree (upper(afa_generated_unique));


--
-- Name: ix_fabs_legacy_procurementance_listing_number_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_legacy_procurementance_listing_number_upper ON public.fabs USING btree (upper(legacy_procurementance_listing_number));


--
-- Name: ix_fabs_legacy_procurementance_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_legacy_procurementance_type ON public.fabs USING btree (legacy_procurementance_type);


--
-- Name: ix_fabs_awardee_or_recipient_uniqu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_awardee_or_recipient_uniqu ON public.fabs USING btree (awardee_or_recipient_uniqu);


--
-- Name: ix_fabs_awarding_agency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_awarding_agency_code ON public.fabs USING btree (awarding_agency_code);


--
-- Name: ix_fabs_awarding_sub_tier_agency_c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_awarding_sub_tier_agency_c ON public.fabs USING btree (awarding_sub_tier_agency_c);


--
-- Name: ix_fabs_correction_delete_indicatr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_correction_delete_indicatr ON public.fabs USING btree (correction_delete_indicatr);


--
-- Name: ix_fabs_fain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_fain ON public.fabs USING btree (fain);


--
-- Name: ix_fabs_federal_action_obligation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_federal_action_obligation ON public.fabs USING btree (federal_action_obligation);


--
-- Name: ix_fabs_funding_office_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_funding_office_code ON public.fabs USING btree (funding_office_code);


--
-- Name: ix_fabs_funding_opportunity_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_funding_opportunity_number ON public.fabs USING btree (funding_opportunity_number);


--
-- Name: ix_fabs_funding_sub_tier_agency_co; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_funding_sub_tier_agency_co ON public.fabs USING btree (funding_sub_tier_agency_co);


--
-- Name: ix_fabs_indirect_federal_sharing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_indirect_federal_sharing ON public.fabs USING btree (indirect_federal_sharing);


--
-- Name: ix_fabs_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_job_id ON public.fabs USING btree (job_id);


--
-- Name: ix_fabs_legal_entity_congressional; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_legal_entity_congressional ON public.fabs USING btree (legal_entity_congressional);


--
-- Name: ix_fabs_legal_entity_zip5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_legal_entity_zip5 ON public.fabs USING btree (legal_entity_zip5);


--
-- Name: ix_fabs_legal_entity_zip_last4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_legal_entity_zip_last4 ON public.fabs USING btree (legal_entity_zip_last4);


--
-- Name: ix_fabs_period_of_performance_curr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_period_of_performance_curr ON public.fabs USING btree (period_of_performance_curr);


--
-- Name: ix_fabs_period_of_performance_star; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_period_of_performance_star ON public.fabs USING btree (period_of_performance_star);


--
-- Name: ix_fabs_place_of_perform_country_c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_place_of_perform_country_c ON public.fabs USING btree (place_of_perform_country_c);


--
-- Name: ix_fabs_place_of_performance_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_place_of_performance_code ON public.fabs USING btree (place_of_performance_code);


--
-- Name: ix_fabs_record_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_record_type ON public.fabs USING btree (record_type);


--
-- Name: ix_fabs_row_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_row_number ON public.fabs USING btree (row_number);


--
-- Name: ix_fabs_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_submission_id ON public.fabs USING btree (submission_id);


--
-- Name: ix_fabs_uei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_uei ON public.fabs USING btree (uei);


--
-- Name: ix_fabs_uei_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_uei_upper ON public.fabs USING btree (upper(uei));


--
-- Name: ix_fabs_unique_award_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_unique_award_key ON public.fabs USING btree (unique_award_key);


--
-- Name: ix_fabs_uri; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_fabs_uri ON public.fabs USING btree (uri);


--
-- Name: ix_file_generation_agency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_file_generation_agency_code ON public.file_generation USING btree (agency_code);


--
-- Name: ix_file_generation_agency_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_file_generation_agency_type ON public.file_generation USING btree (agency_type);


--
-- Name: ix_file_generation_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_file_generation_end_date ON public.file_generation USING btree (end_date);


--
-- Name: ix_file_generation_file_format; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_file_generation_file_format ON public.file_generation USING btree (file_format);


--
-- Name: ix_file_generation_file_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_file_generation_file_type ON public.file_generation USING btree (file_type);


--
-- Name: ix_file_generation_request_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_file_generation_request_date ON public.file_generation USING btree (request_date);


--
-- Name: ix_file_generation_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_file_generation_start_date ON public.file_generation USING btree (start_date);


--
-- Name: ix_file_generation_task_generation_task_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_file_generation_task_generation_task_key ON public.file_generation_task USING btree (generation_task_key);


--
-- Name: ix_flex_field_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flex_field_job_id ON public.flex_field USING btree (job_id);


--
-- Name: ix_flex_field_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_flex_field_submission_id ON public.flex_field USING btree (submission_id);


--
-- Name: ix_contract_data_cast_action_date_as_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_contract_data_cast_action_date_as_date ON public.detached_award_procurement USING btree (public.cast_as_date(action_date));


--
-- Name: ix_frec_frec_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_frec_frec_code ON public.frec USING btree (frec_code);


--
-- Name: ix_funding_opportunity_funding_opportunity_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_funding_opportunity_funding_opportunity_number ON public.funding_opportunity USING btree (funding_opportunity_number);


--
-- Name: ix_gtas_boc_disaster_emergency_fund_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_gtas_boc_disaster_emergency_fund_code ON public.gtas_boc USING btree (disaster_emergency_fund_code);


--
-- Name: ix_gtas_boc_display_tas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_gtas_boc_display_tas ON public.gtas_boc USING btree (display_tas);


--
-- Name: ix_gtas_boc_fiscal_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_gtas_boc_fiscal_year ON public.gtas_boc USING btree (fiscal_year);


--
-- Name: ix_gtas_boc_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_gtas_boc_period ON public.gtas_boc USING btree (period);


--
-- Name: ix_gtas_boc_tas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_gtas_boc_tas ON public.gtas_boc USING btree (tas);


--
-- Name: ix_historic_duns_awardee_or_recipient_uniqu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_historic_duns_awardee_or_recipient_uniqu ON public.historic_duns USING btree (awardee_or_recipient_uniqu);


--
-- Name: ix_historic_duns_uei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_historic_duns_uei ON public.historic_duns USING btree (uei);


--
-- Name: ix_historic_duns_uei_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_historic_duns_uei_upper ON public.historic_duns USING btree (upper(uei));


--
-- Name: ix_object_class_object_class_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_object_class_object_class_code ON public.object_class USING btree (object_class_code);


--
-- Name: ix_object_class_program_activity_by_direct_reimbursable_fun; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_object_class_program_activity_by_direct_reimbursable_fun ON public.object_class_program_activity USING btree (by_direct_reimbursable_fun);


--
-- Name: ix_object_class_program_activity_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_object_class_program_activity_job_id ON public.object_class_program_activity USING btree (job_id);


--
-- Name: ix_object_class_program_activity_object_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_object_class_program_activity_object_class ON public.object_class_program_activity USING btree (object_class);


--
-- Name: ix_object_class_program_activity_program_activity_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_object_class_program_activity_program_activity_code ON public.object_class_program_activity USING btree (program_activity_code);


--
-- Name: ix_object_class_program_activity_row_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_object_class_program_activity_row_number ON public.object_class_program_activity USING btree (row_number);


--
-- Name: ix_object_class_program_activity_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_object_class_program_activity_submission_id ON public.object_class_program_activity USING btree (submission_id);


--
-- Name: ix_object_class_program_activity_tas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_object_class_program_activity_tas ON public.object_class_program_activity USING btree (tas);


--
-- Name: ix_oc_atc_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oc_atc_upper ON public.object_class_program_activity USING btree (upper(availability_type_code));


--
-- Name: ix_oc_dr_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oc_dr_upper ON public.object_class_program_activity USING btree (upper(by_direct_reimbursable_fun));


--
-- Name: ix_oc_pa_account_num_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oc_pa_account_num_submission_id ON public.object_class_program_activity USING btree (account_num, submission_id);


--
-- Name: ix_oc_pa_defc_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oc_pa_defc_upper ON public.object_class_program_activity USING btree (upper(disaster_emergency_fund_code));


--
-- Name: ix_oc_pa_pan_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oc_pa_pan_upper ON public.object_class_program_activity USING btree (upper(program_activity_name));


--
-- Name: ix_oc_pa_tas_oc_pa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oc_pa_tas_oc_pa ON public.object_class_program_activity USING btree (tas, object_class, program_activity_code);


--
-- Name: ix_oc_park_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oc_park_upper ON public.object_class_program_activity USING btree (upper(program_activity_reporting_key));


--
-- Name: ix_oc_pya_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_oc_pya_upper ON public.object_class_program_activity USING btree (upper(prior_year_adjustment));


--
-- Name: ix_office_agency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_office_agency_code ON public.office USING btree (agency_code);


--
-- Name: ix_office_effective_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_office_effective_end_date ON public.office USING btree (effective_end_date);


--
-- Name: ix_office_effective_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_office_effective_start_date ON public.office USING btree (effective_start_date);


--
-- Name: ix_office_office_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_office_office_code ON public.office USING btree (office_code);


--
-- Name: ix_office_sub_tier_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_office_sub_tier_code ON public.office USING btree (sub_tier_code);


--
-- Name: ix_pa_tas_pa; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_pa_tas_pa ON public.program_activity USING btree (fiscal_year_period, agency_id, allocation_transfer_id, account_number, program_activity_code, program_activity_name);


--
-- Name: ix_pap_tas_park; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_pap_tas_park ON public.program_activity_park USING btree (fiscal_year, period, agency_id, allocation_transfer_id, main_account_number, sub_account_number, park_code);


--
-- Name: ix_pfabs_fain_upp_trans; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pfabs_fain_upp_trans ON public.published_fabs USING btree (upper(translate(fain, '-'::text, ''::text)));


--
-- Name: ix_pfabs_sub_code_coal_upp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pfabs_sub_code_coal_upp ON public.published_fabs USING btree (COALESCE(upper(awarding_sub_tier_agency_c), ''::text));


--
-- Name: ix_program_activity_account_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_program_activity_account_number ON public.program_activity USING btree (account_number);


--
-- Name: ix_program_activity_agency_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_program_activity_agency_id ON public.program_activity USING btree (agency_id);


--
-- Name: ix_program_activity_fiscal_year_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_program_activity_fiscal_year_period ON public.program_activity USING btree (fiscal_year_period);


--
-- Name: ix_program_activity_park_agency_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_program_activity_park_agency_id ON public.program_activity_park USING btree (agency_id);


--
-- Name: ix_program_activity_park_allocation_transfer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_program_activity_park_allocation_transfer_id ON public.program_activity_park USING btree (allocation_transfer_id);


--
-- Name: ix_program_activity_park_fiscal_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_program_activity_park_fiscal_year ON public.program_activity_park USING btree (fiscal_year);


--
-- Name: ix_program_activity_park_main_account_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_program_activity_park_main_account_number ON public.program_activity_park USING btree (main_account_number);


--
-- Name: ix_program_activity_park_park_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_program_activity_park_park_code ON public.program_activity_park USING btree (park_code);


--
-- Name: ix_program_activity_park_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_program_activity_park_period ON public.program_activity_park USING btree (period);


--
-- Name: ix_program_activity_park_sub_account_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_program_activity_park_sub_account_number ON public.program_activity_park USING btree (sub_account_number);


--
-- Name: ix_program_activity_program_activity_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_program_activity_program_activity_code ON public.program_activity USING btree (program_activity_code);


--
-- Name: ix_program_activity_program_activity_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_program_activity_program_activity_name ON public.program_activity USING btree (program_activity_name);


--
-- Name: ix_published_appropriation_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_appropriation_submission_id ON public.published_appropriation USING btree (submission_id);


--
-- Name: ix_published_award_financial_legacy_procurementance_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_award_financial_legacy_procurementance_submission_id ON public.published_award_financial_legacy_procurementance USING btree (submission_id);


--
-- Name: ix_published_award_financial_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_award_financial_submission_id ON public.published_award_financial USING btree (submission_id);


--
-- Name: ix_published_award_procurement_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_award_procurement_submission_id ON public.published_award_procurement USING btree (submission_id);


--
-- Name: ix_published_fabs_action_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_action_date ON public.published_fabs USING btree (action_date);


--
-- Name: ix_published_fabs_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_action_type ON public.published_fabs USING btree (action_type);


--
-- Name: ix_published_fabs_afa_generated_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_afa_generated_unique ON public.published_fabs USING btree (afa_generated_unique);


--
-- Name: ix_published_fabs_afa_generated_unique_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_afa_generated_unique_upper ON public.published_fabs USING btree (upper(afa_generated_unique));


--
-- Name: ix_published_fabs_legacy_procurementance_listing_number_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_legacy_procurementance_listing_number_upper ON public.published_fabs USING btree (upper(legacy_procurementance_listing_number));


--
-- Name: ix_published_fabs_legacy_procurementance_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_legacy_procurementance_type ON public.published_fabs USING btree (legacy_procurementance_type);


--
-- Name: ix_published_fabs_awardee_or_recipient_uniqu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_awardee_or_recipient_uniqu ON public.published_fabs USING btree (awardee_or_recipient_uniqu);


--
-- Name: ix_published_fabs_awarding_agency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_awarding_agency_code ON public.published_fabs USING btree (awarding_agency_code);


--
-- Name: ix_published_fabs_awarding_sub_tier_agency_c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_awarding_sub_tier_agency_c ON public.published_fabs USING btree (awarding_sub_tier_agency_c);


--
-- Name: ix_published_fabs_awarding_subtier_c_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_awarding_subtier_c_upper ON public.published_fabs USING btree (upper(awarding_sub_tier_agency_c));


--
-- Name: ix_published_fabs_cast_action_date_as_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_cast_action_date_as_date ON public.published_fabs USING btree (public.cast_as_date(action_date));


--
-- Name: ix_published_fabs_correction_delete_indicatr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_correction_delete_indicatr ON public.published_fabs USING btree (correction_delete_indicatr);


--
-- Name: ix_published_fabs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_created_at ON public.published_fabs USING btree (created_at);


--
-- Name: ix_published_fabs_fain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_fain ON public.published_fabs USING btree (fain);


--
-- Name: ix_published_fabs_fain_awarding_sub_tier_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_fain_awarding_sub_tier_is_active ON public.published_fabs USING btree (fain, awarding_sub_tier_agency_c, is_active);


--
-- Name: ix_published_fabs_fain_awarding_subtier_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_fain_awarding_subtier_upper ON public.published_fabs USING btree (upper(fain), upper(awarding_sub_tier_agency_c));


--
-- Name: ix_published_fabs_fain_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_fain_upper ON public.published_fabs USING btree (upper(fain));


--
-- Name: ix_published_fabs_funding_agency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_funding_agency_code ON public.published_fabs USING btree (funding_agency_code);


--
-- Name: ix_published_fabs_funding_office_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_funding_office_code ON public.published_fabs USING btree (funding_office_code);


--
-- Name: ix_published_fabs_funding_sub_tier_agency_co; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_funding_sub_tier_agency_co ON public.published_fabs USING btree (funding_sub_tier_agency_co);


--
-- Name: ix_published_fabs_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_is_active ON public.published_fabs USING btree (is_active) WHERE (is_active IS TRUE);


--
-- Name: ix_published_fabs_period_of_perfomance_curr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_period_of_perfomance_curr ON public.published_fabs USING btree (period_of_performance_curr);


--
-- Name: ix_published_fabs_period_of_perfomance_star; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_period_of_perfomance_star ON public.published_fabs USING btree (period_of_performance_star);


--
-- Name: ix_published_fabs_place_of_perform_country_c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_place_of_perform_country_c ON public.published_fabs USING btree (place_of_perform_country_c);


--
-- Name: ix_published_fabs_place_of_performance_congr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_place_of_performance_congr ON public.published_fabs USING btree (place_of_performance_congr);


--
-- Name: ix_published_fabs_record_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_record_type ON public.published_fabs USING btree (record_type);


--
-- Name: ix_published_fabs_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_submission_id ON public.published_fabs USING btree (submission_id);


--
-- Name: ix_published_fabs_uak_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_uak_upper ON public.published_fabs USING btree (upper(unique_award_key));


--
-- Name: ix_published_fabs_uei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_uei ON public.published_fabs USING btree (uei);


--
-- Name: ix_published_fabs_uei_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_uei_upper ON public.published_fabs USING btree (upper(uei));


--
-- Name: ix_published_fabs_ultimate_parent_uei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_ultimate_parent_uei ON public.published_fabs USING btree (ultimate_parent_uei);


--
-- Name: ix_published_fabs_ultimate_parent_unique_ide; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_ultimate_parent_unique_ide ON public.published_fabs USING btree (ultimate_parent_unique_ide);


--
-- Name: ix_published_fabs_unique_award_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_unique_award_key ON public.published_fabs USING btree (unique_award_key);


--
-- Name: ix_published_fabs_uri; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_uri ON public.published_fabs USING btree (uri);


--
-- Name: ix_published_fabs_uri_awarding_sub_tier_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_uri_awarding_sub_tier_is_active ON public.published_fabs USING btree (uri, awarding_sub_tier_agency_c, is_active);


--
-- Name: ix_published_fabs_uri_awarding_subtier_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_uri_awarding_subtier_upper ON public.published_fabs USING btree (upper(uri), upper(awarding_sub_tier_agency_c));


--
-- Name: ix_published_fabs_uri_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_fabs_uri_upper ON public.published_fabs USING btree (upper(uri));


--
-- Name: ix_published_flex_field_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_flex_field_submission_id ON public.published_flex_field USING btree (submission_id);


--
-- Name: ix_published_object_class_program_activity_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_published_object_class_program_activity_submission_id ON public.published_object_class_program_activity USING btree (submission_id);


--
-- Name: ix_published_total_obligations_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_published_total_obligations_submission_id ON public.published_total_obligations USING btree (submission_id);


--
-- Name: ix_sam_activation_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_activation_desc ON public.sam_recipient USING btree (activation_date DESC);


--
-- Name: ix_sam_recipient_activation_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_recipient_activation_date ON public.sam_recipient USING btree (activation_date);


--
-- Name: ix_sam_recipient_awardee_or_recipient_uniqu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_recipient_awardee_or_recipient_uniqu ON public.sam_recipient USING btree (awardee_or_recipient_uniqu);


--
-- Name: ix_sam_recipient_deactivation_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_recipient_deactivation_date ON public.sam_recipient USING btree (deactivation_date);


--
-- Name: ix_sam_recipient_expiration_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_recipient_expiration_date ON public.sam_recipient USING btree (expiration_date);


--
-- Name: ix_sam_recipient_registration_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_recipient_registration_date ON public.sam_recipient USING btree (registration_date);


--
-- Name: ix_sam_recipient_uei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_recipient_uei ON public.sam_recipient USING btree (uei);


--
-- Name: ix_sam_recipient_uei_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_recipient_uei_upper ON public.sam_recipient USING btree (upper(uei));


--
-- Name: ix_sam_recipient_unregistered_uei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_recipient_unregistered_uei ON public.sam_recipient_unregistered USING btree (uei);


--
-- Name: ix_sam_recipient_unregistered_uei_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_recipient_unregistered_uei_upper ON public.sam_recipient_unregistered USING btree (upper(uei));


--
-- Name: ix_sam_subcontract_le_country_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subcontract_le_country_upper ON public.sam_subcontract USING btree (upper(legal_entity_country_code));


--
-- Name: ix_sam_subcontract_le_state_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subcontract_le_state_upper ON public.sam_subcontract USING btree (upper(legal_entity_state_code));


--
-- Name: ix_sam_subcontract_legal_entity_zip_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subcontract_legal_entity_zip_code ON public.sam_subcontract USING btree (legal_entity_zip_code);


--
-- Name: ix_sam_subcontract_ppop_country_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subcontract_ppop_country_upper ON public.sam_subcontract USING btree (upper(ppop_country_code));


--
-- Name: ix_sam_subcontract_ppop_state_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subcontract_ppop_state_upper ON public.sam_subcontract USING btree (upper(ppop_state_code));


--
-- Name: ix_sam_subcontract_ppop_zip_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subcontract_ppop_zip_code ON public.sam_subcontract USING btree (ppop_zip_code);


--
-- Name: ix_sam_subcontract_puei_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subcontract_puei_upper ON public.sam_subcontract USING btree (upper(parent_uei));


--
-- Name: ix_sam_subcontract_subaward_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_sam_subcontract_subaward_report_id ON public.sam_subcontract USING btree (subaward_report_id);


--
-- Name: ix_sam_subcontract_subaward_report_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_sam_subcontract_subaward_report_number ON public.sam_subcontract USING btree (subaward_report_number);


--
-- Name: ix_sam_subcontract_uak_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subcontract_uak_upper ON public.sam_subcontract USING btree (upper(unique_award_key));


--
-- Name: ix_sam_subcontract_uei_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subcontract_uei_upper ON public.sam_subcontract USING btree (upper(uei));


--
-- Name: ix_sam_subcontract_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subcontract_updated_at ON public.sam_subcontract USING btree (updated_at);


--
-- Name: ix_sam_subgrant_le_country_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subgrant_le_country_upper ON public.sam_subgrant USING btree (upper(legal_entity_country_code));


--
-- Name: ix_sam_subgrant_le_state_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subgrant_le_state_upper ON public.sam_subgrant USING btree (upper(legal_entity_state_code));


--
-- Name: ix_sam_subgrant_legal_entity_zip_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subgrant_legal_entity_zip_code ON public.sam_subgrant USING btree (legal_entity_zip_code);


--
-- Name: ix_sam_subgrant_ppop_country_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subgrant_ppop_country_upper ON public.sam_subgrant USING btree (upper(ppop_country_code));


--
-- Name: ix_sam_subgrant_ppop_state_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subgrant_ppop_state_upper ON public.sam_subgrant USING btree (upper(ppop_state_code));


--
-- Name: ix_sam_subgrant_ppop_zip_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subgrant_ppop_zip_code ON public.sam_subgrant USING btree (ppop_zip_code);


--
-- Name: ix_sam_subgrant_puei_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subgrant_puei_upper ON public.sam_subgrant USING btree (upper(parent_uei));


--
-- Name: ix_sam_subgrant_subaward_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_sam_subgrant_subaward_report_id ON public.sam_subgrant USING btree (subaward_report_id);


--
-- Name: ix_sam_subgrant_subaward_report_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_sam_subgrant_subaward_report_number ON public.sam_subgrant USING btree (subaward_report_number);


--
-- Name: ix_sam_subgrant_uak_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subgrant_uak_upper ON public.sam_subgrant USING btree (upper(unique_award_key));


--
-- Name: ix_sam_subgrant_uei_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subgrant_uei_upper ON public.sam_subgrant USING btree (upper(uei));


--
-- Name: ix_sam_subgrant_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sam_subgrant_updated_at ON public.sam_subgrant USING btree (updated_at);


--
-- Name: ix_sc_state_cd; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_sc_state_cd ON public.state_congressional USING btree (state_code, congressional_district_no);


--
-- Name: ix_session_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_session_uid ON public.session_map USING btree (uid);


--
-- Name: ix_sf_133_agency_identifier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sf_133_agency_identifier ON public.sf_133 USING btree (agency_identifier);


--
-- Name: ix_sf_133_allocation_transfer_agency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sf_133_allocation_transfer_agency ON public.sf_133 USING btree (allocation_transfer_agency);


--
-- Name: ix_sf_133_disaster_emergency_fund_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sf_133_disaster_emergency_fund_code ON public.sf_133 USING btree (disaster_emergency_fund_code);


--
-- Name: ix_sf_133_display_tas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sf_133_display_tas ON public.sf_133 USING btree (display_tas);


--
-- Name: ix_sf_133_fiscal_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sf_133_fiscal_year ON public.sf_133 USING btree (fiscal_year);


--
-- Name: ix_sf_133_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sf_133_period ON public.sf_133 USING btree (period);


--
-- Name: ix_sf_133_tas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sf_133_tas ON public.sf_133 USING btree (tas);


--
-- Name: ix_sf_133_tas_group; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_sf_133_tas_group ON public.sf_133 USING btree (tas, fiscal_year, period, line, disaster_emergency_fund_code);


--
-- Name: ix_state_congressional_census_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_state_congressional_census_year ON public.state_congressional USING btree (census_year);


--
-- Name: ix_state_congressional_congressional_district_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_state_congressional_congressional_district_no ON public.state_congressional USING btree (congressional_district_no);


--
-- Name: ix_state_congressional_state_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_state_congressional_state_code ON public.state_congressional USING btree (state_code);


--
-- Name: ix_states_state_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_states_state_code ON public.states USING btree (state_code);


--
-- Name: ix_sub_tier_agency_sub_tier_agency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_sub_tier_agency_sub_tier_agency_code ON public.sub_tier_agency USING btree (sub_tier_agency_code);


--
-- Name: ix_subaward_action_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_action_date ON public.subaward USING btree (action_date);


--
-- Name: ix_subaward_award_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_award_id ON public.subaward USING btree (award_id);


--
-- Name: ix_subaward_award_id_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_award_id_upper ON public.subaward USING btree (upper(award_id));


--
-- Name: ix_subaward_awardee_or_recipient_uei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_awardee_or_recipient_uei ON public.subaward USING btree (awardee_or_recipient_uei);


--
-- Name: ix_subaward_awardee_or_recipient_uniqu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_awardee_or_recipient_uniqu ON public.subaward USING btree (awardee_or_recipient_uniqu);


--
-- Name: ix_subaward_awarding_agency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_awarding_agency_code ON public.subaward USING btree (awarding_agency_code);


--
-- Name: ix_subaward_awarding_sub_tier_agency_c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_awarding_sub_tier_agency_c ON public.subaward USING btree (awarding_sub_tier_agency_c);


--
-- Name: ix_subaward_awarding_sub_tier_agency_c_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_awarding_sub_tier_agency_c_upper ON public.subaward USING btree (upper(awarding_sub_tier_agency_c));


--
-- Name: ix_subaward_funding_agency_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_funding_agency_code ON public.subaward USING btree (funding_agency_code);


--
-- Name: ix_subaward_funding_sub_tier_agency_co; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_funding_sub_tier_agency_co ON public.subaward USING btree (funding_sub_tier_agency_co);


--
-- Name: ix_subaward_internal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_subaward_internal_id ON public.subaward USING btree (internal_id);


--
-- Name: ix_subaward_parent_award_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_parent_award_id ON public.subaward USING btree (parent_award_id);


--
-- Name: ix_subaward_parent_award_id_upper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_parent_award_id_upper ON public.subaward USING btree (upper(parent_award_id));


--
-- Name: ix_subaward_prime_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_prime_id ON public.subaward USING btree (prime_id);


--
-- Name: ix_subaward_sub_action_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_sub_action_date ON public.subaward USING btree (sub_action_date);


--
-- Name: ix_subaward_sub_awardee_or_recipient_uei; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_sub_awardee_or_recipient_uei ON public.subaward USING btree (sub_awardee_or_recipient_uei);


--
-- Name: ix_subaward_sub_awardee_or_recipient_uniqu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_sub_awardee_or_recipient_uniqu ON public.subaward USING btree (sub_awardee_or_recipient_uniqu);


--
-- Name: ix_subaward_sub_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_subaward_sub_id ON public.subaward USING btree (sub_id);


--
-- Name: ix_subaward_sub_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_sub_parent_id ON public.subaward USING btree (sub_parent_id);


--
-- Name: ix_subaward_subaward_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_subaward_number ON public.subaward USING btree (subaward_number);


--
-- Name: ix_subaward_subaward_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_subaward_type ON public.subaward USING btree (subaward_type);


--
-- Name: ix_subaward_unique_award_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_subaward_unique_award_key ON public.subaward USING btree (unique_award_key);


--
-- Name: ix_tas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tas ON public.tas_lookup USING btree (allocation_transfer_agency, agency_identifier, beginning_period_of_availa, ending_period_of_availabil, availability_type_code, main_account_code, sub_account_code, internal_start_date, internal_end_date);


--
-- Name: ix_tas_failed_edits_display_tas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tas_failed_edits_display_tas ON public.tas_failed_edits USING btree (display_tas);


--
-- Name: ix_tas_failed_edits_fiscal_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tas_failed_edits_fiscal_year ON public.tas_failed_edits USING btree (fiscal_year);


--
-- Name: ix_tas_failed_edits_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tas_failed_edits_period ON public.tas_failed_edits USING btree (period);


--
-- Name: ix_tas_failed_edits_tas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tas_failed_edits_tas ON public.tas_failed_edits USING btree (tas);


--
-- Name: ix_tas_lookup_account_num; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tas_lookup_account_num ON public.tas_lookup USING btree (account_num);


--
-- Name: ix_tas_lookup_agency_identifier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tas_lookup_agency_identifier ON public.tas_lookup USING btree (agency_identifier);


--
-- Name: ix_tas_lookup_allocation_transfer_agency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tas_lookup_allocation_transfer_agency ON public.tas_lookup USING btree (allocation_transfer_agency);


--
-- Name: ix_tas_lookup_availability_type_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tas_lookup_availability_type_code ON public.tas_lookup USING btree (availability_type_code);


--
-- Name: ix_tas_lookup_beginning_period_of_availa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tas_lookup_beginning_period_of_availa ON public.tas_lookup USING btree (beginning_period_of_availa);


--
-- Name: ix_tas_lookup_ending_period_of_availabil; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tas_lookup_ending_period_of_availabil ON public.tas_lookup USING btree (ending_period_of_availabil);


--
-- Name: ix_tas_lookup_main_account_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tas_lookup_main_account_code ON public.tas_lookup USING btree (main_account_code);


--
-- Name: ix_tas_lookup_sub_account_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tas_lookup_sub_account_code ON public.tas_lookup USING btree (sub_account_code);


--
-- Name: ix_tas_lookup_tas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tas_lookup_tas ON public.tas_lookup USING btree (tas);


--
-- Name: ix_total_obligations_submission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_total_obligations_submission_id ON public.total_obligations USING btree (submission_id);


--
-- Name: ix_user_affiliation_cgac_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_affiliation_cgac_id ON public.user_affiliation USING btree (cgac_id);


--
-- Name: ix_user_affiliation_frec_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_affiliation_frec_id ON public.user_affiliation USING btree (frec_id);


--
-- Name: ix_user_affiliation_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_affiliation_user_id ON public.user_affiliation USING btree (user_id);


--
-- Name: ix_zips_concat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_concat ON public.zips USING btree (((zip5 || zip_last4)));


--
-- Name: ix_zips_congressional_district_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_congressional_district_no ON public.zips USING btree (congressional_district_no);


--
-- Name: ix_zips_county_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_county_number ON public.zips USING btree (county_number);


--
-- Name: ix_zips_grouped_historical_zip5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_grouped_historical_zip5 ON public.zips_grouped_historical USING btree (zip5);


--
-- Name: ix_zips_grouped_zip5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_grouped_zip5 ON public.zips_grouped USING btree (zip5);


--
-- Name: ix_zips_historical_congressional_district_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_historical_congressional_district_no ON public.zips_historical USING btree (congressional_district_no);


--
-- Name: ix_zips_historical_county_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_historical_county_number ON public.zips_historical USING btree (county_number);


--
-- Name: ix_zips_historical_state_abbreviation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_historical_state_abbreviation ON public.zips_historical USING btree (state_abbreviation);


--
-- Name: ix_zips_historical_zip5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_historical_zip5 ON public.zips_historical USING btree (zip5);


--
-- Name: ix_zips_historical_zip5_state_abbreviation_county_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_historical_zip5_state_abbreviation_county_number ON public.zips_historical USING btree (zip5, state_abbreviation, county_number);


--
-- Name: ix_zips_historical_zip_last4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_historical_zip_last4 ON public.zips_historical USING btree (zip_last4);


--
-- Name: ix_zips_state_abbreviation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_state_abbreviation ON public.zips USING btree (state_abbreviation);


--
-- Name: ix_zips_zip5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_zip5 ON public.zips USING btree (zip5);


--
-- Name: ix_zips_zip5_state_abbreviation_county_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_zip5_state_abbreviation_county_number ON public.zips USING btree (zip5, state_abbreviation, county_number);


--
-- Name: ix_zips_zip_last4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_zips_zip_last4 ON public.zips USING btree (zip_last4);


--
-- Name: email_template email_template_template_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template
    ADD CONSTRAINT email_template_template_type_id_fkey FOREIGN KEY (template_type_id) REFERENCES public.email_template_type(email_template_type_id);


--
-- Name: error_metadata error_metadata_error_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_metadata
    ADD CONSTRAINT error_metadata_error_type_id_fkey FOREIGN KEY (error_type_id) REFERENCES public.error_type(error_type_id);


--
-- Name: file_columns file_columns_field_types_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_columns
    ADD CONSTRAINT file_columns_field_types_id_fkey FOREIGN KEY (field_types_id) REFERENCES public.field_type(field_type_id);


--
-- Name: appropriation fk_appropriation_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appropriation
    ADD CONSTRAINT fk_appropriation_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: award_financial_legacy_procurementance fk_award_financial_legacy_procurementance_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_financial_legacy_procurementance
    ADD CONSTRAINT fk_award_financial_legacy_procurementance_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: award_financial fk_award_financial_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_financial
    ADD CONSTRAINT fk_award_financial_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: award_procurement fk_award_procurement_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.award_procurement
    ADD CONSTRAINT fk_award_procurement_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: published_files_history fk_certify_history_published_files_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_files_history
    ADD CONSTRAINT fk_certify_history_published_files_id FOREIGN KEY (certify_history_id) REFERENCES public.certify_history(certify_history_id);


--
-- Name: certify_history fk_certify_history_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certify_history
    ADD CONSTRAINT fk_certify_history_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id);


--
-- Name: certify_history fk_certify_history_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certify_history
    ADD CONSTRAINT fk_certify_history_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: job_dependency fk_dep_job_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_dependency
    ADD CONSTRAINT fk_dep_job_id FOREIGN KEY (job_id) REFERENCES public.job(job_id) ON DELETE CASCADE;


--
-- Name: error_metadata fk_error_metadata_job; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_metadata
    ADD CONSTRAINT fk_error_metadata_job FOREIGN KEY (job_id) REFERENCES public.job(job_id) ON DELETE CASCADE;


--
-- Name: error_metadata fk_error_severity_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_metadata
    ADD CONSTRAINT fk_error_severity_id FOREIGN KEY (severity_id) REFERENCES public.rule_severity(rule_severity_id);


--
-- Name: external_data_load_date fk_external_data_type_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_data_load_date
    ADD CONSTRAINT fk_external_data_type_id FOREIGN KEY (external_data_type_id) REFERENCES public.external_data_type(external_data_type_id);


--
-- Name: fabs fk_fabs_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fabs
    ADD CONSTRAINT fk_fabs_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: rule_sql fk_file; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_sql
    ADD CONSTRAINT fk_file FOREIGN KEY (file_id) REFERENCES public.file_type(file_type_id);


--
-- Name: validation_label fk_file; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_label
    ADD CONSTRAINT fk_file FOREIGN KEY (file_id) REFERENCES public.file_type(file_type_id);


--
-- Name: file_columns fk_file_column_file_type; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_columns
    ADD CONSTRAINT fk_file_column_file_type FOREIGN KEY (file_id) REFERENCES public.file_type(file_type_id);


--
-- Name: file fk_file_job; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file
    ADD CONSTRAINT fk_file_job FOREIGN KEY (job_id) REFERENCES public.job(job_id) ON DELETE CASCADE;


--
-- Name: job fk_file_request_file_generation_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job
    ADD CONSTRAINT fk_file_request_file_generation_id FOREIGN KEY (file_generation_id) REFERENCES public.file_generation(file_generation_id) ON DELETE SET NULL;


--
-- Name: file fk_file_status_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file
    ADD CONSTRAINT fk_file_status_id FOREIGN KEY (file_status_id) REFERENCES public.file_status(file_status_id);


--
-- Name: comment fk_file_type; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT fk_file_type FOREIGN KEY (file_type_id) REFERENCES public.file_type(file_type_id);


--
-- Name: error_metadata fk_file_type_file_status_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_metadata
    ADD CONSTRAINT fk_file_type_file_status_id FOREIGN KEY (file_type_id) REFERENCES public.file_type(file_type_id);


--
-- Name: flex_field fk_flex_field_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flex_field
    ADD CONSTRAINT fk_flex_field_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: frec fk_frec_cgac; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frec
    ADD CONSTRAINT fk_frec_cgac FOREIGN KEY (cgac_id) REFERENCES public.cgac(cgac_id) ON DELETE CASCADE;


--
-- Name: file_generation_task fk_generation_job; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_generation_task
    ADD CONSTRAINT fk_generation_job FOREIGN KEY (job_id) REFERENCES public.job(job_id) ON DELETE CASCADE;


--
-- Name: rule_settings fk_impact; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_settings
    ADD CONSTRAINT fk_impact FOREIGN KEY (impact_id) REFERENCES public.rule_impact(rule_impact_id) ON DELETE CASCADE;


--
-- Name: job fk_job_status_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job
    ADD CONSTRAINT fk_job_status_id FOREIGN KEY (job_status_id) REFERENCES public.job_status(job_status_id);


--
-- Name: job fk_job_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job
    ADD CONSTRAINT fk_job_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: job fk_job_type_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job
    ADD CONSTRAINT fk_job_type_id FOREIGN KEY (job_type_id) REFERENCES public.job_type(job_type_id);


--
-- Name: job fk_job_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job
    ADD CONSTRAINT fk_job_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: object_class_program_activity fk_object_class_program_activity_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.object_class_program_activity
    ADD CONSTRAINT fk_object_class_program_activity_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: job_dependency fk_prereq_job_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_dependency
    ADD CONSTRAINT fk_prereq_job_id FOREIGN KEY (prerequisite_id) REFERENCES public.job(job_id) ON DELETE CASCADE;


--
-- Name: published_files_history fk_publish_history_published_files_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_files_history
    ADD CONSTRAINT fk_publish_history_published_files_id FOREIGN KEY (publish_history_id) REFERENCES public.publish_history(publish_history_id);


--
-- Name: publish_history fk_publish_history_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publish_history
    ADD CONSTRAINT fk_publish_history_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id);


--
-- Name: publish_history fk_publish_history_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publish_history
    ADD CONSTRAINT fk_publish_history_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: submission fk_publish_status_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission
    ADD CONSTRAINT fk_publish_status_id FOREIGN KEY (publish_status_id) REFERENCES public.publish_status(publish_status_id) ON DELETE SET NULL;


--
-- Name: published_appropriation fk_published_appropriation_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_appropriation
    ADD CONSTRAINT fk_published_appropriation_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: published_award_financial_legacy_procurementance fk_published_award_financial_legacy_procurementance_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_award_financial_legacy_procurementance
    ADD CONSTRAINT fk_published_award_financial_legacy_procurementance_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: published_award_financial fk_published_award_financial_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_award_financial
    ADD CONSTRAINT fk_published_award_financial_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: published_award_procurement fk_published_award_procurement_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_award_procurement
    ADD CONSTRAINT fk_published_award_procurement_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: published_comment fk_published_comment_file_type_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_comment
    ADD CONSTRAINT fk_published_comment_file_type_id FOREIGN KEY (file_type_id) REFERENCES public.file_type(file_type_id);


--
-- Name: published_comment fk_published_comment_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_comment
    ADD CONSTRAINT fk_published_comment_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: published_error_metadata fk_published_error_metadata_file_type_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_error_metadata
    ADD CONSTRAINT fk_published_error_metadata_file_type_id FOREIGN KEY (file_type_id) REFERENCES public.file_type(file_type_id);


--
-- Name: published_error_metadata fk_published_error_metadata_job_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_error_metadata
    ADD CONSTRAINT fk_published_error_metadata_job_id FOREIGN KEY (job_id) REFERENCES public.job(job_id) ON DELETE CASCADE;


--
-- Name: published_error_metadata fk_published_error_metadata_severity_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_error_metadata
    ADD CONSTRAINT fk_published_error_metadata_severity_id FOREIGN KEY (severity_id) REFERENCES public.rule_severity(rule_severity_id);


--
-- Name: published_error_metadata fk_published_error_metadata_target_file_type_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_error_metadata
    ADD CONSTRAINT fk_published_error_metadata_target_file_type_id FOREIGN KEY (target_file_type_id) REFERENCES public.file_type(file_type_id);


--
-- Name: published_files_history fk_published_files_history_file_type; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_files_history
    ADD CONSTRAINT fk_published_files_history_file_type FOREIGN KEY (file_type_id) REFERENCES public.file_type(file_type_id);


--
-- Name: published_files_history fk_published_files_history_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_files_history
    ADD CONSTRAINT fk_published_files_history_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id);


--
-- Name: published_flex_field fk_published_flex_field_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_flex_field
    ADD CONSTRAINT fk_published_flex_field_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: published_object_class_program_activity fk_published_object_class_program_activity_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_object_class_program_activity
    ADD CONSTRAINT fk_published_object_class_program_activity_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: published_total_obligations fk_published_total_obligations_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_total_obligations
    ADD CONSTRAINT fk_published_total_obligations_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: rule_settings fk_setting_file_type; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_settings
    ADD CONSTRAINT fk_setting_file_type FOREIGN KEY (file_id) REFERENCES public.file_type(file_type_id);


--
-- Name: rule_settings fk_setting_target_file_type; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_settings
    ADD CONSTRAINT fk_setting_target_file_type FOREIGN KEY (target_file_id) REFERENCES public.file_type(file_type_id);


--
-- Name: sub_tier_agency fk_sub_tier_agency_cgac; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_tier_agency
    ADD CONSTRAINT fk_sub_tier_agency_cgac FOREIGN KEY (cgac_id) REFERENCES public.cgac(cgac_id) ON DELETE CASCADE;


--
-- Name: sub_tier_agency fk_sub_tier_agency_frec; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_tier_agency
    ADD CONSTRAINT fk_sub_tier_agency_frec FOREIGN KEY (frec_id) REFERENCES public.frec(frec_id) ON DELETE CASCADE;


--
-- Name: submission_sub_tier_affiliation fk_sub_tier_submission_affiliation_agency_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission_sub_tier_affiliation
    ADD CONSTRAINT fk_sub_tier_submission_affiliation_agency_id FOREIGN KEY (sub_tier_agency_id) REFERENCES public.sub_tier_agency(sub_tier_agency_id);


--
-- Name: comment fk_submission; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment
    ADD CONSTRAINT fk_submission FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: submission fk_submission_publishing_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission
    ADD CONSTRAINT fk_submission_publishing_user FOREIGN KEY (publishing_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: submission_sub_tier_affiliation fk_submission_sub_tier_affiliation_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission_sub_tier_affiliation
    ADD CONSTRAINT fk_submission_sub_tier_affiliation_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id);


--
-- Name: submission fk_submission_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submission
    ADD CONSTRAINT fk_submission_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: banner fk_submission_window_application; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banner
    ADD CONSTRAINT fk_submission_window_application FOREIGN KEY (application_type_id) REFERENCES public.application_type(application_type_id);


--
-- Name: rule_sql fk_target_file; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_sql
    ADD CONSTRAINT fk_target_file FOREIGN KEY (target_file_id) REFERENCES public.file_type(file_type_id);


--
-- Name: error_metadata fk_target_file_type_file_status_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_metadata
    ADD CONSTRAINT fk_target_file_type_file_status_id FOREIGN KEY (target_file_type_id) REFERENCES public.file_type(file_type_id);


--
-- Name: total_obligations fk_total_obligations_submission_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.total_obligations
    ADD CONSTRAINT fk_total_obligations_submission_id FOREIGN KEY (submission_id) REFERENCES public.submission(submission_id) ON DELETE CASCADE;


--
-- Name: job job_file_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job
    ADD CONSTRAINT job_file_type_id_fkey FOREIGN KEY (file_type_id) REFERENCES public.file_type(file_type_id);


--
-- Name: published_error_metadata published_error_metadata_error_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.published_error_metadata
    ADD CONSTRAINT published_error_metadata_error_type_id_fkey FOREIGN KEY (error_type_id) REFERENCES public.error_type(error_type_id);


--
-- Name: rule_sql rule_sql_rule_severity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rule_sql
    ADD CONSTRAINT rule_sql_rule_severity_id_fkey FOREIGN KEY (rule_severity_id) REFERENCES public.rule_severity(rule_severity_id);


--
-- Name: user_affiliation user_affiliation_cgac_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_affiliation
    ADD CONSTRAINT user_affiliation_cgac_fk FOREIGN KEY (cgac_id) REFERENCES public.cgac(cgac_id) ON DELETE CASCADE;


--
-- Name: user_affiliation user_affiliation_frec_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_affiliation
    ADD CONSTRAINT user_affiliation_frec_fk FOREIGN KEY (frec_id) REFERENCES public.frec(frec_id) ON DELETE CASCADE;


--
-- Name: user_affiliation user_affiliation_permission_type_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_affiliation
    ADD CONSTRAINT user_affiliation_permission_type_fk FOREIGN KEY (permission_type_id) REFERENCES public.permission_type(permission_type_id);


--
-- Name: user_affiliation user_affiliation_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_affiliation
    ADD CONSTRAINT user_affiliation_user_fk FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

