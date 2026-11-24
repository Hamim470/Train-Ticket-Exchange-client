"use client";

import { useState, useEffect, useRef, useCallback, Suspense, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  Clock,
  Lock,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Loader2,
  Train,
  MapPin,
  Calendar,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";
import { getPublicTickets } from "@/lib/api/tickets";
import { lockTicketListing, unlockTicketListing } from "@/lib/actions/tickets";

const LOCK_DURATION_MS = 10 * 60 * 1000;

function formatCountdown(remainingMs) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function CheckoutContent({ ticketId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const { t } = useLanguage();

  const expiresAtParam = Number(searchParams.get("expiresAt") || 0);

  const [ticket, setTicket] = useState(null);
  const [deadlineMs, setDeadlineMs] = useState(() =>
    expiresAtParam > Date.now() ? expiresAtParam : null
  );
  const [remainingMs, setRemainingMs] = useState(() =>
    expiresAtParam > Date.now() ? expiresAtParam - Date.now() : LOCK_DURATION_MS
  );
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const expiredHandledRef = useRef(false);

  // Load ticket info & ensure lock is active
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.push("/login");
      return;
    }

    let cancelled = false;

    async function initCheckout() {
      try {
        const listRes = await getPublicTickets();
        if (!cancelled && listRes.ok && Array.isArray(listRes.data)) {
          const found = listRes.data.find((item) => String(item._id) === String(ticketId));
          if (found) setTicket(found);
        }

        if (!deadlineMs) {
          const lockRes = await lockTicketListing(ticketId);
          if (cancelled) return;

          if (!lockRes.ok) {
            setErrorMsg(
              lockRes.data?.message ||
                t(
                  "টিকিটটি লক করা যায়নি। মার্কেটপ্লেসে ফিরিয়ে নেওয়া হচ্ছে...",
                  "Could not lock ticket. Redirecting to marketplace..."
                )
            );
            setTimeout(() => router.push("/tickets"), 1400);
            return;
          }

          const targetMs =
            lockRes.data?.lockedUntilMs ||
            (lockRes.data?.lockedUntil
              ? new Date(lockRes.data.lockedUntil).getTime()
              : Date.now() + LOCK_DURATION_MS);

          setDeadlineMs(targetMs);
          setRemainingMs(Math.max(0, targetMs - Date.now()));
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Checkout init error:", err);
          setErrorMsg(t("চেকআউট শুরু করতে সমস্যা হয়েছে।", "Failed to initialize checkout."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initCheckout();
    return () => {
      cancelled = true;
    };
  }, [isPending, session, ticketId, deadlineMs, router, t]);

  const handleExpiredUnlockAndRedirect = useCallback(async () => {
    if (expiredHandledRef.current) return;
    expiredHandledRef.current = true;

    try {
      await unlockTicketListing(ticketId);
    } catch (err) {
      console.error("Auto-unlock on expiry error:", err);
    } finally {
      router.replace("/tickets?expired=1");
    }
  }, [ticketId, router]);

  // Real-time 10:00 countdown interval
  useEffect(() => {
    if (!deadlineMs || loading) return;

    const tick = () => {
      const diff = deadlineMs - Date.now();
      if (diff <= 0) {
        setRemainingMs(0);
        handleExpiredUnlockAndRedirect();
      } else {
        setRemainingMs(diff);
      }
    };

    tick();
    const intervalId = setInterval(tick, 500);
    return () => clearInterval(intervalId);
  }, [deadlineMs, loading, handleExpiredUnlockAndRedirect]);

  const handleCancelCheckout = async () => {
    if (canceling || expiredHandledRef.current) return;
    expiredHandledRef.current = true;
    setCanceling(true);

    try {
      await unlockTicketListing(ticketId);
    } catch (err) {
      console.error("Cancel unlock error:", err);
    } finally {
      router.push("/tickets");
    }
  };

  if (isPending || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  const isUrgent = remainingMs <= 2 * 60 * 1000;
  const fare = Number(ticket?.fare || 0);
  const platformFee = Number(ticket?.platformFee ?? 25);
  const totalPayable = fare + platformFee;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Amber Motion Urgency Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: isUrgent ? [1, 1.01, 1] : 1,
        }}
        transition={
          isUrgent
            ? { repeat: Infinity, duration: 1.4, ease: "easeInOut" }
            : { duration: 0.25 }
        }
        className="rounded-2xl bg-amber-50 border border-amber-300 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-950">
              {t(
                "টিকিটটি ১০ মিনিটের জন্য আপনার নামে লক করা হয়েছে",
                "Ticket Locked for Your Checkout Window"
              )}
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              {t(
                "সময় শেষ হলে লক স্বয়ংক্রিয়ভাবে বাতিল হয়ে টিকিট আবার মার্কেটপ্লেসে চলে যাবে।",
                "Complete payment before 00:00 or the lock automatically releases and returns you to /tickets."
              )}
            </p>
          </div>
        </div>

        <div
          className="px-4 py-2.5 rounded-xl bg-amber-100 border border-amber-300 flex items-center gap-2 self-start sm:self-center shrink-0"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <Clock className="w-4 h-4 text-amber-800" />
          <span className="text-xl font-extrabold text-amber-950 timer-digits tabular-nums">
            {formatCountdown(remainingMs)}
          </span>
        </div>
      </motion.div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Checkout Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h1 className="text-xl font-bold text-slate-900">
            {t("এসক্রো চেকআউট সারসংক্ষেপ", "Escrow Checkout Summary")}
          </h1>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>{t("লকড", "Locked")}</span>
          </span>
        </div>

        {ticket ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Train className="w-4 h-4 text-emerald-600" />
                <span>
                  {ticket.trainName}{" "}
                  <span className="text-slate-500 font-normal timer-digits">
                    (#{ticket.trainNumber})
                  </span>
                </span>
              </div>
              {ticket.sellerVerified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <ShieldCheck className="w-4 h-4" />
                  <span>✓ NID Verified Seller</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {ticket.fromStation} → {ticket.toStation}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 timer-digits sm:justify-end">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {ticket.journeyDate} • {ticket.departureTime}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>{t("মূল ভাড়া", "Ticket Fare")}</span>
                <span className="font-semibold text-slate-900 timer-digits tabular-nums">
                  ৳{fare}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t("এসক্রো সুরক্ষা ফি", "Escrow Protection Fee")}</span>
                <span className="font-semibold text-slate-900 timer-digits tabular-nums">
                  ৳{platformFee}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-base font-bold text-slate-900">
                <span>{t("সর্বমোট পরিশোধযোগ্য", "Total Payable")}</span>
                <span className="text-emerald-700 timer-digits tabular-nums">
                  ৳{totalPayable}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600 timer-digits">
            {t("টিকিট আইডি:", "Ticket ID:")} {ticketId}
          </p>
        )}

        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900">
          {t(
            "পেমেন্ট সম্পন্ন হওয়ার পর সিট নম্বর, PNR এবং ই-টিকিট ফাইল আপনার অ্যাকাউন্টে আনলক হবে এবং অর্থ এসক্রোতে সুরক্ষিত থাকবে।",
            "Once payment is confirmed in Task 4.3, Seat Number, PNR, and the e-ticket file unlock while funds remain held in escrow."
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={canceling}
            onClick={handleCancelCheckout}
            className="min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {canceling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 text-slate-500" />
            )}
            <span>{t("বাতিল ও আনলক করুন", "Cancel & Release Lock")}</span>
          </button>

          <span className="text-xs text-slate-500 text-center sm:text-right">
            {t(
              "bKash / Nagad এসক্রো পেমেন্ট পরবর্তী ধাপ (4.3)-এ যুক্ত হবে।",
              "bKash / Nagad escrow payment connects in Task 4.3."
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage({ params }) {
  const { ticketId } = use(params);

  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 py-14 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
        </div>
      }
    >
      <CheckoutContent ticketId={ticketId} />
    </Suspense>
  );
}