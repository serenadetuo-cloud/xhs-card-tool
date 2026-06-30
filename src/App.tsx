import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Trash2, 
  Copy, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Layers, 
  Sliders, 
  Plus, 
  BookOpen, 
  HelpCircle,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Undo2,
  Redo2,
  RefreshCw,
  Image as ImageIcon
} from "lucide-react";
import { TEMPLATES, DEFAULT_SETTINGS, POPULAR_EMOJIS, SAMPLE_NOTE } from "./data";
import { CardSettings, Page, Template, ModelConfig } from "./types";
import { splitContentToPages, copyToClipboard } from "./utils";
import { CardPreview } from "./components/CardPreview";
import { AIPanel } from "./components/AIPanel";
import { ModelConfigPanel } from "./components/ModelConfigPanel";
import { toPng } from "html-to-image";

export default function App() {
  // Advanced Model Settings State
  const [modelConfig, setModelConfig] = useState<ModelConfig>(() => {
    try {
      const saved = localStorage.getItem("user_model_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        const isGeminiModel = parsed.model && parsed.model.toLowerCase().includes("gemini");
        return {
          provider: "gemini",
          apiKey: parsed.apiKey || "",
          baseUrl: parsed.baseUrl || "",
          model: isGeminiModel ? parsed.model : "gemini-3.5-flash"
        };
      }
    } catch (e) {
      console.error(e);
    }
    return {
      provider: "gemini",
      apiKey: "",
      baseUrl: "",
      model: "gemini-3.5-flash"
    };
  });

  useEffect(() => {
    localStorage.setItem("user_model_config", JSON.stringify(modelConfig));
  }, [modelConfig]);

  // Title & Body editor state
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>(SAMPLE_NOTE.content);
  
  // Sidebar toggles
  const [activeTab, setActiveTab] = useState<"templates" | "adjust">("templates");
  const [autoPaginate, setAutoPaginate] = useState<boolean>(true);
  const [showTitleOnAll, setShowTitleOnAll] = useState<boolean>(false);

  // Layout & Active page states
  const [aspectRatio, setAspectRatio] = useState<"3:4" | "3:5">("3:4");
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [activeTemplate, setActiveTemplate] = useState<Template>(TEMPLATES[0]);
  const [settings, setSettings] = useState<CardSettings>({
    ...DEFAULT_SETTINGS,
    showTitle: false
  });

  // History stack for undo/redo (debounced and state-aware)
  const [history, setHistory] = useState<{ content: string; settings: CardSettings; activeTemplateId: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isNavigatingHistory = useRef<boolean>(false);

  // Status feedback
  const [copied, setCopied] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportAllProgress, setExportAllProgress] = useState<string | null>(null);
  const [generatingCover, setGeneratingCover] = useState<boolean>(false);

  const handleGenerateCover = async () => {
    if (!content.trim()) return;
    setGeneratingCover(true);
    try {
      const res = await fetch("/api/ai/generate-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, modelConfig }),
      });
      const data = await res.json();
      if (data.coverTitle) {
        setSettings(prev => ({
          ...prev,
          coverTitle: data.coverTitle,
          coverSubtitle: data.coverSubtitle || "",
          coverTags: data.coverTags || ""
        }));
      }
    } catch (e) {
      console.error("Failed to generate AI cover:", e);
    } finally {
      setGeneratingCover(false);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [previewScale, setPreviewScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const [floatingToolbar, setFloatingToolbar] = useState<{
    show: boolean;
    x: number;
    y: number;
    text: string;
  }>({ show: false, x: 0, y: 0, text: "" });
  const mouseCoords = useRef({ x: 0, y: 0 });

  // Record history on changes (debounced with distinct check)
  useEffect(() => {
    if (isNavigatingHistory.current) {
      isNavigatingHistory.current = false;
      return;
    }

    const currentSettingsStr = JSON.stringify(settings);
    if (historyIndex >= 0) {
      const prev = history[historyIndex];
      if (
        prev.content === content &&
        prev.activeTemplateId === activeTemplate.id &&
        JSON.stringify(prev.settings) === currentSettingsStr
      ) {
        return;
      }
    }

    const handler = setTimeout(() => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({
        content,
        settings: JSON.parse(currentSettingsStr),
        activeTemplateId: activeTemplate.id
      });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }, 400); // Debounce consecutive keystrokes

    return () => clearTimeout(handler);
  }, [content, settings, activeTemplate.id]);

  // Split content to pages dynamically
  const pagesWithoutCover = useMemo(() => {
    return splitContentToPages(title, content, autoPaginate, settings, aspectRatio);
  }, [title, content, autoPaginate, settings, aspectRatio]);

  // Prepend cover page if showCover is active
  const pages = useMemo(() => {
    if (settings.showCover) {
      const coverPage: Page = {
        id: "cover",
        title: settings.coverTitle,
        content: ""
      };
      return [coverPage, ...pagesWithoutCover];
    }
    return pagesWithoutCover;
  }, [settings.showCover, settings.coverTitle, settings.coverSubtitle, settings.coverAuthor, settings.coverTags, pagesWithoutCover]);

  // Ensure activePageIndex stays within bounds
  useEffect(() => {
    if (activePageIndex >= pages.length) {
      setActivePageIndex(Math.max(0, pages.length - 1));
    }
  }, [pages.length, activePageIndex]);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      const parentWidth = containerRef.current?.parentElement?.clientWidth || 390;
      if (parentWidth < 390) {
        setPreviewScale(parentWidth / 390);
      } else {
        setPreviewScale(1);
      }
    };
    updateScale();
    const timer = setTimeout(updateScale, 150);
    window.addEventListener("resize", updateScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateScale);
    };
  }, [aspectRatio, pages.length]);

  // Undo / Redo helpers
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      isNavigatingHistory.current = true;
      setHistoryIndex(prevIdx);
      
      const prev = history[prevIdx];
      setContent(prev.content);
      setSettings(prev.settings);
      const foundTemplate = TEMPLATES.find(t => t.id === prev.activeTemplateId);
      if (foundTemplate) setActiveTemplate(foundTemplate);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      isNavigatingHistory.current = true;
      setHistoryIndex(nextIdx);
      
      const next = history[nextIdx];
      setContent(next.content);
      setSettings(next.settings);
      const foundTemplate = TEMPLATES.find(t => t.id === next.activeTemplateId);
      if (foundTemplate) setActiveTemplate(foundTemplate);
    }
  };

  // Insertion helpers for toolbar
  const insertTextAtCursor = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const scrollPos = textarea.scrollTop; // Lock scroll position to prevent scroll jumping
    const currentText = content;
    const selectedText = currentText.substring(start, end);
    
    const replacement = prefix + selectedText + suffix;
    const newContent = currentText.substring(0, start) + replacement + currentText.substring(end);
    
    setContent(newContent);
    
    // Focus back and highlight
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
      textarea.scrollTop = scrollPos; // Restore scroll position exactly
    }, 50);
  };

  // Heading inserting (clears selection start, inserts heading marker)
  const insertHeading = (level: 1 | 2 | 3) => {
    const marker = level === 1 ? "# " : level === 2 ? "## " : "### ";
    insertTextAtCursor(marker);
  };

  const insertHighlight = () => {
    insertTextAtCursor("==", "==");
  };

  const insertEmoji = (emoji: string) => {
    insertTextAtCursor(emoji);
  };

  const handleTextareaSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      const selectedText = textarea.value.substring(start, end).trim();
      if (selectedText.length > 0) {
        const rect = textarea.getBoundingClientRect();
        // Position the floating toolbar above the selection near the mouse release coordinates
        setFloatingToolbar({
          show: true,
          x: Math.min(Math.max(10, mouseCoords.current.x - rect.left - 70), rect.width - 230),
          y: Math.min(Math.max(10, mouseCoords.current.y - rect.top - 45), rect.height - 45),
          text: selectedText
        });
        return;
      }
    }
    setFloatingToolbar(prev => ({ ...prev, show: false }));
  };

  const handleTextareaMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    mouseCoords.current = { x: e.clientX, y: e.clientY };
  };

  // Add Page divider helper
  const addPageBreak = () => {
    const divider = "\n\n---\n\n";
    setContent(prev => prev + divider);
    // Auto scroll to bottom
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    }, 80);
  };

  // Reset/Clear note content
  const handleClear = () => {
    if (window.confirm("确定清空所有内容吗？此操作无法撤销。")) {
      setTitle("");
      setContent("");
      setActivePageIndex(0);
    }
  };

  // Load sample template
  const handleLoadSample = () => {
    setTitle(SAMPLE_NOTE.title);
    setContent(SAMPLE_NOTE.content);
    setActivePageIndex(0);
  };

  // Copy full typeset copywriting with emojis to clipboard
  const handleCopyText = async () => {
    const fullTextToCopy = `${title ? `【${title}】\n\n` : ""}${content.replace(/==/g, "")}`;
    const success = await copyToClipboard(fullTextToCopy);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Export current active card as high-res PNG image
  const handleExportCurrent = async () => {
    const node = document.getElementById(`active-card-render`);
    if (!node) return;

    setExporting(true);
    try {
      // Small pause to guarantee font rendering completes
      await new Promise(resolve => setTimeout(resolve, 300));
      const dataUrl = await toPng(node, {
        quality: 0.98,
        pixelRatio: 2, // 2x density for superb retina quality
        cacheBust: true,
        backgroundColor: "transparent",
      });

      const link = document.createElement("a");
      link.download = `xiaohongshu-card-${activePageIndex + 1}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Export Error:", e);
      alert("导出失败，请重试或更换浏览器。");
    } finally {
      setExporting(false);
    }
  };

  // Batch Export All pages simultaneously
  const handleExportAll = async () => {
    setExportAllProgress("preparing");
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      for (let i = 0; i < pages.length; i++) {
        setExportAllProgress(`正在生成第 ${i + 1}/${pages.length} 张图片...`);
        const node = document.getElementById(`all-cards-render-hidden-${i}`);
        if (!node) continue;

        const dataUrl = await toPng(node, {
          quality: 0.98,
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "transparent",
        });

        const link = document.createElement("a");
        link.download = `xiaohongshu-card-batch-${i + 1}.png`;
        link.href = dataUrl;
        link.click();

        // Introduce brief timeout between downloads to prevent browser throttling
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    } catch (e) {
      console.error("Batch Export Error:", e);
      alert("批量导出时发生错误，请重试。");
    } finally {
      setExportAllProgress(null);
    }
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-sans select-none antialiased overflow-hidden">
      {/* Top Navbar */}
      <header className="bg-white border-b border-neutral-200 shrink-0 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center shadow-md">
            <span className="text-white font-black text-lg">书</span>
          </div>
          <div>
            <h1 className="text-base font-black text-neutral-900 tracking-tight flex items-center space-x-1.5">
              <span>小红书卡片排版工具</span>
              <span className="text-[10px] bg-rose-100 text-rose-600 font-bold px-1.5 py-0.5 rounded-md animate-pulse">PRO</span>
            </h1>
            <p className="text-[10px] text-neutral-400">一键制作高颜值、爆款排版的小红书图文卡片</p>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-load-sample"
            onClick={handleLoadSample}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer transition-colors border border-neutral-200/40"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>载入范例</span>
          </button>

          <button
            id="btn-copy-clipboard"
            onClick={handleCopyText}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
              copied
                ? "bg-emerald-500 text-white border-transparent"
                : "bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200"
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
            <span>{copied ? "已复制正文" : "复制排版文本"}</span>
          </button>

          <button
            id="btn-export-single"
            onClick={handleExportCurrent}
            disabled={exporting || exportAllProgress !== null}
            className="flex items-center space-x-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-500/10 cursor-pointer transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? "正在导出..." : "导出当前页"}</span>
          </button>

          {pages.length > 1 && (
            <button
              id="btn-export-all"
              onClick={handleExportAll}
              disabled={exporting || exportAllProgress !== null}
              className="flex items-center space-x-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/10 cursor-pointer transition-all disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>批量导出全部 ({pages.length})</span>
            </button>
          )}

          <button
            id="btn-clear-all"
            onClick={handleClear}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 cursor-pointer transition-colors border border-transparent hover:border-neutral-200/50"
            title="清空内容"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* FAR LEFT: Dynamic Card Thumbnail Navigator (Vertical Rail) */}
        <aside className="w-28 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-between shrink-0 py-4 items-center">
          <div className="w-full flex-1 overflow-y-auto space-y-4 px-2 custom-scrollbar">
            <div className="text-[10px] font-bold text-neutral-500 text-center tracking-wider pb-2 border-b border-neutral-800">
              页面
            </div>
            
            <div className="flex flex-col space-y-3 pt-2">
              {pages.map((p, idx) => {
                const isActive = idx === activePageIndex;
                return (
                  <button
                    id={`btn-thumb-page-${idx}`}
                    key={p.id}
                    onClick={() => setActivePageIndex(idx)}
                    className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden border cursor-pointer transition-all flex flex-col items-center justify-center p-1 text-left ${
                      isActive
                        ? "border-rose-500 ring-2 ring-rose-500/30 bg-neutral-800"
                        : "border-neutral-800 bg-neutral-800/40 hover:border-neutral-700"
                    }`}
                  >
                    {/* Simulated Miniature content */}
                    <div className="w-full h-full text-[6px] text-neutral-500 overflow-hidden leading-tight font-mono p-1 select-none pointer-events-none scale-90 origin-top">
                      {p.title && <div className="font-extrabold text-neutral-400 truncate border-b border-neutral-800 pb-0.5 mb-1">{p.title}</div>}
                      <div className="line-clamp-5 text-[5px] leading-tight text-neutral-500">{p.content.substring(0, 45)}...</div>
                    </div>
                    {/* Index badge */}
                    <div className={`absolute bottom-0.5 right-1 text-[8px] font-bold px-1 rounded-sm ${isActive ? "bg-rose-500 text-white" : "bg-neutral-800 text-neutral-400"}`}>
                      {idx + 1}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* "+ Insert manual page break" */}
          <button
            id="btn-add-manual-break"
            onClick={addPageBreak}
            className="w-16 h-16 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 text-neutral-500 hover:text-neutral-300 flex flex-col items-center justify-center cursor-pointer transition-all mt-4 shrink-0 bg-neutral-800/20"
            title="在正文底部插入手动分页符"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[8px] font-bold mt-1">换页</span>
          </button>
        </aside>

        {/* LEFT CENTER: Content Writing Area */}
        <section className="w-[480px] bg-white border-r border-neutral-200 flex flex-col shrink-0 min-h-0 overflow-y-auto">
          {/* Section Headers */}
          <div className="p-4 space-y-4">
            
            {/* Advanced Model Settings Panel */}
            <ModelConfigPanel
              config={modelConfig}
              onChange={setModelConfig}
            />
            
            {/* Content text section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-neutral-700 tracking-wide flex items-center space-x-1">
                  <span className="w-1.5 h-3 bg-rose-500 rounded-sm inline-block" />
                  <span>I 卡片正文</span>
                </label>
                
                <div className="flex items-center space-x-3">
                  {/* Character count */}
                  <span className="text-[10px] text-neutral-400 font-mono">
                    字数: {content.length}
                  </span>
                  
                  {/* Auto Page break toggle */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] text-neutral-400 flex items-center space-x-0.5">
                      <span>自动分页:</span>
                      <span className="cursor-help text-neutral-300 hover:text-neutral-500" title="当正文文字超出单张卡片最佳显示范围时，系统会自动切分为多张连贯卡片进行排版。">
                        <HelpCircle className="w-3 h-3" />
                      </span>
                    </span>
                    <button
                      id="btn-toggle-auto-paginate"
                      onClick={() => setAutoPaginate(prev => !prev)}
                      className={`w-8 h-4 rounded-full p-0.5 transition-all cursor-pointer ${autoPaginate ? "bg-rose-500" : "bg-neutral-200"}`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition-all transform ${autoPaginate ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Text formatting Toolbar */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden flex flex-col bg-white">
                <div className="bg-neutral-50 border-b border-neutral-200 p-2 flex flex-wrap items-center gap-2">
                  {/* Undo/Redo */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      id="btn-tool-undo"
                      onClick={handleUndo}
                      disabled={historyIndex <= 0}
                      className="p-1 text-neutral-500 hover:text-neutral-800 disabled:opacity-40 rounded hover:bg-neutral-200/50 cursor-pointer"
                      title="撤销"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id="btn-tool-redo"
                      onClick={handleRedo}
                      disabled={historyIndex >= history.length - 1}
                      className="p-1 text-neutral-500 hover:text-neutral-800 disabled:opacity-40 rounded hover:bg-neutral-200/50 cursor-pointer"
                      title="重做"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="w-[1px] h-3.5 bg-neutral-200 shrink-0" />

                  {/* Headings & Highlighter & Markdown styles */}
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      id="btn-tool-h1"
                      onClick={() => insertHeading(1)}
                      className="px-1.5 py-0.5 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 rounded hover:bg-neutral-200/50 flex items-center space-x-0.5 cursor-pointer border border-neutral-200 bg-white"
                      title="插入一级标题"
                    >
                      <Heading1 className="w-3 h-3" />
                      <span>一级</span>
                    </button>
                    <button
                      id="btn-tool-h2"
                      onClick={() => insertHeading(2)}
                      className="px-1.5 py-0.5 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 rounded hover:bg-neutral-200/50 flex items-center space-x-0.5 cursor-pointer border border-neutral-200 bg-white"
                      title="插入二级标题"
                    >
                      <Heading2 className="w-3 h-3" />
                      <span>二级</span>
                    </button>
                    <button
                      id="btn-tool-h3"
                      onClick={() => insertHeading(3)}
                      className="px-1.5 py-0.5 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 rounded hover:bg-neutral-200/50 flex items-center space-x-0.5 cursor-pointer border border-neutral-200 bg-white"
                      title="插入三级标题"
                    >
                      <Heading3 className="w-3 h-3" />
                      <span>三级</span>
                    </button>

                    <button
                      id="btn-tool-highlight"
                      onClick={insertHighlight}
                      className="px-1.5 py-0.5 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 rounded hover:bg-neutral-200/50 flex items-center space-x-0.5 cursor-pointer border border-neutral-200 bg-white"
                      title="将选中文字包围在==荧光笔中=="
                    >
                      <Highlighter className="w-3 h-3 text-amber-500" />
                      <span>荧光笔</span>
                    </button>

                    <button
                      id="btn-tool-bold"
                      onClick={() => insertTextAtCursor("**", "**")}
                      className="px-1.5 py-0.5 text-[10px] font-extrabold text-neutral-750 hover:text-neutral-900 rounded hover:bg-neutral-200/50 cursor-pointer border border-neutral-200 bg-white"
                      title="加粗文字 **粗体**"
                    >
                      <span>B</span>
                    </button>

                    <button
                      id="btn-tool-italic"
                      onClick={() => insertTextAtCursor("*", "*")}
                      className="px-1.5 py-0.5 text-[10px] font-bold italic text-neutral-755 hover:text-neutral-900 rounded hover:bg-neutral-200/50 cursor-pointer border border-neutral-200 bg-white"
                      title="斜体文字 *斜体*"
                    >
                      <span>I</span>
                    </button>

                    <button
                      id="btn-tool-underline"
                      onClick={() => insertTextAtCursor("++", "++")}
                      className="px-1.5 py-0.5 text-[10px] font-bold underline text-neutral-755 hover:text-neutral-900 rounded hover:bg-neutral-200/50 cursor-pointer border border-neutral-200 bg-white"
                      title="下划线文字 ++下划线++"
                    >
                      <span>U</span>
                    </button>

                    <button
                      id="btn-tool-strikethrough"
                      onClick={() => insertTextAtCursor("~~", "~~")}
                      className="px-1.5 py-0.5 text-[10px] font-bold line-through text-neutral-755 hover:text-neutral-900 rounded hover:bg-neutral-200/50 cursor-pointer border border-neutral-200 bg-white"
                      title="删除线文字 ~~删除线~~"
                    >
                      <span>S</span>
                    </button>

                    <button
                      id="btn-tool-blockquote"
                      onClick={() => insertTextAtCursor("> ")}
                      className="px-1.5 py-0.5 text-[10px] font-bold text-neutral-755 hover:text-neutral-900 rounded hover:bg-neutral-200/50 cursor-pointer border border-neutral-200 bg-white"
                      title="插入引用块 > "
                    >
                      <span>Quote</span>
                    </button>
                  </div>
                </div>

                {/* Popular Emojis quick insertion bar */}
                <div className="bg-neutral-50/50 border-b border-neutral-200 px-2 py-1 flex items-center space-x-1.5 overflow-x-auto custom-scrollbar whitespace-nowrap select-none">
                  <span className="text-[9px] text-neutral-400 font-bold shrink-0">小红书常用表情:</span>
                  {POPULAR_EMOJIS.map((e, idx) => (
                    <button
                      id={`btn-tool-emoji-${idx}`}
                      key={idx}
                      onClick={() => insertEmoji(e)}
                      className="text-xs hover:scale-125 transition-transform p-0.5 cursor-pointer"
                    >
                      {e}
                    </button>
                  ))}
                </div>

                {/* Rich text Editor Textarea */}
                <div className="relative h-[480px]">
                  <textarea
                    id="textarea-card-content"
                    ref={textareaRef}
                    placeholder={`在此输入正文内容...
支持 markdown 等快捷标签：
1. 每行开头写「# 标题」可渲染出精致标题。
2. 句中用「==荧光笔文字==」可包围高亮重点。
3. 另起一行书写「---」可以手动强制分割出下一张。`}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onMouseUp={handleTextareaSelection}
                    onKeyUp={handleTextareaSelection}
                    onMouseMove={handleTextareaMouseMove}
                    className="w-full h-full px-3 py-3 text-neutral-700 text-sm focus:outline-none placeholder-neutral-300 resize-none font-sans leading-relaxed bg-white custom-scrollbar"
                  />

                  {/* Floating Selection Toolbar */}
                  <AnimatePresence>
                    {floatingToolbar.show && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bg-neutral-900/95 text-white rounded-xl shadow-2xl py-1.5 px-2 flex items-center space-x-1.5 z-30 backdrop-blur-md border border-neutral-700/50"
                        style={{
                          left: `${floatingToolbar.x}px`,
                          top: `${floatingToolbar.y}px`
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            insertTextAtCursor("**", "**");
                            setFloatingToolbar(prev => ({ ...prev, show: false }));
                          }}
                          className="px-1.5 py-0.5 hover:bg-white/10 text-white hover:text-rose-400 font-extrabold rounded text-xs transition-colors cursor-pointer"
                          title="加粗"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            insertTextAtCursor("==", "==");
                            setFloatingToolbar(prev => ({ ...prev, show: false }));
                          }}
                          className="px-1.5 py-0.5 hover:bg-white/10 text-yellow-300 hover:text-yellow-400 font-bold rounded text-xs transition-colors cursor-pointer flex items-center"
                          title="荧光笔高亮"
                        >
                          🖍️
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            insertTextAtCursor("# ");
                            setFloatingToolbar(prev => ({ ...prev, show: false }));
                          }}
                          className="px-1.5 py-0.5 hover:bg-white/10 text-white hover:text-rose-400 font-bold rounded text-[10px] transition-colors cursor-pointer"
                          title="插入大标题"
                        >
                          H1
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            insertTextAtCursor("## ");
                            setFloatingToolbar(prev => ({ ...prev, show: false }));
                          }}
                          className="px-1.5 py-0.5 hover:bg-white/10 text-white hover:text-rose-400 font-bold rounded text-[10px] transition-colors cursor-pointer"
                          title="插入中标题"
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            insertTextAtCursor("~~", "~~");
                            setFloatingToolbar(prev => ({ ...prev, show: false }));
                          }}
                          className="px-1.5 py-0.5 hover:bg-white/10 text-neutral-300 hover:text-rose-400 rounded text-xs line-through transition-colors cursor-pointer"
                          title="删除线"
                        >
                          S
                        </button>
                        <div className="w-[1px] h-3 bg-neutral-700 self-center mx-0.5" />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(floatingToolbar.text);
                            setFloatingToolbar(prev => ({ ...prev, show: false }));
                          }}
                          className="px-2 py-0.5 hover:bg-rose-500 hover:text-white text-rose-400 rounded text-[10px] font-bold transition-all cursor-pointer"
                          title="复制文本"
                        >
                          复制
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Bottom Gemini AI Assistant Suite */}
            <AIPanel
              textContent={content}
              onUpdateContent={setContent}
              titleContent={title}
              onUpdateTitle={setTitle}
              aspectRatio={aspectRatio}
              modelConfig={modelConfig}
            />
          </div>
        </section>

        {/* CENTER PANEL: Interactive Canvas Preview */}
        <section className="flex-1 bg-slate-100 flex flex-col min-h-0 relative">
          
          {/* Middle control bar */}
          <div className="bg-white border-b border-neutral-200 px-6 py-2.5 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-neutral-500">画布比例:</span>
              <div className="bg-neutral-100 rounded-lg p-0.5 flex space-x-0.5 border border-neutral-200/40">
                <button
                  id="btn-ratio-3-4"
                  onClick={() => setAspectRatio("3:4")}
                  className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition-all ${
                    aspectRatio === "3:4"
                      ? "bg-white text-neutral-800 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  3:4 (标准图文)
                </button>
                <button
                  id="btn-ratio-3-5"
                  onClick={() => setAspectRatio("3:5")}
                  className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition-all ${
                    aspectRatio === "3:5"
                      ? "bg-white text-neutral-800 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  3:5 (长图尺寸)
                </button>
              </div>
            </div>

            <div className="text-xs text-neutral-400 font-medium">
              当前展示模板：<strong className="text-neutral-700 font-bold">{activeTemplate.name}</strong>
            </div>
          </div>

          {/* Active Card Frame container */}
          <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center min-h-0 custom-scrollbar">
            
            {/* Interactive Carousel frame with paginating buttons */}
            <div className="w-[390px] max-w-full relative group">
              
              {/* Carousel Previous button */}
              {pages.length > 1 && (
                <button
                  id="btn-carousel-prev"
                  onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
                  disabled={activePageIndex === 0}
                  className="absolute left-[-50px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-800 disabled:opacity-30 disabled:pointer-events-none hover:shadow-md transition-all cursor-pointer z-20"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Dynamic Page content card container */}
              <div ref={containerRef} className="relative w-full flex justify-center items-center overflow-hidden" style={{ height: `${520 * (aspectRatio === "3:4" ? 1 : 1.25) * previewScale + 10}px` }}>
                <div style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: "center center",
                  width: "390px",
                  position: "absolute"
                }}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${activeTemplate.id}-${activePageIndex}-${aspectRatio}`}
                      initial={{ opacity: 0, scale: 0.98, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="w-[390px]"
                    >
                      {/* Visual Card component wrapped in capturing box */}
                      <CardPreview
                        containerId="active-card-render"
                        page={pages[activePageIndex]}
                        pageIndex={activePageIndex}
                        totalPages={pages.length}
                        template={activeTemplate}
                        settings={settings}
                        aspectRatio={aspectRatio}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Carousel Next button */}
              {pages.length > 1 && (
                <button
                  id="btn-carousel-next"
                  onClick={() => setActivePageIndex(prev => Math.min(pages.length - 1, prev + 1))}
                  disabled={activePageIndex === pages.length - 1}
                  className="absolute right-[-50px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-800 disabled:opacity-30 disabled:pointer-events-none hover:shadow-md transition-all cursor-pointer z-20"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Pagination Bullet Indicators */}
            {pages.length > 1 && (
              <div className="flex items-center space-x-1.5 mt-6 shrink-0">
                {pages.map((_, idx) => (
                  <button
                    id={`btn-indicator-bullet-${idx}`}
                    key={idx}
                    onClick={() => setActivePageIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === activePageIndex ? "w-4 bg-rose-500" : "w-1.5 bg-neutral-300 hover:bg-neutral-400"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANEL: Configuration and Styling */}
        <section className="w-80 bg-white border-l border-neutral-200 shrink-0 flex flex-col min-h-0">
          
          {/* Navigation Sidebar Tabs */}
          <div className="flex border-b border-neutral-200 shrink-0 bg-neutral-50 p-1">
            <button
              id="btn-tab-templates"
              onClick={() => setActiveTab("templates")}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                activeTab === "templates"
                  ? "bg-white text-rose-500 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>爆款模板库</span>
            </button>
            <button
              id="btn-tab-adjustments"
              onClick={() => setActiveTab("adjust")}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                activeTab === "adjust"
                  ? "bg-white text-rose-500 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>版面微调</span>
            </button>
          </div>

          {/* Dynamic configuration content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
            {activeTab === "templates" ? (
              
              /* TEMPLATE SELECTOR GRID */
              <div className="space-y-4">
                <div className="text-[11px] font-extrabold text-neutral-400 tracking-wider">
                  点击套用高颜值卡片主题：
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {TEMPLATES.map((t) => {
                    const isSelected = t.id === activeTemplate.id;
                    return (
                      <button
                        id={`btn-select-template-${t.id}`}
                        key={t.id}
                        onClick={() => setActiveTemplate(t)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-rose-500 bg-rose-50/20"
                            : "border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50/50 bg-white"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {/* Mini visual block indicator */}
                          <div className={`w-8 h-8 rounded-lg border border-neutral-200/50 ${t.bgClass} flex items-center justify-center shadow-sm shrink-0`}>
                            <span className={`text-[10px] font-bold ${t.textColor}`}>A</span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-neutral-800 flex items-center space-x-1.5">
                              <span>{t.name}</span>
                              {isSelected && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />}
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-0.5 leading-snug">{t.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              
              /* CARD STYLE DETAILS ADJUSTMENT PANEL */
              <div className="space-y-5 text-xs text-neutral-600">
                
                {/* 0. Cover Page Settings */}
                <div className="space-y-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-neutral-800 flex items-center space-x-1.5">
                      <span className="w-1.5 h-3 bg-rose-500 rounded-sm inline-block" />
                      <span>包含第一页为封面 (Cover Page)</span>
                    </label>
                    <button
                      id="btn-toggle-cover"
                      onClick={() => setSettings(prev => ({ ...prev, showCover: !prev.showCover }))}
                      className={`w-8 h-4 rounded-full p-0.5 transition-all cursor-pointer ${settings.showCover ? "bg-rose-500" : "bg-neutral-200"}`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition-all transform ${settings.showCover ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {settings.showCover && (
                    <div className="space-y-2.5 pt-2 border-t border-neutral-200/60 animate-fadeIn">
                      {/* AI One-click cover button */}
                      <button
                        id="btn-ai-gen-cover"
                        type="button"
                        onClick={handleGenerateCover}
                        disabled={generatingCover || !content.trim()}
                        className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-rose-500 to-amber-500 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                      >
                        {generatingCover ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>AI 正在智能提炼并生成封面...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                            <span>AI 一键智能生成封面内容</span>
                          </>
                        )}
                      </button>

                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-neutral-500 block">封面布局排版 (Layout Style)：</span>
                        <div className="grid grid-cols-3 gap-1">
                          {(["classic", "split", "magazine", "minimal-book", "asymmetric", "bold-impact"] as const).map((lay) => {
                            let label = "";
                            switch (lay) {
                              case "classic": label = "经典居中"; break;
                              case "split": label = "左右拼色"; break;
                              case "magazine": label = "时尚杂志"; break;
                              case "minimal-book": label = "文艺书封"; break;
                              case "asymmetric": label = "非对称海报"; break;
                              case "bold-impact": label = "极简大字"; break;
                            }
                            return (
                              <button
                                id={`btn-cover-layout-${lay}`}
                                key={lay}
                                type="button"
                                onClick={() => setSettings(prev => ({ ...prev, coverLayout: lay }))}
                                className={`py-1 text-[10px] font-bold border rounded cursor-pointer transition-all text-center ${
                                  (settings.coverLayout || "classic") === lay
                                    ? "border-rose-500 bg-rose-50/30 text-rose-600 font-extrabold"
                                    : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-neutral-500">封面主标题 (支持回车换行)：</span>
                        <textarea
                          id="input-cover-title"
                          rows={2}
                          value={settings.coverTitle}
                          onChange={(e) => setSettings(prev => ({ ...prev, coverTitle: e.target.value }))}
                          placeholder="例如: 深度好文、爆款标题..."
                          className="w-full px-2 py-1.5 border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs bg-white resize-y"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-neutral-500">封面副标题 (支持回车换行)：</span>
                        <textarea
                          id="input-cover-subtitle"
                          rows={2}
                          value={settings.coverSubtitle}
                          onChange={(e) => setSettings(prev => ({ ...prev, coverSubtitle: e.target.value }))}
                          placeholder="例如: 让你少走10年弯路的经典文案..."
                          className="w-full px-2 py-1.5 border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs bg-white resize-y"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-neutral-500">作者/署名：</span>
                        <input
                          id="input-cover-author"
                          type="text"
                          value={settings.coverAuthor}
                          onChange={(e) => setSettings(prev => ({ ...prev, coverAuthor: e.target.value }))}
                          placeholder="例如: 小红书博主 @灵感画板..."
                          className="w-full px-2 py-1 border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-neutral-500">封面标签 (逗号/空格分隔)：</span>
                        <input
                          id="input-cover-tags"
                          type="text"
                          value={settings.coverTags}
                          onChange={(e) => setSettings(prev => ({ ...prev, coverTags: e.target.value }))}
                          placeholder="例如: 精选文案, 干货分享, 程序员..."
                          className="w-full px-2 py-1 border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs bg-white"
                        />
                      </div>

                      {/* Cover Typography Choices */}
                      <div className="pt-2 border-t border-neutral-200/40 space-y-2">
                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold text-neutral-500 block">封面主标题字体 (Title Font)：</span>
                          <div className="grid grid-cols-5 gap-1">
                            {(["inherit", "sans", "display", "mono", "serif"] as const).map((fam) => {
                              let label = "";
                              switch (fam) {
                                case "inherit": label = "全局"; break;
                                case "sans": label = "黑体"; break;
                                case "display": label = "现代"; break;
                                case "mono": label = "等宽"; break;
                                case "serif": label = "雅致"; break;
                              }
                              return (
                                <button
                                  id={`btn-cover-title-font-${fam}`}
                                  key={fam}
                                  type="button"
                                  onClick={() => setSettings(prev => ({ ...prev, coverTitleFont: fam }))}
                                  className={`py-1 text-[9px] font-bold border rounded cursor-pointer transition-all text-center ${
                                    (settings.coverTitleFont || "inherit") === fam
                                      ? "border-rose-500 bg-rose-50/30 text-rose-600 font-extrabold"
                                      : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold text-neutral-500 block">封面副标题字体 (Subtitle Font)：</span>
                          <div className="grid grid-cols-5 gap-1">
                            {(["inherit", "sans", "display", "mono", "serif"] as const).map((fam) => {
                              let label = "";
                              switch (fam) {
                                case "inherit": label = "全局"; break;
                                case "sans": label = "黑体"; break;
                                case "display": label = "现代"; break;
                                case "mono": label = "等宽"; break;
                                case "serif": label = "雅致"; break;
                              }
                              return (
                                <button
                                  id={`btn-cover-sub-font-${fam}`}
                                  key={fam}
                                  type="button"
                                  onClick={() => setSettings(prev => ({ ...prev, coverSubtitleFont: fam }))}
                                  className={`py-1 text-[9px] font-bold border rounded cursor-pointer transition-all text-center ${
                                    (settings.coverSubtitleFont || "inherit") === fam
                                      ? "border-rose-500 bg-rose-50/30 text-rose-600 font-extrabold"
                                      : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Cover Size Multipliers */}
                      <div className="pt-2.5 border-t border-neutral-200/40 space-y-2">
                        <span className="text-[10px] font-extrabold text-neutral-400 block uppercase tracking-wider">封面排版细节比例</span>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-neutral-500 font-bold">主标题字号比例：</span>
                            <span className="font-mono text-rose-500 font-bold">{(settings.coverTitleSizeMultiplier ?? 1.0).toFixed(1)}x</span>
                          </div>
                          <input
                            id="cover-title-multiplier"
                            type="range"
                            min="0.6"
                            max="1.8"
                            step="0.1"
                            value={settings.coverTitleSizeMultiplier ?? 1.0}
                            onChange={(e) => setSettings(prev => ({ ...prev, coverTitleSizeMultiplier: parseFloat(e.target.value) }))}
                            className="w-full accent-rose-500 h-1 bg-neutral-200 rounded-lg cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-neutral-500 font-bold">副标题字号比例：</span>
                            <span className="font-mono text-rose-500 font-bold">{(settings.coverSubtitleSizeMultiplier ?? 1.0).toFixed(1)}x</span>
                          </div>
                          <input
                            id="cover-subtitle-multiplier"
                            type="range"
                            min="0.6"
                            max="1.8"
                            step="0.1"
                            value={settings.coverSubtitleSizeMultiplier ?? 1.0}
                            onChange={(e) => setSettings(prev => ({ ...prev, coverSubtitleSizeMultiplier: parseFloat(e.target.value) }))}
                            className="w-full accent-rose-500 h-1 bg-neutral-200 rounded-lg cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-neutral-500 font-bold">底部标签比例：</span>
                            <span className="font-mono text-rose-500 font-bold">{(settings.coverTaglineSizeMultiplier ?? 1.0).toFixed(1)}x</span>
                          </div>
                          <input
                            id="cover-tagline-multiplier"
                            type="range"
                            min="0.6"
                            max="1.8"
                            step="0.1"
                            value={settings.coverTaglineSizeMultiplier ?? 1.0}
                            onChange={(e) => setSettings(prev => ({ ...prev, coverTaglineSizeMultiplier: parseFloat(e.target.value) }))}
                            className="w-full accent-rose-500 h-1 bg-neutral-200 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Color Overrides */}
                <div className="space-y-2.5 bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-neutral-800 flex items-center space-x-1.5">
                      <span className="w-1.5 h-3 bg-indigo-500 rounded-sm inline-block" />
                      <span>独立色彩微调 (Color Overrides)</span>
                    </label>
                    {(settings.customBgColor || settings.customTitleColor || settings.customTextColor || settings.customAccentColor) && (
                      <button
                        id="btn-clear-custom-colors"
                        onClick={() => setSettings(prev => ({
                          ...prev,
                          customBgColor: undefined,
                          customTitleColor: undefined,
                          customTextColor: undefined,
                          customAccentColor: undefined
                        }))}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100"
                      >
                        重置默认
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-neutral-400 leading-normal">
                    可在风格模版的基础上进一步深度自定义颜色。
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-neutral-500 block">自定义背景色：</span>
                      <div className="flex items-center space-x-1.5">
                        <input
                          id="color-picker-bg"
                          type="color"
                          value={settings.customBgColor || activeTemplate.bgColor}
                          onChange={(e) => setSettings(prev => ({ ...prev, customBgColor: e.target.value }))}
                          className="w-6 h-6 rounded cursor-pointer border border-neutral-200 bg-transparent p-0"
                        />
                        <span className="font-mono text-[10px] text-neutral-400 uppercase">{settings.customBgColor ? "已修改" : "默认"}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-neutral-500 block">自定义标题色：</span>
                      <div className="flex items-center space-x-1.5">
                        <input
                          id="color-picker-title"
                          type="color"
                          value={settings.customTitleColor || activeTemplate.titleColor || "#1e293b"}
                          onChange={(e) => setSettings(prev => ({ ...prev, customTitleColor: e.target.value }))}
                          className="w-6 h-6 rounded cursor-pointer border border-neutral-200 bg-transparent p-0"
                        />
                        <span className="font-mono text-[10px] text-neutral-400 uppercase">{settings.customTitleColor ? "已修改" : "默认"}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-neutral-500 block">自定义正文色：</span>
                      <div className="flex items-center space-x-1.5">
                        <input
                          id="color-picker-text"
                          type="color"
                          value={settings.customTextColor || activeTemplate.bodyColor || "#475569"}
                          onChange={(e) => setSettings(prev => ({ ...prev, customTextColor: e.target.value }))}
                          className="w-6 h-6 rounded cursor-pointer border border-neutral-200 bg-transparent p-0"
                        />
                        <span className="font-mono text-[10px] text-neutral-400 uppercase">{settings.customTextColor ? "已修改" : "默认"}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-neutral-500 block">自定义荧光色：</span>
                      <div className="flex items-center space-x-1.5">
                        <input
                          id="color-picker-accent"
                          type="color"
                          value={settings.customAccentColor || "#eab308"}
                          onChange={(e) => setSettings(prev => ({ ...prev, customAccentColor: e.target.value }))}
                          className="w-6 h-6 rounded cursor-pointer border border-neutral-200 bg-transparent p-0"
                        />
                        <span className="font-mono text-[10px] text-neutral-400 uppercase">{settings.customAccentColor ? "已修改" : "默认"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1. Typography Fonts Selection */}
                <div className="space-y-2">
                  <label className="font-extrabold text-neutral-800 block">文字字体：</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["sans", "display", "mono", "serif"] as const).map((fam) => {
                      let label = "";
                      switch (fam) {
                        case "sans": label = "黑体 / Sans"; break;
                        case "display": label = "现代 / Display"; break;
                        case "mono": label = "等宽 / Mono"; break;
                        case "serif": label = "雅致 / Serif"; break;
                      }
                      return (
                        <button
                          id={`btn-style-font-${fam}`}
                          key={fam}
                          onClick={() => setSettings(prev => ({ ...prev, fontFamily: fam }))}
                          className={`py-1.5 px-2 text-[10px] font-bold border rounded-lg cursor-pointer transition-all text-center ${
                            settings.fontFamily === fam
                              ? "border-rose-500 bg-rose-50/30 text-rose-600"
                              : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Text Alignments */}
                <div className="space-y-2">
                  <label className="font-extrabold text-neutral-800 block">对齐方式：</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["left", "center", "right", "justify"] as const).map((align) => {
                      let label = "";
                      switch (align) {
                        case "left": label = "左对齐"; break;
                        case "center": label = "居中"; break;
                        case "right": label = "右对齐"; break;
                        case "justify": label = "两端"; break;
                      }
                      return (
                        <button
                          id={`btn-style-align-${align}`}
                          key={align}
                          onClick={() => setSettings(prev => ({ ...prev, alignment: align }))}
                          className={`py-1 px-1.5 text-[10px] font-bold border rounded-lg cursor-pointer transition-all text-center ${
                            settings.alignment === align
                              ? "border-rose-500 bg-rose-50/30 text-rose-600"
                              : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Font Sizes */}
                <div className="space-y-3 pt-1 border-t border-neutral-100">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-extrabold text-neutral-800">正文字号：</span>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase">{settings.bodySize}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["sm", "md", "lg", "xl"] as const).map((sz) => (
                        <button
                          id={`btn-style-size-${sz}`}
                          key={sz}
                          onClick={() => setSettings(prev => ({ ...prev, bodySize: sz }))}
                          className={`py-1 text-[10px] font-bold border rounded-lg cursor-pointer transition-all text-center ${
                            settings.bodySize === sz
                              ? "border-rose-500 bg-rose-50/30 text-rose-600"
                              : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-extrabold text-neutral-800">标题字号：</span>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase">{settings.titleSize}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {(["sm", "md", "lg", "xl", "2xl"] as const).map((sz) => (
                        <button
                          id={`btn-style-tsize-${sz}`}
                          key={sz}
                          onClick={() => setSettings(prev => ({ ...prev, titleSize: sz }))}
                          className={`py-1 text-[9px] font-bold border rounded cursor-pointer transition-all text-center ${
                            settings.titleSize === sz
                              ? "border-rose-500 bg-rose-50/30 text-rose-600"
                              : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Formatting details (Sliders) */}
                <div className="space-y-3 pt-2 border-t border-neutral-100">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-extrabold text-neutral-800">行高间距 (Line Height)：</span>
                      <span className="font-mono text-[10px] font-bold text-neutral-500">{settings.lineHeight}</span>
                    </div>
                    <input
                      id="range-line-height"
                      type="range"
                      min="1.3"
                      max="2.0"
                      step="0.1"
                      value={settings.lineHeight}
                      onChange={(e) => setSettings(prev => ({ ...prev, lineHeight: parseFloat(e.target.value) }))}
                      className="w-full accent-rose-500 h-1 bg-neutral-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-extrabold text-neutral-800">字间距 (Letter Spacing)：</span>
                      <span className="font-mono text-[10px] font-bold text-neutral-500">{settings.letterSpacing}px</span>
                    </div>
                    <input
                      id="range-letter-spacing"
                      type="range"
                      min="0"
                      max="4"
                      step="1"
                      value={settings.letterSpacing}
                      onChange={(e) => setSettings(prev => ({ ...prev, letterSpacing: parseInt(e.target.value) }))}
                      className="w-full accent-rose-500 h-1 bg-neutral-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-extrabold text-neutral-800">内边距 (Card Padding)：</span>
                      <span className="font-mono text-[10px] font-bold text-neutral-500">{settings.padding}px</span>
                    </div>
                    <input
                      id="range-padding"
                      type="range"
                      min="24"
                      max="60"
                      step="4"
                      value={settings.padding}
                      onChange={(e) => setSettings(prev => ({ ...prev, padding: parseInt(e.target.value) }))}
                      className="w-full accent-rose-500 h-1 bg-neutral-200 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* 5. Highlight selection */}
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <label className="font-extrabold text-neutral-800 block">荧光笔颜色：</label>
                  <div className="flex space-x-2">
                    {(["yellow", "green", "pink", "blue", "purple"] as const).map((color) => {
                      let colorClass = "";
                      switch (color) {
                        case "yellow": colorClass = "bg-yellow-400"; break;
                        case "green": colorClass = "bg-emerald-400"; break;
                        case "pink": colorClass = "bg-rose-400"; break;
                        case "blue": colorClass = "bg-sky-400"; break;
                        case "purple": colorClass = "bg-purple-400"; break;
                      }
                      const isSelected = settings.highlightColor === color;
                      return (
                        <button
                          id={`btn-style-hl-${color}`}
                          key={color}
                          onClick={() => setSettings(prev => ({ ...prev, highlightColor: color }))}
                          className={`w-5 h-5 rounded-full ${colorClass} transition-transform hover:scale-110 cursor-pointer flex items-center justify-center ${
                            isSelected ? "ring-2 ring-rose-500 ring-offset-2 scale-110" : "opacity-80"
                          }`}
                          title={`${color} highlight`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5.5 Background Texture Overlay */}
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <label className="font-extrabold text-neutral-800 block">背景底纹 (Background Pattern)：</label>
                  <div className="grid grid-cols-5 gap-1">
                    {(["none", "grid", "dots", "diagonal", "waves"] as const).map((pat) => {
                      let label = "";
                      switch (pat) {
                        case "none": label = "无"; break;
                        case "grid": label = "网格"; break;
                        case "dots": label = "点点"; break;
                        case "diagonal": label = "斜线"; break;
                        case "waves": label = "波浪"; break;
                      }
                      return (
                        <button
                          id={`btn-style-pattern-${pat}`}
                          key={pat}
                          onClick={() => setSettings(prev => ({ ...prev, bgPattern: pat }))}
                          className={`py-1 text-[10px] font-bold border rounded-lg cursor-pointer transition-all text-center ${
                            (settings.bgPattern || "none") === pat
                              ? "border-rose-500 bg-rose-50/30 text-rose-600"
                              : "border-neutral-200 hover:bg-neutral-50 text-neutral-500"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. Signature / Watermark settings */}
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-neutral-800 block">底部签名水印：</label>
                    <button
                      id="btn-toggle-watermark"
                      onClick={() => setSettings(prev => ({ ...prev, showWatermark: !prev.showWatermark }))}
                      className={`w-8 h-4 rounded-full p-0.5 transition-all cursor-pointer ${settings.showWatermark ? "bg-rose-500" : "bg-neutral-200"}`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition-all transform ${settings.showWatermark ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                  {settings.showWatermark && (
                    <div className="space-y-1.5">
                      <input
                        id="input-watermark"
                        type="text"
                        placeholder="e.g. 小红书 ID: @灵感画板"
                        value={settings.watermark}
                        onChange={(e) => setSettings(prev => ({ ...prev, watermark: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 text-xs bg-neutral-50/30"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-neutral-400 font-bold">融入背景全屏防伪水印 (Anti-counterfeit)：</span>
                        <button
                          id="btn-toggle-bg-watermark"
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, showBgWatermark: !prev.showBgWatermark }))}
                          className={`w-8 h-4 rounded-full p-0.5 transition-all cursor-pointer ${settings.showBgWatermark ? "bg-rose-500" : "bg-neutral-200"}`}
                        >
                          <div className={`w-3 h-3 rounded-full bg-white transition-all transform ${settings.showBgWatermark ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 7. Card Appearance options */}
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-neutral-800">页码进度 (1/2)：</label>
                    <button
                      id="btn-toggle-progress"
                      onClick={() => setSettings(prev => ({ ...prev, showProgress: !prev.showProgress }))}
                      className={`w-8 h-4 rounded-full p-0.5 transition-all cursor-pointer ${settings.showProgress ? "bg-rose-500" : "bg-neutral-200"}`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transition-all transform ${settings.showProgress ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </section>

      </div>

      {/* OFF-SCREEN CAPTURE BUFFER (Invisible to user, used by html-to-image for pristine exporting) */}
      <div className="absolute left-[-99999px] top-[-99999px] pointer-events-none" style={{ width: "450px" }}>
        {pages.map((p, idx) => (
          <div
            key={`all-capture-container-${p.id}`}
            id={`all-cards-render-hidden-${idx}`}
            style={{ width: "390px", marginBottom: "40px" }}
          >
            <CardPreview
              page={p}
              pageIndex={idx}
              totalPages={pages.length}
              template={activeTemplate}
              settings={settings}
              aspectRatio={aspectRatio}
            />
          </div>
        ))}
      </div>

      {/* Floating Status / Load Block Overlay */}
      <AnimatePresence>
        {exportAllProgress !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6"
          >
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-neutral-100">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-black text-neutral-900 text-sm">批量打包导出中</h3>
                <p className="text-xs text-neutral-400">正在按最高清 2X 视网膜规格转译为 PNG 图片</p>
              </div>
              <div className="bg-neutral-50 rounded-xl py-2.5 px-4 border border-neutral-100">
                <span className="text-xs font-bold text-neutral-600 font-mono tracking-wide">
                  {exportAllProgress === "preparing" ? "正在渲染首张画布..." : exportAllProgress}
                </span>
              </div>
              <p className="text-[10px] text-neutral-300">
                温馨提示：由于开启了高DPI超级无损模式，浏览器会连贯下载每页卡片，请在浏览器中允许“自动下载多个文件”权限。
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
