import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

interface CustomModelConfig {
  provider?: "gemini" | "openai";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

// Helper to robustly clean and parse JSON response from different LLM models
function parseJSONResponse(text: string): any {
  if (!text) return {};
  let cleaned = text.trim();
  
  // Try direct parsing first
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // If direct parse fails, try extracting from markdown JSON code blocks
    const jsonMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/i) || cleaned.match(/```\s*([\s\S]*?)\s*```/i);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (innerError) {
        console.error("Failed to parse matched JSON block:", innerError);
      }
    }
    
    // Try to find the first '{' and last '}'
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch (innerError) {
        console.error("Failed to parse substring between braces:", innerError);
      }
    }
    
    throw new Error("AI 接口返回格式不正确 (期待 JSON格式): " + text.substring(0, 200));
  }
}

// Helper for AI responses
async function generateAIContent(systemPrompt: string, userPrompt: string, jsonSchema?: any, modelConfig?: CustomModelConfig) {
  const provider = modelConfig?.provider || "gemini";
  const apiKey = modelConfig?.apiKey || process.env.GEMINI_API_KEY;
  const baseUrl = modelConfig?.baseUrl;
  const modelName = modelConfig?.model || "gemini-3.5-flash";

  if (provider === "openai") {
    const url = `${baseUrl || "https://api.openai.com/v1"}/chat/completions`;
    const headers: any = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };
    
    const body: any = {
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    };

    if (jsonSchema) {
      body.response_format = { type: "json_object" };
    }

    let res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    // CRITICAL FIX: If response_format causes a 400 or 422 error (common for models like Zhipu GLM, Kimi, etc.),
    // automatically retry WITHOUT response_format and instruct the model explicitly to return JSON.
    if (!res.ok && jsonSchema && (res.status === 400 || res.status === 422)) {
      console.warn("OpenAI-compatible API failed with response_format. Retrying without it...");
      const fallbackBody = { ...body };
      delete fallbackBody.response_format;
      
      // Inject explicit JSON requirement into the user message
      fallbackBody.messages[1].content = userPrompt + "\n\n【重要要求】请确保仅返回符合上述结构的纯 JSON 字符串。不要添加任何 markdown 代码块标记 (如 ```json) 也不要包含任何日常对话内容。";
      
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(fallbackBody),
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI API Error:", errText);
      throw new Error(`OpenAI 兼容 API 请求失败 (状态码: ${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI 兼容 API 返回了空内容");
    }
    return content;
  } else {
    let clientToUse = ai;
    if (modelConfig?.apiKey) {
      clientToUse = new GoogleGenAI({
        apiKey: modelConfig.apiKey,
        ...(modelConfig.baseUrl ? { httpOptions: { baseUrl: modelConfig.baseUrl } } : {}),
      });
    }

    const config: any = {
      systemInstruction: systemPrompt,
      temperature: 0.7,
    };

    if (jsonSchema) {
      config.responseMimeType = "application/json";
      config.responseSchema = jsonSchema;
    }

    const response = await clientToUse.models.generateContent({
      model: modelName,
      contents: userPrompt,
      config: config,
    });

    return response.text;
  }
}

// 1. One-Click Pagination and Formatting API
app.post("/api/ai/paginate", async (req, res) => {
  const { text, aspectRatio, modelConfig } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  const ratio = aspectRatio || "3:4";
  const systemPrompt = `You are an expert typesetting and layout assistant for Xiaohongshu card creators. Your goal is to process the user's input text to format headings, identify key phrases for bold and highlight decorations, and insert logical page breakers WITHOUT changing any original words or copywriting.

CRITICAL RULES:
1. STRICT TEXT PRESERVATION (MANDATORY): Do NOT change, correct, rephrase, rewrite, summarize, add, or remove any words or sentences. Every single character and meaning of the original copy must be preserved exactly. ONLY add formatting markers (#, ##, **, ==) and page separators (---).
2. FORMAT HEADINGS: Identify logical titles or section headings (lines introducing a section, or short isolated lines) and format them as markdown titles by prepending "# " or "## " at the beginning of the line.
3. BOLD HIGHLIGHTS: Identify the most important keywords, figures, stats, or punchy points and wrap them in double asterisks "**" (e.g. "**这个词**") for emphasis.
4. FLUORESCENT MARKER: Identify 1-2 core value declarations or ultimate takeaways per page and wrap them in "==" (e.g. "==高亮突出==") for highlighter styled emphasis.
5. CARD PAGINATION ("---"): Insert the divider "---" on a completely new line (surrounded by empty lines, i.e., "\\n\\n---\\n\\n") at natural semantic split points or paragraph borders based on the current canvas ratio:
   - For "3:4" (Shorter Standard Card): Since standard card space is limited, split pages more frequently. Insert "---" roughly every 120-180 characters, or every 4-6 lines of text, to prevent text overflowing the canvas boundaries.
   - For "3:5" (Taller Card): More vertical space is available. Split pages less frequently. Insert "---" roughly every 220-300 characters, or every 7-9 lines of text.
6. Make sure all formatting is cleanly integrated and strictly matches standard markdown syntax.

Return a JSON object with the key "paginatedText" containing the fully formatted and paginated copy.`;

  const jsonSchema = {
    type: Type.OBJECT,
    properties: {
      paginatedText: {
        type: Type.STRING,
        description: "The formatted typeset content containing markdown headers, bold, highlighter, and page dividers, strictly preserving the original wording."
      }
    },
    required: ["paginatedText"]
  };

  try {
    const aiResponse = await generateAIContent(systemPrompt, `Please process and paginate this content for a ${ratio} aspect ratio:\n\n${text}`, jsonSchema, modelConfig);
    res.json(parseJSONResponse(aiResponse || "{}"));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Sensitive Word Compliance Checking API
app.post("/api/ai/check", async (req, res) => {
  const { text, modelConfig } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  const systemPrompt = `You are a compliance officer for Xiaohongshu (小红书) content creation. Analyze the provided text for any potential sensitive words, prohibited vocabulary, extreme claims, or contact info that violates Xiaohongshu's community guidelines.
Common violations to look for:
- Absolute or extreme advertising words (e.g., "最", "第一", "绝对", "顶级", "首创", "唯一", "100%", "极致").
- Quick/get-rich-on claims, financial/medical unauthorized advice (e.g., "暴富", "赚大钱", "保准治好").
- Direct contact/sales guidance (e.g., "加我微信", "私信我发链接", "威信", "VX").
- Other sensitive or rude words.

Return a JSON report indicating whether any violations are found, along with a list of specific violations, the reason, and recommended alternatives.`;

  const jsonSchema = {
    type: Type.OBJECT,
    properties: {
      hasViolations: {
        type: Type.BOOLEAN,
        description: "True if any sensitive words or violations are detected."
      },
      violations: {
        type: Type.ARRAY,
        description: "List of detected sensitive words or compliance issues.",
        items: {
          type: Type.OBJECT,
          properties: {
            word: {
              type: Type.STRING,
              description: "The sensitive or violating word/phrase found in the text."
            },
            reason: {
              type: Type.STRING,
              description: "Why this word/phrase is sensitive or violates Xiaohongshu rules."
            },
            suggestion: {
              type: Type.STRING,
              description: "A safer alternative to replace this word/phrase."
            }
          },
          required: ["word", "reason", "suggestion"]
        }
      }
    },
    required: ["hasViolations", "violations"]
  };

  try {
    const aiResponse = await generateAIContent(systemPrompt, `Check this content for compliance:\n\n${text}`, jsonSchema, modelConfig);
    res.json(parseJSONResponse(aiResponse || "{}"));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Cover Page Smart Generation API
app.post("/api/ai/generate-cover", async (req, res) => {
  const { text, modelConfig } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  const systemPrompt = `You are a viral Xiaohongshu (小红书) visual editor. Your job is to analyze the provided main body text and generate incredibly engaging, eye-catching cover details that drive clicks.
Generate a JSON object containing:
- "coverTitle": A punchy, sensational, or highly structured viral title (e.g. including numbers, "建议收藏", "绝密干货", "真香警告", or high-contrast adjectives) with appropriate emojis. Maximum 20 characters.
- "coverSubtitle": A compelling, smooth subtitle expanding on the value of the post to spark curiosity and action. Maximum 45 characters.
- "coverTags": 2-3 extremely relevant, high-traffic keyword tags separated by bullet dots " • " (e.g., "求职干货 • 职场避坑 • 面试通关"). Maximum 25 characters.

Return the result STRICTLY as a JSON object with these three keys.`;

  const jsonSchema = {
    type: Type.OBJECT,
    properties: {
      coverTitle: {
        type: Type.STRING,
        description: "A punchy, viral Xiaohongshu-style main cover title with emojis."
      },
      coverSubtitle: {
        type: Type.STRING,
        description: "A compelling subtitle explaining the value of reading."
      },
      coverTags: {
        type: Type.STRING,
        description: "2-3 high-traffic tags separated by bullet dots."
      }
    },
    required: ["coverTitle", "coverSubtitle", "coverTags"]
  };

  try {
    const aiResponse = await generateAIContent(systemPrompt, `Analyze this body copy and generate the perfect cover assets:\n\n${text}`, jsonSchema, modelConfig);
    res.json(parseJSONResponse(aiResponse || "{}"));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Test Connection API
app.post("/api/ai/test-connection", async (req, res) => {
  const { modelConfig } = req.body;
  try {
    const testPrompt = "Please respond with exactly the word 'OK' to test this connection.";
    const response = await generateAIContent("You are a helpful assistant.", testPrompt, undefined, modelConfig);
    if (response) {
      res.json({ success: true, model: modelConfig?.model || "gemini-3.5-flash" });
    } else {
      res.status(500).json({ error: "Empty response from API provider" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to connect to API" });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
