import type { IncomingMessage, ServerResponse } from "http";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let appInstance: any = null;

function getApp() {
  if (appInstance) return appInstance;

  try {
    const localBundle = require("./server.cjs");
    appInstance = localBundle.default || localBundle;
    if (appInstance && typeof appInstance === "function") {
      return appInstance;
    }
  } catch (err1) {
    try {
      const distBundle = require("../dist/server.cjs");
      appInstance = distBundle.default || distBundle;
      if (appInstance && typeof appInstance === "function") {
        return appInstance;
      }
    } catch (err2) {
      console.error("[Vercel api/index] Critical error loading server bundle:", err1, err2);
    }
  }

  return appInstance;
}

export const config = {
  maxDuration: 60,
};

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const app = getApp();
  if (!app) {
    (res as any).status?.(500) || (res.statusCode = 500);
    res.end(
      JSON.stringify({
        error: "Backend Serverless Function failed to initialize: compiled server bundle was not found.",
      })
    );
    return;
  }
  return app(req, res);
}
