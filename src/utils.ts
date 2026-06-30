import { Page, CardSettings } from "./types";

// Split content into clean pages elegantly
export const splitContentToPages = (
  rawTitle: string,
  rawContent: string,
  autoPaginate: boolean,
  settings: CardSettings,
  aspectRatio: "3:4" | "3:5" = "3:4"
): Page[] => {
  // First, split by manual indicator: "---" on a separate line
  const manualBlocks = rawContent.split(/\n---\s*\n|\n---\s*$/g);
  
  const pages: Page[] = [];
  
  // Set approximate char limit per card based on font sizes to prevent overflow
  let maxChars = 320;
  const containsChinese = /[\u4e00-\u9fa5]/.test(rawContent);

  if (containsChinese) {
    if (settings.bodySize === 'sm') maxChars = 550;
    else if (settings.bodySize === 'md') maxChars = 450;
    else if (settings.bodySize === 'lg') maxChars = 350;
    else if (settings.bodySize === 'xl') maxChars = 250;
    else maxChars = 450;
  } else {
    if (settings.bodySize === 'sm') maxChars = 360;
    else if (settings.bodySize === 'md') maxChars = 300;
    else if (settings.bodySize === 'lg') maxChars = 240;
    else if (settings.bodySize === 'xl') maxChars = 180;
    else maxChars = 320;
  }

  // Adjust for 3:5 aspect ratio (which is taller)
  if (aspectRatio === "3:5") {
    maxChars = Math.floor(maxChars * 1.25);
  }

  // Adjust for custom padding (more padding means less space)
  if (settings.padding > 24) {
    maxChars = Math.floor(maxChars * 0.9);
  } else if (settings.padding < 24) {
    maxChars = Math.floor(maxChars * 1.1);
  }

  // If title is displayed on every card, decrease character count slightly
  if (settings.showTitle && rawTitle) {
    maxChars -= Math.floor(maxChars * 0.18);
  }

  manualBlocks.forEach((block, idx) => {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) return;

    if (!autoPaginate) {
      // Create single page for this manual block
      pages.push({
        id: `page-manual-${idx}`,
        title: rawTitle,
        content: trimmedBlock
      });
      return;
    }

    // Auto paginate inside this block
    const lines = trimmedBlock.split("\n");
    let currentChunk = "";
    let subIdx = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // If adding this line exceeds the char limit, and we already have content, push previous content as a page
      if (currentChunk.length + line.length > maxChars && currentChunk.trim()) {
        pages.push({
          id: `page-${idx}-${subIdx}`,
          title: rawTitle,
          content: currentChunk.trim()
        });
        currentChunk = line + "\n";
        subIdx++;
      } else {
        currentChunk += line + "\n";
      }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      pages.push({
        id: `page-${idx}-${subIdx}-last`,
        title: rawTitle,
        content: currentChunk.trim()
      });
    }
  });

  // Fallback: if empty, return one blank page
  if (pages.length === 0) {
    pages.push({
      id: "blank",
      title: rawTitle,
      content: ""
    });
  }

  return pages;
};

// Copy helper with feedback
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Failed to copy text: ", err);
    return false;
  }
};
