import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";

const CodeMirrorEditor = forwardRef(function CodeMirrorEditor(
  { value, onChange },
  ref,
) {
  const [EditorComp, setEditorComp] = useState(null);
  const [_loadError, setLoadError] = useState(false);
  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [currentValue, setCurrentValue] = useState(value);
  const [editMode, setEditMode] = useState("code"); // "code" | "visual"

  const isTest =
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV === "test";

  useEffect(() => {
    let mounted = true;
    if (isTest) {
      setLoadError(true);
      return;
    }
    // Dynamic import to support multiple package layout possibilities
    import("@visual-json/react")
      .then((m) => {
        if (!mounted) return;
        let Comp = null;
        // Prefer a ready-to-render editor component
        if (m.JsonEditor) {
          Comp = m.JsonEditor;
        } else if (m.FormView) {
          Comp = m.FormView;
        } else if (m.VisualJson) {
          Comp = m.VisualJson;
        } else if (m.default) {
          Comp = m.default;
        }
        if (Comp) setEditorComp(() => Comp);
        else setLoadError(true);
      })
      .catch(() => setLoadError(true));
    return () => {
      mounted = false;
    };
  }, [isTest]);

  // Keep internal currentValue in sync with prop — only update when actually different
  // to avoid a props→state→parent→props render cycle.
  useEffect(() => {
    if (value !== currentValue) {
      setCurrentValue(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Parse value to object for structured editor; if invalid JSON, fallback to text area
  let parsed = null;
  let invalidJson = false;
  try {
    parsed = currentValue ? JSON.parse(currentValue) : {};
  } catch (_e) {
    invalidJson = true;
    parsed = currentValue;
  }

  // Stable onChange handler — new reference only when onChange prop itself changes.
  // This prevents @visual-json/react's FormView from seeing a new prop every render
  // and firing its internal useEffect([onChange]) → setState infinite loop.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const handleChange = useCallback((newVal) => {
    let strVal;
    try {
      if (typeof newVal === "string") {
        strVal = newVal;
      } else {
        strVal = JSON.stringify(newVal, null, 2);
      }
    } catch (_e) {
      strVal = String(newVal);
    }
    setCurrentValue(strVal);
    try {
      onChangeRef.current(strVal);
    } catch (_e) {
      // ignore upstream handler errors here
    }
  }, []); // [] — stable for the lifetime of this component instance

  useImperativeHandle(ref, () => ({
    getValue: () => currentValue,
    setValue: (v) => {
      // accept object or string
      const next = typeof v === "string" ? v : JSON.stringify(v, null, 2);
      setCurrentValue(next);
      try {
        onChange(next);
      } catch (_e) {}
    },
    focus: () => {
      if (editorRef.current && typeof editorRef.current.focus === "function") {
        try {
          editorRef.current.focus();
          return;
        } catch (_e) {}
      }
      // Try to focus a focusable element inside the VisualJson container
      try {
        if (containerRef.current) {
          const focusable = containerRef.current.querySelector(
            "[tabindex], button, input, textarea, [role=tree], [role=button]",
          );
          if (focusable && typeof focusable.focus === "function") {
            focusable.focus();
            return;
          }
        }
      } catch (_e) {}
      if (textareaRef.current) textareaRef.current.focus();
    },
  }));

  // If in test mode, display raw textarea for safety
  if (isTest) {
    return (
      <textarea
        ref={textareaRef}
        style={{
          height: "100%",
          width: "100%",
          fontFamily: "monospace",
          fontSize: 13,
        }}
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      {/* Editor Tab Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg-secondary)",
          padding: "var(--spacing-xs) var(--spacing-md)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
          <button
            className={`btn btn-small ${editMode === "code" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setEditMode("code")}
            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
          >
            Code
          </button>
          {EditorComp && (
            <button
              className={`btn btn-small ${editMode === "visual" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                if (invalidJson) {
                  alert("Cannot switch to Visual Form: JSON is invalid");
                  return;
                }
                setEditMode("visual");
              }}
              disabled={invalidJson}
              style={{ padding: "4px 8px", fontSize: "0.75rem" }}
              title={invalidJson ? "Visual editor is disabled for invalid JSON" : ""}
            >
              Visual Form
            </button>
          )}
        </div>
        {invalidJson && (
          <span style={{ color: "var(--color-danger)", fontSize: "0.75rem" }}>
            ⚠️ Invalid JSON
          </span>
        )}
      </div>

      {/* Editor Content Area */}
      <div style={{ flex: 1, overflow: "auto", position: "relative", minHeight: 0 }}>
        {editMode === "visual" && EditorComp && !invalidJson ? (
          <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
            <EditorComp value={parsed} onChange={handleChange} />
          </div>
        ) : (
          <CodeMirror
            value={currentValue}
            height="100%"
            extensions={[json()]}
            onChange={handleChange}
            style={{ height: "100%", width: "100%" }}
          />
        )}
      </div>
    </div>
  );
});

export default CodeMirrorEditor;
