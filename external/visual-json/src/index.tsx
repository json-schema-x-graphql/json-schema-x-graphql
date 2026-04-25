/**
 * visual-json — vendored JSON tree viewer/editor (React component)
 *
 * Vendored in-repo at external/visual-json/ to avoid depending on an external
 * npm package. Provides a stable interface; extend freely.
 *
 * Original package: https://www.npmjs.com/package/visual-json
 */
import React, { useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface JsonViewProps {
  /** JSON value to display */
  data: unknown;
  /** Root node name shown in the tree */
  name?: string;
  /** Default collapsed depth (0 = all collapsed, Infinity = all expanded) */
  collapsed?: number | boolean;
  /** Called when a value is edited (JsonEditor mode) */
  onChange?: (path: string[], newValue: unknown) => void;
  /** Display as editable inputs */
  editable?: boolean;
  /** Optional CSS class */
  className?: string;
  /** Indent size in px per level */
  indentWidth?: number;
}

export interface JsonEditorProps extends Omit<JsonViewProps, "editable"> {
  onChange: (path: string[], newValue: unknown) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getType(val: unknown): string {
  if (val === null) return "null";
  if (Array.isArray(val)) return "array";
  return typeof val;
}

function stringify(val: unknown): string {
  if (val === null) return "null";
  if (typeof val === "string") return `"${val}"`;
  return String(val);
}

// ── Node component ────────────────────────────────────────────────────────────

interface NodeProps {
  name: string;
  value: unknown;
  path: string[];
  depth: number;
  collapsed: number | boolean;
  editable: boolean;
  indentWidth: number;
  onChange?: (path: string[], newValue: unknown) => void;
}

const JsonNode: React.FC<NodeProps> = ({
  name,
  value,
  path,
  depth,
  collapsed,
  editable,
  indentWidth,
  onChange,
}) => {
  const isCollapsedByDefault =
    typeof collapsed === "boolean"
      ? collapsed
      : depth >= collapsed;

  const [isOpen, setIsOpen] = useState(!isCollapsedByDefault);
  const [editValue, setEditValue] = useState(stringify(value));

  const type = getType(value);
  const isExpandable = type === "object" || type === "array";
  const indent = depth * indentWidth;

  const handleToggle = useCallback(() => setIsOpen((o) => !o), []);

  const handleBlur = useCallback(() => {
    if (!onChange) return;
    try {
      onChange(path, JSON.parse(editValue));
    } catch {
      // revert if parse fails
      setEditValue(stringify(value));
    }
  }, [editValue, onChange, path, value]);

  const bracket = type === "array" ? ["[", "]"] : ["{", "}"];
  const childEntries =
    isExpandable ? Object.entries(value as Record<string, unknown>) : [];
  const summary = isExpandable
    ? `${isOpen ? bracket[0] : `${bracket[0]}…${bracket[1]}`} ${
        !isOpen ? `(${childEntries.length})` : ""
      }`
    : null;

  return (
    <div
      style={{ marginLeft: indent, fontFamily: "monospace", fontSize: "13px", lineHeight: 1.6 }}
      data-path={path.join(".")}
    >
      {isExpandable ? (
        <>
          <span
            role="button"
            tabIndex={0}
            aria-expanded={isOpen}
            style={{ cursor: "pointer", userSelect: "none" }}
            onClick={handleToggle}
            onKeyDown={(e) => e.key === "Enter" && handleToggle()}
          >
            <span style={{ color: "#888", marginRight: 4 }}>{isOpen ? "▾" : "▸"}</span>
            <span style={{ color: "#c792ea", fontWeight: 600 }}>{name}</span>
            <span style={{ color: "#89ddff" }}>: </span>
            <span style={{ color: "#ffcb6b" }}>{summary}</span>
          </span>
          {isOpen && (
            <div>
              {childEntries.map(([k, v]) => (
                <JsonNode
                  key={k}
                  name={k}
                  value={v}
                  path={[...path, k]}
                  depth={depth + 1}
                  collapsed={collapsed}
                  editable={editable}
                  indentWidth={indentWidth}
                  onChange={onChange}
                />
              ))}
              <span style={{ color: "#ffcb6b" }}>{bracket[1]}</span>
            </div>
          )}
        </>
      ) : (
        <div>
          <span style={{ color: "#c792ea", fontWeight: 600 }}>{name}</span>
          <span style={{ color: "#89ddff" }}>: </span>
          {editable && onChange ? (
            <input
              style={{
                background: "#1e1e2e",
                color: "#a6e3a1",
                border: "1px solid #45475a",
                borderRadius: 3,
                padding: "1px 4px",
                fontFamily: "monospace",
                fontSize: "13px",
              }}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              aria-label={path.join(".")}
            />
          ) : (
            <span
              style={{
                color:
                  type === "string"
                    ? "#a6e3a1"
                    : type === "number"
                    ? "#f38ba8"
                    : type === "boolean"
                    ? "#89dceb"
                    : "#cba6f7",
              }}
            >
              {stringify(value)}
            </span>
          )}
          <span style={{ color: "#6c7086" }}> // {type}</span>
        </div>
      )}
    </div>
  );
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * JsonView — read-only collapsible JSON tree
 */
export const JsonView: React.FC<JsonViewProps> = ({
  data,
  name = "root",
  collapsed = 2,
  editable = false,
  onChange,
  className,
  indentWidth = 16,
}) => (
  <div
    className={className}
    style={{
      background: "#1e1e2e",
      padding: "12px 16px",
      borderRadius: 6,
      overflow: "auto",
    }}
    role="tree"
    aria-label="JSON tree"
  >
    <JsonNode
      name={name}
      value={data}
      path={[]}
      depth={0}
      collapsed={collapsed}
      editable={editable}
      indentWidth={indentWidth}
      onChange={onChange}
    />
  </div>
);

/**
 * JsonEditor — editable JSON tree (same as JsonView with editable=true)
 */
export const JsonEditor: React.FC<JsonEditorProps> = (props) => (
  <JsonView {...props} editable />
);

export default JsonView;
