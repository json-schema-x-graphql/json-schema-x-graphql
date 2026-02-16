import { ElkApi } from "../elk-api";
import { calcDimensions, sortNodesTs } from "../tsAlgo";
import { catchSchemaErrors } from "../validation";
import {
  Parser,
  TreeToGraphQL,
  TypeSystemDefinition,
  mergeTrees,
} from "graphql-js-tree";
import { getTokenAtPosition } from "graphql-language-service";
const ctx = self;
const receive = (key, fn) => (message) => {
  const m = message.data;
  if (m.event === key)
    try {
      const data = fn(m);
      if (typeof data === "object" && "then" in data) {
        data.then((r) => {
          postMessage({
            data: r,
            event: key,
            id: m.id,
          });
        });
      } else {
        postMessage({
          data,
          event: key,
          id: m.id,
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        postMessage({
          error: error.message,
          event: key,
          id: m.id,
        });
      }
    }
};
ctx.addEventListener("message", (message) => {
  receive("validate", (args) => catchSchemaErrors(args.schema, args.libraries))(
    message,
  );
  receive("parse", (args) =>
    TreeToGraphQL.parse({
      nodes: args.tree.nodes
        .filter((n) => !n.fromLibrary)
        .map((n) => ({
          ...n,
          args: n.args.filter((a) => !a.fromLibrary),
          directives: n.directives.filter((a) => !a.fromLibrary),
        })),
    }),
  )(message);
  receive("parseSchema", (args) => {
    const mtress = mergeTrees(
      Parser.parse(args.schema),
      args.libraries ? Parser.parse(args.libraries) : { nodes: [] },
    );
    if (mtress.nodes) {
      if (args.cutSchemaDefinition) {
        return {
          ...mtress,
          nodes: mtress.nodes.filter(
            (n) => n.data.type !== TypeSystemDefinition.SchemaDefinition,
          ),
        };
      }
      return mtress;
    }
    throw new Error("No nodes to parse");
  })(message);
  receive("token", (args) =>
    JSON.stringify(getTokenAtPosition(args.document, args.position)),
  )(message);
  receive("simulateSort", (args) => {
    const sorted = sortNodesTs(args);
    const elk = new ElkApi();
    return elk
      .layout(
        {
          id: "root",
          children: sorted.numberNodes.map((nn) => ({
            id: nn.id,
            x: nn.x - nn.width / 2.0,
            y: nn.y - nn.height / 2.0,
            width: nn.width,
            height: nn.height,
          })),
          edges: sorted.connections.map((c, i) => ({
            id: `e-${i}`,
            sources: [c.source],
            targets: [c.target],
          })),
        },
        {
          layoutOptions: {
            "elk.spacing.nodeNode": "30.0",
            "elk.algorithm": "elk.layered",
            "elk.layered.spacing.nodeNodeBetweenLayers": "100.0",
            "elk.layered.thoroughness": "7",
            "elk.direction": "RIGHT",
            "elk.edgeRouting": "POLYLINE",
            "elk.aspectRatio": "2.0f",
          },
        },
      )
      .then((v) => {
        const elkNodes = sorted.numberNodes.map((nn) => ({
          ...nn,
          x:
            (v.children?.find((c) => c.id === nn.id)?.x || nn.x) +
            nn.width / 2.0,
          y:
            (v.children?.find((c) => c.id === nn.id)?.y || nn.y) +
            nn.height / 2.0,
        }));
        const relativeConnections = sorted.connections.map((connection) => {
          return {
            source: elkNodes.find((el) => el.id === connection.source),
            target: elkNodes.find((el) => el.id === connection.target),
            connectionType: connection.connectionType,
          };
        });
        return {
          nodes: elkNodes,
          connections: relativeConnections,
          ...calcDimensions(elkNodes),
        };
      });
  })(message);
});
