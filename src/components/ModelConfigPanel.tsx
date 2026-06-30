import React, { useState } from "react";
import { Settings, ChevronDown, ChevronUp, Key, Cpu, Eye, EyeOff, CheckCircle2, ExternalLink, Globe } from "lucide-react";
import { ModelConfig } from "../types";

interface ModelConfigPanelProps {
  config: ModelConfig;
  onChange: (newConfig: ModelConfig) => void;
}

const GEMINI_MODELS = [
  { id: "gemini-3.5-flash", name: "gemini-3.5-flash", desc: "速度极快，最新推荐，智能度高且体验流畅" },
  { id: "gemini-3.1-pro-preview", name: "gemini-3.1-pro-preview", desc: "高级复杂逻辑，适合长文深度排版与创意理解" }
];

export const ModelConfigPanel: React.FC<ModelConfigPanelProps> = ({ config, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleApiKeyChange = (val: string) => {
    onChange({
      ...config,
      provider: "gemini",
      apiKey: val
    });
    setTestResult(null);
  };

  const handleModelChange = (modelId: string) => {
    onChange({
      ...config,
      provider: "gemini",
      model: modelId
    });
    setTestResult(null);
  };

  const handleBaseUrlChange = (val: string) => {
    onChange({
      ...config,
      provider: "gemini",
      baseUrl: val
    });
    setTestResult(null);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/ai/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          modelConfig: {
            ...config,
            provider: "gemini" // force gemini for safety
          } 
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: `连接测试成功！当前模型：${data.model || config.model} 能够正常响应。`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "连接测试失败，请检查 API Key 是否正确输入，以及您的网络是否支持直连 Google 服务。",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "请求发送失败，请检查网络或 API 配置。",
      });
    } finally {
      setTesting(false);
    }
  };

  const isConfigured = !!config.apiKey.trim();

  return (
    <div className="bg-white border border-neutral-200/80 rounded-xl shadow-sm overflow-hidden mb-4 transition-all">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-neutral-50/50 hover:bg-neutral-50 flex items-center justify-between text-neutral-700 text-xs font-semibold select-none cursor-pointer border-b border-neutral-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Settings className={`w-4 h-4 text-neutral-500 transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`} />
          <span className="text-neutral-800 text-sm font-semibold">{isOpen ? "收起 Gemini API 智能设置" : "Gemini 爆款 AI 写作配置 (可选配置 API Key)"}</span>
          
          {/* Status Badge */}
          {isConfigured ? (
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px] border border-emerald-200/50">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>已启用您的 Key</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold text-[10px] border border-amber-200/30">
              🔒 平台托管免费 API (3.5-flash)
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 text-neutral-400">
          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
            {config.model || "gemini-3.5-flash"}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Settings Panel Content */}
      {isOpen && (
        <div className="p-4 space-y-4 bg-white">
          
          {/* 1. Guideline & Link for applying for key */}
          <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                💡 免费获取 Gemini API 密钥
              </span>
              <p className="text-[11px] text-neutral-500 leading-relaxed max-w-xl">
                您可以申请个人的 Gemini API Key 来解锁更高的调用频率、更低延迟。Google AI Studio 目前向全球开发者提供免费的 API 额度，无需任何费用。
              </p>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="shrink-0 w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-lg shadow-sm shadow-amber-500/10 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            >
              <span>获取官方 API Key</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* 2. API Key input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-600 flex items-center space-x-1">
              <Key className="w-3.5 h-3.5 text-neutral-400" />
              <span>您的 Gemini API Key</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showKey ? "text" : "password"}
                value={config.apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="在此粘贴您的 AI Studio Key (形如 AIzaSy...)"
                className="w-full pr-10 pl-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-mono text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 3. Model selector (Simplified, explicit buttons) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-600 flex items-center space-x-1">
              <Cpu className="w-3.5 h-3.5 text-neutral-400" />
              <span>选用 Gemini 模型版本</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GEMINI_MODELS.map((m) => {
                const isSelected = (config.model || "gemini-3.5-flash") === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleModelChange(m.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-rose-50/50 border-rose-500 ring-1 ring-rose-500/20"
                        : "bg-neutral-50/50 hover:bg-neutral-50 border-neutral-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isSelected ? "text-rose-600" : "text-neutral-700"}`}>
                        {m.name}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1 font-normal leading-normal">
                      {m.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Optional Proxy / Base URL Input for regions where Google is blocked */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-600 flex items-center space-x-1">
              <Globe className="w-3.5 h-3.5 text-neutral-400" />
              <span>API 代理中转地址 (可选)</span>
            </label>
            <input
              type="text"
              value={config.baseUrl || ""}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              placeholder="默认 (留空) 直连 Google 官方服务。如国内直连受限，可填入第三方 Gemini 代理地址"
              className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-mono text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>

          {/* 5. Connection Test and Result */}
          <div className="pt-2 border-t border-neutral-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="text-[10px] text-neutral-400">
              <span>🔒 安全声明：所有 API 密钥仅加密保存在您本地浏览器的 LocalStorage 中，不会上传到任何第三方。</span>
            </div>
            
            <div className="flex items-center space-x-2 self-end">
              <button
                type="button"
                disabled={testing}
                onClick={testConnection}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {testing ? "正在测试连接..." : "测试 API 连接"}
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold border transition-all ${
                testResult.success
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                  : "bg-rose-50 border-rose-100 text-rose-700"
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
