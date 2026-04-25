import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useMantineColorScheme } from "@mantine/core";
import "@mantine/dropzone/styles.css";
import styled, { ThemeProvider } from "styled-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { NextSeo } from "next-seo";
import { ViewerNavigation } from "../components/ViewerNavigation";
import { SEO } from "../constants/seo";
import { darkTheme, lightTheme } from "../constants/theme";
import schema_unificationData from "../data/schema-unification.schema.json";
import { FileFormat } from "../enums/file.enum";
import { BottomBar } from "../features/editor/BottomBar";
import { FullscreenDropzone } from "../features/editor/FullscreenDropzone";
import { Toolbar } from "../features/editor/Toolbar";
import useGraph from "../features/editor/views/GraphView/stores/useGraph";
import useConfig from "../store/useConfig";
import useFile from "../store/useFile";

const ModalController = dynamic(() => import("../features/modals/ModalController"));
const ExternalMode = dynamic(() => import("../features/editor/ExternalMode"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export const StyledPageWrapper = styled.div`
  height: calc(100vh - 27px);
  width: 100%;

  @media only screen and (max-width: 320px) {
    height: 100vh;
  }
`;

export const StyledEditorWrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

export const StyledEditor = styled(Allotment)`
  position: relative !important;
  display: flex;
  background: ${({ theme }) => theme.BACKGROUND_SECONDARY};
  height: calc(100vh - 67px);

  @media only screen and (max-width: 320px) {
    height: 100vh;
  }
`;

const TextEditor = dynamic(() => import("../features/editor/TextEditor"), {
  ssr: false,
});

const LiveEditor = dynamic(() => import("../features/editor/LiveEditor"), {
  ssr: false,
});

const SchemaUnificationDataViewer = () => {
  const { setColorScheme } = useMantineColorScheme();
  const setContents = useFile((state) => state.setContents);
  const darkmodeEnabled = useConfig((state) => state.darkmodeEnabled);
  const fullscreen = useGraph((state) => state.fullscreen);
  const [dataLoaded, setDataLoaded] = useState(false);
  useEffect(() => {
    if (!dataLoaded) {
      const dataToLoad = schema_unificationData;

      if (typeof window !== "undefined") {
        // First: prefer example data passed via localStorage (ViewerNavigation sets this)
        const exampleDataLS = localStorage.getItem("schema_unification-example-data");
        const exampleNameStored = localStorage.getItem("schema_unification-example-name");

        if (exampleDataLS && exampleNameStored) {
          try {
            const parsed = JSON.parse(exampleDataLS);
            // Clear the localStorage after loading so repeated navigations don't reuse it unexpectedly
            localStorage.removeItem("schema_unification-example-data");
            localStorage.removeItem("schema_unification-example-name");

            setContents({
              contents: JSON.stringify(parsed, null, 2),
              format: FileFormat.JSON,
              hasChanges: false,
            });
            setDataLoaded(true);
            return;
          } catch (error) {
            // If parsing fails, fall back to URL-based logic below

            console.warn("Failed to parse example data from localStorage:", error);
          }
        }

        // Second: support the existing URL-based example/system loader
        const params = new URLSearchParams(window.location.search);
        const example = params.get("example");
        const system = params.get("system");

        if (example === "true" && system) {
          let examplePath = "";
          if (system === "contract_data") {
            examplePath = "/data/generated/examples/contract_data.json";
          } else if (system === "legacy_procurement") {
            examplePath = "/data/generated/examples/legacy_procurement.json";
          } else if (system === "intake_process") {
            examplePath = "/data/generated/examples/intake_process.json";
          }
          if (examplePath) {
            fetch(examplePath)
              .then((res) => res.json())
              .then((json) => {
                setContents({
                  contents: JSON.stringify(json, null, 2),
                  format: FileFormat.JSON,
                  hasChanges: false,
                });
                setDataLoaded(true);
              })
              .catch(() => {
                setContents({
                  contents: JSON.stringify(schema_unificationData, null, 2),
                  format: FileFormat.JSON,
                  hasChanges: false,
                });
                setDataLoaded(true);
              });
            return;
          }
        }
      }

      // Default: load the canonical generated data
      const jsonString = JSON.stringify(dataToLoad, null, 2);
      setContents({
        contents: jsonString,
        format: FileFormat.JSON,
        hasChanges: false,
      });
      setDataLoaded(true);
    }
  }, [setContents, dataLoaded]);

  useEffect(() => {
    setColorScheme(darkmodeEnabled ? "dark" : "light");
  }, [darkmodeEnabled, setColorScheme]);

  return (
    <>
      <NextSeo
        {...SEO}
        title="GSA Enterprise - Schema Unification Forest Data Viewer"
        description="Visualize and explore schema_unification.json data in an interactive graph format."
        canonical="https://github.com/GSA-TTS/enterprise-schema-unification/schema_unification-data-viewer"
      />
      <ThemeProvider theme={darkmodeEnabled ? darkTheme : lightTheme}>
        <QueryClientProvider client={queryClient}>
          <ViewerNavigation currentViewer="data" />
          <ExternalMode />
          <ModalController />
          <StyledEditorWrapper>
            <StyledPageWrapper>
              <Toolbar />
              <StyledEditorWrapper>
                <StyledEditor proportionalLayout={false}>
                  <Allotment.Pane
                    preferredSize={450}
                    minSize={fullscreen ? 0 : 300}
                    maxSize={800}
                    visible={!fullscreen}
                  >
                    <TextEditor />
                  </Allotment.Pane>
                  <Allotment.Pane minSize={0}>
                    <LiveEditor />
                  </Allotment.Pane>
                </StyledEditor>
                <FullscreenDropzone />
              </StyledEditorWrapper>
            </StyledPageWrapper>
            <BottomBar />
          </StyledEditorWrapper>
        </QueryClientProvider>
      </ThemeProvider>
    </>
  );
};

export default SchemaUnificationDataViewer;
