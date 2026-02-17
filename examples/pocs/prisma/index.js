const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const dotenv = require("dotenv");
dotenv.config();
let prisma = null;
let pgPool = null;
try {
  // attempt to use Prisma client if available (requires `prisma generate`)
  const { PrismaClient } = require("@prisma/client");
  prisma = new PrismaClient();
  console.log("[prisma-poc] using @prisma/client");
} catch (e) {
  // fallback to pg if Prisma client isn't present/generated
  console.warn(
    "[prisma-poc] @prisma/client unavailable, falling back to pg queries",
  );
  const { Pool } = require("pg");
  const connection =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
  pgPool = new Pool({ connectionString: connection });
}

const PORT = process.env.PORT || 4003;

const schema = buildSchema(`
  type Solicitation {
    id: Int!
    solicitation_number: String
    amendment_number: String
    title: String
    status: String
    amount: Float
  }

  type Requisition {
    id: Int!
    requisition_number: String
    amendment_number: String
    description: String
    amount: Float
  }

  type Query {
    solicitations(limit: Int): [Solicitation!]!
    requisitions(limit: Int): [Requisition!]!
  }
`);

const root = {
  solicitations: async ({ limit }) => {
    const take = typeof limit === "number" ? limit : 50;
    if (prisma) {
      const rows = await prisma.solicitation.findMany({ take });
      return rows.map((r) => ({
        id: r.id,
        solicitation_number: r.solicitationNumber,
        amendment_number: r.amendmentNumber,
        title: r.title,
        status: r.status,
        amount: r.amount,
      }));
    }
    // pg fallback
    const client = await pgPool.connect();
    try {
      const res = await client.query(
        `SELECT id, solicitation_number, amendment_number, title, status, amount FROM solicitation ORDER BY id ASC LIMIT $1`,
        [take],
      );
      return res.rows.map((r) => ({
        id: r.id,
        solicitation_number: r.solicitation_number,
        amendment_number: r.amendment_number,
        title: r.title,
        status: r.status,
        amount: r.amount,
      }));
    } finally {
      client.release();
    }
  },
  requisitions: async ({ limit }) => {
    const take = typeof limit === "number" ? limit : 50;
    if (prisma) {
      const rows = await prisma.requisition.findMany({ take });
      return rows.map((r) => ({
        id: r.id,
        requisition_number: r.requisitionNumber,
        amendment_number: r.amendmentNumber,
        description: r.description,
        amount: r.amount,
      }));
    }
    const client = await pgPool.connect();
    try {
      const res = await client.query(
        `SELECT id, requisition_number, amendment_number, description, amount FROM requisition ORDER BY id ASC LIMIT $1`,
        [take],
      );
      return res.rows.map((r) => ({
        id: r.id,
        requisition_number: r.requisition_number,
        amendment_number: r.amendment_number,
        description: r.description,
        amount: r.amount,
      }));
    } finally {
      client.release();
    }
  },
};

const app = express();

app.use("/graphql", graphqlHTTP({ schema, rootValue: root, graphiql: true }));
app.get("/", (_req, res) => res.redirect("/graphql"));

app.listen(PORT, () =>
  console.log(`[prisma-poc] listening on http://localhost:${PORT}/graphql`),
);

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
