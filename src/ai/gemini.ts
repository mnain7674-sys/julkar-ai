/**
 * Google Gemini Provider Implementation for JOXIQ AI
 * Powered by @google/genai SDK
 */

import { GoogleGenAI } from "@google/genai";
import { envConfig } from "../config/env.js";
import { askOptimized } from "../lib/tokenOptimizer/index.js";
import {
  IAIProvider,
  AIProviderId,
  ChatMessage,
  ChatOptions,
  StreamChunk,
} from "./types.js";

export class GeminiProvider implements IAIProvider {
  id: AIProviderId = "gemini";
  displayName = "Google Gemini";
  defaultModel = "gemini-2.5-flash";
  supportedModels = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-pro",
  ];

  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = envConfig.geminiApiKey;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        console.error("[GeminiProvider] Missing GEMINI_API_KEY in environment variables!");
        throw new Error(
          "GEMINI_API_KEY is not configured in Vercel environment variables. Please go to your Vercel Project Settings > Environment Variables, add GEMINI_API_KEY with your Google Gemini API key, and redeploy."
        );
      }
      this.client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "joxiq-ai-service",
          },
        },
      });
    }
    return this.client;
  }

  isAvailable(): boolean {
    return envConfig.isProviderConfigured("gemini");
  }

  /**
   * Converts generic ChatMessage array to Gemini SDK format
   */
  private formatContents(messages: ChatMessage[]) {
    return messages.map((msg) => {
      const parts: any[] = [];
      let msgText = msg.content || "";

      if (msg.document && msg.document.content) {
        msgText = `[Attached Document: ${msg.document.name} (${msg.document.size || ""})]\n=== DOCUMENT CONTENT START ===\n${msg.document.content}\n=== DOCUMENT CONTENT END ===\n\n${msgText}`;
      }

      if (msgText) {
        parts.push({ text: msgText });
      }

      if (msg.image && msg.image.data && msg.image.mimeType) {
        parts.push({
          inlineData: {
            mimeType: msg.image.mimeType,
            data: msg.image.data.replace(/^data:image\/\w+;base64,/, ""),
          },
        });
      }

      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts,
      };
    });
  }

  async *generateStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const ai = this.getClient();
    const contents = this.formatContents(messages);
    const modelName = options?.model || this.defaultModel;

    const tools = options?.useSearch ? [{ googleSearch: {} }] : undefined;
    const config: any = {
      systemInstruction: options?.systemInstruction,
      temperature: typeof options?.temperature === "number" ? options.temperature : 0.7,
      tools,
    };

    const candidateModels = Array.from(new Set([modelName, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"]));

    let responseStream;
    let lastError: any = null;

    for (const modelToTry of candidateModels) {
      try {
        responseStream = await ai.models.generateContentStream({
          model: modelToTry,
          contents,
          config,
        });
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
        const errMsg = typeof err?.message === "string" ? err.message : String(err || "");
        console.warn(`[GeminiProvider] Model ${modelToTry} stream failed:`, errMsg);
        if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded")) {
          // Continue loop to try next candidate model (e.g. gemini-2.0-flash or gemini-2.5-pro)
          continue;
        }
      }
    }

    if (!responseStream || lastError) {
      const errMsg = typeof lastError?.message === "string" ? lastError.message : String(lastError || "");
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded")) {
        throw new Error("Gemini API quota exceeded (Rate Limit 429). Please wait a few seconds before retrying.");
      }
      throw new Error(errMsg || "Gemini generation failed.");
    }

    for await (const chunk of responseStream) {
      const text = chunk.text;
      const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const searchQueries = chunk.candidates?.[0]?.groundingMetadata?.webSearchQueries;

      const streamChunk: StreamChunk = {
        providerUsed: "gemini",
        modelUsed: modelName,
      };

      if (text) {
        streamChunk.text = text;
      }

      if (groundingChunks || searchQueries) {
        streamChunk.grounding = {
          chunks: groundingChunks || [],
          queries: searchQueries || [],
        };
      }

      if (streamChunk.text || streamChunk.grounding) {
        yield streamChunk;
      }
    }
  }

  async generateContent(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    const ai = this.getClient();
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const userMessage = lastUserMsg?.content || "";
    const history = messages.filter((m) => m !== lastUserMsg);

    const result = await askOptimized({
      userId: options?.userId || "anonymous",
      conversationId: options?.userId || "default_conv",
      userMessage,
      chatHistory: history.map((m) => ({
        role: m.role,
        content: m.content || "",
      })),
      summarizeFn: async (text: string) => {
        try {
          const res = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text }] }],
            config: { maxOutputTokens: 250 },
          });
          return res.text || "";
        } catch (e) {
          return "";
        }
      },
      callModel: async ({ systemPrompt, context, recentMessages, userMessage, model, maxOutputTokens }) => {
        const fullSystemInstruction = [options?.systemInstruction, systemPrompt, context].filter(Boolean).join("\n\n");

        const preparedMessages: ChatMessage[] = [
          ...recentMessages.map((m) => ({
            id: String(Date.now() + Math.random()),
            role: (m.role === "assistant" || m.role === "model") ? ("assistant" as const) : ("user" as const),
            content: m.content || m.text || "",
            timestamp: Date.now(),
          })),
          {
            id: String(Date.now()),
            role: "user" as const,
            content: userMessage,
            timestamp: Date.now(),
          },
        ];

        const contents = this.formatContents(preparedMessages);
        const modelName = model || options?.model || this.defaultModel;

        const config: any = {
          systemInstruction: fullSystemInstruction,
          temperature: typeof options?.temperature === "number" ? options.temperature : 0.7,
          maxOutputTokens,
        };

        const candidateModels = Array.from(new Set([modelName, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"]));

        let response: any = null;
        let lastError: any = null;

        for (const modelToTry of candidateModels) {
          try {
            response = await ai.models.generateContent({
              model: modelToTry,
              contents,
              config,
            });
            lastError = null;
            break;
          } catch (err: any) {
            lastError = err;
            const errMsg = typeof err?.message === "string" ? err.message : String(err || "");
            console.warn(`[GeminiProvider] Model ${modelToTry} content generation failed:`, errMsg);
            if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded")) {
              continue;
            }
          }
        }

        if (!response || lastError) {
          const errMsg = typeof lastError?.message === "string" ? lastError.message : String(lastError || "");
          if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded")) {
            throw new Error("Gemini API quota exceeded (Rate Limit 429). Please wait a few seconds before retrying.");
          }
          throw new Error(errMsg || "Gemini generation failed.");
        }

        return response.text || "";
      },
    });

    return result.text || "";
  }
}
