import React, { useCallback } from "react";
import { LoadingOverlay } from "@mantine/core";
import styled from "styled-components";
import type { EditorProps } from "@monaco-editor/react";
import ClientMonacoEditor from "../../components/ClientMonacoEditor";
import useConfig from "../../store/useConfig";
import useFile from "../../store/useFile";

/**
 * Load @monaco-editor/react only on the client at runtime.
 * We configure the loader as soon as the module is imported so the monaco
 * worker paths are set before the editor initializes.
 */
const Editor = ClientMonacoEditor;

const editorOptions: EditorProps["options"] = {
  formatOnPaste: true,
  tabSize: 2,
  formatOnType: true,
  minimap: { enabled: false },
  stickyScroll: { enabled: false },
  scrollBeyondLastLine: false,
  placeholder: "Start typing...",
};

const TextEditor = () => {
  // useMonaco removed — access the Monaco global via `window.monaco` in effects instead
  const contents = useFile(state => state.contents);
  const setContents = useFile(state => state.setContents);
  const setError = useFile(state => state.setError);
  const jsonSchema = useFile(state => state.jsonSchema);
  const getHasChanges = useFile(state => state.getHasChanges);
  const theme = useConfig(state => (state.darkmodeEnabled ? "vs-dark" : "light"));
  const fileType = useFile(state => state.format);

  React.useEffect(() => {
    // The Monaco global may not be available immediately because the editor is
    // loaded client-side and asynchronously. Poll briefly until the global
    // is present and then configure JSON diagnostics.
    let mounted = true;
    const applyDefaults = () => {
      try {
        const mon = typeof window !== "undefined" ? (window as any).monaco : null;
        if (mon && mon.languages && mon.languages.json && mon.languages.json.jsonDefaults) {
          mon.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            allowComments: true,
            enableSchemaRequest: true,
            ...(jsonSchema && {
              schemas: [
                {
                  uri: "http://myserver/foo-schema.json",
                  fileMatch: ["*"],
                  schema: jsonSchema,
                },
              ],
            }),
          });
          return true;
        }
      } catch (e) {
        // ignore and allow retry
      }
      return false;
    };

    if (!applyDefaults()) {
      const id = setInterval(() => {
        if (!mounted) return;
        if (applyDefaults()) {
          clearInterval(id);
        }
      }, 200);
      return () => {
        mounted = false;
        clearInterval(id);
      };
    }

    return () => {
      mounted = false;
    };
  }, [jsonSchema]);

  React.useEffect(() => {
    const beforeunload = (e: BeforeUnloadEvent) => {
      if (getHasChanges()) {
        const confirmationMessage =
          "Unsaved changes, if you leave before saving  your changes will be lost";

        (e || window.event).returnValue = confirmationMessage; //Gecko + IE
        return confirmationMessage;
      }
    };

    window.addEventListener("beforeunload", beforeunload);

    return () => {
      window.removeEventListener("beforeunload", beforeunload);
    };
  }, [getHasChanges]);

  const handleMount = useCallback(editor => {
    editor.onDidPaste(() => {
      editor.getAction("editor.action.formatDocument")?.run();
    });
  }, []);

  return (
    <StyledEditorWrapper>
      <StyledWrapper>
        <Editor
          height="100%"
          language={fileType}
          theme={theme}
          value={contents}
          options={editorOptions}
          onMount={handleMount}
          onValidate={errors => setError(errors[0]?.message)}
          onChange={contents => setContents({ contents, skipUpdate: true })}
          loading={<LoadingOverlay visible />}
        />
      </StyledWrapper>
    </StyledEditorWrapper>
  );
};

export default TextEditor;

const StyledEditorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  user-select: none;
`;

const StyledWrapper = styled.div`
  display: grid;
  height: calc(100vh - 67px);
  grid-template-columns: 100%;
  grid-template-rows: minmax(0, 1fr);
`;
