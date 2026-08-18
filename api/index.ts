import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let appInstance: any = null;

async function resolveApp() {
  if (appInstance) return appInstance;

  try {
    // 1. Try importing the compiled CommonJS bundle
    const bundled = require("../dist/server.cjs");
    appInstance = bundled?.default || bundled;
    if (appInstance && typeof appInstance === "function") {
      return appInstance;
    }
  } catch (err1) {
    // Bundle not found or failed, try ESM import
  }

  try {
    // 2. Try importing server module directly
    // @ts-ignore
    const mod = await import("../server.js").catch(() => import("../server.ts"));
    appInstance = (mod as any)?.default || mod;
    return appInstance;
  } catch (err2) {
    console.error("[Vercel api/index] Failed to load server app:", err2);
    throw err2;
  }
}

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await resolveApp();
    if (!app) {
      return res.status(500).json({ error: "Backend server instance failed to initialize." });
    }
    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Serverless Handler Error]:", err);
    return res.status(500).json({
      error: "Backend Serverless Function failed to execute: " + (err?.message || String(err)),
    });
  }
}
