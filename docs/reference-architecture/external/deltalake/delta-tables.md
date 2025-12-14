# Delta Table Definitions

This page contains example CREATE TABLE statements and best-practice Delta table properties for bronze, silver, and gold layers. It was split from the original guide to reduce page size.

Example snippet (bronze table):

```sql
CREATE TABLE common_core_catalog.bronze.contract_data_raw (
  program_id STRING NOT NULL,
  published_date TIMESTAMP,
  title STRING,
  ingestion_timestamp TIMESTAMP NOT NULL
) USING DELTA
PARTITIONED BY (DATE(published_date));
```
