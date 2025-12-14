# Archived: Hasura DDN / HDL POC — abandonment rationale

Status: archived (2025-11-17)

Summary
-------
We attempted to use Hasura DDN (v3 project/context) + a transform pipeline that mapped our federation subgraphs/supergraph into Hasura HDL (HML/HASURA metadata) as a way to host a federation-style GraphQL gateway backed by Postgres/Hasura. After several iterations and experiments the approach proved unsuitable for production adoption. The work is therefore deprecated and archived here for future reference.

Key problems encountered
------------------------
- Fidelity loss mapping federation features to Hasura metadata
  - Federation supergraph semantics (e.g., `@join__field`, `@join__type`, `join__Graph` ownership/joins) do not map cleanly to Hasura's table/relationship/permission model. Attempting to encode these semantics required many custom computed fields, views, and database-level glue that made the pipeline brittle.
- Transform complexity and maintenance burden
  - The transform that converted canonical SDL/subgraphs into Hasura HML required delicate heuristics and many project-specific rules. Small changes in SDL (field naming, directives) triggered significant metadata churn and manual fixes.
- Local developer ergonomics and slow iteration
  - Building engine artifacts, applying metadata and restarting the engine introduced long feedback loops, making exploratory schema design and debugging slow.
- Tooling gaps and test fragility
  - Tests that validated semantic parity between federated SDL and the resulting Hasura-exposed API were brittle and expensive to maintain. The build produced intermittent differences across composition libraries (@theguild vs Apollo) and the transform could not elegantly reconcile them.
- Operational concerns
  - Running a Hasura engine as a "federation gateway" produced unclear ownership boundaries for fields and introduced runtime behaviors (permissions, caching, auth) that required additional operational work to secure and scale.

Why we are abandoning the approach
---------------------------------
- The mapping required to faithfully represent federated semantics in Hasura is non-trivial and core to the POC; without that fidelity the gateway would produce surprising behavior for clients.
- Continued investment would require a long-term maintenance commitment to keep the transform in sync with evolving SDL, composition libraries, and Hasura engine versions.
- There are more promising gateway models that align better with our goals (external gateway process capable of federated execution or schema stitching) and that can be validated with smaller, faster POCs.

Recommended alternatives to evaluate
-----------------------------------
We will pivot to focused POC testing of the following gateway approaches:

- PostGraphile (Postgres-first GraphQL engine)
  - Docs: https://postgraphile.org/postgraphile/5/running-postgraphile-in-docker
  - Rationale: direct Postgres-first approach that can expose a GraphQL API without heavy metadata transformation; good for data-backed APIs where Postgres is primary store.

- The Guild — Hive / Gateway
  - Docs: https://the-guild.dev/graphql/hive/docs/gateway
  - Rationale: Guild tools are aligned with federation workflows and may provide a more natural gateway for federated compositions.

- WunderGraph / Cosmo
  - Repo: https://github.com/wundergraph/cosmo
  - Rationale: modern GraphQL gateway frameworks that support multiple backends, caching, and deployment patterns; may simplify hosting federation or stitched schemas.

Evaluation needs and requirements
--------------------------------
Any candidate solution should be evaluated against the following checklist:

- Semantic fidelity
  - Can we represent the federated SDL (types, directives, ownership) with no or minimal loss? Are `@join__*` semantics preserved in behavior?
- Developer ergonomics
  - Fast local iteration cycle (build/apply < 1 minute ideally), clear debugging workflow, and predictable artifact creation.
- Operational fit
  - Deployability in our Docker + CI environment, observability (metrics/tracing), and security (auth, secrets management).
- Performance & scalability
  - Reasonable cold-starts, acceptable memory footprint, and support for caching or persisted queries if needed.
- Compatibility & integration
  - Integrates with our existing schema tooling (SDL generators, JSON Schema validators) and CI jobs; supports automated artifact generation.
- Maturity & community
  - Active maintenance, clear docs, and community adoption.
- Testing surface
  - Ability to assert parity between canonical SDL and runtime API using automated tests (introspection, field-level checks).
- Migration path
  - Minimal manual mapping when moving from canonical SDL → runtime API, and clear rollback options.

Acceptance criteria for a new gateway POC
-----------------------------------------
- We can bootstrap a POC that exposes the canonical SDL via the gateway with >95% parity for the set of fields used by our demo apps.
- Local iteration time supports developer testing (build+apply+verify < 3 minutes typical).
- Gateway can be deployed in Docker and integrated into our CI pipeline for automated validation.
- Basic observability (request logging + latency metrics) is available out-of-the-box or via integrations.

Next steps (actionable)
-----------------------
1. Archive current artifacts from `dev/hasura-ddn/` into `generated-schemas/composition-artifacts/` and tag the repo/branch for reference.
2. Create three small POCs (one per candidate):
   - PostGraphile in Docker exposing a minimal set of tables and verifying queries.
   - The Guild gateway composition for our existing subgraphs (compose + run gateway).
   - WunderGraph/Cosmo minimal gateway that exposes introspection and built-in caching.
3. Use the evaluation checklist to score each POC and document results under `dev/`.
4. Select the best candidate for further integration testing and migrate a small consumer app to it.

Contact / owners
----------------
- Previous owner(s): engineering team working on `dev/hasura-ddn` (check git history on that folder for specific authors).
- Current owners for next steps: schema team / platform team.

References / artifacts
----------------------
- `dev/hasura-ddn/` — local DDN project used for the POC (archived in-place)
- `generated-schemas/composition-artifacts/` — artifact outputs from composition runs
- This archived note: `docs/archived/hasura-ddn-abandonment.md`

---

(If you'd like, I can also generate a short checklist of concrete test cases to run for each POC.)
