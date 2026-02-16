# Comprehensive Guide to Government Contract Management Schema

> DRAFT - Note: This document outlines the capabilities and insights enabled by the unified GraphQL schema for government contract management. It highlights the unique query categories, advanced filtering options, and revolutionary analytics that were previously impossible with siloed systems.
> **FIELDS MAY CHANGE - DO NOT RELY ON THIS DOCUMENT FOR IMPLEMENTATION OF QUERIES OR INTEGRATIONS.**

## Overview

This schema provides a unified interface for querying government contract data across multiple systems (Contract Data, Legacy Procurement, Intake Process, Logistics Mgmt, and **PRISM (tbd)**). It enables complex analytics, data quality monitoring, and cross-system insights that would be extremely difficult or impossible without this integration layer.

## Query Categories and Capabilities

### 1. Core Contract Queries

#### `contract(id: ID!): Contract`

**Purpose**: Retrieve a single contract by its global record ID  
**Key Insights Enabled**:

- Complete 360-degree view of a contract across all systems
- Full contract lineage and system processing chain
- Quality metrics and certification status
- Related contracts and hierarchical relationships

**Example Use Cases**:

- Contract auditing with full data provenance
- Investigating data quality issues for specific contracts
- Understanding contract relationships and dependencies

#### `contracts(filter: ContractFilter, pagination: PaginationInput, sort: [ContractSortInput!]): ContractConnection!`

**Purpose**: Search and filter contracts with advanced criteria  
**Key Insights Enabled**:

- Multi-dimensional contract analysis
- Cross-system contract discovery
- Quality-based filtering
- Complex business rule validation

**Advanced Filter Capabilities**:

```graphql
# Find all emergency acquisitions over $1M with quality issues
filter: {
  emergencyAcquisition: true
  contractValue: { min: 1000000 }
  qualityScoreMin: 0.8
}
```

**Previously Impossible Insights**:

- Find contracts with similar characteristics across all systems
- Identify contracts with data quality issues before analysis
- Track contract modifications across system boundaries

### 2. System-Specific Queries

#### `contract_dataPrograms(filter: Contract DataFilter): [Contract DataProgram!]!`

**Unique Capabilities**:

- Search programs by objective content
- Filter by legacy_procurementance type hierarchies
- Track program evolution over time
- Identify related programs automatically

**Previously Difficult Analysis**:

- Finding all programs related to specific policy objectives
- Tracking program funding across fiscal years
- Understanding eligibility patterns across programs

#### `legacy_procurementContracts(filter: AssistFilter): [AssistContract!]!`

**Unique Capabilities**:

- Template-based contract analysis
- Line item level financial tracking
- Nature of acquisition categorization

#### `intake_processContracts(filter: EasiFilter): [EasiContract!]!`

**Unique Capabilities**:

- CLIN-level contract analysis
- Unit price comparisons
- Contract Data field mapping visibility

### 3. Analytics and Reporting

#### `contractAnalytics(timeRange: TimeRangeInput!, groupBy: [AnalyticsGroupBy!]!): [AnalyticsResult!]!`

**Revolutionary Insights**:

- Multi-dimensional trend analysis across systems
- Vendor performance comparisons by various metrics
- Agency spending patterns with quality correlation
- Set-aside program effectiveness measurement

**Grouping Options**:

- `FISCAL_YEAR`: Year-over-year comparisons
- `AGENCY`: Inter-agency benchmarking
- `VENDOR`: Supplier analysis
- `NAICS_CODE`: Industry sector analysis
- `PSC_CODE`: Product/service category trends
- `CONTRACT_TYPE`: Contract vehicle effectiveness
- `SET_ASIDE_TYPE`: Small business program analysis
- `SYSTEM_SOURCE`: Data source quality comparison

**Previously Impossible Analytics**:

```graphql
# Analyze vendor performance across agencies and contract types
contractAnalytics(
  timeRange: { startDate: "2023-01-01", endDate: "2024-01-01" }
  groupBy: [VENDOR, AGENCY, CONTRACT_TYPE]
)
```

### 4. Data Quality Monitoring

#### `dataQualityMetrics(systemName: SystemType, timeRange: TimeRangeInput): DataQualityMetrics!`

**Quality Insights**:

- System-level quality scoring
- Issue type breakdown and severity analysis
- Quality trend tracking over time
- Threshold compliance monitoring

**Critical Capabilities**:

- Identify systemic data issues before they impact analysis
- Track data quality improvements over time
- Prioritize data cleanup efforts
- Validate system integration effectiveness

### 5. Reference Data Queries

#### `agencies: [Agency!]!`

**Capabilities**:

- Complete agency hierarchy navigation
- Department-agency relationships
- Contact information retrieval

#### `naicsCodes(search: String): [NAICSCode!]!`

**Capabilities**:

- Industry classification search
- Size standard lookups
- Hierarchical code navigation

#### `pscCodes(search: String): [PSCCode!]!`

**Capabilities**:

- Product/service classification
- Category and subcategory analysis

## Advanced Insights Now Possible

### 1. Cross-System Contract Tracking

```graphql
# Track a contract's journey through multiple systems
contract(id: "global-123") {
  systemChain {
    systemName
    processedDate
    dataQuality {
      completenessScore
      validationErrors
    }
  }
}
```

### 2. Vendor Risk Assessment

```graphql
# Analyze vendor performance across all contracts
contracts(filter: { vendorUei: "123456789" }) {
  edges {
    node {
      analytics {
        performanceMetrics {
          onTimeDeliveryRate
          budgetVariance
          qualityRating
        }
      }
      qualityMetrics {
        overallScore
        certificationLevel
      }
    }
  }
}
```

### 3. Competitive Analysis

```graphql
# Compare competition metrics across contract types
contractAnalytics(
  timeRange: { startDate: "2023-01-01", endDate: "2024-01-01" }
  groupBy: [CONTRACT_TYPE, COMPETITION_TYPE]
) {
  groupByValue
  totalContracts
  averageValue
  breakdown {
    category
    value
    percentage
  }
}
```

### 4. Quality-Driven Decision Making

```graphql
# Find high-value contracts with quality issues
contracts(
  filter: {
    contractValue: { min: 5000000 }
    qualityScoreMin: 0.7
  }
  sort: [{ field: QUALITY_SCORE, direction: ASC }]
) {
  edges {
    node {
      piid
      qualityMetrics {
        overallScore
        qualityIssues {
          severity
          description
          recommendation
        }
      }
    }
  }
}
```

### 5. Predictive Analytics Foundation

```graphql
# Get trend data for forecasting
contract(id: "contract-123") {
  analytics {
    trendAnalysis {
      forecastProjections {
        periodEnd
        projectedValue
        confidence
        methodology
      }
    }
  }
}
```

## Real-Time Capabilities (Subscriptions)

### 1. Quality Monitoring

```graphql
subscription {
  qualityMetricsUpdated(systemName: Contract Data) {
    averageQualityScore
    recordsWithCriticalIssues
    qualityThresholdMet
  }
}
```

### 2. Contract Updates

```graphql
subscription {
  contractUpdated(contractId: "contract-123") {
    lastModified
    statusInfo {
      status
    }
    financialInfo {
      totalContractValue
    }
  }
}
```

### 3. System Health Monitoring

```graphql
subscription {
  systemHealthUpdated {
    systemName
    overallStatus
    components {
      name
      status
      message
    }
  }
}
```

## Mutation Capabilities

### 1. Data Ingestion Control

```graphql
mutation {
  triggerDataIngestion(input: {
    systemName: Contract Data
    batchDate: "2024-01-15"
    forceRefresh: true
  }) {
    jobId
    status
  }
}
```

### 2. Quality Improvement

```graphql
mutation {
  runQualityCheck(input: { tableName: "contracts", checkType: COMPREHENSIVE }) {
    overallScore
    issues {
      severity
      description
    }
  }
}
```

### 3. Data Corrections

```graphql
mutation {
  correctContractData(
    input: {
      contractId: "contract-123"
      corrections: [
        {
          fieldName: "vendorName"
          oldValue: "ACME Corp"
          newValue: "ACME Corporation"
          correctionType: STANDARDIZATION
        }
      ]
      reason: "Vendor name standardization"
    }
  ) {
    vendorInfo {
      vendorName
    }
  }
}
```

## Key Benefits and Previously Impossible Capabilities

1. **Unified Contract View**: See complete contract data across all systems in one query
2. **Quality-Aware Analytics**: Filter out low-quality data before analysis
3. **Cross-System Relationships**: Understand how contracts relate across different systems
4. **Temporal Analysis**: Track contract evolution and system processing over time
5. **Predictive Insights**: Access trend analysis and forecasting data
6. **Real-Time Monitoring**: Subscribe to quality and system health updates
7. **Hierarchical Navigation**: Explore organizational and classification hierarchies
8. **Performance Benchmarking**: Compare vendor and agency performance metrics
9. **Compliance Tracking**: Monitor set-aside and small business participation
10. **Data Lineage**: Understand complete data transformation history

This schema fundamentally transforms government contract data analysis from siloed, system-specific queries to comprehensive, cross-system intelligence gathering.
