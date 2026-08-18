/**
 * Centralized Environment Configuration for JOXIQ AI Services.
 * Reads API keys and configuration settings safely without crashing at load time.
 */

export interface AIEnvConfig {
  geminiApiKey: string | null;
  openaiApiKey: string | null;
  claudeApiKey: string | null;
  defaultProvider: "gemini" | "openai" | "claude";
}

/**
 * Retrieves environment variables safely in both Node.js (server-side) and Vite environments.
 */
function getEnvVar(key: string): string | null {
  // Check process.env (Node.js server)
  if (typeof process !== "undefined" && process.env) {
    if (process.env[key] && process.env[key] !== `MY_${key}`) {
      return process.env[key]!;
    }
  }

  // Check import.meta.env (Vite client fallback if VITE_ prefix used)
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[`VITE_${key}`]) {
      return metaEnv[`VITE_${key}`];
    }
  } catch {
    // Ignore in non-Vite execution contexts
  }

  return null;
}

export const envConfig = {
  /**
   * Gemini API Key
   * Pre-configured via AI Studio Secrets (GEMINI_API_KEY)
   */
  get geminiApiKey(): string | null {
    return (
      getEnvVar("GEMINI_API_KEY") ||
      getEnvVar("GOOGLE_API_KEY") ||
      getEnvVar("GOOGLE_GENAI_API_KEY") ||
      getEnvVar("GOOGLE_AI_API_KEY") ||
      getEnvVar("gemini_api_key") ||
      getEnvVar("google_api_key") ||
      getEnvVar("Gemini_API_Key") ||
      getEnvVar("Gemini_Api_Key") ||
      getEnvVar("VITE_GEMINI_API_KEY") ||
      getEnvVar("VITE_GOOGLE_API_KEY")
    );
  },

  /**
   * OpenAI API Key
   * Connect future OpenAI API key here by adding OPENAI_API_KEY in .env or Secrets
   */
  get openaiApiKey(): string | null {
    return (
      getEnvVar("OPENAI_API_KEY") ||
      getEnvVar("openai_api_key")
    );
  },

  /**
   * Anthropic Claude API Key
   * Connect future Claude API key here by adding ANTHROPIC_API_KEY or CLAUDE_API_KEY in .env or Secrets
   */
  get claudeApiKey(): string | null {
    return (
      getEnvVar("ANTHROPIC_API_KEY") ||
      getEnvVar("CLAUDE_API_KEY") ||
      getEnvVar("claude_api_key")
    );
  },

  /**
   * Check if a specific AI provider has a configured API key
   */
  isProviderConfigured(provider: "gemini" | "openai" | "claude"): boolean {
    switch (provider) {
      case "gemini":
        return Boolean(this.geminiApiKey && this.geminiApiKey.trim() !== "");
      case "openai":
        return Boolean(this.openaiApiKey && this.openaiApiKey.trim() !== "");
      case "claude":
        return Boolean(this.claudeApiKey && this.claudeApiKey.trim() !== "");
      default:
        return false;
    }
  },

  /**
   * Returns list of currently active & configured AI providers
   */
  getAvailableProviders(): ("gemini" | "openai" | "claude")[] {
    const available: ("gemini" | "openai" | "claude")[] = [];
    if (this.isProviderConfigured("gemini")) available.push("gemini");
    if (this.isProviderConfigured("openai")) available.push("openai");
    if (this.isProviderConfigured("claude")) available.push("claude");
    return available;
  }
};
