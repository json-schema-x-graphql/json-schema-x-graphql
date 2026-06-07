import React from "react";
import { Handle, Position } from "@xyflow/react";
import "./ERDiagramNode.css";

const BADGE_COLORS = {
  "@key": "#2196f3",
  "@external": "#ff9800",
  "@provides": "#4caf50",
  "@requires": "#f44336",
  "@shareable": "#9c27b0",
  "@extends": "#795548",
  "@override": "#e91e63",
};

function DirectiveBadge({ name }) {
  const color = BADGE_COLORS[name] || "#607d8b";
  return (
    <span
      className="directive-badge"
      style={{ backgroundColor: color }}
      title={name}
    >
      {name.replace("@", "")}
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
              return (
                <li
                  key={idx}
                  className={`er-node-field ${isExternal ? "external-field" : ""}`}
                >
                  <span className="field-name">{field.name}</span>
                  <span className="field-type">{field.type}</span>
                  {field.directives && field.directives.length > 0 && (
                    <span className="field-badges">
                      {field.directives.map((d, i) => (
                        <DirectiveBadge key={i} name={d.name} />
                      ))}
                    </span>
                  )}
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
