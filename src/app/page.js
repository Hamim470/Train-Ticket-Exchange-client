"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ShieldCheck, Lock, Ticket, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import SearchBar from "@/components/SearchBar";

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="bg-slate-950 text-white min-h-[calc(100vh-4rem)]">
      {/* Hero & Public Ticket Search */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-16 sm:pt-16 sm:pb-24 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="max-w-3xl space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>
              {t(
                "এনআইডি যাচাইকৃত বিক্রেতা ও নিরাপদ এসক্রো সুরক্ষা",
                "NID-Verified Sellers & Escrow Protection"
              )}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
            {t(
              "অব্যবহৃত ট্রেনের টিকিট কিনুন ও বিক্রি করুন সম্পূর্ণ নিরাপদে",
              "Exchange Unused Train Tickets Safely with Escrow Trust"
            )}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
            {t(
              "রুট ও যাত্রার তারিখ দিয়ে টিকিট খুঁজুন। এসক্রো পেমেন্ট সম্পন্ন না হওয়া পর্যন্ত সিট নম্বর ও PNR গোপন থাকে।",
              "Search available Bangladesh Railway intercity tickets by route and date. Seat numbers and PNR codes remain masked until escrow payment clears."
            )}
          </p>
        </motion.div>

        {/* Search Bar */}
        <div className="text-slate-900">
          <SearchBar />
        </div>

        {/* Trust Highlights & Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                {t("✓ NID Verified Seller", "✓ NID Verified Seller")}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  "প্রতিটি বিক্রেতার জাতীয় পরিচয়পত্র অ্যাডমিন কর্তৃক যাচাইকৃত।",
                  "Every seller completes admin-reviewed NID verification before listing."
                )}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-start gap-3">
            <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                {t("Seat: [HIDDEN] সুরক্ষা", "Seat: [HIDDEN] Privacy")}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  "কপি বা ডুপ্লিকেট রোধে সিট ও PNR পেমেন্টের আগে প্রকাশ করা হয় না।",
                  "Seat numbers and PNRs stay hidden publicly to prevent duplicate claims."
                )}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Ticket className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {t("সব টিকিট দেখুন", "Browse Marketplace")}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t("অনুমোদিত সব টিকিটের তালিকা", "View all live approved listings")}
                </p>
              </div>
            </div>
            <Link
              href="/tickets"
              className="min-h-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0"
            >
              <span>{t("যান", "Go")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}