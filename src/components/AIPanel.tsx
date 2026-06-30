import React, { useState } from "react";
import { Sparkles, ShieldAlert, CheckCircle, RefreshCw, BookOpen } from "lucide-react";
import { Violation, ComplianceReport, ModelConfig } from "../types";

interface AIPanelProps {
  textContent: string;
  onUpdateContent: (newText: string) => void;
  titleContent: string;
  onUpdateTitle: (newTitle: string) => void;
  aspectRatio: "3:4" | "3:5";
  modelConfig: ModelConfig;
}

export const AIPanel: React.FC<AIPanelProps> = ({
  textContent,
  onUpdateContent,
  titleContent,
  onUpdateTitle,
  aspectRatio,
  modelConfig,
}) => {
  const [loading, setLoading] = useState<string | null>(null); // name of active action, or null
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // One-click Pagination and Formatting
  const handlePaginate = async () => {
    if (!textContent.trim()) return;
    setLoading("paginate");
    setReport(null);
    setError(null);
    try {
      const res = await fetch("/api/ai/paginate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textContent, aspectRatio, modelConfig }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `请求失败，服务器返回了状态码 ${res.status}`);
      }

      if (data.paginatedText) {
        // Safe-guard content state updates: make sure we always pass a clean string to state.
        if (typeof data.paginatedText === "string") {
          onUpdateContent(data.paginatedText);
        } else if (Array.isArray(data.paginatedText)) {
          onUpdateContent(data.paginatedText.join("\n---\n"));
        } else if (typeof data.paginatedText === "object") {
          const values = Object.values(data.paginatedText).map(v => typeof v === 'string' ? v : JSON.stringify(v));
          onUpdateContent(values.join("\n---\n"));
        } else {
          onUpdateContent(String(data.paginatedText));
        }
      } else {
        throw new Error("模型接口返回的数据中未包含分页文本(paginatedText)，请检查模型是否支持输出该格式");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "请求发生未知错误，请检查 API Key、接口地址和网络。");
    } finally {
      setLoading(null);
    }
  };

  // Check Sensitive words (Compliance Checking)
  const handleCheck = async () => {
    if (!textContent.trim()) return;
    setLoading("check");
    setReport(null);
    setError(null);
    try {
      const res = await fetch("/api/ai/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textContent, modelConfig }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `请求失败，服务器返回了状态码 ${res.status}`);
      }

      setReport({
        hasViolations: data.hasViolations || false,
        violations: data.violations || [],
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "合规检测请求失败，请检查 API Key 和接口地址配置。");
    } finally {
      setLoading(null);
    }
  };

  // Replace a sensitive word in current content
  const replaceWord = (word: string, replacement: string) => {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const newContent = textContent.replace(new RegExp(escapedWord, "g"), replacement);
    onUpdateContent(newContent);
    
    // update report state directly to reflect fixed violation
    if (report) {
      const filtered = report.violations.filter(v => v.word !== word);
      setReport({
        hasViolations: filtered.length > 0,
        violations: filtered
      });
    }
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200/60 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-800 flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>Gemini 爆款 AI 写作协同</span>
        </h4>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
          已连接 {modelConfig.provider === "gemini" ? "Gemini" : "OpenAI"} ({modelConfig.model})
        </span>
      </div>

      {/* Primary Quick AI Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          id="btn-ai-paginate"
          onClick={handlePaginate}
          disabled={loading !== null || !textContent.trim()}
          className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-all cursor-pointer shadow-sm shadow-amber-500/10"
          title="根据画布比例，智能处理标题、加粗与高亮，并自动增加分页符 ---"
        >
          {loading === "paginate" ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <BookOpen className="w-3.5 h-3.5" />
          )}
          <span>一键分页</span>
        </button>

        <button
          id="btn-ai-check"
          onClick={handleCheck}
          disabled={loading !== null || !textContent.trim()}
          className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
          title="检测敏感或违禁词并提供一键修改建议"
        >
          {loading === "check" ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          )}
          <span>文案合规检测</span>
        </button>
      </div>

      {/* Compliance / Sensitive Word Checking Report Card */}
      {report && (
        <div className="border-t border-neutral-200/60 pt-3 space-y-2">
          <div className="flex items-center space-x-1.5">
            {report.hasViolations ? (
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            <span className="text-xs font-semibold text-neutral-800">
              {report.hasViolations ? `检测到 ${report.violations.length} 个不合规词汇` : "未检测到敏感或违规词汇！"}
            </span>
          </div>

          {report.hasViolations && (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {report.violations.map((v, i) => (
                <div key={i} className="bg-rose-50/50 border border-rose-100 rounded-lg p-2 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-700 bg-rose-100/70 px-1.5 py-0.5 rounded">
                      "{v.word}"
                    </span>
                    <button
                      id={`btn-ai-replace-${i}`}
                      onClick={() => replaceWord(v.word, v.suggestion)}
                      className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-2 py-0.5 rounded cursor-pointer transition-colors border border-emerald-200"
                    >
                      替换为: {v.suggestion}
                    </button>
                  </div>
                  <p className="text-neutral-500 text-[10px] leading-snug">
                    <strong className="text-neutral-600">原因:</strong> {v.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-semibold relative animate-fade-in">
          <div className="flex items-start justify-between">
            <span className="leading-relaxed pr-6">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="absolute right-2 top-2 text-rose-400 hover:text-rose-600 font-bold px-1"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-[10px] text-neutral-400 flex items-center justify-center space-x-1.5 py-1">
          <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
          <span>正在交由 AI 智能处理中，请稍候...</span>
        </div>
      )}
    </div>
  );
};
