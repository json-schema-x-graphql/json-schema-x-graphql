#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { camelToSnake } from '../helpers/case-conversion.mjs';

const repoRoot = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const schemaPath = path.join(repoRoot, 'src', 'data', 'schema_unification.schema.json');

// Full list of missing GraphQL fields (copied from last validate:all run)
const missingFields = [
  "acquisitionData","actionType","additionalInfo","address","agencyCode","alternativeNames","amount","amountSpentOnProduct","analytics","analyticsReadiness","applicantTypes","appropriation","legacy_procurementSpecific","legacy_procurementanceTypes","averageActionValue","averageBidAmount","averageQualityScore","averageScore","averageValue","awardData","baseAndAllOptionsValue","basePerformancePeriod","beneficiaryTypes","body","breakdown","budgetVariance","businessClassification","businessOwner","businessSize","cabinetLevel","category","categoryOfProduct","certificationLevel","checkId","checkType","childContracts","children","city","clearanceLevel","clearanceRequired","clientData","clientOrganizationName","clinData","clinNumber","clinType","coSizeDetermination","code","competitionMetrics","competitionType","competitorCount","completedAt","completenessScore","components","confidence","congressionalDistrict","consistencyScore","contactId","contacts","contractCharacteristics","contractCompleteDate","contractDurationDays","contractFiscalYear","contractId","contractTitle","contractType","contractVehicle","contractingAgency","contractingDepartment","coordinates","count","country","county","createdDate","customerSatisfaction","dataQuality","date","department","description","descriptionOfRequirement","detectedAt","discretionaryFund","intake_processFieldName","intake_processSpecific","elementId","eligibility","email","emergencyAcquisition","employeeThreshold","endDate","enrichmentScore","errors","examples","executedAt","exercised","expirationDate","extendedAmount","facilitySecurityRequired","fieldName","fieldType","financialInfo","fiscalYear","forecastProjections","contract_dataFieldMappings","contract_dataFieldName","contract_dataSpecific","fundingAgency","fundingAmount","fundingDepartment","fundingSources","globalRecordId","governmentFurnishedProperty","groupByValue","historicalIndex","historicalIndexId","iaPiidOrUniqueId","includesCui","independentGovernmentEstimate","index","industry","industryGroup","ingestedAt","invoiceNumber","isActive","isFunded","isLatest","isManual","isPrimary","issueBreakdown","issueCount","issueId","issueType","issues","jobId","lastCarDateSigned","lastChecked","lastModified","lastModifiedDate","lastQualityCheck","lastUpdated","lastValidated","latitude","level","lineItemData","loanTerms","localAreaSetAside","longitude","mappingRule","measurementType","medianValue","message","methodology","metrics","naicsCode","naicsDescription","naicsDetails","name","nationalIndustry","natureOfAcquisition","notSeparatelyPriced","notToExceed","objective","obligationDate","obligations","officeAddress","onTimeDeliveryRate","optionNumber","optionPeriods","optional","organizationHierarchy","organizationId","organizationInfo","originalAwardPiid","overallScore","overallStatus","parent","parentAgency","parentContract","paymentDate","paymentHistory","paymentId","percentage","performanceMetrics","performancePeriod","period","periodEnd","periodOfPerformance","phone","placeOfPerformance","primarySystem","processedDate","programId","programNumber","projectedValue","projects","pscCode","pscDescription","pscDetails","publishedDate","qualityIssues","qualityMetrics","qualityRating","qualityScore","qualityThresholdMet","qualityTrends","quantity","recommendation","recommendations","recordCount","recordId","recordsProcessed","recordsWithAnyIssues","recordsWithCriticalIssues","recurringService","recurringUtilities","referencedPiid","registrationDate","registrationStatus","relatedContracts","relatedPrograms","relationship","reportSubmittedFiscalYear","restrictions","revenueThreshold","role","rules","samStatus","schemaVersion","seasonalPatterns","sector","securityRequirements","serviceType","setAsideForLocalFirms","setAsideType","severity","sizeStandards","socioEconomicCategories","startDate","startedAt","state","status","statusCode","statusInfo","streetAddress","subcategory","subsector","systemChain","systemExtensions","systemName","systemOwner","tableName","templateName","templateVersion","templates","threshold","timelinessScore","title","totalActions","totalContractValue","totalContracts","totalRecords","totalValue","transformationApplied","transformationRules","trend","trendAnalysis","type","typeOfIdc","typeOfProduct","uniqueAgencies","uniqueVendors","unit","unitOfMeasure","unitPrice","uptime","usage","validationErrors","validityScore","value","valueGrowthRate","vendorInfo","vendorName","vendorType","vendorUei","volumeCount","volumeGrowthRate","website","whoCanUseIdc","winRate","year","zip"
];

async function loadSchema() {
  const text = await fs.readFile(schemaPath, 'utf8');
  return JSON.parse(text);
}

function findKeyLocations(obj, targetKey, basePath = '') {
  const results = [];
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const currentPath = basePath ? `${basePath}/${k}` : k;
      if (k === targetKey) {
        results.push(currentPath);
      }
      // If value is object, recurse
      if (v && typeof v === 'object') {
        results.push(...findKeyLocations(v, targetKey, currentPath));
      }
    }
  }
  return results;
}

function findDefOrProp(schema, key) {
  const matches = [];
  // Check top-level $defs or definitions
  const defs = schema.$defs || schema.definitions || {};
  for (const defName of Object.keys(defs)) {
    if (defName === key) matches.push(`$defs/${defName}`);
    // also check inside def properties
    const def = defs[defName];
    if (def && def.properties) {
      if (key in def.properties) matches.push(`$defs/${defName}/properties/${key}`);
      // deeper search
      matches.push(...findKeyLocations(def.properties, key, `$defs/${defName}/properties`));
    }
    // find nested occurrences
    matches.push(...findKeyLocations(def, key, `$defs/${defName}`));
  }

  // Check top-level properties
  if (schema.properties) {
    if (key in schema.properties) matches.push(`properties/${key}`);
    matches.push(...findKeyLocations(schema.properties, key, 'properties'));
  }

  // Last resort: global search through the whole schema
  matches.push(...findKeyLocations(schema, key, ''));

  // Deduplicate
  return Array.from(new Set(matches)).filter(Boolean);
}

(async function main() {
  try {
    const schema = await loadSchema();
    const report = [];

    for (const field of missingFields) {
      const snake = camelToSnake(field);
      const candidates = [field, snake];
      const found = [];
      for (const c of candidates) {
        const locs = findDefOrProp(schema, c);
        if (locs.length) {
          found.push({ candidate: c, locations: locs });
        }
      }
      report.push({ field, snake, found: found.length ? found : 'NOT_FOUND' });
    }

    // Print succinct report: only entries where a match was found, plus a short NOT_FOUND list
    const matched = report.filter(r => r.found !== 'NOT_FOUND');
    const notFound = report.filter(r => r.found === 'NOT_FOUND');

    console.log('Mapping report for missing GraphQL fields (showing matches):\n');
    for (const r of matched) {
      console.log(`- ${r.field} -> snake: ${r.snake}`);
      for (const hit of r.found) {
        console.log(`    candidate '${hit.candidate}' found at:`);
        for (const p of hit.locations.slice(0, 10)) console.log(`      - ${p}`);
      }
    }

    console.log('\n---\nFields not found in schema (candidates tried: original, snake_case):\n');
    for (const r of notFound.slice(0, 200)) console.log(`- ${r.field} (snake: ${r.snake})`);

    // Summary
    console.log(`\nSummary: ${matched.length} fields mapped, ${notFound.length} not found (of ${report.length}).`);

  } catch (err) {
    console.error('Error while mapping:', err);
    process.exit(1);
  }
})();
