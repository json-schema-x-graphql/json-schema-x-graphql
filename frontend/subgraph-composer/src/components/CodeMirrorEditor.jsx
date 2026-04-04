import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";

const CodeMirrorEditor = forwardRef(function CodeMirrorEditor({ value, onChange }, ref) {
  const [EditorComp, setEditorComp] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    let mounted = true;
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
        } else if (m.VisualJson && m.JsonEditor) {
          // Compose provider + editor
          const Visual = m.VisualJson;
          const JsonEd = m.JsonEditor;
          Comp = function WrappedVisualJson(props) {
            return React.createElement(Visual, { value: props.value, onChange: props.onChange }, React.createElement(JsonEd, null));
          };
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
  }, []);

  // keep internal currentValue in sync with prop
  useEffect(() => setCurrentValue(value), [value]);

  // Parse value to object for structured editor; if invalid JSON, fallback to text area
  let parsed = null;
  let invalidJson = false;
  try {
    parsed = currentValue ? JSON.parse(currentValue) : {};
  } catch (e) {
    invalidJson = true;
    parsed = currentValue;
  }

  const handleChange = (newVal) => {
    let strVal;
    try {
      if (typeof newVal === "string") {
        strVal = newVal;
      } else {
        strVal = JSON.stringify(newVal, null, 2);
      }
    } catch (e) {
      strVal = String(newVal);
    }
    setCurrentValue(strVal);
    try {
      onChange(strVal);
    } catch (e) {
      // ignore upstream handler errors here
    }
  };

  useImperativeHandle(ref, () => ({
    getValue: () => currentValue,
    setValue: (v) => {
      // accept object or string
      const next = typeof v === "string" ? v : JSON.stringify(v, null, 2);
      setCurrentValue(next);
      try {
        onChange(next);
      } catch (e) {}
    },
    focus: () => {
      if (editorRef.current && typeof editorRef.current.focus === "function") {
        try {
          editorRef.current.focus();
          return;
        } catch (e) {}
      }
      // Try to focus a focusable element inside the VisualJson container
      try {
        if (containerRef.current) {
          const focusable = containerRef.current.querySelector(
            "[tabindex], button, input, textarea, [role=tree], [role=button]"
          );
          if (focusable && typeof focusable.focus === "function") {
            focusable.focus();
            return;
          }
        }
      } catch (e) {}
      if (textareaRef.current) textareaRef.current.focus();
    },
  }));

  if (EditorComp && !invalidJson) {
    const Editor = EditorComp;
    return (
      <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
        <Editor value={parsed} onChange={handleChange} />
      </div>
    );
  }

  // Fallback: if JSON invalid or editor failed to load, show a textarea
  return (
    <textarea
      ref={textareaRef}
      style={{ height: "100%", width: "100%", fontFamily: "monospace", fontSize: 13 }}
      value={currentValue}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
});

export default CodeMirrorEditor;
