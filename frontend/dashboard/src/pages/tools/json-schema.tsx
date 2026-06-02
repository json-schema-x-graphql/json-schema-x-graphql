import React from "react";
import { Box, Button, Container, Flex, Paper, Title, Text } from "@mantine/core";
import type { OnMount } from "@monaco-editor/react";
import { JSONSchemaFaker } from "json-schema-faker";
import { NextSeo } from "next-seo";
import { LuCheck, LuCircleX } from "react-icons/lu";
import ClientMonacoEditor from "../../components/ClientMonacoEditor";
import { SEO } from "../../constants/seo";
import schema_unificationSchema from "../../data/generated/schema-unification.from-graphql.json";
import { FileFormat, TypeLanguage } from "../../enums/file.enum";
import { editorOptions } from "../../layout/ConverterLayout/options";
import Layout from "../../layout/PageLayout";
import { generateType } from "../../lib/utils/generateType";
import { jsonToContent } from "../../lib/utils/jsonAdapter";

const Editor = ClientMonacoEditor;

const JSONSchemaTool = () => {
  const monacoRef = React.useRef<Parameters<OnMount>[1] | null>(null);
  const [jsonError, setJsonError] = React.useState(false);
  const [jsonSchemaError, setJsonSchemaError] = React.useState(false);
  const [json, setJson] = React.useState("");
  const [jsonSchema, setJsonSchema] = React.useState(
    JSON.stringify(schema_unificationSchema, null, 2),
  );
  // Keep a parsed representation so we can pass a real object to Monaco diagnostics
  const [parsedJsonSchema, setParsedJsonSchema] = React.useState<object | null>(
    () => schema_unificationSchema || null,
  );

  React.useEffect(() => {
    // Support autoloading the schema via URL params:
    // - ?autoload=true  -> loads the built-in generated schema_unification schema
    // - ?schema=/data/path.json -> attempts to fetch that path and load it
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const autoload = params.get("autoload");
      const schemaPath = params.get("schema");
      if (autoload === "true" || schemaPath) {
        if (schemaPath) {
          // Try to fetch the requested schema path (publically served)
          fetch(schemaPath)
            .then((res) => {
              if (!res.ok) throw new Error("Failed to fetch schema");
              return res.json();
            })
            .then((j) => {
              setJsonSchema(JSON.stringify(j, null, 2));
              setParsedJsonSchema(j);
            })
            .catch(() => {
              // fallback to the embedded generated schema if fetch fails
              setJsonSchema(JSON.stringify(schema_unificationSchema, null, 2));
              setParsedJsonSchema(schema_unificationSchema);
            });
        } else {
          setJsonSchema(JSON.stringify(schema_unificationSchema, null, 2));
          setParsedJsonSchema(schema_unificationSchema);
        }
      }
    }

    // Determine the schema object to provide to Monaco diagnostics.
    // Monaco expects an object, not a JSON string.
    let schemaObj = parsedJsonSchema;
    if (!schemaObj) {
      try {
        schemaObj = JSON.parse(jsonSchema);
      } catch {
        schemaObj = null;
      }
    }

    // Monaco's types can be finicky in our ESM/Jest environment; cast to `any`
    // and defensively check for the jsonDefaults API before calling it.
    const monacoAny = monacoRef.current as any;
    try {
      if (
        monacoAny &&
        monacoAny.languages &&
        monacoAny.languages.json &&
        monacoAny.languages.json.jsonDefaults &&
        typeof monacoAny.languages.json.jsonDefaults.setDiagnosticsOptions === "function"
      ) {
        monacoAny.languages.json.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          allowComments: true,
          enableSchemaRequest: true,
          ...(schemaObj && {
            schemas: [
              {
                uri: "http://myserver/schema_unification-schema.json",
                fileMatch: ["*"],
                schema: schemaObj,
              },
            ],
          }),
        });
      }
    } catch (err) {
      // Swallow errors to avoid breaking the page when Monaco isn't fully initialized
      // (e.g., during server-side rendering or tests). Diagnostics will be disabled.
      console.warn("Monaco diagnostics not configured:", err);
    }
  }, [jsonSchema, parsedJsonSchema]);

  const generateJsonSchema = async () => {
    const jsonSchema = await generateType(json, FileFormat.JSON, TypeLanguage.JSON_SCHEMA);
    setJsonSchema(jsonSchema);
  };

  const generateJson = async () => {
    const randomJson = await JSONSchemaFaker.resolve(JSON.parse(jsonSchema));
    const contents = await jsonToContent(JSON.stringify(randomJson, null, 2), FileFormat.JSON);
    setJson(contents);
  };

  return (
    <Layout>
      <NextSeo
        {...SEO}
        title="JSON Schema Validator & Generator"
        description="Use our JSON Schema Validator & Generator tool to intake_processly validate and generate JSON schemas, and generate data from JSON schemas. Simply input your JSON data, generate the corresponding schema, and validate your data with ease."
        canonical="https://jsoncrack.com/tools/json-schema"
      />
      <Container mt="xl" size="xl">
        <Title c="black">JSON Schema Validator & Generator</Title>
        <Flex pt="lg" gap="lg">
          <Button
            onClick={generateJsonSchema}
            variant="default"
            size="md"
            disabled={!json.length || jsonError}
          >
            Generate JSON Schema
          </Button>
          <Button
            onClick={generateJson}
            variant="default"
            size="md"
            disabled={!jsonSchema.length || jsonSchemaError}
          >
            Generate JSON
          </Button>
        </Flex>
        <Flex pt="lg" gap="40">
          <Paper mah="600px" withBorder flex="1" style={{ overflow: "hidden" }}>
            <Box p="xs" bg="gray">
              <Flex justify="space-between" align="center">
                <Text c="gray.3">JSON</Text>
                {jsonError ? <LuCircleX color="red" /> : <LuCheck color="lightgreen" />}
              </Flex>
            </Box>
            <Editor
              value={json}
              onChange={(value) => setJson(value || "")}
              onValidate={(errors) => setJsonError(!!errors.length)}
              language="json"
              height={500}
              options={editorOptions}
              onMount={(_editor, monaco) => (monacoRef.current = monaco)}
            />
          </Paper>
          <Paper mah="600px" withBorder flex="1" style={{ overflow: "hidden" }}>
            <Box p="xs" bg="gray">
              <Flex justify="space-between" align="center">
                <Text c="gray.3">JSON Schema</Text>
                {jsonSchemaError ? <LuCircleX color="red" /> : <LuCheck color="lightgreen" />}
              </Flex>
            </Box>
            <Editor
              value={jsonSchema}
              onChange={(value) => {
                const v = value || "";
                setJsonSchema(v);
                // Keep a parsed object in sync when possible so Monaco gets an object
                try {
                  const parsed = JSON.parse(v);
                  setParsedJsonSchema(parsed);
                  // If the JSON is valid, clear the jsonSchemaError flag (validation will still run)
                  setJsonSchemaError(false);
                } catch {
                  setParsedJsonSchema(null);
                }
              }}
              onValidate={(errors) => setJsonSchemaError(!!errors.length)}
              language="json"
              height={500}
              options={editorOptions}
            />
          </Paper>
        </Flex>
      </Container>
    </Layout>
  );
};

export default JSONSchemaTool;
