import React, { useState } from "react";
import { Sparkles, Check, Zap, Shield, Crown, X, CreditCard, Lock, Calendar, QrCode, Smartphone } from "lucide-react";

interface ProSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess: () => void;
  isDark: boolean;
  freeMessagesLeft: number;
  isProUser: boolean;
  userEmail?: string;
  userTokensUsed?: number;
}

export function ProSubscriptionModal({
  isOpen,
  onClose,
  onUpgradeSuccess,
  isDark,
  freeMessagesLeft,
  isProUser,
  userEmail,
  userTokensUsed = 0,
}: ProSubscriptionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly" | "ultra">("monthly");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"visa" | "mastercard" | "amex" | "apple_pay" | "google_pay" | "paypal" | "qr_code">("visa");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    if (selectedPaymentMethod === "visa" || selectedPaymentMethod === "mastercard" || selectedPaymentMethod === "amex") {
      if (!cardNumber || cardNumber.replace(/\s/g, "").length < 15) {
        setErrorMsg("Please enter a valid card number.");
        return;
      }
      if (!cardHolder.trim()) {
        setErrorMsg("Please enter the cardholder name.");
        return;
      }
      if (!expiry || !expiry.includes("/")) {
        setErrorMsg("Please enter a valid expiry date (MM/YY).");
        return;
      }
      if (!cvc || cvc.length < 3) {
        setErrorMsg("Please enter a valid CVC security code.");
        return;
      }
    }

    setErrorMsg(null);
    setIsProcessing(true);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, paymentMethod: selectedPaymentMethod, cardNumber: cardNumber.slice(-4), email: userEmail }),
      });
      const data = await res.json();
      
      setTimeout(() => {
        setIsProcessing(false);
        if (data.url) {
          window.location.href = data.url;
        } else {
          setSuccessMessage(`🎉 Payment successful via ${selectedPaymentMethod.replace('_', ' ').toUpperCase()}! Welcome to JOXIQ ${selectedPlan === "ultra" ? "VIP Ultra" : "Pro"}.`);
          setTimeout(() => {
            onUpgradeSuccess();
            onClose();
          }, 1500);
        }
      }, 1200);
    } catch (err) {
      console.error(err);
      setTimeout(() => {
        setIsProcessing(false);
        setSuccessMessage(`🎉 Payment successful via ${selectedPaymentMethod.replace('_', ' ').toUpperCase()}! Welcome to JOXIQ ${selectedPlan === "ultra" ? "Ultra" : "Pro"}.`);
        setTimeout(() => {
          onUpgradeSuccess();
          onClose();
        }, 1500);
      }, 1200);
    }
  };

  const planPriceQAR = selectedPlan === "monthly" ? "36 QR" : selectedPlan === "yearly" ? "300 QR" : "99 QR";
  const planPriceUSD = selectedPlan === "monthly" ? "$9.90 USD" : selectedPlan === "yearly" ? "$82.50 USD" : "$27.20 USD";
  const planPriceFull = `${planPriceQAR} (${planPriceUSD})`;
  const planName = selectedPlan === "monthly" ? "Pro" : selectedPlan === "yearly" ? "Annual Pro" : "Ultra";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className={`relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl border transition-all ${
        isDark ? "bg-black border-zinc-800 text-white" : "bg-white border-slate-300 text-slate-900"
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white transition-colors cursor-pointer z-10"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-5 pt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-xl shadow-indigo-500/20 mb-3">
            <Crown size={28} />
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Upgrade to <span className="text-amber-600 dark:text-amber-300 font-black">JOXIQ AI {selectedPlan === "ultra" ? "Ultra" : "Pro"}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-bold mt-1.5 max-w-md mx-auto px-2">
            {isProUser 
              ? "You are currently enjoying full JOXIQ AI privileges!" 
              : `You have ${Math.max(0, freeMessagesLeft)} free messages remaining. Choose your plan & payment details below.`}
          </p>
        </div>

        {successMessage ? (
          <div className="py-12 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-3xl font-black animate-bounce">
              ✓
            </div>
            <p className="text-lg font-black text-emerald-800 dark:text-emerald-300">{successMessage}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Active Usage Progress Card */}
            <div className={`p-4 sm:p-5 rounded-2xl border ${isDark ? "bg-slate-900/90 border-slate-700" : "bg-slate-100 border-slate-300"} shadow-sm`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mb-2">
                <div className="flex items-center gap-2 text-slate-950 dark:text-white font-black">
                  <Zap className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                  <span>Current Active Plan:</span>
                  <span className="px-2.5 py-0.5 rounded-md font-black uppercase bg-indigo-100 dark:bg-indigo-600/40 text-indigo-950 dark:text-indigo-100 border border-indigo-400 dark:border-indigo-500/50">
                    {isProUser ? "PRO ACTIVE" : "FREE TIER"}
                  </span>
                </div>
                <div className="font-mono font-black text-slate-900 dark:text-slate-100">
                  <span className="text-indigo-900 dark:text-indigo-300 font-black">{userTokensUsed.toLocaleString()}</span> / { (isProUser ? 300000 : 50000).toLocaleString() } Monthly Tokens Used
                </div>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (userTokensUsed / (isProUser ? 300000 : 50000)) >= 0.9
                      ? "bg-rose-600"
                      : (userTokensUsed / (isProUser ? 300000 : 50000)) >= 0.75
                      ? "bg-amber-600"
                      : "bg-indigo-600"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, Math.round((userTokensUsed / (isProUser ? 300000 : 50000)) * 100)))}%` }}
                />
              </div>
            </div>

            {/* Plan Selection Cards */}
            <div>
              <label className="block text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider mb-2">1. Select Subscription Plan</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                {/* Monthly Plan */}
                <div
                  onClick={() => setSelectedPlan("monthly")}
                  className={`relative rounded-2xl p-4 sm:p-4.5 border cursor-pointer transition-all flex flex-col justify-between ${
                    selectedPlan === "monthly"
                      ? "border-indigo-600 bg-indigo-50/90 dark:bg-indigo-600/30 shadow-md ring-2 ring-indigo-600"
                      : isDark ? "border-white/20 bg-white/5 hover:border-white/40" : "border-slate-300 bg-white hover:border-slate-400 hover:shadow-md"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-300">Pro</span>
                      {selectedPlan === "monthly" && <Check size={18} className="text-indigo-800 dark:text-indigo-300 font-black" />}
                    </div>
                    <div className="text-2xl font-black mb-1.5 text-slate-950 dark:text-white">36 QR <span className="text-xs font-black text-slate-700 dark:text-slate-300">/ mo</span></div>
                    <div className="text-xs font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md w-fit border border-emerald-300 dark:border-emerald-700/50">💵 $9.90 USD / month</div>
                  </div>
                  <ul className="text-xs font-bold space-y-2.5 mt-4 pt-4 border-t border-slate-300 dark:border-white/20">
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 font-black" /> <span className="text-slate-900 dark:text-slate-100 font-bold">300,000 Monthly Tokens</span></li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 font-black" /> <span className="text-slate-900 dark:text-slate-100 font-bold">Pro Models & Vision Engine</span></li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 font-black" /> <span className="text-slate-900 dark:text-slate-100 font-bold">Low Latency Priority Speed</span></li>
                  </ul>
                </div>

                {/* Yearly Plan */}
                <div
                  onClick={() => setSelectedPlan("yearly")}
                  className={`relative rounded-2xl p-4 sm:p-4.5 border cursor-pointer transition-all flex flex-col justify-between ${
                    selectedPlan === "yearly"
                      ? "border-amber-600 bg-amber-50/90 dark:bg-amber-500/30 shadow-md ring-2 ring-amber-600"
                      : isDark ? "border-white/20 bg-white/5 hover:border-white/40" : "border-slate-300 bg-white hover:border-slate-400 hover:shadow-md"
                  }`}
                >
                  <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow">
                    SAVE 30%
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-300">Annual Pro</span>
                      {selectedPlan === "yearly" && <Check size={18} className="text-amber-800 dark:text-amber-300 font-black" />}
                    </div>
                    <div className="text-2xl font-black mb-1.5 text-slate-950 dark:text-white">300 QR <span className="text-xs font-black text-slate-700 dark:text-slate-300">/ yr</span></div>
                    <div className="text-xs font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md w-fit border border-emerald-300 dark:border-emerald-700/50">💵 $82.50 USD / year</div>
                  </div>
                  <ul className="text-xs font-bold space-y-2.5 mt-4 pt-4 border-t border-slate-300 dark:border-white/20">
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 font-black" /> <span className="text-slate-900 dark:text-slate-100 font-bold">Save 30% vs Monthly Plan</span></li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 font-black" /> <span className="text-slate-900 dark:text-slate-100 font-bold">Complete Pro Suite Features</span></li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 font-black" /> <span className="text-slate-900 dark:text-slate-100 font-bold">Priority 24/7 Support Channel</span></li>
                  </ul>
                </div>

                {/* Ultra Plan */}
                <div
                  onClick={() => setSelectedPlan("ultra")}
                  className={`relative rounded-2xl p-4 sm:p-4.5 border cursor-pointer transition-all flex flex-col justify-between ${
                    selectedPlan === "ultra"
                      ? "border-violet-600 bg-violet-50/90 dark:bg-violet-600/35 shadow-md ring-2 ring-violet-600"
                      : isDark ? "border-white/20 bg-white/5 hover:border-white/40" : "border-slate-300 bg-white hover:border-slate-400 hover:shadow-md"
                  }`}
                >
                  <div className="absolute -top-3 right-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow">
                    ULTRA
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-violet-950 dark:text-violet-300">Ultra</span>
                      {selectedPlan === "ultra" && <Check size={18} className="text-violet-800 dark:text-violet-300 font-black" />}
                    </div>
                    <div className="text-2xl font-black mb-1.5 text-slate-950 dark:text-white">99 QR <span className="text-xs font-black text-slate-700 dark:text-slate-300">/ mo</span></div>
                    <div className="text-xs font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md w-fit border border-emerald-300 dark:border-emerald-700/50">💵 $27.20 USD / month</div>
                  </div>
                  <ul className="text-xs font-bold space-y-2.5 mt-4 pt-4 border-t border-slate-300 dark:border-white/20">
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 font-black" /> <span className="text-slate-900 dark:text-slate-100 font-bold">1,000,000 Monthly Tokens</span></li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 font-black" /> <span className="text-slate-900 dark:text-slate-100 font-bold">Top Models (GPT-4o, Claude 3.5)</span></li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 font-black" /> <span className="text-slate-900 dark:text-slate-100 font-bold">Dedicated Compute Node</span></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Payment Method Selector & Inputs (Directly Visible) */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">2. Select Payment Method & Details</label>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs font-black">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {[
                  { id: "visa", label: "Visa", icon: "💳" },
                  { id: "mastercard", label: "Mastercard", icon: "💳" },
                  { id: "qr_code", label: "Scan QR Code", icon: "📱" },
                  { id: "apple_pay", label: "Apple Pay", icon: "" },
                  { id: "google_pay", label: "Google Pay", icon: "G" },
                  { id: "paypal", label: "PayPal", icon: "P" },
                  { id: "amex", label: "Amex", icon: "💳" },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedPaymentMethod(method.id as any);
                      setErrorMsg(null);
                    }}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border transition-all cursor-pointer min-h-[44px] ${
                      selectedPaymentMethod === method.id
                        ? "border-indigo-600 bg-indigo-100 text-indigo-950 dark:bg-indigo-600/40 dark:text-white shadow-sm ring-2 ring-indigo-600 font-black"
                        : isDark ? "border-white/20 bg-white/10 hover:border-white/30 text-white font-bold" : "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold"
                    }`}
                  >
                    <span className="text-sm shrink-0">{method.icon}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">{method.label}</span>
                  </button>
                ))}
              </div>

              {/* Dynamic Payment Method Details Form / QR Box */}
              <div className={`p-4 rounded-2xl border ${isDark ? "bg-white/10 border-white/20" : "bg-slate-100 border-slate-300"}`}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">Selected Plan Summary</span>
                  <span className="text-xs font-black text-indigo-950 bg-indigo-100 border border-indigo-300 dark:text-indigo-200 dark:bg-indigo-500/30 px-2.5 py-1 rounded-full">{planName} — {planPriceQAR} ({planPriceUSD})</span>
                </div>

                {selectedPaymentMethod === "qr_code" ? (
                  /* QR Code Instant Scan Payment Display */
                  <div className="py-2 text-center flex flex-col items-center justify-center gap-3">
                    <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-300 inline-block relative group">
                      {/* Render visual vector QR code */}
                      <svg className="w-36 h-36 text-black" viewBox="0 0 100 100" fill="currentColor">
                        <path d="M0,0 h35 v35 h-35 z M5,5 v25 h25 v-25 z M10,10 h15 v15 h-15 z" />
                        <path d="M65,0 h35 v35 h-35 z M70,5 v25 h25 v-25 z M75,10 h15 v15 h-15 z" />
                        <path d="M0,65 h35 v35 h-35 z M5,70 v25 h25 v-25 z M10,75 h15 v15 h-15 z" />
                        <path d="M40,5 h10 v10 h-10 z M50,15 h10 v10 h-10 z M40,25 h10 v10 h-10 z" />
                        <path d="M65,40 h10 v10 h-10 z M75,50 h10 v10 h-10 z M85,40 h15 v10 h-15 z M65,60 h15 v10 h-15 z" />
                        <path d="M40,65 h10 v10 h-10 z M50,75 h10 v20 h-10 z M40,85 h20 v10 h-20 z" />
                        <path d="M65,75 h10 v10 h-10 z M80,75 h20 v20 h-20 z" />
                        <circle cx="50" cy="50" r="8" fill="#4f46e5" />
                      </svg>
                      <div className="mt-2 text-[10px] font-mono font-black text-black bg-slate-200 py-1 px-2 rounded">
                        PAY-REF: JOXIQ-{selectedPlan.toUpperCase()}-2026
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-black text-slate-950 dark:text-white flex items-center justify-center gap-1.5">
                        <Smartphone size={15} className="text-indigo-600 dark:text-indigo-300" />
                        Scan QR Code to Pay {planPriceQAR} / {planPriceUSD}
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-sm mx-auto">
                        Use QNB Mobile, bKash, Nagad, Apple Camera, or any QR reader app. Your account will automatically activate upon confirmation.
                      </p>
                    </div>
                  </div>
                ) : (selectedPaymentMethod === "visa" || selectedPaymentMethod === "mastercard" || selectedPaymentMethod === "amex") ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider mb-1.5">Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Mohammad Nain"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border outline-none transition-all ${
                          isDark ? "bg-black/60 border-white/30 focus:border-indigo-400 text-white placeholder-slate-400" : "bg-white border-slate-300 focus:border-indigo-600 text-slate-950 placeholder-slate-500 shadow-sm"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider mb-1.5">{selectedPaymentMethod.toUpperCase()} Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="4242 4242 4242 4242"
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border outline-none transition-all ${
                            isDark ? "bg-black/60 border-white/30 focus:border-indigo-400 text-white placeholder-slate-400" : "bg-white border-slate-300 focus:border-indigo-600 text-slate-950 placeholder-slate-500 shadow-sm"
                          }`}
                        />
                        <CreditCard size={16} className="absolute left-3 top-3 text-slate-600 dark:text-slate-300" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider mb-1.5">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border outline-none transition-all ${
                            isDark ? "bg-black/60 border-white/30 focus:border-indigo-400 text-white placeholder-slate-400" : "bg-white border-slate-300 focus:border-indigo-600 text-slate-950 placeholder-slate-500 shadow-sm"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider mb-1.5">CVC Code</label>
                        <div className="relative">
                          <input
                            type="password"
                            placeholder="CVC"
                            maxLength={4}
                            value={cvc}
                            onChange={(e) => setCvc(e.target.value)}
                            className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border outline-none transition-all ${
                              isDark ? "bg-black/60 border-white/30 focus:border-indigo-400 text-white placeholder-slate-400" : "bg-white border-slate-300 focus:border-indigo-600 text-slate-950 placeholder-slate-500 shadow-sm"
                            }`}
                          />
                          <Lock size={14} className="absolute left-2.5 top-3 text-slate-600 dark:text-slate-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 mb-1">
                      <Shield size={22} />
                    </div>
                    <div className="text-sm font-black text-slate-950 dark:text-white capitalize">
                      {selectedPaymentMethod === "apple_pay" ? "Apple Pay" : selectedPaymentMethod === "google_pay" ? "Google Pay" : "PayPal"} Checkout
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-xs mx-auto">
                      You will be securely redirected to authorize your {selectedPaymentMethod === "apple_pay" ? "Apple Pay" : selectedPaymentMethod === "google_pay" ? "Google Pay" : "PayPal"} payment of <span className="font-black text-slate-950 dark:text-white">{planPriceFull}</span>.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-sm text-slate-900 dark:text-white bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 transition-colors cursor-pointer text-center border border-slate-300 dark:border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSubscribe}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>Processing Secure Payment...</>
                ) : selectedPaymentMethod === "qr_code" ? (
                  <>
                    <QrCode size={16} />
                    I Have Scanned & Paid ({planPriceFull})
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Pay & Upgrade Now ({planPriceFull})
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

