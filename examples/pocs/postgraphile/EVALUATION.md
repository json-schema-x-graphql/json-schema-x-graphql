# PostGraphile POC — Evaluation Checklist

Use this checklist to evaluate the POC against the project requirements.

1. Semantic fidelity

- Can the gateway expose the canonical fields (names + types) with minimal transformation?
- Are complex directives or federation semantics required? (If yes, note where PostGraphile cannot represent them.)

2. Developer ergonomics

- Time to apply schema change and see it in GraphQL (measure in seconds/minutes).
- Ease of editing SQL vs SDL for iterative design.

3. Operational fit

- Can the stack be containerized and started in CI (yes/no)?
- Observability: are request logs and basic metrics available or intake_processly added?

4. Performance & scalability

- Basic latency numbers under small load (use `ab` or `hey` for simple tests).

5. Testing surface

- Can we introspect and assert parity via automated tests (introspection + field presence)?

6. Migration / Integration

- How much manual mapping is needed from canonical SDL → runtime API? (list steps)

Score each area (0-5) and add short notes.
