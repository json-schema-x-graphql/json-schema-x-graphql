import React from "react";
import { Container, Box } from "@mantine/core";
import { MermaidDiagram } from "../../components/MermaidDiagram";

const schema_unificationMermaidContent = `erDiagram
    NORMALIZED_SCHEMA {
        string schemaVersion "Schema version number for compatibility tracking"
        string sourceSystem "Source system: Contract Data, Legacy Procurement, Intake Process, or Logistics Mgmt"
        datetime lastModified "Timestamp of last record modification"
        string recordId PK "Unique identifier across all systems"
        decimal completenessScore "Data quality score from 0-1"
        datetime lastValidated "Timestamp of last data validation"
    }
    
    COMMON_ELEMENTS {
        string recordId PK "FK to NORMALIZED_SCHEMA - Record identifier"
        string contractTitle "Title or description of the contract"
        string contractType "Type of contract instrument"
        string contractingAgencyCode "Code identifying contracting agency"
        string contractingAgencyName "Name of contracting agency"
        string vendorName "Name of vendor providing goods/services"
        string vendorUei "Vendor Unique Entity Identifier"
        boolean isActive "Whether the contract is currently active"
        boolean isLatest "Whether this is the latest version"
        boolean isFunded "Whether the contract is currently funded"
    }
    
    CONTRACT_IDENTIFICATION {
        string piid PK "Procurement Instrument Identifier"
        string originalAwardPiid "Original Award PIID for reference tracking"
        string referencedPiid "Referenced PIID for related contracts"
        string contractTitle "Title or description of the contract"
        string contractType "Type of contract instrument"
        string descriptionOfRequirement "Detailed description of contract requirements"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }
    
    ORGANIZATION_INFO {
        string orgId PK "Organization record identifier"
        string contractingAgencyCode "Code for agency handling contract"
        string contractingAgencyName "Name of contracting agency"
        string contractingDepartmentCode "Code for contracting department"
        string contractingDepartmentName "Name of contracting department"
        string fundingAgencyCode "Code for agency providing funding"
        string fundingAgencyName "Name of funding agency"
        string fundingDepartmentCode "Code for funding department"
        string fundingDepartmentName "Name of funding department"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }
    
    VENDOR_INFO {
        string vendorId PK "Vendor record identifier"
        string vendorName "Legal name of vendor organization"
        string vendorUei "Unique Entity Identifier in Entity Management"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }
    
    PLACE_OF_PERFORMANCE {
        string popId PK "Place of Performance record identifier"
        string popAddressLine1 "Primary address line"
        string popAddressLine2 "Secondary address line"
        string popCity "City name for place of performance"
        string popStateCode "State code for place of performance"
        string popZipCode "ZIP code for place of performance"
        string popCountryCode "Country code for place of performance"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }
    
    BUSINESS_CLASSIFICATION {
        string classificationId PK "Business classification record identifier"
        string primaryNaicsCode "Primary NAICS code for contract"
        string secondaryNaicsCode "Secondary NAICS code if applicable"
        string pscCode "Product/Service Code for contract"
        string businessType "Type of business classification"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }
    
    FINANCIAL_INFO {
        string financialId PK "Financial record identifier"
        decimal obligatedAmount "Amount obligated for contract"
        decimal totalContractValue "Total value of contract"
        decimal fundedAmount "Amount currently funded"
        datetime obligationDate "Date of financial obligation"
        string fundingAgencyCode "Code for funding agency"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }
    
    CONTRACT_CHARACTERISTICS {
        string characteristicsId PK "Contract characteristics record identifier"
        boolean isGfp "Government Furnished Property indicator"
        boolean isEmergency "Emergency contract indicator"
        boolean isIdv "Indefinite Delivery Vehicle indicator"
        string contractingMethodCode "Method used for contracting"
        string evaluationMethodCode "Evaluation method code"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }
    
    CONTACTS {
        string contactId PK "Contact record identifier"
        string contactType "Type of contact (Contracting Officer, etc.)"
        string contactName "Name of contact person"
        string contactEmail "Email address of contact"
        string contactPhone "Phone number of contact"
        string organizationName "Organization name for contact"
        string recordId FK "to COMMON_ELEMENTS - Record link"
    }
    
    %% Core Schema Relationships
    NORMALIZED_SCHEMA ||--|| COMMON_ELEMENTS : contains
    COMMON_ELEMENTS ||--o{ CONTRACT_IDENTIFICATION : includes
    COMMON_ELEMENTS ||--o{ ORGANIZATION_INFO : includes
    COMMON_ELEMENTS ||--o{ VENDOR_INFO : includes
    COMMON_ELEMENTS ||--o{ PLACE_OF_PERFORMANCE : includes
    COMMON_ELEMENTS ||--o{ BUSINESS_CLASSIFICATION : includes
    COMMON_ELEMENTS ||--o{ FINANCIAL_INFO : includes
    COMMON_ELEMENTS ||--o{ CONTRACT_CHARACTERISTICS : includes
    COMMON_ELEMENTS ||--o{ CONTACTS : includes`;

export const HeroPreview = () => {
  return (
    <Container component="section" id="preview" fluid py="20" mx="lg">
      <Box
        maw={1036}
        mx="auto"
        style={{
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid #c1c1c1",
          outline: "1px solid #c1c1c1",
          outlineOffset: "6px",
        }}
      >
        <MermaidDiagram definition={schema_unificationMermaidContent} />
      </Box>
    </Container>
  );
};
