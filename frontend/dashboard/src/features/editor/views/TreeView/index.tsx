import React from "react";
import { useTheme } from "styled-components";
import { JSONTree } from "react-json-tree";
import useJson from "../../../../store/useJson";
import { Label } from "./Label";
import { Value } from "./Value";

export const TreeView = () => {
  const theme = useTheme();
  const json = useJson(state => state.json);

  // Handle invalid JSON gracefully
  let parsedData;
  let errorMessage: string | null = null;

  try {
    parsedData = JSON.parse(json);
  } catch (error) {
    errorMessage = `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`;
    parsedData = null;
  }

  if (errorMessage) {
    return (
      <div
        style={{
          padding: "1rem",
          color: "#ff6b6b",
          fontFamily: "monospace",
          backgroundColor: "#ffebee",
          border: "1px solid #ffcdd2",
          borderRadius: "4px",
          overflow: "auto",
          height: "100%",
        }}
      >
        <h3
          style={{
            margin: "0 0 0.5rem 0",
            color: "#d32f2f",
          }}
        >
          JSON Parsing Error
        </h3>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {errorMessage}
        </pre>
        <div
          style={{
            marginTop: "1rem",
            fontSize: "0.9em",
            color: "#666",
          }}
        >
          Please check your JSON input and try again.
        </div>
      </div>
    );
  }

  return (
    <JSONTree
      hideRoot
      data={parsedData}
      valueRenderer={(valueAsString, value) => <Value {...{ valueAsString, value }} />}
      labelRenderer={(keyPath, nodeType) => <Label {...{ keyPath, nodeType }} />}
      theme={{
        extend: {
          overflow: "scroll",
          height: "100%",
          scheme: "monokai",
          author: "wimer hazenberg (http://www.monokai.nl)",
          base00: theme.GRID_BG_COLOR,
        },
      }}
    />
  );
};
