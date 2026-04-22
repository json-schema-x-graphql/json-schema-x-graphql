import { camelToSnake, convertObjectKeys } from "./helpers/case-conversion.mjs";
import fs from "fs";
import path from "path";

// Paths
const inputPath = path.resolve("src/data/schema_unification.schema.json");
const outputPath = path.resolve("src/data/schema_unification.schema.snake.json");

// Read canonical schema
const schema = JSON.parse(fs.readFileSync(inputPath, "utf8"));

// Convert all keys to snake_case
const snakeSchema = convertObjectKeys(schema, camelToSnake);

// Write the converted schema
fs.writeFileSync(outputPath, JSON.stringify(snakeSchema, null, 2));

console.log(`✅ Converted schema written to ${outputPath}`);
