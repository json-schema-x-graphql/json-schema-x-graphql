# Environment Setup

## Databricks Workspace Configuration

This section contains initialization scripts and example configurations for setting up a Databricks workspace optimized for the Common Core ETL pipeline.

Example initialization script (abbreviated):

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("CommonCoreETL") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .getOrCreate()

CATALOG_NAME = "common_core_catalog"
BRONZE_SCHEMA = "bronze"
SILVER_SCHEMA = "silver"
GOLD_SCHEMA = "gold"

print("Databricks environment configured for Common Core ETL")
```

## Unity Catalog Setup

See the `catalog-architecture.md` page for schema creation SQL and permission examples.
