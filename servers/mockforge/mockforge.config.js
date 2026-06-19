/**
 * MockForge Configuration
 *
 * Custom resolvers and faker.js integration for realistic mock data
 * generation from the Petrified Forest supergraph.
 */
import { faker } from "@faker-js/faker";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

// Seed faker for deterministic data
faker.seed(12345);

/**
 * Load seed data from CSV files
 */
class SeedDataLoader {
  constructor() {
    this.cache = {};
  }

  load(system) {
    if (this.cache[system]) return this.cache[system];

    const csvPath = path.join(process.cwd(), "dev/pocs/mockforge/seed-data", `${system}.csv`);

    try {
      if (fs.existsSync(csvPath)) {
        const content = fs.readFileSync(csvPath, "utf-8");
        this.cache[system] = parse(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        console.log(`✅ Loaded ${this.cache[system].length} records from ${system}.csv`);
      } else {
        console.warn(`⚠️  Seed file not found: ${csvPath}`);
        this.cache[system] = [];
      }
    } catch (e) {
      console.error(`❌ Error loading ${system}.csv:`, e.message);
      this.cache[system] = [];
    }

    return this.cache[system];
  }

  getRandomRecord(system) {
    const data = this.load(system);
    return data.length > 0 ? faker.helpers.arrayElement(data) : null;
  }
}

const seedLoader = new SeedDataLoader();

const profileState = new WeakMap();

const AGENCY_CODE_WEIGHTS = [
  { value: "9700", weight: 22 },
  { value: "8000", weight: 10 },
  { value: "4720", weight: 9 },
  { value: "2100", weight: 7 },
  { value: "1900", weight: 6 },
  { value: "1301", weight: 5 },
  { value: "1448", weight: 5 },
  { value: "7008", weight: 5 },
  { value: "1550", weight: 4 },
  { value: "1605", weight: 4 },
  { value: "12D2", weight: 3 },
  { value: "12K3", weight: 3 },
  { value: "4745", weight: 3 },
  { value: "97AS", weight: 2 },
];

const TOP_VENDOR_NAMES = [
  "AMERISOURCEBERGEN DRUG CORPORATION",
  "CARDINAL HEALTH 200, LLC",
  "NATIONAL INDUSTRIES FOR THE BLIND",
  "SCIENCE APPLICATIONS INTERNATIONAL CORPORATION",
  "OWENS & MINOR DISTRIBUTION, INC.",
  "ASRC FEDERAL FACILITIES LOGISTICS, LLC",
  "W.W. GRAINGER, INC.",
  "NOBLE SALES CO., INC.",
  "LOCKHEED MARTIN CORPORATION",
  "BOOZ ALLEN HAMILTON INC.",
  "DELOITTE CONSULTING LLP",
  "GENERAL DYNAMICS INFORMATION TECHNOLOGY, INC.",
  "LEIDOS, INC.",
  "NORTHROP GRUMMAN SYSTEMS CORPORATION",
  "RAYTHEON COMPANY",
];

const NAICS_CODE_WEIGHTS = [
  { value: "423450", weight: 10 },
  { value: "424210", weight: 10 },
  { value: "311991", weight: 8 },
  { value: "311812", weight: 8 },
  { value: "324110", weight: 7 },
  { value: "541330", weight: 7 },
  { value: "325411", weight: 6 },
  { value: "453210", weight: 6 },
  { value: "336413", weight: 6 },
  { value: "541519", weight: 6 },
  { value: "444130", weight: 5 },
  { value: "324191", weight: 5 },
  { value: "332212", weight: 5 },
  { value: "332510", weight: 5 },
  { value: "236220", weight: 6 },
];

const PSC_CODE_WEIGHTS = [
  { value: "6515", weight: 12 },
  { value: "6505", weight: 11 },
  { value: "8915", weight: 10 },
  { value: "5120", weight: 9 },
  { value: "7510", weight: 9 },
  { value: "6640", weight: 8 },
  { value: "9130", weight: 7 },
  { value: "R499", weight: 12 },
  { value: "5340", weight: 10 },
  { value: "8910", weight: 10 },
];

const POP_STATE_WEIGHTS = [
  { value: "VA", weight: 12 },
  { value: "IL", weight: 8 },
  { value: "CA", weight: 8 },
  { value: "PA", weight: 8 },
  { value: "NJ", weight: 6 },
  { value: "TX", weight: 5 },
  { value: "MD", weight: 4 },
  { value: "NY", weight: 4 },
  { value: "FL", weight: 4 },
  { value: "OH", weight: 3 },
  { value: "GA", weight: 3 },
  { value: "NC", weight: 3 },
  { value: "DC", weight: 2 },
  { value: "WA", weight: 2 },
  { value: "CO", weight: 2 },
];

function pickWeighted(options) {
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  let threshold = faker.number.float({ min: 0, max: totalWeight, fractionDigits: 8 });

  for (const option of options) {
    threshold -= option.weight;
    if (threshold <= 0) {
      return typeof option.value === "function" ? option.value() : option.value;
    }
  }

  const fallback = options[options.length - 1]?.value;
  return typeof fallback === "function" ? fallback() : fallback;
}

function sampleStandardNormal() {
  let u1 = 0;
  let u2 = 0;

  while (u1 === 0) {
    u1 = faker.number.float({ min: Number.EPSILON, max: 1, fractionDigits: 8 });
  }

  while (u2 === 0) {
    u2 = faker.number.float({ min: Number.EPSILON, max: 1, fractionDigits: 8 });
  }

  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

function sampleLogNormal({ median, sigma, min = 0, max = Number.MAX_SAFE_INTEGER }) {
  const mu = Math.log(median);
  const value = Math.exp(mu + sigma * sampleStandardNormal());
  const bounded = Math.min(Math.max(value, min), max);
  return Number(bounded.toFixed(2));
}

function getParentProfile(parent, key, factory) {
  if (!parent || typeof parent !== "object") {
    return factory();
  }

  let entry = profileState.get(parent);
  if (!entry) {
    entry = {};
    profileState.set(parent, entry);
  }

  if (!entry[key]) {
    entry[key] = factory();
  }

  return entry[key];
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function generatePIID() {
  const patterns = [
    () => faker.string.alphanumeric({ length: 4, casing: "upper" }),
    () =>
      `SPM${faker.string.alphanumeric({ length: 2, casing: "upper" })}${faker.string.numeric(2)}${pickWeighted([
        { value: "D", weight: 45 },
        { value: "F", weight: 35 },
        { value: "C", weight: 20 },
      ])}${faker.string.numeric(4)}`,
    () =>
      `${faker.string.numeric(2)}${faker.string.alpha({ length: 3, casing: "upper" })}${faker.string.numeric(3)}${pickWeighted([
        { value: "D", weight: 40 },
        { value: "F", weight: 35 },
        { value: "C", weight: 25 },
      ])}${faker.string.numeric(4)}`,
    () =>
      `GS-${faker.string.numeric(2)}F-${faker.string.numeric(3)}${faker.string.alpha({ length: 2, casing: "upper" })}`,
  ];

  return faker.helpers.arrayElement(patterns)();
}

/**
 * Generate realistic DUNS numbers
 */
function generateDUNS() {
  return faker.string.numeric(9);
}

/**
 * Generate realistic UEI (Unique Entity Identifier)
 */
function generateUEI() {
  return faker.string.alphanumeric(12).toUpperCase();
}

function generateVendorName() {
  if (faker.datatype.boolean({ probability: 0.8 })) {
    return faker.helpers.arrayElement(TOP_VENDOR_NAMES);
  }

  return faker.company.name().toUpperCase();
}

/**
 * Generate realistic NAICS codes
 */
function generateNAICS() {
  return pickWeighted(NAICS_CODE_WEIGHTS);
}

/**
 * Generate realistic PSC (Product Service Code)
 */
function generatePSC() {
  return pickWeighted(PSC_CODE_WEIGHTS);
}

/**
 * Generate realistic contract amounts
 */
function generateAgencyCode() {
  return pickWeighted(AGENCY_CODE_WEIGHTS);
}

function generateStateCode() {
  return pickWeighted(POP_STATE_WEIGHTS);
}

function generateDollarsObligated() {
  if (faker.datatype.boolean({ probability: 0.2 })) {
    return 0;
  }

  return sampleLogNormal({ median: 860, sigma: 2.2, min: 0, max: 344000000000 });
}

function generateContractAmount() {
  return sampleLogNormal({ median: 307, sigma: 2.5, min: 0, max: 292000000000000 });
}

function generateHeaderDockey() {
  return faker.string.numeric({ length: faker.number.int({ min: 7, max: 10 }) });
}

function generateDateBundle() {
  const actionDate = faker.date.between({ from: "2015-01-01", to: "2026-06-03" });
  const solicitationLeadDays = faker.number.int({ min: 1, max: 180 });
  const solicitationDate = new Date(actionDate);
  solicitationDate.setDate(solicitationDate.getDate() - solicitationLeadDays);

  const signedLeadDays = faker.number.int({ min: 0, max: 3 });
  const dateSigned = new Date(actionDate);
  dateSigned.setDate(dateSigned.getDate() - signedLeadDays);

  const effectiveLagDays = faker.number.int({ min: 0, max: 30 });
  const effectiveDate = new Date(actionDate);
  effectiveDate.setDate(effectiveDate.getDate() + effectiveLagDays);

  const currentCompletionDate = new Date(effectiveDate);
  currentCompletionDate.setDate(currentCompletionDate.getDate() + faker.number.int({ min: 30, max: 365 * 3 }));

  const ultimateCompletionDate = new Date(currentCompletionDate);
  ultimateCompletionDate.setDate(ultimateCompletionDate.getDate() + faker.number.int({ min: 0, max: 365 }));

  const fiscalYear = effectiveDate.getMonth() >= 9 ? String(effectiveDate.getFullYear() + 1) : String(effectiveDate.getFullYear());

  return {
    solicitationDate,
    actionDate,
    dateSigned,
    effectiveDate,
    currentCompletionDate,
    ultimateCompletionDate,
    fiscalYear,
  };
}

function getEntityProfile(parent, system) {
  return getParentProfile(parent, `entity:${system}`, () => {
    const piid = parent?._mockInputPiid || generatePIID();
    const awardOrIdv = pickWeighted([
      { value: "AWARD", weight: 75 },
      { value: "IDV", weight: 25 },
    ]);
    const initialAward = faker.datatype.boolean({ probability: 0.3 });
    const dateBundle = generateDateBundle();

    return {
      piid,
      referencePiid: initialAward ? null : generatePIID(),
      vendorUei: generateUEI(),
      vendorDuns: generateDUNS(),
      vendorName: generateVendorName(),
      naics: generateNAICS(),
      psc: generatePSC(),
      contractingAgencyCode: generateAgencyCode(),
      fundingAgencyCode: generateAgencyCode(),
      state: generateStateCode(),
      zipCode: faker.location.zipCode(),
      congressionalDistrict: faker.number.int({ min: 1, max: 53 }).toString().padStart(2, "0"),
      awardAmount: generateContractAmount(),
      obligatedAmount: generateDollarsObligated(),
      baseAndAllOptionsValue: generateContractAmount(),
      currentTotalValueAward: generateContractAmount(),
      awardOrIdv,
      isInitialAward: initialAward,
      modificationNumber: initialAward
        ? "0"
        : `P${faker.string.numeric(5)}`,
      headerDockey: parent?._mockHeaderDockey || generateHeaderDockey(),
      dateBundle,
    };
  });
}

/**
 * Custom resolvers for specific GraphQL types
 */
export const customResolvers = {
  Query: {
    fpds: () => ({}),
    usaspending: () => ({}),
    assist: () => ({}),
    easi: () => ({}),
    calm: () => ({}),
  },

  FpdsQuery: {
    record: (_parent, { piid, agency_code }) => ({ _mockInputPiid: piid, _mockAgencyCode: agency_code }),
  },

  UsaspendingQuery: {
    procurement: (_parent, { piid }) => ({ _mockInputPiid: piid }),
    procurementByKey: (_parent, { unique_award_key }) => ({ _mockInputPiid: unique_award_key?.split("_")[2] || generatePIID() }),
  },

  AssistQuery: {
    award: (_parent, { award_piid }) => ({ _mockInputPiid: award_piid }),
  },

  CalmQuery: {
    award: (_parent, { header_dockey }) => ({ _mockHeaderDockey: header_dockey }),
  },

  // FPDS-specific resolvers
  FpdsRecord: {
    piid: parent => getEntityProfile(parent, "fpds").piid,
    contractNumber: parent => getEntityProfile(parent, "fpds").piid,
    awardAmount: parent => getEntityProfile(parent, "fpds").awardAmount,
    obligatedAmount: parent => getEntityProfile(parent, "fpds").obligatedAmount,
    baseAndAllOptionsValue: parent => getEntityProfile(parent, "fpds").baseAndAllOptionsValue,
    actionDate: parent => formatDate(getEntityProfile(parent, "fpds").dateBundle.actionDate),
    awardDate: parent => getEntityProfile(parent, "fpds").dateBundle.actionDate.toISOString(),
    effectiveDate: parent => getEntityProfile(parent, "fpds").dateBundle.effectiveDate.toISOString(),
    currentCompletionDate: parent =>
      getEntityProfile(parent, "fpds").dateBundle.currentCompletionDate.toISOString(),
    contractingOfficeAgencyId: parent => getEntityProfile(parent, "fpds").contractingAgencyCode,
    contractingOfficeId: () => faker.string.alphanumeric(6).toUpperCase(),
    fundingAgencyCode: parent => getEntityProfile(parent, "fpds").fundingAgencyCode,
    placeCongressionalDistrict: parent =>
      getEntityProfile(parent, "fpds").congressionalDistrict,
  },

  FpdsClassification: {
    naicsCode: parent => getEntityProfile(parent, "fpds").naics,
    productOrServiceCode: parent => getEntityProfile(parent, "fpds").psc,
  },

  FpdsVendor: {
    vendorName: parent => {
      const seed = seedLoader.getRandomRecord("fpds");
      return seed?.vendor_name || getEntityProfile(parent, "fpds").vendorName;
    },
    vendorUei: parent => getEntityProfile(parent, "fpds").vendorUei,
  },

  // USAspending-specific resolvers
  UsaspendingProcurement: {
    piid: parent => getEntityProfile(parent, "usaspending").piid,
    unique_award_key: parent => {
      const profile = getEntityProfile(parent, "usaspending");
      return `CONT_AWD_${profile.contractingAgencyCode}_${profile.piid}_${profile.modificationNumber}`;
    },
    awardee_or_recipient_uniqu: parent => getEntityProfile(parent, "usaspending").vendorDuns,
    awardee_or_recipient_uei: parent => getEntityProfile(parent, "usaspending").vendorUei,
    awardee_or_recipient_legal: parent => {
      const seed = seedLoader.getRandomRecord("usaspending");
      return seed?.awardee_name || getEntityProfile(parent, "usaspending").vendorName;
    },
    naics: parent => getEntityProfile(parent, "usaspending").naics,
    product_or_service_code: parent => getEntityProfile(parent, "usaspending").psc,
    federal_action_obligation: parent => getEntityProfile(parent, "usaspending").obligatedAmount,
    current_total_value_award: parent =>
      String(getEntityProfile(parent, "usaspending").currentTotalValueAward),
    action_date: parent => formatDate(getEntityProfile(parent, "usaspending").dateBundle.actionDate),
    period_of_performance_star: parent =>
      formatDate(getEntityProfile(parent, "usaspending").dateBundle.effectiveDate),
    period_of_performance_curr: parent =>
      formatDate(getEntityProfile(parent, "usaspending").dateBundle.currentCompletionDate),
    legal_entity_zip4: parent => getEntityProfile(parent, "usaspending").zipCode,
    place_of_performance_zip4a: parent => getEntityProfile(parent, "usaspending").zipCode,
  },

  // ASSIST-specific resolvers
  AssistAward: {
    ia_piid_or_unique_id: parent => `IA${getEntityProfile(parent, "assist").piid}`,
    source_record_id: () => faker.string.uuid(),
    assist_award_data: parent => ({
      award_amount: getEntityProfile(parent, "assist").awardAmount,
      award_date: formatDate(getEntityProfile(parent, "assist").dateBundle.actionDate),
      recipient_name: getEntityProfile(parent, "assist").vendorName,
      recipient_duns: getEntityProfile(parent, "assist").vendorDuns,
    }),
  },

  // EASI-specific resolvers
  EasiContract: {
    contractNbr: parent => getEntityProfile(parent, "easi").piid,
    contractingOfficeCd: parent => getEntityProfile(parent, "easi").contractingAgencyCode,
    vendorName: parent => {
      const seed = seedLoader.getRandomRecord("easi");
      return seed?.vendor_name || getEntityProfile(parent, "easi").vendorName;
    },
    executedDt: parent => formatDate(getEntityProfile(parent, "easi").dateBundle.actionDate),
    startDt: parent =>
      formatDate(getEntityProfile(parent, "easi").dateBundle.effectiveDate),
    endDt: parent =>
      formatDate(getEntityProfile(parent, "easi").dateBundle.currentCompletionDate),
    modSerialNumber: parent => getEntityProfile(parent, "easi").modificationNumber,
    pegVendorCd: parent => getEntityProfile(parent, "easi").vendorUei,
  },

  // CALM-specific resolvers
  CalmAward: {
    headerDockey: parent => getEntityProfile(parent, "calm").headerDockey,
    awardNumber: parent => getEntityProfile(parent, "calm").piid,
    solicitationNumber: parent => getEntityProfile(parent, "calm").referencePiid,
    vendorName: parent => {
      const seed = seedLoader.getRandomRecord("calm");
      return seed?.vendor_name || getEntityProfile(parent, "calm").vendorName;
    },
    vendorState: parent => getEntityProfile(parent, "calm").state,
    awardDate: parent => getEntityProfile(parent, "calm").dateBundle.actionDate.toISOString(),
    signedDate: parent => getEntityProfile(parent, "calm").dateBundle.dateSigned.toISOString(),
    effectiveDate: parent => getEntityProfile(parent, "calm").dateBundle.effectiveDate.toISOString(),
    completionDate: parent =>
      getEntityProfile(parent, "calm").dateBundle.currentCompletionDate.toISOString(),
    ultimateCompletionDate: parent =>
      getEntityProfile(parent, "calm").dateBundle.ultimateCompletionDate.toISOString(),
    popStartDate: parent => getEntityProfile(parent, "calm").dateBundle.effectiveDate.toISOString(),
    popEndDate: parent =>
      getEntityProfile(parent, "calm").dateBundle.currentCompletionDate.toISOString(),
    solicitationDate: parent =>
      getEntityProfile(parent, "calm").dateBundle.solicitationDate.toISOString(),
    ctrOfficeId: parent => getEntityProfile(parent, "calm").contractingAgencyCode,
    extentCompeted: () => pickWeighted([
      { value: "A", weight: 53 },
      { value: "F", weight: 12 },
      { value: "D", weight: 10 },
      { value: "C", weight: 9 },
      { value: "B", weight: 6 },
      { value: "G", weight: 5 },
      { value: "CDO", weight: 2 },
      { value: null, weight: 3 },
    ]),
    setaside: () => pickWeighted([
      { value: null, weight: 48 },
      { value: "NONE", weight: 43 },
      { value: "SBA", weight: 6 },
      { value: "8AN", weight: 1 },
      { value: "SDVOSBC", weight: 1 },
      { value: "8A", weight: 1 },
    ]),
    fpdsUniqueActionId: parent =>
      `${getEntityProfile(parent, "calm").contractingAgencyCode}_${getEntityProfile(parent, "calm").fundingAgencyCode}_${getEntityProfile(parent, "calm").piid}_${getEntityProfile(parent, "calm").modificationNumber}_${getEntityProfile(parent, "calm").referencePiid || getEntityProfile(parent, "calm").piid}_0`,
    fpdsModificationNumber: parent => getEntityProfile(parent, "calm").modificationNumber,
    fpdsAwardOrIdv: parent => getEntityProfile(parent, "calm").awardOrIdv,
    fpdsActionDate: parent => getEntityProfile(parent, "calm").dateBundle.actionDate.toISOString(),
    fpdsEffectiveDate: parent => getEntityProfile(parent, "calm").dateBundle.effectiveDate.toISOString(),
    fpdsCurrentCompletionDate: parent =>
      getEntityProfile(parent, "calm").dateBundle.currentCompletionDate.toISOString(),
    fpdsUltimateCompletionDate: parent =>
      getEntityProfile(parent, "calm").dateBundle.ultimateCompletionDate.toISOString(),
    fpdsVendorName: parent => getEntityProfile(parent, "calm").vendorName,
    fpdsVendorDunsNumber: parent => getEntityProfile(parent, "calm").vendorDuns,
  },

};

/**
 * Field-level resolver patterns
 */
export const fieldPatterns = {
  // Email fields
  email: () => faker.internet.email(),
  contact_email: () => faker.internet.email(),

  // Phone fields
  phone: () => faker.phone.number(),
  phone_number: () => faker.phone.number(),
  fax: () => faker.phone.number(),

  // Address fields
  street: () => faker.location.streetAddress(),
  address: () => faker.location.streetAddress(),
  city: () => faker.location.city(),
  state: () => generateStateCode(),
  zip: () => faker.location.zipCode(),
  zipcode: () => faker.location.zipCode(),
  country: () => "US",

  // Name fields
  name: () => faker.person.fullName(),
  first_name: () => faker.person.firstName(),
  last_name: () => faker.person.lastName(),
  contact_name: () => faker.person.fullName(),

  // Business fields
  company: () => generateVendorName(),
  vendor: () => generateVendorName(),
  contractor: () => generateVendorName(),

  // ID fields
  id: () => faker.string.uuid(),
  uuid: () => faker.string.uuid(),
  guid: () => faker.string.uuid(),

  // DUNS/UEI fields
  duns: () => generateDUNS(),
  uei: () => generateUEI(),

  // Contract identifiers
  piid: () => generatePIID(),
  contract_number: () => generatePIID(),
  unique_action_id: () => {
    const agencyCode = generateAgencyCode();
    const fundingAgencyCode = generateAgencyCode();
    const piid = generatePIID();
    const referencePiid = generatePIID();
    const modNumber = faker.datatype.boolean({ probability: 0.3 })
      ? "0"
      : `P${faker.string.numeric(5)}`;
    return `${agencyCode}_${fundingAgencyCode}_${piid}_${modNumber}_${referencePiid}_0`;
  },
  unique_contract_id: () => {
    const agencyCode = generateAgencyCode();
    return `${agencyCode}_${agencyCode}_${generatePIID()}_${generatePIID()}`;
  },

  // Codes
  naics: () => generateNAICS(),
  psc: () => generatePSC(),

  // Amounts
  amount: () => generateContractAmount(),
  value: () => generateContractAmount(),
  cost: () => generateContractAmount(),
  price: () => generateContractAmount(),
  decimal: () => generateContractAmount(),
  total_obligated_amount: () => generateDollarsObligated(),
  borrowing_authority_amount: () => generateContractAmount(),
  current_total_value_award: () => generateContractAmount(),

  // Dates
  date: () => faker.date.recent({ days: 365 }).toISOString().split("T")[0],
  created_at: () => faker.date.past({ years: 2 }).toISOString(),
  updated_at: () => faker.date.recent({ days: 30 }).toISOString(),

  // Descriptions
  description: () => faker.lorem.sentence(),
  notes: () => faker.lorem.paragraph(),
  comments: () => faker.lorem.paragraph(),
};

export default {
  customResolvers,
  fieldPatterns,
};
