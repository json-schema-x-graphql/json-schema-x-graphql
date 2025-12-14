#!/usr/bin/env python3
"""
Clean up redundant x-graphql-* annotations from Public Spending schema.

Only keeps annotations where:
1. Field name is truncated (not clean snake_case → camelCase)
2. Type differs from JSON Schema default (DateTime, Decimal)
3. Non-null constraint needed
"""

import json
import re
from pathlib import Path

# Fields with truncated names that need x-graphql-field-name
TRUNCATED_FIELDS = {
    "awarding_sub_tier_agency_c", "awarding_sub_tier_agency_n",
    "award_modification_amendme", "awardee_or_recipient_uniqu",
    "ultimate_parent_legal_enti", "ultimate_parent_unique_ide",
    "awardee_or_recipient_legal", "place_of_perform_county_na",
    "place_of_perform_state_nam", "place_of_performance_zip4a",
    "place_of_performance_congr", "place_of_perform_country_n",
    "period_of_performance_star", "period_of_performance_curr",
    "period_of_perf_potential_e", "potential_total_value_awar",
    "base_exercised_options_val", "funding_sub_tier_agency_co",
    "funding_sub_tier_agency_na", "referenced_idv_agency_iden",
    "entity_doing_business_as_n", "sba_certified_8_a_joint_ve",
    "small_disadvantaged_busine", "service_disabled_veteran_o",
    "american_indian_owned_busi", "alaskan_native_owned_corpo",
    "native_hawaiian_owned_busi", "asian_pacific_american_own",
    "black_american_owned_busin", "hispanic_american_owned_bu",
    "corporate_entity_tax_exemp", "limited_liability_corporat",
    "partnership_or_limited_lia"
}

# Types that need explicit x-graphql-field-type
SPECIAL_TYPES = {"DateTime", "Decimal"}

def snake_to_camel(snake_str):
    """Convert snake_case to camelCase."""
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

def clean_property(field_name, prop_def):
    """Remove redundant x-graphql annotations from a property."""
    # Keep x-graphql-field-type only for special types
    if "x-graphql-field-type" in prop_def:
        if prop_def["x-graphql-field-type"] not in SPECIAL_TYPES:
            del prop_def["x-graphql-field-type"]
    
    # Keep x-graphql-field-name only for truncated fields
    if "x-graphql-field-name" in prop_def:
        if field_name not in TRUNCATED_FIELDS:
            expected_camel = snake_to_camel(field_name)
            if prop_def["x-graphql-field-name"] == expected_camel:
                del prop_def["x-graphql-field-name"]
    
    return prop_def

def clean_schema(schema):
    """Recursively clean all properties in schema."""
    if "$defs" in schema:
        for type_name, type_def in schema["$defs"].items():
            if "properties" in type_def:
                for field_name, prop_def in type_def["properties"].items():
                    if isinstance(prop_def, dict) and "$ref" not in prop_def:
                        clean_property(field_name, prop_def)
    return schema

def main():
    schema_path = Path("src/data/public_spending.schema.json")
    
    with open(schema_path) as f:
        schema = json.load(f)
    
    # Clean the schema
    schema = clean_schema(schema)
    
    # Write back with pretty formatting
    with open(schema_path, 'w') as f:
        json.dump(schema, f, indent=2)
    
    print(f"✓ Cleaned {schema_path}")
    print("  Removed redundant x-graphql-field-name and x-graphql-field-type annotations")

if __name__ == "__main__":
    main()
