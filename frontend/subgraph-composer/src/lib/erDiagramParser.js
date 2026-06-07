/**
 * ER Diagram Parser
 *
 * Parses GraphQL SDL into entity-relationship nodes and edges
 * with federation directive metadata.
 */

export const FEDERATION_DIRECTIVES = [
  "@key",
  "@external",
  "@provides",
  "@requires",
  "@shareable",
  "@extends",
  "@override",
];

export const DIRECTIVE_EDGE_STYLES = {
  "@key": { strokeDasharray: "0", markerEnd: "arrow" },
  "@external": { strokeDasharray: "5 5", markerEnd: "arrow" },
  "@requires": { strokeDasharray: "2 2", markerEnd: "arrow" },
  "@shareable": {
    strokeDasharray: "0",
    markerEnd: "arrow",
    markerStart: "arrow",
  },
  "@provides": { strokeDasharray: "0", markerEnd: "arrow", strokeWidth: 2 },
  "@extends": { strokeDasharray: "8 4", markerEnd: "arrow" },
  "@override": { strokeDasharray: "0", markerEnd: "arrow", strokeWidth: 2 },
};

export const SUBGRAPH_COLORS = [
  "#2196f3",
  "#4caf50",
  "#ff9800",
  "#9c27b0",
  "#f44336",
  "#009688",
  "#795548",
  "#607d8b",
  "#e91e63",
  "#3f51b5",
];

/**
 * Parse GraphQL SDL into entity nodes
 * @param {string} sdl - GraphQL SDL
 * @param {Object} typeSources - Map of typeName -> [schemaId]
 * @param {Array<{id: string, name: string}>} schemas - Schema metadata
 * @returns {{nodes: Array, edges: Array, subgraphs: Array}}
 */
export function parseERDiagram(sdl, typeSources = {}, schemas = []) {
  if (!sdl || typeof sdl !== "string") {
    return { nodes: [], edges: [], subgraphs: [] };
  }

  const schemaIndexMap = new Map();
  schemas.forEach((s, idx) => schemaIndexMap.set(s.id, idx));

  const nodes = [];
  const edges = [];
  const subgraphGroups = new Map();

  // First pass: create all nodes
  const nodeMap = new Map();
  let nodeId = 0;
  const typeRegex =
    /type\s+(\w+)(?:\s+implements\s+[\w&\s,]+)?\s*(?:@[\w(\s"=:,)]+)?\s*\{([^}]*)\}/g;
  let match;

  while ((match = typeRegex.exec(sdl)) !== null) {
    const typeName = match[1];
    const body = match[2];
    const fullMatch = match[0];

    const typeDirectives = extractDirectives(
      fullMatch.substring(0, fullMatch.indexOf("{")),
    );
    const fields = parseFields(body);

    const sourceIds = typeSources[typeName] || [];
    const sourceIndices = sourceIds.map((id) => schemaIndexMap.get(id) ?? 0);
    const primaryColor = SUBGRAPH_COLORS[sourceIndices[0] ?? 0];

    const node = {
      id: `node-${nodeId++}`,
      type: "entityNode",
      position: { x: 0, y: 0 },
      data: {
        label: typeName,
        fields,
        directives: typeDirectives,
        color: primaryColor,
        sourceIds,
        sourceNames: sourceIds.map(
          (id) => schemas.find((s) => s.id === id)?.name || id,
        ),
      },
    };

    nodes.push(node);
    nodeMap.set(typeName, node);

    for (const sourceId of sourceIds) {
      if (!subgraphGroups.has(sourceId)) {
        subgraphGroups.set(sourceId, {
          id: sourceId,
          name: schemas.find((s) => s.id === sourceId)?.name || sourceId,
          color: SUBGRAPH_COLORS[schemaIndexMap.get(sourceId) ?? 0],
          nodeIds: [],
        });
      }
      subgraphGroups.get(sourceId).nodeIds.push(node.id);
    }
  }

  // Second pass: create edges from all nodes
  for (const node of nodes) {
    for (const field of node.data.fields) {
      const baseType = extractBaseType(field.type);
      if (baseType && baseType !== node.data.label && isComplexType(baseType)) {
        const targetNode = nodeMap.get(baseType);
        if (targetNode) {
          const edgeDirectives = field.directives.filter((d) =>
            FEDERATION_DIRECTIVES.includes(d.name),
          );
          const primaryDirective = edgeDirectives[0]?.name || "@key";
          const style =
            DIRECTIVE_EDGE_STYLES[primaryDirective] ||
            DIRECTIVE_EDGE_STYLES["@key"];

          edges.push({
            id: `edge-${node.id}-${targetNode.id}-${field.name}`,
            source: node.id,
            target: targetNode.id,
            label: field.name,
            style: {
              stroke: node.data.color,
              strokeWidth: style.strokeWidth || 1,
              strokeDasharray: style.strokeDasharray,
            },
            markerEnd: style.markerEnd,
            markerStart: style.markerStart,
            data: {
              directives: edgeDirectives,
              fieldName: field.name,
            },
          });
        }
      }
    }
  }

  // Apply a simple layout: distribute nodes in columns per subgraph
  const subgraphs = Array.from(subgraphGroups.values());
  layoutNodes(nodes, subgraphs);

  return { nodes, edges, subgraphs };
}

/**
 * Extract fields and their directives from a type body
 */
function parseFields(body) {
  const fields = [];
  const lines = body.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Match field definitions: name(args): Type @directives
    const fieldMatch = trimmed.match(
      /^(\w+)(?:\s*\([^)]*\))?\s*:\s*([^@\n]+)(.*)?$/,
    );
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const typeStr = fieldMatch[2].trim();
      const directiveStr = fieldMatch[3] || "";

      const directives = extractDirectives(directiveStr);
      fields.push({
        name: fieldName,
        type: typeStr,
        directives,
      });
    }
  }

  return fields;
}

/**
 * Extract directives from a string
 */
function extractDirectives(str) {
  const directives = [];
  if (!str) return directives;

  const directiveRegex = /@(\w+)(?:\s*\(\s*([^)]*)\s*\))?/g;
  let dmatch;

  while ((dmatch = directiveRegex.exec(str)) !== null) {
    const name = `@${dmatch[1]}`;
    const args = dmatch[2] || "";
    directives.push({ name, args });
  }

  return directives;
}

/**
 * Extract base type from GraphQL type string
 */
function extractBaseType(typeStr) {
  return (typeStr || "").replace(/[!\[\]]/g, "").trim();
}

/**
 * Check if a type is a complex (non-scalar) type
 */
function isComplexType(typeStr) {
  const base = extractBaseType(typeStr);
  const scalars = [
    "String",
    "Int",
    "Float",
    "Boolean",
    "ID",
    "Date",
    "DateTime",
    "JSON",
    "Url",
    "Email",
  ];
  return base && !scalars.includes(base);
}

/**
 * Simple layout: place nodes in columns per subgraph swimlane
 */
function layoutNodes(nodes, subgraphs) {
  const laneWidth = 320;
  const nodeHeight = 120;
  const nodeSpacing = 40;

  const nodePositions = new Map();

  subgraphs.forEach((subgraph, laneIndex) => {
    let yOffset = 0;
    for (const nodeId of subgraph.nodeIds) {
      if (!nodePositions.has(nodeId)) {
        nodePositions.set(nodeId, {
          x: laneIndex * laneWidth + 20,
          y: yOffset,
        });
        yOffset += nodeHeight + nodeSpacing;
      } else {
        // Node belongs to multiple subgraphs; center it between lanes
        const existing = nodePositions.get(nodeId);
        const newX = laneIndex * laneWidth + 20;
        nodePositions.set(nodeId, {
          x: (existing.x + newX) / 2,
          y: existing.y,
        });
      }
    }
  });

  for (const node of nodes) {
    const pos = nodePositions.get(node.id);
    if (pos) {
      node.position = pos;
    }
  }
}

/**
 * Generate a Mermaid ER diagram string from parsed ER data
 * @param {{nodes: Array, edges: Array, subgraphs: Array}} erData
 * @returns {string}
 */
export function generateMermaidER(erData) {
  const { nodes, edges, subgraphs } = erData;
  if (!nodes || nodes.length === 0) return "";

  const lines = ["erDiagram"];

  // Define entities
  for (const node of nodes) {
    const label = node.data.label;
    const fields = node.data.fields || [];
    lines.push(`  ${label} {`);
    for (const field of fields) {
      const type = extractBaseType(field.type);
      const badges = field.directives
        .filter((d) => FEDERATION_DIRECTIVES.includes(d.name))
        .map((d) => d.name)
        .join(" ");
      const badgeStr = badges ? ` ${badges}` : "";
      lines.push(`    ${type} ${field.name}${badgeStr}`);
    }
    lines.push("  }");
  }

  // Define relationships
  const relationMap = new Map();
  for (const edge of edges) {
    const sourceLabel = nodes.find((n) => n.id === edge.source)?.data.label;
    const targetLabel = nodes.find((n) => n.id === edge.target)?.data.label;
    if (!sourceLabel || !targetLabel) continue;

    const key = `${sourceLabel} ||--|| ${targetLabel}`;
    const directives =
      edge.data?.directives?.map((d) => d.name).join(", ") || "";
    const label = edge.label || "";
    const fullLabel = directives ? `${label} : ${directives}` : label;

    if (!relationMap.has(key)) {
      relationMap.set(key, fullLabel);
    }
  }

  for (const [key, label] of relationMap.entries()) {
    lines.push(`  ${key} : "${label}"`);
  }

  return lines.join("\n");
}

/**
 * Export Mermaid ER diagram as a downloadable file
 */
export function exportMermaidER(erData, filename = "er-diagram.mmd") {
  const mermaid = generateMermaidER(erData);
  const blob = new Blob([mermaid], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return mermaid;
}
