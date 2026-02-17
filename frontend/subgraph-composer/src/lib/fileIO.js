/**
 * File I/O utilities for importing and exporting schemas
 * Handles JSON schema upload, download, and bulk operations
 */

/**
 * Export a single schema as JSON file
 * @param {Object} schema - Schema object with id, name, content
 * @param {string} filename - Optional custom filename
 */
export function exportSchema(schema, filename = null) {
  try {
    const name = filename || `${schema.name.replace(/\s+/g, "-")}.json`;
    const data = {
      name: schema.name,
      schema: JSON.parse(schema.content),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, name);

    return { success: true, filename: name };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Export all schemas as a single JSON file
 * @param {Array} schemas - Array of schema objects
 * @param {string} filename - Optional custom filename
 */
export function exportAllSchemas(schemas, filename = "schemas-export.json") {
  try {
    const data = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      schemas: schemas.map((s) => ({
        name: s.name,
        schema: JSON.parse(s.content),
      })),
      count: schemas.length,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, filename);

    return { success: true, filename, count: schemas.length };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Import schemas from a file
 * Supports both single schema and bulk exports
 * @param {File} file - File object from input
 */
export async function importSchemaFile(file) {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    if (!file.type.includes("json")) {
      throw new Error("File must be JSON format");
    }

    const content = await file.text();
    const data = JSON.parse(content);

    // Check if it's a bulk export or single schema
    if (data.schemas && Array.isArray(data.schemas)) {
      // Bulk export format
      return {
        success: true,
        type: "bulk",
        schemas: data.schemas.map((item, idx) => ({
          name: item.name || `Imported Schema ${idx + 1}`,
          content: JSON.stringify(item.schema, null, 2),
        })),
        count: data.schemas.length,
      };
    } else if (data.schema) {
      // Single schema format
      return {
        success: true,
        type: "single",
        schema: {
          name: data.name || "Imported Schema",
          content: JSON.stringify(data.schema, null, 2),
        },
      };
    } else if (data.title && data.type === "object") {
      // Raw JSON schema
      return {
        success: true,
        type: "single",
        schema: {
          name: data.title || "Imported Schema",
          content: JSON.stringify(data, null, 2),
        },
      };
    } else {
      throw new Error(
        "Invalid schema format. Expected exported schema or JSON schema",
      );
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Export supergraph as GraphQL file
 * @param {string} sdl - GraphQL SDL string
 * @param {string} filename - Optional custom filename
 */
export function exportSupergraph(sdl, filename = "supergraph.graphql") {
  try {
    const blob = new Blob([sdl], { type: "text/plain" });
    downloadBlob(blob, filename);
    return { success: true, filename };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Export composition report as JSON
 * @param {Object} report - Composition stats, errors, schemas info
 * @param {string} filename - Optional custom filename
 */
export function exportReport(report, filename = "composition-report.json") {
  try {
    const data = {
      exportedAt: new Date().toISOString(),
      ...report,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, filename);

    return { success: true, filename };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Helper to trigger browser download
 * @private
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse exported schema file to extract metadata
 * @param {File} file
 */
export async function inspectSchemaFile(file) {
  try {
    const content = await file.text();
    const data = JSON.parse(content);

    let count = 0;
    let schemaNames = [];

    if (data.schemas && Array.isArray(data.schemas)) {
      count = data.schemas.length;
      schemaNames = data.schemas.map((s) => s.name || "Unnamed");
    } else if (data.schema) {
      count = 1;
      schemaNames = [data.name || "Imported Schema"];
    } else if (data.title && data.type === "object") {
      count = 1;
      schemaNames = [data.title];
    }

    return {
      success: true,
      filename: file.name,
      size: file.size,
      count,
      schemaNames,
      exportedAt: data.exportedAt || "unknown",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
