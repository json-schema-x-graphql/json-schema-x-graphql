import React from "react";
import { Handle, Position } from "@xyflow/react";
import { isComplexType } from "../lib/erDiagramParser.js";
import "./ERDiagramNode.css";

const BADGE_COLORS = {
  "@key": "linear-gradient(135deg, #ffd700, #ff9800)", // Glowing gold
  "@external": "transparent",
  "@provides": "linear-gradient(135deg, #ab47bc, #7b1fa2)", // Vivid purple
  "@requires": "linear-gradient(135deg, #66bb6a, #388e3c)", // Green
  "@shareable": "linear-gradient(135deg, #78909c, #455a64)",
  "@extends": "linear-gradient(135deg, #8d6e63, #5d4037)",
  "@override": "linear-gradient(135deg, #ec407a, #c2185b)",
};

function DirectiveBadge({ name }) {
  const isKey = name === "@key";
  const isExternal = name === "@external";

  let content = name.replace("@", "");
  let style = { background: BADGE_COLORS[name] || "#607d8b" };
  let className = "directive-badge";

  if (isKey) {
    content = "🔑";
    style = { background: BADGE_COLORS[name], color: "#000" };
  } else if (isExternal) {
    className += " badge-external";
    style = {
      background: "transparent",
      border: "1px dashed rgba(255,255,255,0.4)",
      color: "rgba(255,255,255,0.7)",
    };
  }

  return (
    <span className={className} style={style} title={name}>
      {content}
    </span>
  );
}

// Convert hex to rgba for glassmorphism
const hexToRgba = (hex, alpha) => {
  if (!hex || !hex.startsWith("#")) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function ERDiagramNode({ data }) {
  const { label, fields, directives, color, sourceNames } = data;
  const glowColor = hexToRgba(color, 0.4);
  const headerBg = hexToRgba(color, 0.2);

  return (
    <div 
      className="er-node" 
      style={{ 
        "--node-color": color, 
        "--node-glow": glowColor,
        borderTopColor: color 
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="er-handle top-handle"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
      <div className="er-node-header" style={{ background: headerBg }}>
        <div className="er-node-title-wrapper">
          <div className="er-node-title">{label}</div>
        </div>
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
                >
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`target-${field.name}`}
                    className="er-handle side-handle"
                    style={{ opacity: 0 }}
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
                    className="er-handle side-handle"
                    style={{ opacity: 0 }}
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
            <span key={i} className="er-node-source" style={{ color: color, borderColor: hexToRgba(color, 0.3) }}>
              {name}
            </span>
          ))}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="er-handle bottom-handle"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
    </div>
  );
}
