import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { JSONEditor } from "vanilla-jsoneditor";
import "vanilla-jsoneditor/themes/jse-theme-dark.css";

const CodeMirrorEditor = forwardRef(function CodeMirrorEditor(
  { value, onChange },
  ref,
) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    editorRef.current = new JSONEditor({
      target: containerRef.current,
      props: {
        content: { text: value || "" },
        onChange: (updatedContent) => {
          if (onChange) {
            const text =
              "text" in updatedContent
                ? updatedContent.text
                : JSON.stringify(updatedContent.json, null, 2);
            onChange(text);
          }
        },
      },
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []); // Run once on mount

  // Sync value from props to editor
  useEffect(() => {
    if (editorRef.current) {
      const currentContent = editorRef.current.get();
      const currentText =
        "text" in currentContent
          ? currentContent.text
          : JSON.stringify(currentContent.json, null, 2);

      if (currentText !== value) {
        editorRef.current.updateProps({
          content: { text: value || "" },
        });
      }
    }
  }, [value]);

  useImperativeHandle(ref, () => ({
    getValue: () => {
      if (!editorRef.current) return value;
      const content = editorRef.current.get();
      return "text" in content
        ? content.text
        : JSON.stringify(content.json, null, 2);
    },
    setValue: (v) => {
      const text = typeof v === "string" ? v : JSON.stringify(v, null, 2);
      if (editorRef.current) {
        editorRef.current.updateProps({ content: { text } });
      }
      if (onChange) onChange(text);
    },
    focus: () => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    },
  }));

  // Render with jse-theme-dark to automatically use dark mode styling
  // And custom overrides to transparent background
  return (
    <div
      className="jse-theme-dark custom-json-editor"
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    />
  );
});

export default CodeMirrorEditor;
