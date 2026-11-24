"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Train, UserCheck, Lock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [identifier, setIdentifier] = useState(""); // Mobile number or Email
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);

    try {
      // Resolve mobile number to registered email if user entered a phone number
      const resolveRes = await fetch(`${API_URL}/api/auth/resolve-identifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const resolved = await resolveRes.json();

      if (!resolveRes.ok || !resolved.email) {
        setAlert({
          type: "error",
          text:
            resolved.message ||
            t("এই মোবাইল নম্বর বা ইমেইলে কোনো অ্যাকাউন্ট নেই।", "Account not found."),
        });
        setLoading(false);
        return;
      }

      const { error } = await signIn.email({
        email: resolved.email,
        password,
      });

      if (error) {
        setAlert({
          type: "error",
          text: error.message || t("তথ্য অথবা পাসওয়ার্ড সঠিক নয়।", "Invalid credentials."),
        });
        setLoading(false);
        return;
      }

      setAlert({
        type: "success",
        text: t("সফলভাবে লগইন হয়েছে!", "Logged in successfully!"),
      });

      setTimeout(() => {
        router.push("/dashboard/profile");
        router.refresh();
      }, 700);
    } catch (err) {
      setAlert({
        type: "error",
        text: t("সার্ভার সংযোগে সমস্যা হয়েছে।", "Unable to connect to authentication server."),
      });
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
            {t("স্বাগতম! লগইন করুন", "Welcome Back")}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {t(
              "মোবাইল নম্বর অথবা ইমেইল দিয়ে লগইন করুন",
              "Sign in using your Mobile Number or Email"
            )}
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

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              {t("মোবাইল নম্বর অথবা ইমেইল", "Mobile Number or Email")}
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="017XXXXXXXX or you@example.com"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                {t("লগইন হচ্ছে...", "Signing In...")}
              </>
            ) : (
              t("লগইন করুন", "Sign In")
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6">
          {t("নতুন ব্যবহারকারী?", "Don't have an account?")}{" "}
          <Link href="/register" className="font-semibold text-emerald-600 hover:underline">
            {t("নিবন্ধন করুন", "Register Now")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}