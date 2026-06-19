/**
 * Federation-Aware Gateway Server
 *
 * Stitching gateway that merges all subgraph schemas and routes queries
 * to the correct subgraph. Supports both local development (localhost)
 * and Docker (service hostnames).
 *
 * Uses @graphql-tools/stitch with type merging to resolve federation
 * entities across subgraphs (e.g. FpdsRecord.piid -> UsaspendingProcurement).
 *
 * Phase 2a: Unified Contract entity — queries all subgraphs by PIID
 * Phase 2b: FieldMapping query — exposes cross-system field name mappings
 * Phase 2c: System health extensions — per-request subgraph latency/status
 *
 * Usage:
 *   PORT=4000 node gateway-server.js           # local dev (subgraphs on localhost)
 *   PORT=4000 DOCKER=1 node gateway-server.js  # Docker (service hostnames)
 */
import { delegateToSchema } from "@graphql-tools/delegate";
import { buildHTTPExecutor } from "@graphql-tools/executor-http";
import { stitchSchemas } from "@graphql-tools/stitch";
import { schemaFromExecutor } from "@graphql-tools/wrap";
import fs from "fs";
import { createYoga } from "graphql-yoga";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const IS_DOCKER = process.env.DOCKER === "1";

// ---------------------------------------------------------------------------
// Subgraph configurations
// ---------------------------------------------------------------------------

const subgraphs = [
  { name: "fpds", localPort: 4001, dockerHost: "fpds-mock" },
  { name: "usaspending", localPort: 4002, dockerHost: "usaspending-mock" },
  { name: "assist", localPort: 4003, dockerHost: "assist-mock" },
  { name: "easi", localPort: 4004, dockerHost: "easi-mock" },
  { name: "calm", localPort: 4005, dockerHost: "calm-mock" },
  { name: "example", localPort: 4006, dockerHost: "example-mock" },
].map(sg => ({
  ...sg,
  url: IS_DOCKER
    ? `http://${sg.dockerHost}:${sg.localPort}/graphql`
    : `http://localhost:${sg.localPort}/graphql`,
}));

console.log("🔨 Building federation gateway...");
console.log(`   Mode: ${IS_DOCKER ? "Docker" : "Local development"}`);

// ---------------------------------------------------------------------------
// Phase 2b: Load field mapping data at startup
// ---------------------------------------------------------------------------

/**
 * Load and transform the GSDM mapping file into FieldMapping records.
 * Falls back to a curated seed list when the file is unavailable.
 */
function loadFieldMappings() {
  // Try GSDM mapping-resolved.json first (richest cross-system data)
  const gsdmPath = path.join(__dirname, "../../../generated-schemas/gsdm/mapping-resolved.json");

  if (fs.existsSync(gsdmPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(gsdmPath, "utf8"));
      const entries = Array.isArray(raw.entries) ? raw.entries : [];

      return entries
        .filter(e => e.canonical_path && typeof e.canonical_path === "string")
        .map(e => {
          // canonical_path looks like "common_elements.contract_identification.piid"
          const parts = e.canonical_path.split(".");
          const leaf = parts[parts.length - 1];

          return {
            canonicalName: e.canonical_path,
            description: e.description || null,
            fpdsField: e.gsdm_path || null,
            usaspendingField: leaf || null,
            assistField: null,
            calmField: null,
            easiField: null,
          };
        });
    } catch (err) {
      console.warn(`⚠️  Could not parse GSDM mapping: ${err.message}`);
    }
  }

  // Curated seed list of well-known cross-system fields
  return [
    {
      canonicalName: "piid",
      description: "Procurement Instrument Identifier — primary join key across all systems",
      fpdsField: "awardContractId.piid",
      usaspendingField: "piid",
      assistField: "award_piid",
      calmField: "solicitation_number",
      easiField: "contract_nbr",
    },
    {
      canonicalName: "vendor.uei",
      description: "Unique Entity Identifier (SAM.gov) for the vendor/awardee",
      fpdsField: "vendor.vendorUei",
      usaspendingField: "awardee_or_recipient_uei",
      assistField: "vendor_uei",
      calmField: null,
      easiField: "peg_vendor_cd",
    },
    {
      canonicalName: "vendor.name",
      description: "Legal business name of the vendor/awardee",
      fpdsField: "vendor.vendorName",
      usaspendingField: "awardee_or_recipient_legal",
      assistField: "vendor_name",
      calmField: null,
      easiField: null,
    },
    {
      canonicalName: "vendor.cageCode",
      description: "Commercial and Government Entity (CAGE) code",
      fpdsField: "vendor.cageCode",
      usaspendingField: "cage_code",
      assistField: null,
      calmField: null,
      easiField: null,
    },
    {
      canonicalName: "agency.awardingAgencyCode",
      description: "Awarding agency code (2–3 digit FSDS code)",
      fpdsField: "purchaserInformation.contractingOfficeAgencyId",
      usaspendingField: "awarding_agency_code",
      assistField: null,
      calmField: null,
      easiField: "contracting_office_cd",
    },
    {
      canonicalName: "agency.fundingAgencyCode",
      description: "Funding agency code",
      fpdsField: "purchaserInformation.fundingRequestingAgencyId",
      usaspendingField: "funding_agency_code",
      assistField: null,
      calmField: null,
      easiField: null,
    },
    {
      canonicalName: "classification.naicsCode",
      description: "North American Industry Classification System (NAICS) code — 6 digits",
      fpdsField: "productOrServiceInformation.principalNaicsCode",
      usaspendingField: "naics",
      assistField: "naics_code",
      calmField: "primary_naics_code",
      easiField: null,
    },
    {
      canonicalName: "classification.pscCode",
      description: "Product or Service Code (PSC)",
      fpdsField: "productOrServiceInformation.productOrServiceCode",
      usaspendingField: "product_or_service_code",
      assistField: "psc_code",
      calmField: "primary_product_code",
      easiField: null,
    },
    {
      canonicalName: "classification.contractType",
      description: "Contract award type code (FFP, CPFF, T&M, etc.)",
      fpdsField: "contractData.typeOfContractCode",
      usaspendingField: "contract_award_type",
      assistField: "contract_type",
      calmField: "anticipated_type_of_contract",
      easiField: null,
    },
    {
      canonicalName: "financial.federalActionObligation",
      description: "Federal obligation amount for this action",
      fpdsField: "dollarValues.action.amount",
      usaspendingField: "federal_action_obligation",
      assistField: "action_obligation",
      calmField: "amount",
      easiField: null,
    },
    {
      canonicalName: "financial.baseAndAllOptionsValue",
      description: "Total contract value including all option periods",
      fpdsField: "dollarValues.baseAndAllOptionsValue",
      usaspendingField: "base_and_all_options_value",
      assistField: "base_and_all_options_value",
      calmField: null,
      easiField: null,
    },
    {
      canonicalName: "dates.periodOfPerformanceStart",
      description: "Period of performance start date",
      fpdsField: "relevantContractDates.effectiveDate",
      usaspendingField: "period_of_performance_star",
      assistField: "period_of_performance_start",
      calmField: "pop_start_date",
      easiField: "start_dt",
    },
    {
      canonicalName: "dates.periodOfPerformanceEnd",
      description: "Period of performance current end date",
      fpdsField: "relevantContractDates.currentCompletionDate",
      usaspendingField: "period_of_performance_curr",
      assistField: "period_of_performance_end",
      calmField: "pop_end_date",
      easiField: "end_dt",
    },
    {
      canonicalName: "competition.extentCompeted",
      description: "Extent to which the contract was competed",
      fpdsField: "competition.extentCompeted",
      usaspendingField: "extent_competed",
      assistField: null,
      calmField: "extent_competed",
      easiField: null,
    },
    {
      canonicalName: "competition.setAsideType",
      description: "Set-aside type (8(a), WOSB, HUBZone, SDVOSB, etc.)",
      fpdsField: "competition.typeOfSetAside",
      usaspendingField: "type_set_aside",
      assistField: "type_set_aside",
      calmField: "set_aside",
      easiField: null,
    },
  ];
}

const FIELD_MAPPINGS = loadFieldMappings();
console.log(`📋 Loaded ${FIELD_MAPPINGS.length} field mapping entries`);

// ---------------------------------------------------------------------------
// Phase 2c: System health tracking
// ---------------------------------------------------------------------------

/** Per-request health state (one object per HTTP request, keyed by request id) */
const activeRequestHealth = new Map();

/** Most-recent completed health snapshot for each subgraph (updated after each request) */
const latestHealth = {};
for (const sg of subgraphs) {
  latestHealth[sg.name] = { status: "unknown", latencyMs: null, error: null };
}

/**
 * Ping a single subgraph with a lightweight introspection-style query and
 * record its status and latency.
 */
async function pingSubgraph(sg) {
  const start = Date.now();
  try {
    const res = await fetch(sg.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ __typename }" }),
      signal: AbortSignal.timeout(3000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      latestHealth[sg.name] = { status: "degraded", latencyMs, error: `HTTP ${res.status}` };
    } else {
      latestHealth[sg.name] = { status: "ok", latencyMs, error: null };
    }
  } catch (err) {
    const latencyMs = Date.now() - start;
    latestHealth[sg.name] = {
      status: "degraded",
      latencyMs,
      error: err.name === "TimeoutError" ? "timeout" : err.message,
    };
  }
}

/** Background health poll every 30 seconds */
async function startHealthPolling() {
  const pollOnce = () => Promise.all(subgraphs.map(pingSubgraph));
  await pollOnce(); // warm up immediately
  setInterval(pollOnce, 30_000);
}

// ---------------------------------------------------------------------------
// Build subgraph executors and schemas
// ---------------------------------------------------------------------------

const subgraphResults = await Promise.all(
  subgraphs.map(async ({ name, url }) => {
    try {
      const executor = buildHTTPExecutor({ endpoint: url });
      const schema = await schemaFromExecutor(executor);
      console.log(`✅ Loaded ${name} subgraph from ${url}`);
      return { name, schema, executor, url };
    } catch (error) {
      console.error(`❌ Failed to load ${name} from ${url}: ${error.message}`);
      return null;
    }
  })
);

const validResults = subgraphResults.filter(r => r !== null);

if (validResults.length === 0) {
  console.error("❌ No subgraphs available. Exiting.");
  process.exit(1);
}

// Build a lookup: subgraph name → SubschemaConfig (for Contract field delegation)
const subschemaByName = Object.fromEntries(
  validResults.map(({ name, schema, executor }) => [name, { schema, executor }])
);

// Check which types exist across loaded subgraphs
const availableTypes = new Set();
for (const { schema } of validResults) {
  for (const typeName of Object.keys(schema.getTypeMap())) {
    availableTypes.add(typeName);
  }
}

// Build subschema configs for stitching
const subschemaConfigs = validResults.map(({ schema, executor }) => ({
  schema,
  executor,
}));

function schemaHasField(typeName, fieldName) {
  return validResults.some(({ schema }) => {
    const type = schema.getType(typeName);
    return typeof type?.getFields === "function" && Boolean(type.getFields()[fieldName]);
  });
}

// ---------------------------------------------------------------------------
// Phase 2a: Contract type + Phase 2b: FieldMapping type
// ---------------------------------------------------------------------------

/**
 * Build extension SDL only referencing types that actually exist in the
 * loaded subgraphs. This prevents stitching errors when a subgraph is down.
 */
function buildExtensionTypeDefs() {
  const contractFields = [];
  const queryFields = [];
  const blocks = [];

  if (availableTypes.has("FpdsRecord") && !schemaHasField("Contract", "fpds")) {
    contractFields.push(`  """FPDS procurement record"""\n  fpds: FpdsRecord`);
  }
  if (availableTypes.has("UsaspendingProcurement") && !schemaHasField("Contract", "usaspending")) {
    contractFields.push(
      `  """USAspending procurement record"""\n  usaspending: UsaspendingProcurement`
    );
  }
  if (availableTypes.has("AssistAward") && !schemaHasField("Contract", "assist")) {
    contractFields.push(`  """ASSIST award record"""\n  assist: AssistAward`);
  }
  if (contractFields.length > 0) {
    blocks.push(`
    extend type Contract {
      ${contractFields.join("\n      ")}
    }
    `);
  }

  if (!schemaHasField("Query", "fieldMappings") || !schemaHasField("Query", "fieldMapping")) {
    blocks.push(`
    """
    Cross-system field name mapping entry.
    Describes how a single procurement data element is named in each source system.
    """
    type FieldMapping {
      """Canonical dot-notation field path (e.g. \\"vendor.uei\\")"""
      canonicalName: String!
      """Human-readable description of the field"""
      description: String
      """Field name in FPDS"""
      fpdsField: String
      """Field name in USAspending"""
      usaspendingField: String
      """Field name in ASSIST"""
      assistField: String
      """Field name in CALM"""
      calmField: String
      """Field name in EASi"""
      easiField: String
    }
    `);
  }

  if (!schemaHasField("Query", "fieldMappings")) {
    queryFields.push(`
      """
      Return all cross-system field name mappings. Useful for understanding
      how procurement data elements are named across FPDS, USAspending,
      ASSIST, CALM, and EASi.
      """
      fieldMappings: [FieldMapping!]!
    `);
  }

  if (!schemaHasField("Query", "fieldMapping")) {
    queryFields.push(`
      """
      Fetch a single cross-system field mapping by canonical name.
      """
      fieldMapping(
        """Canonical field name (e.g. \\"vendor.uei\\")"""
        canonicalName: String!
      ): FieldMapping
    `);
  }

  if (queryFields.length > 0) {
    blocks.push(`
    extend type Query {
      ${queryFields.join("\n")}
    }
    `);
  }

  return blocks.join("\n");
}

const shouldExtendContractFpds = availableTypes.has("FpdsRecord") && !schemaHasField("Contract", "fpds");
const shouldExtendContractUsaspending =
  availableTypes.has("UsaspendingProcurement") && !schemaHasField("Contract", "usaspending");
const shouldExtendContractAssist =
  availableTypes.has("AssistAward") && !schemaHasField("Contract", "assist");
const shouldExtendFieldMappings = !schemaHasField("Query", "fieldMappings");
const shouldExtendFieldMapping = !schemaHasField("Query", "fieldMapping");

// ---------------------------------------------------------------------------
// Extension resolvers: Contract field delegation + FieldMapping queries
// ---------------------------------------------------------------------------

/**
 * Each Contract sub-field resolver delegates to the appropriate subgraph
 * using delegateToSchema, which forwards the client's full selection set.
 * This ensures nested fields (e.g. contract.fpds.vendor.vendor_name) are
 * resolved correctly rather than returning null for everything beyond the key.
 */
const queryResolvers = {};

if (shouldExtendFieldMappings) {
  queryResolvers.fieldMappings = () => FIELD_MAPPINGS;
}

if (shouldExtendFieldMapping) {
  queryResolvers.fieldMapping = (_parent, { canonicalName }) =>
    FIELD_MAPPINGS.find(m => m.canonicalName === canonicalName) ?? null;
}

const contractResolvers = {
  availableSystems: {
    selectionSet: `{ piid }`,
    resolve(contract) {
      return buildContractSourceRecords(contract).map(record => record.system);
    },
  },

  sourceRecords: {
    selectionSet: `{ piid }`,
    resolve(contract) {
      return buildContractSourceRecords(contract);
    },
  },
};

if (shouldExtendContractFpds) {
  contractResolvers.fpds = {
    selectionSet: `{ piid }`,
    resolve(contract, _args, context, info) {
      if (!subschemaByName.fpds || !availableTypes.has("FpdsRecord")) return null;
      return delegateToSchema({
        schema: subschemaByName.fpds,
        operation: "query",
        fieldName: "fpdsRecord",
        args: { piid: contract.piid },
        context,
        info,
      });
    },
  };
}

if (shouldExtendContractUsaspending) {
  contractResolvers.usaspending = {
    selectionSet: `{ piid }`,
    resolve(contract, _args, context, info) {
      if (!subschemaByName.usaspending || !availableTypes.has("UsaspendingProcurement"))
        return null;
      return delegateToSchema({
        schema: subschemaByName.usaspending,
        operation: "query",
        fieldName: "procurement",
        args: { piid: contract.piid },
        context,
        info,
      });
    },
  };
}

if (shouldExtendContractAssist) {
  contractResolvers.assist = {
    selectionSet: `{ piid }`,
    resolve(contract, _args, context, info) {
      if (!subschemaByName.assist || !availableTypes.has("AssistAward")) return null;
      return delegateToSchema({
        schema: subschemaByName.assist,
        operation: "query",
        fieldName: "award",
        args: { award_piid: contract.piid },
        context,
        info,
      });
    },
  };
}

const extensionResolvers = {
  Query: queryResolvers,
  Contract: contractResolvers,
};

function buildContractSourceRecords(contract) {
  if (!contract?.piid) return [];

  const records = [];

  if (subschemaByName.fpds && availableTypes.has("FpdsRecord")) {
    records.push({
      system: "FPDS",
      subgraphName: "fpds",
      rootQuery: "fpdsRecord",
      identifierArg: "piid",
      identifierSourceField: "piid",
      recordId: contract.piid,
      notes: "Use FPDS for procurement identifiers, competition, and obligation detail.",
    });
  }

  if (subschemaByName.usaspending && availableTypes.has("UsaspendingProcurement")) {
    records.push({
      system: "USASPENDING",
      subgraphName: "usaspending",
      rootQuery: "procurement",
      identifierArg: "piid",
      identifierSourceField: "piid",
      recordId: contract.piid,
      notes: "Use USAspending for public spending, vendor classification, and award rollups.",
    });
  }

  if (subschemaByName.assist && availableTypes.has("AssistAward")) {
    records.push({
      system: "ASSIST",
      subgraphName: "assist",
      rootQuery: "award",
      identifierArg: "award_piid",
      identifierSourceField: "piid",
      recordId: contract.piid,
      notes: "Use ASSIST for award documents, modifications, and supporting agreement records.",
    });
  }

  if (subschemaByName.calm && availableTypes.has("Solicitation")) {
    records.push({
      system: "CALM",
      subgraphName: "calm",
      rootQuery: "solicitation",
      identifierArg: "solicitation_number",
      identifierSourceField: "piid",
      recordId: contract.piid,
      notes: "Use CALM for solicitation and pre-award lifecycle details tied to the PIID.",
    });
  }

  return records;
}

// ---------------------------------------------------------------------------
// Stitch everything together
// ---------------------------------------------------------------------------

let gatewaySchema;

try {
  gatewaySchema = stitchSchemas({
    subschemas: subschemaConfigs,
    typeDefs: buildExtensionTypeDefs(),
    resolvers: extensionResolvers,
  });
} catch (stitchErr) {
  console.error(`❌ Schema stitching failed: ${stitchErr.message}`);
  console.error("   Attempting fallback without extension types...");
  gatewaySchema = stitchSchemas({ subschemas: subschemaConfigs });
}

// Count operations
const queryType = gatewaySchema.getQueryType();
const opCount = queryType ? Object.keys(queryType.getFields()).length : 0;
const typeCount = Object.keys(gatewaySchema.getTypeMap()).filter(t => !t.startsWith("__")).length;

console.log(`\n✅ Stitched ${validResults.length} subgraphs`);
console.log(`   ${opCount} query operations`);
console.log(`   ${typeCount} types`);

// ---------------------------------------------------------------------------
// Phase 2c: System health Yoga plugin
// ---------------------------------------------------------------------------

/**
 * Yoga plugin that:
 *  1. Assigns a requestId to each incoming request (for health tracking)
 *  2. Adds extensions.systemHealth to every response
 */
const systemHealthPlugin = {
  onRequest({ request, serverContext }) {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Initialise the health snapshot from the latest background poll
    const snapshot = {};
    for (const sg of subgraphs) {
      snapshot[sg.name] = { ...latestHealth[sg.name] };
    }
    activeRequestHealth.set(requestId, snapshot);
    // Some server adapters (versions of @whatwg-node/server) do not provide
    // a `setContext` helper. Mutate the provided serverContext object so
    // downstream hooks (e.g. onResultProcess) can read `serverContext.requestId`.
    try {
      if (serverContext && typeof serverContext === "object") {
        serverContext.requestId = requestId;
      }
    } catch (err) {
      // Fallback: nothing we can do — health info won't be attached for this request
      console.warn(`⚠️  Could not attach requestId to serverContext: ${err.message}`);
    }
  },

  onResultProcess({ result, setResult, serverContext }) {
    const requestId = serverContext?.requestId;
    if (!requestId) return;

    const health = activeRequestHealth.get(requestId);
    activeRequestHealth.delete(requestId); // clean up

    if (!health) return;

    // Build per-subgraph health entries
    const systemHealth = {};
    for (const sg of subgraphs) {
      const entry = health[sg.name] ?? latestHealth[sg.name];
      systemHealth[sg.name] = entry
        ? {
            status: entry.status,
            latencyMs: entry.latencyMs,
            ...(entry.error ? { error: entry.error } : {}),
          }
        : { status: "unknown", latencyMs: null };
    }

    // Merge into result extensions (handle arrays for subscriptions)
    if (Array.isArray(result)) return;

    setResult({
      ...result,
      extensions: {
        ...(result.extensions ?? {}),
        systemHealth,
      },
    });
  },
};

// ---------------------------------------------------------------------------
// Create Yoga server
// ---------------------------------------------------------------------------

const yoga = createYoga({
  schema: (() => {
    const dir = gatewaySchema.getDirective('deprecated');
    if (dir && dir.locations) {
      // Python's graphql-core 3 doesn't support DIRECTIVE_DEFINITION yet
      dir.locations = dir.locations.filter(l => l !== 'DIRECTIVE_DEFINITION');
    }
    return gatewaySchema;
  })(),
  plugins: [systemHealthPlugin],
  graphiql: {
    title: "Example Forest Federation Gateway",
    defaultQuery: `# Federation Gateway — ${validResults.length} subgraphs available
# Subgraphs: ${validResults.map(r => r.name).join(", ")}
# Operations: ${opCount}
#
# ── Recommended Consumer Flow ──────────────────────────────────────────────
# 1. Start from contractByPiid(piid: ...) on the federated endpoint.
# 2. Inspect availableSystems + sourceRecords to see which subgraph owns detail.
# 3. Drill into the recommended source field when the stitched schema exposes it.
#
# ── Contract Overview + Drill-down Metadata ────────────────────────────────
query ContractOverview {
  contractByPiid(piid: "GS-TEST-12345678") {
    piid
    availableSystems
    sourceRecords {
      system
      subgraphName
      rootQuery
      identifierArg
      identifierSourceField
      recordId
      notes
    }

    fpds {
      piid
      vendor {
        vendor_name
        vendor_uei
      }
      financial {
        dollars_obligated
      }
    }

    usaspending {
      piid
      agency {
        awardingAgencyCode
        awardingAgencyName
      }
      financial {
        federalActionObligation
      }
    }

    assist {
      award_piid
      modifications {
        modification_number
      }
    }
  }
}
`,
  },
  cors: {
    origin: "*",
    credentials: true,
  },
  maskedErrors: false,
});

const server = createServer(yoga);

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`\n🚀 Federation Gateway running on http://localhost:${PORT}/graphql`);
  console.log(`   Mode: ${IS_DOCKER ? "Docker" : "Local"}`);
  console.log(`   Subgraphs: ${validResults.length}/${subgraphs.length}`);
  validResults.forEach(r => console.log(`   - ${r.name}: ${r.url}`));
  console.log(`\n   Phase 2a: contractByPiid(piid) query — unified cross-system entity`);
  console.log(
    `   Phase 2b: fieldMappings / fieldMapping queries — ${FIELD_MAPPINGS.length} entries`
  );
  console.log(`   Phase 2c: extensions.systemHealth on every response`);
  console.log("");

  // Start background health polling (non-blocking)
  startHealthPolling().catch(err => console.warn(`⚠️  Health polling error: ${err.message}`));
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown() {
  console.log("\n🛑 Shutting down gateway...");
  server.close(() => {
    console.log("✅ Gateway closed");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
