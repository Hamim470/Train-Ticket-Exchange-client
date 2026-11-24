"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Train,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";
import { getPublicTickets } from "@/lib/api/tickets";
import { lockTicketListing } from "@/lib/actions/tickets";

export default function TicketDetailPage({ params }) {
  const { ticketId } = use(params);
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { t } = useLanguage();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTicket() {
      try {
        const res = await getPublicTickets();
        if (cancelled) return;

        if (res.ok && Array.isArray(res.data)) {
          const found = res.data.find((item) => String(item._id) === String(ticketId));
          if (found) {
            setTicket(found);
            setErrorMsg("");
          } else {
            setErrorMsg(
              t(
                "এই টিকিটটি পাওয়া যায়নি অথবা ইতিমধ্যে বুকিং/বিক্রি হয়ে গেছে।",
                "Ticket not found or no longer available."
              )
            );
          }
        } else {
          setErrorMsg(t("টিকিটের তথ্য লোড করা যায়নি।", "Failed to load ticket details."));
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Ticket detail load error:", err);
          setErrorMsg(t("সার্ভার সংযোগে সমস্যা হয়েছে।", "Network error loading ticket."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTicket();
    return () => {
      cancelled = true;
    };
  }, [ticketId, t]);

  const handleProceedToCheckout = async () => {
    setErrorMsg("");

    if (!isPending && !session?.user) {
      router.push("/login");
      return;
    }

    setLocking(true);
    try {
      const res = await lockTicketListing(ticketId);
      if (!res.ok) {
        setErrorMsg(
          res.data?.message ||
            t(
              "টিকিটটি এই মুহূর্তে লক করা যাচ্ছে না।",
              "Unable to acquire checkout lock for this ticket."
            )
        );
        setLocking(false);
        return;
      }

      const targetMs =
        res.data?.lockedUntilMs ||
        (res.data?.lockedUntil ? new Date(res.data.lockedUntil).getTime() : Date.now() + 10 * 60 * 1000);

      router.push(`/checkout/${ticketId}?expiresAt=${targetMs}`);
    } catch (err) {
      console.error("Lock error:", err);
      setErrorMsg(t("লক করতে সমস্যা হয়েছে।", "Failed to lock ticket."));
      setLocking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (errorMsg && !ticket) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-700 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
        <Link
          href="/tickets"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("মার্কেটপ্লেসে ফিরে যান", "Back to Tickets")}</span>
        </Link>
      </div>
    );
  }

  const fare = Number(ticket.fare || 0);
  const platformFee = Number(ticket.platformFee ?? 25);
  const totalPayable = fare + platformFee;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t("সব টিকিট", "Back to Tickets")}</span>
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Train className="w-5 h-5 text-emerald-600" />
              <span>{ticket.trainName}</span>
            </div>
            <p className="text-xs text-slate-500 timer-digits mt-1">
              #{ticket.trainNumber} • {ticket.seatClass || "S_CHAIR"}
            </p>
          </div>

          {ticket.sellerVerified && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>✓ NID Verified Seller</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {ticket.fromStation} → {ticket.toStation}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-700 timer-digits sm:justify-end">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              {ticket.journeyDate}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              {ticket.departureTime}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
          <span className="text-slate-700 font-medium">
            {t("কোচ:", "Coach:")}{" "}
            <strong className="text-slate-900">{ticket.coach || "—"}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-amber-900 timer-digits">
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            Seat: [HIDDEN] • PNR unlocked after escrow payment
          </span>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-slate-100">
          <div>
            <span className="text-xs text-slate-500 block">
              {t("মোট এসক্রো পেমেন্ট", "Total Escrow Amount")}
            </span>
            <span className="text-2xl font-bold text-slate-900 timer-digits">
              ৳{totalPayable}
            </span>
            <span className="text-[11px] text-slate-400 block timer-digits">
              {t(
                `মূল ভাড়া ৳${fare} + এসক্রো ফি ৳${platformFee}`,
                `Fare ৳${fare} + Escrow Fee ৳${platformFee}`
              )}
            </span>
          </div>

          <button
            type="button"
            disabled={locking}
            onClick={handleProceedToCheckout}
            className="min-h-[44px] px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {locking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("১০ মিনিটের জন্য লক হচ্ছে...", "Locking for 10 min...")}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>{t("টিকিট লক করে চেকআউটে যান", "Lock Ticket & Checkout")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}