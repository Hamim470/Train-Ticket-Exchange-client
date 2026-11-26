"use client";

import { useState, useEffect, useRef, useCallback, Suspense, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  Clock,
  Lock,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Loader2,
  Train,
  MapPin,
  Calendar,
  CheckCircle2,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";
import { getPublicTickets } from "@/lib/api/tickets";
import { lockTicketListing, unlockTicketListing } from "@/lib/actions/tickets";
import { getEscrowPaymentStatus } from "@/lib/api/payments";
import { initiateSslczPayment } from "@/lib/actions/payments";

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
  const paymentParam = searchParams.get("payment") || "";
  const tranIdParam = searchParams.get("tranId") || "";
  const reasonParam = searchParams.get("reason") || "";

  const [ticket, setTicket] = useState(null);
  const [deadlineMs, setDeadlineMs] = useState(() =>
    expiresAtParam > Date.now() ? expiresAtParam : null
  );
  const [remainingMs, setRemainingMs] = useState(() =>
    expiresAtParam > Date.now() ? expiresAtParam - Date.now() : LOCK_DURATION_MS
  );
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [redirectingToGateway, setRedirectingToGateway] = useState(false);
  const [completedBooking, setCompletedBooking] = useState(null);
  const [errorMsg, setErrorMsg] = useState(() => {
    if (paymentParam === "failed") {
      return reasonParam || "Payment failed in SSLCOMMERZ Sandbox. You can retry before your 10-minute lock expires.";
    }
    if (paymentParam === "cancelled") {
      return "Payment was cancelled on SSLCOMMERZ. Your lock is still active until the timer runs out.";
    }
    return "";
  });

  const expiredHandledRef = useRef(false);

  // If returning from SSLCOMMERZ with ?payment=success&tranId=..., fetch unlocked booking
  useEffect(() => {
    if (isPending || !session?.user) return;
    if (paymentParam !== "success" || !tranIdParam) return;

    let cancelled = false;

    async function loadConfirmedBooking() {
      try {
        const res = await getEscrowPaymentStatus(tranIdParam);
        if (cancelled) return;

        if (res.ok && res.data?.status === "completed" && res.data?.booking) {
          setCompletedBooking(res.data.booking);
          setErrorMsg("");
        } else {
          setErrorMsg(
            t(
              "পেমেন্ট যাচাই করা হচ্ছে বা সম্পন্ন হয়নি।",
              "Payment confirmation is still pending or could not be verified."
            )
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Fetch confirmed booking error:", err);
          setErrorMsg(t("বুকিং তথ্য লোড করতে সমস্যা হয়েছে।", "Failed to load confirmed booking."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadConfirmedBooking();
    return () => {
      cancelled = true;
    };
  }, [isPending, session, paymentParam, tranIdParam, t]);

  // Normal checkout initialization (when not returning from success)
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (paymentParam === "success" && tranIdParam) return;

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
  }, [isPending, session, ticketId, deadlineMs, paymentParam, tranIdParam, router, t]);

  const handleExpiredUnlockAndRedirect = useCallback(async () => {
    if (expiredHandledRef.current || completedBooking) return;
    expiredHandledRef.current = true;

    try {
      await unlockTicketListing(ticketId);
    } catch (err) {
      console.error("Auto-unlock on expiry error:", err);
    } finally {
      router.replace("/tickets?expired=1");
    }
  }, [ticketId, completedBooking, router]);

  useEffect(() => {
    if (!deadlineMs || loading || completedBooking) return;

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
  }, [deadlineMs, loading, completedBooking, handleExpiredUnlockAndRedirect]);

  const handleCancelCheckout = async () => {
    if (canceling || expiredHandledRef.current || completedBooking) return;
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

  const handlePayWithSslcommerz = async () => {
    setErrorMsg("");
    setRedirectingToGateway(true);

    try {
      const res = await initiateSslczPayment(ticketId);
      if (!res.ok || !res.data?.gatewayPageUrl) {
        setErrorMsg(
          res.data?.message ||
            t(
              "SSLCOMMERZ পেমেন্ট সেশন তৈরি করা যায়নি।",
              "Failed to start SSLCOMMERZ checkout session."
            )
        );
        setRedirectingToGateway(false);
        return;
      }

      window.location.href = res.data.gatewayPageUrl;
    } catch (err) {
      console.error("SSLCOMMERZ redirect error:", err);
      setErrorMsg(t("পেমেন্ট গেটওয়েতে সংযোগ করা যায়নি।", "Network error connecting to SSLCOMMERZ."));
      setRedirectingToGateway(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Confirmed SSLCOMMERZ Escrow Booking + Unlocked Ticket Details
  if (completedBooking) {
    const details = completedBooking.unlockedDetails || {};

    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-5 flex items-start gap-3.5">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-emerald-950">
              {t(
                "SSLCOMMERZ পেমেন্ট সফল! অর্থ এসক্রোতে সুরক্ষিত ও টিকিট আনলক হয়েছে",
                "Payment Verified — Funds Held in Escrow & Ticket Unlocked"
              )}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-800 timer-digits">
              {t("এসক্রো স্ট্যাটাস:", "Escrow Status:")}{" "}
              <strong className="uppercase">{completedBooking.escrowStatus}</strong> •{" "}
              {t("মাধ্যম:", "Channel:")} <strong>{completedBooking.cardType}</strong> • TranID:{" "}
              <strong>{completedBooking.tranId}</strong>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Unlock className="w-5 h-5 text-emerald-600" />
              <span>{t("আনলককৃত টিকিটের তথ্য", "Unlocked Ticket Details")}</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              SOLD • ESCROW HELD
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">{t("কোচ ও সিট", "Coach & Seat")}</span>
              <span className="text-base font-bold text-slate-900 timer-digits">
                {details.coach || "—"} / {details.seatNumber || "—"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">PNR Code</span>
              <span className="text-base font-bold text-emerald-700 timer-digits">
                {details.pnr || "—"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block">{t("পরিশোধিত টাকা", "Amount Held")}</span>
              <span className="text-base font-bold text-slate-900 timer-digits">
                ৳{completedBooking.amount}
              </span>
            </div>
          </div>

          {details.ticketFileUrl && (
            <div>
              <a
                href={details.ticketFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-2"
              >
                <span>{t("ই-টিকিটের মূল ফাইল দেখুন", "View Unlocked E-Ticket File")}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/tickets"
              className="text-sm font-semibold text-emerald-700 hover:underline"
            >
              {t("মার্কেটপ্লেসে ফিরে যান", "Browse More Tickets")}
            </Link>
          </div>
        </div>
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
                "Complete SSLCOMMERZ payment before 00:00 or the lock releases and redirects to /tickets."
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

      {/* Checkout & SSLCOMMERZ Escrow Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h1 className="text-xl font-bold text-slate-900">
            {t("SSLCOMMERZ এসক্রো চেকআউট", "SSLCOMMERZ Escrow Checkout")}
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
            "SSLCOMMERZ গেটওয়ের মাধ্যমে bKash, Nagad, Rocket বা কার্ডে পেমেন্ট সম্পন্ন করুন। পেমেন্ট যাচাই হওয়ার সাথে সাথে সিট ও PNR আনলক হবে।",
            "Pay via bKash, Nagad, Rocket, or Card on SSLCOMMERZ. Once verified, Seat Number and PNR unlock immediately while funds stay held in escrow."
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={canceling || redirectingToGateway}
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

          <button
            type="button"
            disabled={redirectingToGateway}
            onClick={handlePayWithSslcommerz}
            className="min-h-[44px] px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {redirectingToGateway ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("SSLCOMMERZ-এ নিয়ে যাওয়া হচ্ছে...", "Redirecting to SSLCOMMERZ...")}</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>
                  {t(
                    `SSLCOMMERZ-এ ৳${totalPayable} পরিশোধ করুন`,
                    `Pay ৳${totalPayable} via SSLCOMMERZ`
                  )}
                </span>
              </>
            )}
          </button>
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