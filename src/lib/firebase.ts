import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

export const firebaseAppletConfig = {
  projectId: "joxiq-ai",
  appId: "1:698536954361:web:c7f2c1bcdb01f5cee5d528",
  apiKey: "AIzaSyD6JiZYZQE3tP3Opskq5Gshg34B-UAPbiA",
  authDomain: "joxiq-ai.firebaseapp.com",
  firestoreDatabaseId: "",
  storageBucket: "joxiq-ai.firebasestorage.app",
  messagingSenderId: "698536954361",
  measurementId: "G-NRTW7JK3XB",
  oAuthClientId: "",
  recaptchaSiteKey: ""
};

const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId,
  measurementId: firebaseAppletConfig.measurementId
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, signInWithPopup, signInWithRedirect, getRedirectResult };
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");
googleProvider.setCustomParameters({
  prompt: "select_account"
});

export async function syncUserToFirestore(user: { uid?: string; email: string; displayName?: string; isPro?: boolean; plan?: "free" | "pro" | "annual" | "ultra" }) {
  try {
    const docKey = user.uid || user.email;
    if (!docKey) return;
    const userRef = doc(db, "users", docKey);
    const snap = await getDoc(userRef);

    const defaultPlan = user.email === "mnain7674@gmail.com" ? "ultra" : user.plan || (user.isPro ? "pro" : "free");
    const nextResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const planLimits: Record<string, number> = { free: 25000, pro: 300000, annual: 300000, ultra: 1000000 };

    if (!snap.exists()) {
      await setDoc(userRef, {
        userId: user.uid || `u-${Date.now()}`,
        id: user.uid || `u-${Date.now()}`,
        name: user.displayName || user.email.split("@")[0],
        email: user.email,
        role: user.email === "mnain7674@gmail.com" ? "Owner Admin" : "Standard User",
        status: "Active",
        createdAt: new Date().toISOString().split("T")[0],
        lastLogin: new Date().toISOString(),
        plan: defaultPlan,
        subscriptionStatus: "active",
        monthlyTokenLimit: planLimits[defaultPlan] || 25000,
        tokensUsed: 0,
        resetDate: nextResetDate,
      });
    } else {
      await updateDoc(userRef, {
        lastLogin: new Date().toISOString(),
      });
    }

    // Also sync to user.email if docKey was user.uid, for backward compatibility
    if (user.uid && user.email && user.uid !== user.email) {
      const emailRef = doc(db, "users", user.email);
      await setDoc(emailRef, {
        userId: user.uid,
        id: user.uid,
        name: user.displayName || user.email.split("@")[0],
        email: user.email,
        role: user.email === "mnain7674@gmail.com" ? "Owner Admin" : "Standard User",
        lastLogin: new Date().toISOString(),
      }, { merge: true }).catch(() => {});
    }
  } catch (error) {
    console.error("Error syncing user to Firestore:", error);
  }
}

export async function updateUserSubscriptionPlan(email: string, newPlan: "free" | "pro" | "annual" | "ultra") {
  try {
    const userRef = doc(db, "users", email);
    const planLimits: Record<string, number> = { free: 25000, pro: 300000, annual: 300000, ultra: 1000000 };
    const nextResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await updateDoc(userRef, {
      plan: newPlan,
      subscriptionStatus: "active",
      monthlyTokenLimit: planLimits[newPlan] || 25000,
      resetDate: nextResetDate,
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating user subscription plan:", error);
    return { success: false, error };
  }
}
export async function logTokenUsageToFirestore(usage: {
  userId: string;
  userEmail: string;
  modelUsed: string;
  providerUsed: string;
  requestType: string;
  complexity: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  timestamp: number;
  dateKey?: string;
  monthKey?: string;
  responseTime?: number;
}) {
  try {
    const aiUsageCol = collection(db, "ai_usage");
    const docRef = doc(aiUsageCol);
    const dateKey = usage.dateKey || new Date().toISOString().split("T")[0];
    const monthKey = usage.monthKey || new Date().toISOString().slice(0, 7);

    const record = {
      ...usage,
      id: docRef.id,
      dateKey,
      monthKey,
      responseTime: usage.responseTime || 0,
      createdAt: new Date().toISOString()
    };

    await setDoc(docRef, record);

    // Increment user total token count in user document
    const targetUserDocKey = usage.userEmail || usage.userId;
    if (targetUserDocKey && targetUserDocKey !== "anonymous") {
      const userRef = doc(db, "users", targetUserDocKey);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentUsed = parseInt(userSnap.data().tokensUsed || "0", 10);
        await updateDoc(userRef, {
          tokensUsed: (currentUsed + usage.totalTokens).toString(),
          lastActiveMonth: monthKey
        });
      }
    }

    // Increment model monthly usage aggregate document
    const modelStatsRef = doc(db, "model_usage_stats", `${monthKey}_${usage.modelUsed}`);
    const modelSnap = await getDoc(modelStatsRef);
    if (modelSnap.exists()) {
      const curData = modelSnap.data();
      await updateDoc(modelStatsRef, {
        totalTokens: (curData.totalTokens || 0) + usage.totalTokens,
        totalCostUSD: (curData.totalCostUSD || 0) + usage.estimatedCost,
        totalRequests: (curData.totalRequests || 0) + 1,
        lastUpdated: new Date().toISOString()
      });
    } else {
      await setDoc(modelStatsRef, {
        monthKey,
        model: usage.modelUsed,
        totalTokens: usage.totalTokens,
        totalCostUSD: usage.estimatedCost,
        totalRequests: 1,
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Failed to log token usage to Firestore:", error);
  }
}

export const DEFAULT_MODEL_BUDGETS: Record<string, number> = {
  "gpt-5-mini": 1000000,
  "gemini-2.5-flash": 1000000,
  "claude-3-haiku-20240307": 1000000,
  "gpt-4o": 500000,
  "gemini-1.5-pro": 500000,
  "claude-3-5-sonnet-20241022": 500000,
};

export const DEFAULT_PLAN_LIMITS: Record<string, { monthlyTokenLimit: number; dailyTokenLimit: number }> = {
  free: { monthlyTokenLimit: 25000, dailyTokenLimit: 1000 },
  pro: { monthlyTokenLimit: 300000, dailyTokenLimit: 15000 },
  annual: { monthlyTokenLimit: 300000, dailyTokenLimit: 15000 },
  ultra: { monthlyTokenLimit: 1000000, dailyTokenLimit: 50000 },
};

export async function getModelBudgetsFromFirestore(): Promise<Record<string, number>> {
  try {
    const configRef = doc(db, "system_config", "model_budgets");
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      return { ...DEFAULT_MODEL_BUDGETS, ...snap.data() };
    } else {
      await setDoc(configRef, DEFAULT_MODEL_BUDGETS);
      return DEFAULT_MODEL_BUDGETS;
    }
  } catch (err) {
    console.error("Failed to fetch model budgets from Firestore:", err);
    return DEFAULT_MODEL_BUDGETS;
  }
}

export async function updateModelBudgetsInFirestore(budgets: Record<string, number>) {
  try {
    const configRef = doc(db, "system_config", "model_budgets");
    await setDoc(configRef, budgets, { merge: true });
    return { success: true };
  } catch (err) {
    console.error("Failed to update model budgets in Firestore:", err);
    return { success: false, error: err };
  }
}

export async function getPlanLimitsFromFirestore(): Promise<Record<string, { monthlyTokenLimit: number; dailyTokenLimit: number }>> {
  try {
    const configRef = doc(db, "system_config", "plan_limits");
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      return snap.data() as any;
    } else {
      await setDoc(configRef, DEFAULT_PLAN_LIMITS);
      return DEFAULT_PLAN_LIMITS;
    }
  } catch (err) {
    console.error("Failed to fetch plan limits from Firestore:", err);
    return DEFAULT_PLAN_LIMITS;
  }
}

export async function updatePlanLimitsInFirestore(limits: Record<string, { monthlyTokenLimit: number; dailyTokenLimit: number }>) {
  try {
    const configRef = doc(db, "system_config", "plan_limits");
    await setDoc(configRef, limits, { merge: true });
    return { success: true };
  } catch (err) {
    console.error("Failed to update plan limits in Firestore:", err);
    return { success: false, error: err };
  }
}

export async function getModelUsageForCurrentMonth(modelName: string, monthKey?: string): Promise<number> {
  try {
    const targetMonth = monthKey || new Date().toISOString().slice(0, 7);
    const modelStatsRef = doc(db, "model_usage_stats", `${targetMonth}_${modelName}`);
    const snap = await getDoc(modelStatsRef);
    if (snap.exists()) {
      return snap.data().totalTokens || 0;
    }
    return 0;
  } catch (err) {
    console.error("Failed to fetch model usage for current month:", err);
    return 0;
  }
}

export async function getUsageMetricsFromFirestore() {
  try {
    const aiUsageCol = collection(db, "ai_usage");
    const snap = await getDocs(aiUsageCol);
    
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;
    let totalCostUSD = 0;
    let totalResponseTimeMs = 0;

    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const todayDateKey = new Date().toISOString().split("T")[0];

    const costByModel: Record<string, number> = {};
    const tokensByModel: Record<string, number> = {};
    const countByFeature: Record<string, number> = {};
    const tokensByUser: Record<string, { email: string; tokens: number; cost: number; requests: number }> = {};
    const dailyTokensMap: Record<string, number> = {};
    const monthlyTokensMap: Record<string, number> = {};
    const logs: any[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const tokens = data.totalTokens || 0;
      const cost = data.estimatedCost || 0;
      const model = data.modelUsed || "unknown";
      const requestType = data.requestType || "general";
      const userKey = data.userEmail || data.userId || "anonymous";
      const dKey = data.dateKey || new Date().toISOString().split("T")[0];
      const mKey = data.monthKey || dKey.slice(0, 7);

      totalInputTokens += data.inputTokens || 0;
      totalOutputTokens += data.outputTokens || 0;
      totalTokens += tokens;
      totalCostUSD += cost;
      totalResponseTimeMs += data.responseTime || 0;

      costByModel[model] = (costByModel[model] || 0) + cost;
      tokensByModel[model] = (tokensByModel[model] || 0) + tokens;
      countByFeature[requestType] = (countByFeature[requestType] || 0) + 1;
      dailyTokensMap[dKey] = (dailyTokensMap[dKey] || 0) + tokens;
      monthlyTokensMap[mKey] = (monthlyTokensMap[mKey] || 0) + tokens;

      if (!tokensByUser[userKey]) {
        tokensByUser[userKey] = { email: userKey, tokens: 0, cost: 0, requests: 0 };
      }
      tokensByUser[userKey].tokens += tokens;
      tokensByUser[userKey].cost += cost;
      tokensByUser[userKey].requests += 1;

      logs.push(data);
    });

    const averageResponseTimeMs = snap.size > 0 ? Math.round(totalResponseTimeMs / snap.size) : 0;

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalCostUSD,
      totalRequests: snap.size,
      averageResponseTimeMs,
      costByModel,
      tokensByModel,
      countByFeature,
      tokensByUser,
      dailyTokensMap,
      monthlyTokensMap,
      currentMonthKey,
      todayDateKey,
      logs: logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    };
  } catch (error) {
    console.error("Failed to fetch usage metrics from Firestore:", error);
    return null;
  }
}
