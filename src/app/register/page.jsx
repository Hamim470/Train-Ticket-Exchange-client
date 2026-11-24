"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Train,
  User,
  Phone,
  Mail,
  Lock,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { signUp } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [step, setStep] = useState(1); // 1 = Details & Send OTP, 2 = Verify OTP & Create Account
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    otp: "",
  });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!/^01[3-9]\d{8}$/.test(form.phone.trim())) {
      setAlert({
        type: "error",
        text: t(
          "সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)।",
          "Please enter a valid 11-digit Bangladesh mobile number (e.g., 01712345678)."
        ),
      });
      return;
    }

    if (form.password.length < 6) {
      setAlert({
        type: "error",
        text: t("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।", "Password must be at least 6 characters."),
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, phone: form.phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAlert({ type: "error", text: data.message || "Failed to send OTP." });
        setLoading(false);
        return;
      }

      setStep(2);
      setAlert({
        type: "success",
        text: t(
          "আপনার ইমেইলে ৬ সংখ্যার একটি OTP কোড পাঠানো হয়েছে।",
          "A 6-digit OTP code has been sent to your email."
        ),
      });
    } catch (err) {
      setAlert({ type: "error", text: t("সার্ভার সংযোগ ব্যর্থ হয়েছে।", "Server connection failed.") });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);

    try {
      // 1. Verify OTP
      const otpRes = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp: form.otp }),
      });
      const otpData = await otpRes.json();

      if (!otpRes.ok) {
        setAlert({
          type: "error",
          text: otpData.message || t("ভুল বা মেয়াদোত্তীর্ণ OTP।", "Invalid or expired OTP."),
        });
        setLoading(false);
        return;
      }

      // 2. Create account via Better-Auth
      const { error } = await signUp.email({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
      });

      if (error) {
        setAlert({
          type: "error",
          text: error.message || t("নিবন্ধন ব্যর্থ হয়েছে।", "Registration failed."),
        });
        setLoading(false);
        return;
      }

      setAlert({
        type: "success",
        text: t("নিবন্ধন সফল হয়েছে! ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...", "Account created! Redirecting..."),
      });

      setTimeout(() => {
        router.push("/dashboard/profile");
        router.refresh();
      }, 800);
    } catch (err) {
      setAlert({ type: "error", text: t("সার্ভার ত্রুটি হয়েছে।", "Network error.") });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8"
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Train className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("নতুন অ্যাকাউন্ট খুলুন", "Create Your Account")}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {step === 1
              ? t("মোবাইল নম্বর ও ইমেইল দিয়ে নিবন্ধন করুন", "Register with your mobile number & email")
              : t("ইমেইলে পাঠানো ৬ সংখ্যার OTP দিন", "Enter the 6-digit OTP sent to your email")}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {alert && (
            <motion.div
              key={alert.text}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mb-5 p-3.5 rounded-xl border text-sm flex items-start gap-2.5 ${
                alert.type === "error"
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
            >
              {alert.type === "error" ? (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span>{alert.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {t("পূর্ণ নাম (এনআইডি অনুযায়ী)", "Full Name (As per NID)")}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("যেমন: তানভীর আহমেদ", "e.g., Tanvir Ahmed")}
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {t("মোবাইল নম্বর (bKash / Nagad)", "Mobile Number (bKash / Nagad)")}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  maxLength={11}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="017XXXXXXXX"
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-300 text-sm timer-digits focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {t("ইমেইল ঠিকানা (OTP ভেরিফিকেশনের জন্য)", "Email Address (For OTP Verification)")}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {t("পাসওয়ার্ড", "Password")}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("OTP পাঠানো হচ্ছে...", "Sending OTP...")}
                </>
              ) : (
                t("OTP কোড পাঠান", "Send Verification OTP")
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {t("৬ সংখ্যার OTP কোড", "6-Digit OTP Code")}
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={form.otp}
                  onChange={(e) => setForm({ ...form, otp: e.target.value })}
                  placeholder="123456"
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-300 text-base font-bold tracking-widest timer-digits focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("যাচাই করা হচ্ছে...", "Verifying...")}
                </>
              ) : (
                t("যাচাই করে নিবন্ধন সম্পন্ন করুন", "Verify & Complete Registration")
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 py-1 cursor-pointer"
            >
              {t("← তথ্য পরিবর্তন করুন", "← Edit Details")}
            </button>
          </form>
        )}

        <div className="mt-5 p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2.5 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {t(
              "টিকিট বিক্রি করতে প্রোফাইল থেকে এনআইডি ভেরিফিকেশন করতে হবে।",
              "Complete NID verification in your profile to list tickets for sale."
            )}
          </span>
        </div>

        <p className="text-center text-sm text-slate-600 mt-6">
          {t("ইতিমধ্যে অ্যাকাউন্ট আছে?", "Already have an account?")}{" "}
          <Link href="/login" className="font-semibold text-emerald-600 hover:underline">
            {t("লগইন করুন", "Log In")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}