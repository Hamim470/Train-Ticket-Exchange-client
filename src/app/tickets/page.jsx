"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Train,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Lock,
  Loader2,
  RotateCcw,
  PlusCircle,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { getPublicTickets } from "@/lib/api/tickets";
import SearchBar from "@/components/SearchBar";

function TicketsMarketplaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();

  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";
  const dateParam = searchParams.get("date") || "";

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTickets() {
      try {
        const res = await getPublicTickets({
          from: fromParam,
          to: toParam,
          date: dateParam,
        });

        if (cancelled) return;

        if (res.ok && Array.isArray(res.data)) {
          setTickets(res.data);
          setErrorMsg("");
        } else {
          setTickets([]);
          setErrorMsg(
            res.data?.message ||
              t("টিকিট লোড করতে সমস্যা হয়েছে।", "Failed to load available tickets.")
          );
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Marketplace fetch error:", err);
        setTickets([]);
        setErrorMsg(t("সার্ভার সংযোগে সমস্যা হয়েছে।", "Network error loading tickets."));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTickets();

    return () => {
      cancelled = true;
    };
  }, [fromParam, toParam, dateParam, t]);

  const hasActiveFilters = Boolean(fromParam || toParam || dateParam);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("উপলব্ধ ট্রেনের টিকিট", "Available Train Tickets")}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {t(
              "ক্রেতার এসক্রো সুরক্ষায় সিট ও PNR লুকানো অবস্থায় টিকিট প্রদর্শিত হচ্ছে।",
              "Listings show masked seat numbers and verified seller badges until escrow booking."
            )}
          </p>
        </div>

        <Link
          href="/dashboard/sell"
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t("টিকিট বিক্রি করুন", "Sell a Ticket")}</span>
        </Link>
      </div>

      {/* Filter Search Bar */}
      <SearchBar
        key={`${fromParam}-${toParam}-${dateParam}`}
        initialFrom={fromParam}
        initialTo={toParam}
        initialDate={dateParam}
        compact
      />

      {/* Active Filter Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-700">
            <span className="font-semibold">{t("ফিল্টার:", "Active Filters:")}</span>
            {fromParam && (
              <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 font-medium">
                From: {fromParam}
              </span>
            )}
            {toParam && (
              <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 font-medium">
                To: {toParam}
              </span>
            )}
            {dateParam && (
              <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 font-medium timer-digits">
                Date: {dateParam}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              router.push("/tickets");
            }}
            className="min-h-[36px] px-3 py-1 rounded-lg text-emerald-700 hover:bg-emerald-50 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t("রিসেট করুন", "Clear Filters")}</span>
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
        </div>
      ) : errorMsg ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <p className="text-base font-bold text-slate-900">
            {t("কোনো টিকিট পাওয়া যায়নি", "No matching tickets available")}
          </p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {t(
              "অন্য স্টেশন বা যাত্রার তারিখ দিয়ে খুঁজে দেখুন অথবা নতুন টিকিট লিস্ট করুন।",
              "Try a different station pair or journey date, or clear filters to see all approved listings."
            )}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                router.push("/tickets");
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t("সব টিকিট দেখুন", "Show All Tickets")}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => {
            const totalPayable =
              Number(ticket.fare || 0) + Number(ticket.platformFee ?? 25);

            return (
              <div
                key={ticket._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-3.5">
                  {/* Top Row: Train & Verified Seller Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                        <Train className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{ticket.trainName}</span>
                      </div>
                      <p className="text-xs text-slate-500 timer-digits mt-0.5">
                        #{ticket.trainNumber} • {ticket.seatClass || "S_CHAIR"}
                      </p>
                    </div>

                    {ticket.sellerVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>✓ NID Verified Seller</span>
                      </span>
                    )}
                  </div>

                  {/* Route */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        {ticket.fromStation} → {ticket.toStation}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 timer-digits">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {ticket.journeyDate}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {ticket.departureTime}
                      </span>
                    </div>
                  </div>

                  {/* Masked Seat & Coach Info */}
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs">
                    <span className="text-slate-700 font-medium">
                      {t("কোচ:", "Coach:")}{" "}
                      <strong className="text-slate-900">{ticket.coach || "—"}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-amber-900 timer-digits">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      Seat: [HIDDEN]
                    </span>
                  </div>
                </div>

                {/* Fare & Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block">
                      {t("মোট ভাড়া (ফি সহ)", "Total w/ Escrow Fee")}
                    </span>
                    <span className="text-lg font-bold text-slate-900 timer-digits">
                      ৳{totalPayable}
                    </span>
                  </div>

                  <Link
                    href={`/tickets/${ticket._id}`}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shrink-0"
                  >
                    <span>{t("বিস্তারিত দেখুন", "View & Lock")}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-14 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
        </div>
      }
    >
      <TicketsMarketplaceContent />
    </Suspense>
  );
}