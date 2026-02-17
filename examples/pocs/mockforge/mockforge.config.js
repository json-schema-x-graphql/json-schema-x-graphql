/**
 * MockForge Configuration
 *
 * Custom resolvers and faker.js integration for realistic mock data
 * generation from the Petrified Forest supergraph.
 */

import { faker } from "@faker-js/faker";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

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

    // Adjusted path slightly to work relative to where mock-server.js runs or project root
    // The original code used process.cwd() joined with dev/pocs/mockforge which might be specific to that project structure.
    // I'll update it to check local seed-data directory first.
    const csvPath = path.join(process.cwd(), "seed-data", `${system}.csv`);

    try {
      if (fs.existsSync(csvPath)) {
        const content = fs.readFileSync(csvPath, "utf-8");
        this.cache[system] = parse(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        console.log(
          `✅ Loaded ${this.cache[system].length} records from ${system}.csv`,
        );
      } else {
        // console.warn(`⚠️  Seed file not found: ${csvPath}`);
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

/**
 * Generate realistic PIIDs (Procurement Instrument Identifiers)
 */
function generatePIID() {
  const agency = faker.helpers.arrayElement([
    "GS",
    "FA",
    "N00",
    "W911",
    "HSHQDC",
  ]);
  const year = faker.date
    .between({ from: "2020-01-01", to: "2025-12-31" })
    .getFullYear()
    .toString()
    .slice(2);
  const sequence = faker.string.numeric(5);
  return `${agency}${year}F${sequence}`;
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

/**
 * Generate realistic NAICS codes
 */
function generateNAICS() {
  const codes = [
    "541511",
    "541512",
    "541513",
    "541519",
    "541611",
    "541618",
    "541690",
    "541715",
    "541990",
    "561210",
    "561320",
    "561499",
  ];
  return faker.helpers.arrayElement(codes);
}

/**
 * Generate realistic PSC (Product Service Code)
 */
function generatePSC() {
  const codes = [
    "D302",
    "D307",
    "D310",
    "D313",
    "D314",
    "D316",
    "D399",
    "R408",
    "R413",
    "R425",
    "R497",
    "R499",
  ];
  return faker.helpers.arrayElement(codes);
}

/**
 * Generate realistic contract amounts
 */
function generateContractAmount() {
  const amounts = [
    faker.number.float({ min: 10000, max: 100000, precision: 0.01 }),
    faker.number.float({ min: 100000, max: 1000000, precision: 0.01 }),
    faker.number.float({ min: 1000000, max: 10000000, precision: 0.01 }),
  ];
  return faker.helpers.arrayElement(amounts);
}

/**
 * Custom resolvers for specific GraphQL types
 */
export const customResolvers = {
  // FPDS-specific resolvers
  FPDSProcurement: {
    piid: () => generatePIID(),
    contractNumber: () => generatePIID(),
    vendorDuns: () => generateDUNS(),
    vendorUei: () => generateUEI(),
    vendorName: () => {
      const seed = seedLoader.getRandomRecord("fpds");
      return seed?.vendor_name || faker.company.name();
    },
    naics: () => generateNAICS(),
    psc: () => generatePSC(),
    awardAmount: () => generateContractAmount(),
    obligatedAmount: () => generateContractAmount(),
    baseAndAllOptionsValue: () => generateContractAmount(),
    awardDate: () =>
      faker.date
        .between({ from: "2020-01-01", to: "2025-12-31" })
        .toISOString(),
    effectiveDate: () => faker.date.recent({ days: 365 }).toISOString(),
    currentCompletionDate: () => faker.date.future({ years: 2 }).toISOString(),
    contractingOfficeAgencyId: () =>
      faker.helpers.arrayElement(["4700", "9700", "1600", "7000"]),
    contractingOfficeId: () => faker.string.alphanumeric(6).toUpperCase(),
    fundingAgencyId: () =>
      faker.helpers.arrayElement(["4700", "9700", "1600", "7000"]),
    placeOfPerformanceZip: () => faker.location.zipCode(),
    placeOfPerformanceCongressionalDistrict: () =>
      faker.number.int({ min: 1, max: 53 }).toString().padStart(2, "0"),
  },

  // USAspending-specific resolvers
  USAspendingProcurement: {
    piid: () => generatePIID(),
    unique_award_key: () =>
      `CONT_AWD_${faker.string.alphanumeric(20).toUpperCase()}`,
    awardee_or_recipient_uniqu: () => generateDUNS(),
    awardee_or_recipient_uei: () => generateUEI(),
    awardee_or_recipient_legal: () => {
      const seed = seedLoader.getRandomRecord("usaspending");
      return seed?.awardee_name || faker.company.name();
    },
    naics: () => generateNAICS(),
    product_or_service_code: () => generatePSC(),
    federal_action_obligation: () => generateContractAmount(),
    current_total_value_award: () => generateContractAmount().toString(),
    action_date: () =>
      faker.date.recent({ days: 365 }).toISOString().split("T")[0],
    period_of_performance_star: () =>
      faker.date.past({ years: 1 }).toISOString().split("T")[0],
    period_of_performance_curr: () =>
      faker.date.future({ years: 1 }).toISOString().split("T")[0],
    legal_entity_zip4: () => faker.location.zipCode(),
    place_of_performance_zip4a: () => faker.location.zipCode(),
  },

  // ASSIST-specific resolvers
  AssistRecord: {
    ia_piid_or_unique_id: () => `IA${generatePIID()}`,
    source_record_id: () => faker.string.uuid(),
    assist_award_data: () => ({
      award_amount: generateContractAmount(),
      award_date: faker.date.past({ years: 2 }).toISOString().split("T")[0],
      recipient_name: faker.company.name(),
      recipient_duns: generateDUNS(),
    }),
  },

  // EASI-specific resolvers
  EASIProcurement: {
    piid: () => generatePIID(),
    contract_number: () => generatePIID(),
    vendor_name: () => {
      const seed = seedLoader.getRandomRecord("easi");
      return seed?.vendor_name || faker.company.name();
    },
    vendor_duns: () => generateDUNS(),
    total_contract_value: () => generateContractAmount(),
    award_date: () => faker.date.past({ years: 2 }).toISOString().split("T")[0],
    period_of_performance_start: () =>
      faker.date.past({ years: 1 }).toISOString().split("T")[0],
    period_of_performance_end: () =>
      faker.date.future({ years: 2 }).toISOString().split("T")[0],
  },

  // CALM-specific resolvers
  CALMContract: {
    contract_id: () => faker.string.uuid(),
    piid: () => generatePIID(),
    vendor_name: () => {
      const seed = seedLoader.getRandomRecord("calm");
      return seed?.vendor_name || faker.company.name();
    },
    vendor_duns: () => generateDUNS(),
    contract_value: () => generateContractAmount().toString(),
    award_date: () => faker.date.past({ years: 2 }).toISOString().split("T")[0],
    contract_start_date: () =>
      faker.date.past({ years: 1 }).toISOString().split("T")[0],
    contract_end_date: () =>
      faker.date.future({ years: 2 }).toISOString().split("T")[0],
  },

  // Shared types
  DateTime: () => faker.date.recent({ days: 90 }).toISOString(),
  Date: () => faker.date.recent({ days: 90 }).toISOString().split("T")[0],
  Email: () => faker.internet.email(),
  Decimal: () => faker.number.float({ min: 0, max: 1000000, precision: 0.01 }),
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
  state: () => faker.location.state({ abbreviated: true }),
  zip: () => faker.location.zipCode(),
  zipcode: () => faker.location.zipCode(),
  country: () => "USA",

  // Name fields
  name: () => faker.person.fullName(),
  first_name: () => faker.person.firstName(),
  last_name: () => faker.person.lastName(),
  contact_name: () => faker.person.fullName(),

  // Business fields
  company: () => faker.company.name(),
  vendor: () => faker.company.name(),
  contractor: () => faker.company.name(),

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

  // Codes
  naics: () => generateNAICS(),
  psc: () => generatePSC(),

  // Amounts
  amount: () => generateContractAmount(),
  value: () => generateContractAmount(),
  cost: () => generateContractAmount(),
  price: () => generateContractAmount(),

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
