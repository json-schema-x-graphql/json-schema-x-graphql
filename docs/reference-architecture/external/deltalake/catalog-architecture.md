# Catalog and Schema Architecture

This page documents the medallion architecture (bronze/silver/gold), table naming conventions, and centralized schema definitions used in the Common Core ETL implementation.

Key points:
- Use Unity Catalog with separate schemas for `bronze`, `silver`, `gold`, and `monitoring`.
- Maintain schema definitions as code (Python StructType or JSON Schema).
- Apply partitioning strategy by date for bronze and by fiscal year/agency for gold.

Example: create bronze/silver/gold schemas in Unity Catalog.
