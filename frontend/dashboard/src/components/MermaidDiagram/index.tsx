import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

const MermaidContainer = styled.div<{ $isFullscreen?: boolean }>`
  position: relative;
  width: 100%;
  height: ${({ $isFullscreen }) => ($isFullscreen ? "80vh" : "300px")};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e0e0e0;
  border-radius: 15px;
  background: #f9f9f9;
  overflow: auto;

  .mermaid {
    max-width: 100%;
    max-height: 100%;
  }

  svg {
    max-width: 100%;
    max-height: 100%;
    height: auto;
  }
`;

const ExpandButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: rgba(255, 255, 255, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  display: ${({ $isOpen }) => ($isOpen ? "flex" : "none")};
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  padding: 20px;
  background: white;
  border-radius: 15px;
  max-width: 95vw;
  max-height: 95vh;
  overflow: auto;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: #5a6268;
  }
`;

interface MermaidDiagramProps {
  definition: string;
  title?: string;
}

export const MermaidDiagram = ({ definition }: MermaidDiagramProps) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [svgContent, setSvgContent] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const renderDiagram = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "Arial, sans-serif",
          fontSize: 14,
          er: {
            diagramPadding: 20,
            layoutDirection: "TB",
            minEntityWidth: 100,
            minEntityHeight: 75,
            entityPadding: 15,
            stroke: "#333333",
            fill: "#ECECFF",
            fontSize: 12,
          },
        });

        if (definition) {
          const randomId = `mermaid-${Math.random().toString().replace(".", "_")}`;
          const { svg } = await mermaid.render(randomId, definition);
          setSvgContent(svg);
        }
      } catch (error) {
        console.error("Error rendering Mermaid diagram:", error);
        setSvgContent(
          '<div style="padding: 20px; text-align: center; color: #666;">Error rendering diagram</div>',
        );
      }
    };

    renderDiagram();
  }, [definition, isClient]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isClient) {
    return (
      <MermaidContainer>
        <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
          Loading diagram...
        </div>
      </MermaidContainer>
    );
  }

  const DiagramContent = () => (
    <MermaidContainer $isFullscreen={isFullscreen}>
      <ExpandButton onClick={toggleFullscreen}>
        {isFullscreen ? "✕ Close" : "⛶ Expand"}
      </ExpandButton>
      <div
        ref={mermaidRef}
        className="mermaid-container"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </MermaidContainer>
  );

  return (
    <>
      {!isFullscreen && <DiagramContent />}
      <ModalOverlay $isOpen={isFullscreen} onClick={() => setIsFullscreen(false)}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <CloseButton onClick={() => setIsFullscreen(false)}>✕ Close</CloseButton>
          <DiagramContent />
        </ModalContent>
      </ModalOverlay>
    </>
  );
};
