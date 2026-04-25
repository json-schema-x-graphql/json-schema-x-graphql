import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";

const CodeMirrorEditor = forwardRef(function CodeMirrorEditor({ value, onChange }, ref) {
  const textareaRef = useRef(null);
  const [currentValue, setCurrentValue] = useState(value);

  // keep internal currentValue in sync with prop
  useEffect(() => setCurrentValue(value), [value]);

  // Parse value to object for structured editor; if invalid JSON, fallback to text area
  let parsed = null;
  let invalidJson = false;
  try {
    parsed = currentValue ? JSON.parse(currentValue) : {};
  } catch {
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
    } catch {
      strVal = String(newVal);
    }
    setCurrentValue(strVal);
    try {
      onChange(strVal);
    } catch {
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
      } catch {}
    },
    focus: () => {
      if (textareaRef.current) textareaRef.current.focus();
    },
  }));

  // Fallback editor: always use a textarea to avoid unresolved optional editor imports
  return (
    <textarea
      ref={textareaRef}
      style={{
        height: "100%",
        width: "100%",
        fontFamily: "monospace",
        fontSize: 13,
      }}
      value={invalidJson ? parsed : currentValue}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
});

export default CodeMirrorEditor;
