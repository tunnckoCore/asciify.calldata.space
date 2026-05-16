import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Inject font styles directly into the component
const fontStyles = `
  @font-face {
    font-family: "Low Blockscript";
    src: url("/fonts/low-blockscript.woff2") format("woff2"),
         url("/fonts/low-blockscript.otf") format("opentype");
    font-display: swap;
  }

  @font-face {
    font-family: "High Blockscript";
    src: url("/fonts/high-blockscript.woff2") format("woff2"),
         url("/fonts/high-blockscript.otf") format("opentype");
    font-display: swap;
  }
`;

interface AsciifyReactProps {
  content: string;
  backgroundImage: string;
  transactionHash: string;
}

const AsciifyReact: React.FC<AsciifyReactProps> = ({
  content,
  backgroundImage,
  transactionHash,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedChars, setSelectedChars] = useState<Set<number>>(new Set());
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>(null);

  // Memoize character array to prevent unnecessary re-renders
  const characters = useMemo(() => {
    return content.split("").map((char, index) => ({
      char,
      index,
      isSelected: selectedChars.has(index),
    }));
  }, [content, selectedChars]);

  const handleSelectionChange = useCallback(() => {
    if (!containerRef.current) return;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce selection changes for performance
    debounceTimeoutRef.current = setTimeout(() => {
      const selection = window.getSelection();
      const newSelectedChars = new Set<number>();

      if (
        selection &&
        selection.rangeCount > 0 &&
        selection.toString().length > 0
      ) {
        const range = selection.getRangeAt(0);

        // Check if selection is within our container
        if (
          containerRef.current &&
          containerRef.current.contains(range.commonAncestorContainer)
        ) {
          // Use range offsets for much faster selection detection
          let startOffset = 0;
          let endOffset = 0;

          try {
            // Calculate character offsets by walking the DOM
            const walker = document.createTreeWalker(
              containerRef.current,
              NodeFilter.SHOW_TEXT,
              null,
            );

            let currentOffset = 0;
            let textNode;

            while ((textNode = walker.nextNode())) {
              const nodeLength = textNode.textContent?.length || 0;

              if (textNode === range.startContainer) {
                startOffset = currentOffset + range.startOffset;
              }
              if (textNode === range.endContainer) {
                endOffset = currentOffset + range.endOffset;
                break;
              }

              currentOffset += nodeLength;
            }

            // Add selected character indices
            for (
              let i = startOffset;
              i < endOffset && i < content.length;
              i++
            ) {
              newSelectedChars.add(i);
            }
          } catch (error) {
            // Fallback: just clear selection if calculation fails
            console.warn("Selection calculation failed:", error);
          }
        }
      }

      setSelectedChars(newSelectedChars);
    }, 0); // No debounce needed with fast offset calculation
  }, []);

  useEffect(() => {
    // Inject font styles
    const styleElement = document.createElement("style");
    styleElement.textContent = fontStyles;
    document.head.appendChild(styleElement);

    // Check if fonts are loaded
    const checkFonts = async () => {
      try {
        await document.fonts.load('10px "Low Blockscript"');
        await document.fonts.load('10px "High Blockscript"');
        setFontsLoaded(true);
        console.log("Fonts loaded successfully");
      } catch (error) {
        console.log("Font loading error:", error);
        setFontsLoaded(true); // Continue anyway
      }
    };

    checkFonts();

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      document.head.removeChild(styleElement);
    };
  }, [handleSelectionChange]);

  const containerStyle = {
    backgroundImage: `url("${backgroundImage}")`,
    backgroundClip: "text",
    backgroundPosition: "center center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    WebkitTextFillColor: "transparent",
    textFillColor: "transparent",
    wordBreak: "break-all" as const,
    fontSize: "14px",
    textAlign: "justify" as const,
    userSelect: "text" as const,
    width: "750px",
    height: "750px",
  };

  const defaultCharStyle = {
    fontFamily: fontsLoaded ? '"High Blockscript"' : '"Low Blockscript"',
    display: "inline",
  };

  const selectedCharStyle = {
    fontFamily: '"Low Blockscript"',
    WebkitTextFillColor: "#000 !important",
    textFillColor: "#000 !important",
    color: "#000 !important",
    display: "inline",
  };

  return (
    <>
      {!fontsLoaded && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            color: "white",
            fontSize: "12px",
            zIndex: 1000,
          }}
        >
          Loading fonts...
        </div>
      )}
      <div
        ref={containerRef}
        className="asciiart art"
        data-eid={transactionHash}
        style={containerStyle}
      >
        {characters.map(({ char, index, isSelected }) => (
          <span
            key={index}
            className="ascii-char"
            style={isSelected ? selectedCharStyle : defaultCharStyle}
            data-font={isSelected ? "low-blockscript" : "high-blockscript"}
          >
            {char}
          </span>
        ))}
      </div>
    </>
  );
};

export default React.memo(AsciifyReact);
