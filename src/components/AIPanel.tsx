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

// 构建 Gemini API 完整 URL
const buildGeminiUrl = (model: string, apiKey: string, baseUrl?: string): string => {
  const base = baseUrl && baseUrl.trim()
    ? baseUrl.trim().replace(/\/+$/, "")
    : "https://generativelanguage.googleapis.com";
  return `${base}/v1beta/models/${model}:generateContent?key=${apiKey}`;
};

// 调用 Gemini API
const callGemini = async (prompt: string, modelConfig: ModelConfig, temperature: number = 0.7): Promise<string> => {
  const { apiKey, model, baseUrl } = modelConfig;

  if (!apiKey || !apiKey.trim()) {
    throw new Error("请先在下方「AI 模型配置」中填写 Gemini API Key");
  }

  const url = buildGeminiUrl(model || "gemini-2.5-flash", apiKey, baseUrl);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    let errorMsg = `Gemini API 返回错误 ${response.status}`;
    try {
      const errData = await response.json();
      if (errData.error?.message) errorMsg = errData.error.message;
    } catch {}
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!result) {
    throw new Error("Gemini API 返回结果为空，可能是内容被安全过滤，请修改文案后重试");
  }

  return result;
};

// AI 一键分页
const callGeminiForPaginate = async (text: string, aspectRatio: string, modelConfig: ModelConfig): Promise<string> => {
  const prompt = `你是一个专业的小红书爆款文案排版助手。
请将以下文案按照小红书图文笔记的最佳实践进行智能分页与排版。

【要求】
1. 根据画布比例（${aspectRatio}），合理拆分文案为多张卡片内容
2. 每张卡片内容要完整、有逻辑，不要截断句子
3. 用 --- 分隔不同卡片的内容
4. 保持原文的核心信息和语气
5. 适当加粗重点内容（用 **文字** 格式）
6. 用 ==荧光笔== 标记金句或核心观点

【原文案】
${text}

【输出格式】
只输出排版后的文案，用 --- 分隔卡片，不要输出其他解释。`;

  return await callGemini(prompt, modelConfig, 0.7);
};

// AI 合规检测
const callGeminiForCheck = async (text: string, modelConfig: ModelConfig): Promise<ComplianceReport> => {
  const prompt = `你是一个专业的小红书内容合规审核专家。
请检测以下文案中是否包含小红书平台的敏感词、违禁词或可能违规的内容。

【小红书常见违规内容】
- 绝对化用语：最、第一、唯一、顶级、极致、100%、国家级等
- 诱导互动：关注、点赞、评论、私信、加微信、拉群等
- 医疗功效：治疗、治愈、药用、抗炎、抗菌等
- 虚假宣传：秒杀、清仓、全网最低、史无前例等
- 敏感话题：政治、宗教、色情、暴力等

【原文案】
${text}

【输出格式】
如果检测到违规内容，请以 JSON 格式输出：
{
  "hasViolations": true,
  "violations": [
    {
      "word": "违规词",
      "reason": "违规原因",
      "suggestion": "替换建议"
    }
  ]
}

如果没有检测到违规内容，输出：
{
  "hasViolations": false,
  "violations": []
}

只输出 JSON，不要输出其他解释。`;

  const result = await callGemini(prompt, modelConfig, 0.3);

  // 解析 JSON（可能需要从 markdown 代码块中提取）
  let jsonStr = result.trim();
  if (jsonStr.startsWith("```")) {
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1].trim();
  }

  try {
    const report = JSON.parse(jsonStr);
    return {
      hasViolations: report.hasViolations || false,
      violations: report.violations || [],
    };
  } catch {
    return { hasViolations: false, violations: [] };
  }
};

export const AIPanel: React.FC<AIPanelProps> = ({
  textContent,
  onUpdateContent,
  titleContent,
  onUpdateTitle,
  aspectRatio,
  modelConfig,
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePaginate = async () => {
    if (!textContent.trim()) return;
    setLoading("paginate");
    setReport(null);
    setError(null);
    try {
      const result = await callGeminiForPaginate(textContent, aspectRatio, modelConfig);
      onUpdateContent(result);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "AI 分页请求失败，请检查 API Key 和网络连接。");
    } finally {
      setLoading(null);
    }
  };

  const handleCheck = async () => {
    if (!textContent.trim()) return;
    setLoading("check");
    setReport(null);
    setError(null);
    try {
      const result = await callGeminiForCheck(textContent, modelConfig);
      setReport(result);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "合规检测请求失败，请检查 API Key 和网络连接。");
    } finally {
      setLoading(null);
    }
  };

  const replaceWord = (word: string, replacement: string) => {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const newContent = textContent.replace(new RegExp(escapedWord, "g"), replacement);
    onUpdateContent(newContent);

    if (report) {
      const filtered = report.violations.filter((v) => v.word !== word);
      setReport({
        hasViolations: filtered.length > 0,
        violations: filtered,
      });
    }
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200/60 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-800 flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>Gemini AI 写作协同</span>
        </h4>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
          {modelConfig.apiKey ? `${modelConfig.model || "gemini-2.5-flash"}` : "未配置 Key"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
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

      {report && (
        <div className="border-t border-neutral-200/60 pt-3 space-y-2">
          <div className="flex items-center space-x-1.5">
            {report.hasViolations ? (
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            <span className="text-xs font-semibold text-neutral-800">
              {report.hasViolations
                ? `检测到 ${report.violations.length} 个不合规词汇`
                : "未检测到敏感或违规词汇！"}
            </span>
          </div>

          {report.hasViolations && (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {report.violations.map((v, i) => (
                <div
                  key={i}
                  className="bg-rose-50/50 border border-rose-100 rounded-lg p-2 text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-700 bg-rose-100/70 px-1.5 py-0.5 rounded">
                      "{v.word}"
                    </span>
                    <button
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
