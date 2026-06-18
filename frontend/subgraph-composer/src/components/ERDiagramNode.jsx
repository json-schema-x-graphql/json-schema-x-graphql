import React from "react";
import { Handle, Position } from "@xyflow/react";
import { isComplexType } from "../lib/erDiagramParser.js";
import "./ERDiagramNode.css";

const BADGE_COLORS = {
  "@key": "#ffd700", // Gold
  "@external": "transparent",
  "@provides": "#9c27b0", // Vivid purple
  "@requires": "#4caf50", // Green
  "@shareable": "#607d8b",
  "@extends": "#795548",
  "@override": "#e91e63",
};

function DirectiveBadge({ name }) {
  const isKey = name === "@key";
  const isExternal = name === "@external";

  let content = name.replace("@", "");
  let style = { backgroundColor: BADGE_COLORS[name] || "#607d8b" };
  let className = "directive-badge";

  if (isKey) {
    content = "🔑";
    style = { backgroundColor: "#ffd700", color: "#000" };
  } else if (isExternal) {
    className += " badge-external";
    style = {
      backgroundColor: "transparent",
      border: "1px dashed #ccc",
      color: "#666",
    };
  }

  return (
    <span className={className} style={style} title={name}>
      {content}
    </span>
  );
}

export default function ERDiagramNode({ data }) {
  const { label, fields, directives, color, sourceNames } = data;

  return (
    <div className="er-node" style={{ borderColor: color }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: color }}
      />
      <div className="er-node-header" style={{ backgroundColor: color }}>
        <div className="er-node-title">{label}</div>
        {directives && directives.length > 0 && (
          <div className="er-node-directives">
            {directives.map((d, i) => (
              <DirectiveBadge key={i} name={d.name} />
            ))}
          </div>
        )}
      </div>
      <div className="er-node-body">
        {fields && fields.length > 0 ? (
          <ul className="er-node-fields">
            {fields.map((field, idx) => {
              const isExternal = field.directives?.some(
                (d) => d.name === "@external",
              );
              const isScalar = !isComplexType(field.type);
              const isKey = field.directives?.some((d) => d.name === "@key");
              const shouldHide = isScalar && !isKey;

              return (
                <li
                  key={idx}
                  className={`er-node-field ${isExternal ? "external-field" : ""} ${shouldHide ? "hide-by-default" : ""}`}
                  style={{ position: "relative" }}
                >
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`target-${field.name}`}
                    style={{
                      top: "50%",
                      transform: "translateY(-50%)",
                      opacity: 0,
                    }}
                  />
                  <span className="field-name">{field.name}</span>
                  <span
                    className={`field-type ${isScalar ? "is-scalar" : "is-complex"}`}
                  >
                    {field.type}
                  </span>
                  {field.directives && field.directives.length > 0 && (
                    <span className="field-badges">
                      {field.directives.map((d, i) => (
                        <DirectiveBadge key={i} name={d.name} />
                      ))}
                    </span>
                  )}
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`source-${field.name}`}
                    style={{
                      top: "50%",
                      transform: "translateY(-50%)",
                      opacity: 0,
                    }}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="er-node-empty">No fields</div>
        )}
      </div>
      {sourceNames && sourceNames.length > 0 && (
        <div className="er-node-footer">
          {sourceNames.map((name, i) => (
            <span key={i} className="er-node-source">
              {name}
            </span>
          ))}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: color }}
      />
    </div>
  );
}
