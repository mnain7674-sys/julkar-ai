import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Zap,
  Check,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Cpu,
  AlertCircle,
  HelpCircle,
  Clock,
  CreditCard,
  Lock
} from "lucide-react";
import { SUBSCRIPTION_PLANS, SubscriptionPlanId, SubscriptionPlanDetails } from "../config/subscriptionPlans.js";
import { updateUserSubscriptionPlan } from "../lib/firebase.js";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  currentPlan: SubscriptionPlanId;
  tokensUsedCurrentMonth: number;
  onPlanUpdated?: (newPlan: SubscriptionPlanId) => void;
  theme?: "dark" | "light";
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  currentPlan = "free",
  tokensUsedCurrentMonth = 0,
  onPlanUpdated,
  theme = "dark",
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>(currentPlan);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const activePlanDetails = SUBSCRIPTION_PLANS[currentPlan] || SUBSCRIPTION_PLANS.free;
  const currentMonthlyLimit = activePlanDetails.monthlyTokenLimit;
  const percentUsed = Math.min(100, Math.round((tokensUsedCurrentMonth / currentMonthlyLimit) * 100));

  const handleSelectPlan = async (planId: SubscriptionPlanId) => {
    if (planId === currentPlan) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await updateUserSubscriptionPlan(userEmail, planId);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage(`Plan successfully changed to ${SUBSCRIPTION_PLANS[planId].name}! Your token limits have been updated instantly.`);
      if (onPlanUpdated) onPlanUpdated(planId);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } else {
      setErrorMessage("Failed to update subscription plan. Please try again or contact support.");
    }
  };

  const isDark = theme === "dark";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-5xl rounded-3xl border shadow-2xl p-6 sm:p-8 z-50 my-auto subscription-modal-container ${
            isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="text-center space-y-2 mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black bg-indigo-500/10 border border-indigo-500/20 text-indigo-800 dark:text-indigo-300">
              <Sparkles size={14} className="animate-spin-slow text-indigo-700 dark:text-indigo-400" />
              <span>JOXIQ AI Enterprise Subscriptions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Enterprise-Grade AI Intelligence & Productivity
            </h2>
            <p className="text-xs sm:text-sm text-slate-950 dark:text-slate-100 font-black max-w-xl mx-auto">
              Select the optimal plan for academic research, heavy software engineering, and multi-model execution.
            </p>
          </div>

          {/* Active Usage Progress Card */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${isDark ? "bg-slate-900/80 border-slate-800" : "bg-slate-100 border-slate-300"} mb-8`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-2">
              <div className="flex items-center gap-2 text-slate-950 dark:text-slate-100">
                <Cpu className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                <span className="font-black">Current Active Plan:</span>
                <span className="px-2.5 py-0.5 rounded-md font-black uppercase bg-indigo-100 dark:bg-indigo-600/20 text-indigo-900 dark:text-indigo-300 border border-indigo-400 dark:border-indigo-500/30">
                  {activePlanDetails.name}
                </span>
              </div>
              <div className="font-mono font-black text-slate-950 dark:text-slate-200">
                <span className="font-black text-slate-950 dark:text-white">{tokensUsedCurrentMonth.toLocaleString()}</span> / {currentMonthlyLimit.toLocaleString()} Monthly Tokens Used
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-300 dark:bg-slate-800/80 h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentUsed >= 90
                    ? "bg-rose-500"
                    : percentUsed >= 75
                    ? "bg-amber-500"
                    : "bg-gradient-to-r from-indigo-500 to-cyan-400"
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>

            {percentUsed >= 80 && (
              <div className="flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-400 mt-2 font-black">
                <AlertCircle size={13} className="shrink-0" />
                <span>You've used {percentUsed}% of your monthly tokens. Upgrade to Pro or Ultra for expanded limits.</span>
              </div>
            )}
          </div>

          {/* Toast Notification Messages */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-black flex items-center gap-2">
              <Check size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-black flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Subscription Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlanId[]).map((planKey) => {
              const plan = SUBSCRIPTION_PLANS[planKey];
              const isCurrent = currentPlan === planKey;
              const isPopular = plan.popular;

              return (
                <div
                  key={planKey}
                  className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 ${
                    isCurrent
                      ? "border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50/80 dark:bg-indigo-500/5"
                      : isPopular
                      ? "border-amber-500/60 bg-amber-50/30 dark:bg-slate-900/60 shadow-lg"
                      : isDark
                      ? "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                      : "border-slate-300 bg-slate-100 hover:border-slate-400"
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md">
                      {plan.badge}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="border-b border-slate-300 dark:border-slate-500/10 pb-4">
                      <h3 className="font-black text-base text-slate-900 dark:text-slate-100">{plan.name}</h3>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1 min-h-[32px]">{plan.description}</p>
                      <div className="mt-3 flex flex-col gap-1">
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                          {plan.priceQAR === 0 ? "Free / $0 USD" : `${plan.priceQAR} QR`}
                        </div>
                        {plan.priceQAR > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20">
                              💵 ${plan.priceUSD.toFixed(2)} USD
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-500/20">
                              🇶🇦 {plan.priceQAR} QAR
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-slate-400">Plan Features</div>
                      <ul className="space-y-2 text-xs">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-900 dark:text-slate-200 font-bold leading-tight">
                            <Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 font-bold" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-6 mt-4 border-t border-slate-300 dark:border-slate-500/10">
                    <button
                      onClick={() => handleSelectPlan(planKey)}
                      disabled={isCurrent || isSubmitting}
                      className={`w-full py-2.5 rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                        isCurrent
                          ? "bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-400 cursor-default border border-slate-400 dark:border-slate-700"
                          : isPopular
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
                          : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {isCurrent ? (
                        <span>Current Active Plan</span>
                      ) : isSubmitting ? (
                        <span>Processing...</span>
                      ) : (
                        <span>Switch to {plan.name}</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Security Guarantee */}
          <div className="mt-8 pt-4 border-t border-slate-300 dark:border-slate-500/20 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-900 dark:text-slate-200 font-bold gap-3">
            <div className="flex items-center gap-1.5">
              <Lock size={13} className="text-emerald-600 dark:text-emerald-400 font-bold" />
              <span>Secure Payment in Qatari Riyal (QAR). Cancel or upgrade anytime.</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Fair Usage Policy Enforced</span>
              <span>•</span>
              <span>24/7 Cost Protection Active</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
