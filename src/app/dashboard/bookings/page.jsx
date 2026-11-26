"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Train,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Phone,
  Download,
  Copy,
  Check,
  Loader2,
  Ticket,
  UserCheck,
  AlertCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";
import {
  confirmJourneyReleaseEscrow,
} from "@/lib/actions/bookings";
import { reportBookingDispute } from "@/lib/actions/disputes";
import { getMyBookings } from "@/lib/api/bookings";

const FRAUD_REASONS = [
  { value: "fake_or_invalid_pnr", label: "Fake or Invalid PNR / Ticket" },
  { value: "duplicate_or_cancelled_seat", label: "Seat Already Occupied or Cancelled" },
  { value: "seller_unresponsive_fraud", label: "Seller Misrepresented Ticket / Fraud" },
  { value: "other_journey_issue", label: "Other Boarding or Ticket Issue" },
];

function getEscrowBadge(status, t) {
  switch (status) {
    case "released":
      return {
        label: t("এসক্রো রিলিজড", "Escrow Released"),
        classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: ShieldCheck,
      };
    case "refunded":
      return {
        label: t("ক্রেতাকে রিফান্ড করা হয়েছে", "Refunded to Buyer"),
        classes: "bg-sky-50 text-sky-800 border-sky-200",
        icon: ShieldCheck,
      };
    case "frozen":
      return {
        label: t("ডিসপিউটে ফ্রিজড", "Escrow Frozen (Dispute)"),
        classes: "bg-red-50 text-red-700 border-red-200",
        icon: ShieldAlert,
      };
    default:
      return {
        label: t("এসক্রোতে সুরক্ষিত (Held)", "Protected in Escrow (Held)"),
        classes: "bg-amber-50 text-amber-800 border-amber-200",
        icon: Lock,
      };
  }
}

export default function BuyerBookingsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { t } = useLanguage();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusBanner, setStatusBanner] = useState("");
  const [copiedPnr, setCopiedPnr] = useState("");

  // Release Escrow Modal State
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [releasingId, setReleasingId] = useState("");

  // Report Fraud Modal State
  const [fraudTarget, setFraudTarget] = useState(null);
  const [fraudReason, setFraudReason] = useState(FRAUD_REASONS[0].value);
  const [fraudDetails, setFraudDetails] = useState("");
  const [fraudError, setFraudError] = useState("");
  const [submittingFraud, setSubmittingFraud] = useState(false);

  const loadBookings = useCallback(async () => {
    try {
      const res = await getMyBookings();
      if (res.ok && Array.isArray(res.data)) {
        setBookings(res.data);
        setErrorMsg("");
      } else {
        setErrorMsg(
          res.data?.message ||
            t("আপনার বুকিং লোড করা যায়নি।", "Failed to load your bookings.")
        );
      }
    } catch (err) {
      console.error("Load bookings error:", err);
      setErrorMsg(t("সার্ভার সংযোগে সমস্যা হয়েছে।", "Network error loading bookings."));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.push("/login");
      return;
    }
    loadBookings();
  }, [isPending, session, router, loadBookings]);

  const handleCopyPnr = async (pnr) => {
    if (!pnr) return;
    try {
      await navigator.clipboard.writeText(pnr);
      setCopiedPnr(pnr);
      setTimeout(() => setCopiedPnr(""), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const handleConfirmRelease = async () => {
    if (!releaseTarget?._id || releasingId) return;

    const bookingId = releaseTarget._id;
    setReleasingId(bookingId);
    setErrorMsg("");
    setStatusBanner("");

    try {
      const res = await confirmJourneyReleaseEscrow(bookingId);
      if (!res.ok) {
        setErrorMsg(
          res.data?.message ||
            t("এসক্রো রিলিজ করতে সমস্যা হয়েছে।", "Failed to release escrow payment.")
        );
        setReleaseTarget(null);
        setReleasingId("");
        return;
      }

      setBookings((prev) =>
        prev.map((item) =>
          String(item._id) === String(bookingId)
            ? {
                ...item,
                escrowStatus: "released",
                releasedAt: new Date().toISOString(),
              }
            : item
        )
      );

      setStatusBanner(
        res.data?.message ||
          t(
            "ভ্রমণ নিশ্চিত করা হয়েছে এবং বিক্রেতার ওয়ালেটে অর্থ রিলিজ করা হয়েছে।",
            "Journey confirmed and escrow payment released to the seller."
          )
      );
      setReleaseTarget(null);
    } catch (err) {
      console.error("Release escrow error:", err);
      setErrorMsg(t("সার্ভার সংযোগে সমস্যা হয়েছে।", "Network error releasing escrow."));
    } finally {
      setReleasingId("");
    }
  };

  const openFraudModal = (booking) => {
    setFraudTarget(booking);
    setFraudReason(FRAUD_REASONS[0].value);
    setFraudDetails("");
    setFraudError("");
  };

  const handleSubmitFraudReport = async (e) => {
    e.preventDefault();
    if (!fraudTarget?._id || submittingFraud) return;

    if (fraudDetails.trim().length < 10) {
      setFraudError(
        t(
          "অনুগ্রহ করে সমস্যার বিস্তারিত অন্তত ১০ অক্ষরে লিখুন।",
          "Please describe the issue in at least 10 characters."
        )
      );
      return;
    }

    setSubmittingFraud(true);
    setFraudError("");
    setErrorMsg("");
    setStatusBanner("");

    try {
      const res = await reportBookingDispute(fraudTarget._id, {
        reason: fraudReason,
        description: fraudDetails.trim(),
      });

      if (!res.ok) {
        setFraudError(
          res.data?.message ||
            t("ডিসপিউট রিপোর্ট জমা দেওয়া যায়নি।", "Failed to submit fraud dispute.")
        );
        setSubmittingFraud(false);
        return;
      }

      setBookings((prev) =>
        prev.map((item) =>
          String(item._id) === String(fraudTarget._id)
            ? {
                ...item,
                escrowStatus: "frozen",
              }
            : item
        )
      );

      setStatusBanner(
        res.data?.message ||
          t(
            "ডিসপিউট রিপোর্ট জমা হয়েছে এবং এসক্রো অর্থ ফ্রিজ করা হয়েছে।",
            "Dispute filed and escrow funds frozen for admin review."
          )
      );
      setFraudTarget(null);
    } catch (err) {
      console.error("Submit dispute error:", err);
      setFraudError(t("সার্ভার সংযোগে সমস্যা হয়েছে।", "Network error reporting dispute."));
    } finally {
      setSubmittingFraud(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-14 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  const modalPayoutAmount = releaseTarget
    ? Number(releaseTarget.fare ?? releaseTarget.amount ?? 0)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("আমার বুকিং ও আনলককৃত টিকিট", "My Bookings & Unlocked Tickets")}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {t(
              "এসক্রো পেমেন্ট সম্পন্ন হওয়ায় আপনার সিট নম্বর, PNR, ই-টিকিট PDF এবং বিক্রেতার ফোন নম্বর আনলক করা হয়েছে।",
              "Your seat numbers, PNR codes, e-ticket PDFs, and verified seller contact details are unlocked here."
            )}
          </p>
        </div>

        <Link
          href="/tickets"
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shrink-0"
        >
          <Ticket className="w-4 h-4" />
          <span>{t("আরও টিকিট খুঁজুন", "Browse Tickets")}</span>
        </Link>
      </div>

      {/* Escrow Protection Status Overview Card */}
      <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-emerald-950">
            {t(
              "এসক্রো ক্রেতা সুরক্ষা সক্রিয় (Escrow Buyer Protection)",
              "Escrow Buyer Protection Active"
            )}
          </h2>
          <p className="text-xs text-emerald-900 leading-relaxed">
            {t(
              "আপনার পরিশোধিত টাকা নিরাপদে প্ল্যাটফর্মের এসক্রোতে জমা আছে। নিরাপদে ট্রেনে ওঠার পর পেমেন্ট রিলিজ করুন; কোনো জালিয়াতি বা টিকিট সমস্যায় পড়লে রিপোর্ট করলে টাকা ফ্রিজ থাকবে।",
              "Your payment stays safely held in platform escrow until you confirm your journey. Once you board safely, release funds to credit the seller—or report fraud to freeze escrow for admin review."
            )}
          </p>
        </div>
      </div>

      {statusBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-800 flex items-center gap-2.5">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusBanner}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <p className="text-base font-bold text-slate-900">
            {t("এখনো কোনো বুকিং নেই", "No bookings yet")}
          </p>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {t(
              "মার্কেটপ্লেস থেকে পছন্দের ট্রেনের টিকিট লক করে এসক্রো পেমেন্ট করলে এখানে আনলককৃত টিকিট দেখা যাবে।",
              "Lock an available ticket from the marketplace and complete escrow checkout to unlock your PNR and e-ticket here."
            )}
          </p>
          <Link
            href="/tickets"
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <span>{t("টিকিট দেখুন", "Explore Tickets")}</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {bookings.map((booking) => {
            const badge = getEscrowBadge(booking.escrowStatus, t);
            const BadgeIcon = badge.icon;
            const isHeld = booking.escrowStatus === "held";

            return (
              <div
                key={booking._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5"
              >
                {/* Top Header: Train + Escrow Status */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                      <Train className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>{booking.trainName}</span>
                      <span className="text-xs font-medium text-slate-500 timer-digits">
                        (#{booking.trainNumber} • {booking.seatClass})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5 timer-digits">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        {booking.fromStation} → {booking.toStation}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {booking.journeyDate}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {booking.departureTime}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${badge.classes}`}
                  >
                    <BadgeIcon className="w-3.5 h-3.5" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Unmasked Ticket Handover Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                    <span className="text-emerald-800 font-medium flex items-center gap-1">
                      <Unlock className="w-3.5 h-3.5" />
                      {t("আনলককৃত কোচ ও সিট", "Unlocked Coach & Seat")}
                    </span>
                    <p className="text-base font-extrabold text-slate-900 timer-digits mt-1">
                      {booking.coach || "—"} / {booking.seatNumber || "—"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-slate-500 block">PNR Code</span>
                      <p className="text-base font-extrabold text-emerald-700 timer-digits mt-1">
                        {booking.pnr || "—"}
                      </p>
                    </div>
                    {booking.pnr && (
                      <button
                        type="button"
                        onClick={() => handleCopyPnr(booking.pnr)}
                        title="Copy PNR"
                        className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer"
                      >
                        {copiedPnr === booking.pnr ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {t("বিক্রেতার যোগাযোগ", "Seller Contact")}
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                      {booking.sellerName || "Verified Seller"}
                    </p>
                    {booking.sellerPhone ? (
                      <a
                        href={`tel:${booking.sellerPhone}`}
                        className="inline-flex items-center gap-1 text-emerald-700 font-semibold timer-digits mt-0.5 hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{booking.sellerPhone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 block mt-0.5">
                        {t("ফোন নম্বর যুক্ত নেই", "No phone listed")}
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">
                      {t("পরিশোধিত এসক্রো অর্থ", "Escrow Amount")}
                    </span>
                    <p className="text-base font-extrabold text-slate-900 timer-digits mt-1">
                      ৳{booking.amount}
                    </p>
                    <span className="text-[11px] text-slate-400 timer-digits block truncate">
                      TranID: {booking.tranId || "—"}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {booking.escrowStatus === "released"
                      ? t(
                          "এসক্রো পেমেন্ট সফলভাবে বিক্রেতার ওয়ালেটে রিলিজ করা হয়েছে।",
                          "Escrow payout has been released to the seller's wallet."
                        )
                      : booking.escrowStatus === "frozen"
                        ? t(
                            "ডিসপিউট তদন্তাধীন: অ্যাডমিন সিদ্ধান্ত না দেওয়া পর্যন্ত অর্থ ফ্রিজড আছে।",
                            "Dispute under review: escrow funds remain frozen until admin resolution."
                          )
                        : t(
                            "ভ্রমণ নিশ্চিত হলে পেমেন্ট রিলিজ করুন অথবা সমস্যা থাকলে ফ্রড রিপোর্ট করুন।",
                            "Confirm safe travel to release funds, or report fraud to freeze escrow."
                          )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {booking.ticketFileUrl && (
                      <a
                        href={booking.ticketFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-2 transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>{t("টিকিট PDF ডাউনলোড", "Download Ticket PDF")}</span>
                      </a>
                    )}

                    {isHeld && (
                      <>
                        <button
                          type="button"
                          onClick={() => openFraudModal(booking)}
                          className="min-h-[44px] px-4 py-2.5 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <span>! Report Fraud</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setReleaseTarget(booking)}
                          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <span>✓ Yes, Reached Safely (Release Money)</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Release Escrow Confirmation Modal */}
      {releaseTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {t("এসক্রো অর্থ রিলিজ নিশ্চিত করুন", "Confirm Escrow Payout Release")}
                  </h3>
                  <p className="text-xs text-slate-500 timer-digits">
                    {releaseTarget.trainName} • PNR: {releaseTarget.pnr || "—"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={Boolean(releasingId)}
                onClick={() => setReleaseTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
              <p className="font-bold">
                {t(
                  `আপনি কি নিশ্চিত যে আপনি নিরাপদে ভ্রমণ সম্পন্ন করেছেন এবং ৳${modalPayoutAmount} বিক্রেতার ওয়ালেটে পাঠাতে চান?`,
                  `Are you sure you reached safely and want to release ৳${modalPayoutAmount} to the seller's wallet?`
                )}
              </p>
              <p className="text-amber-800">
                {t(
                  "এসক্রো রিলিজ হয়ে গেলে এই লেনদেনটি আর ফিরিয়ে নেওয়া যাবে না।",
                  "Once released, escrow funds are credited to the seller and cannot be reversed automatically."
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                disabled={Boolean(releasingId)}
                onClick={() => setReleaseTarget(null)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                {t("এখনো নয়", "Not Yet")}
              </button>

              <button
                type="button"
                disabled={Boolean(releasingId)}
                onClick={handleConfirmRelease}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {releasingId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("রিলিজ হচ্ছে...", "Releasing...")}</span>
                  </>
                ) : (
                  <span>✓ Yes, Reached Safely (Release Money)</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ! Report Fraud Modal */}
      {fraudTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {t("ফ্রড বা টিকিট সমস্যা রিপোর্ট করুন", "Report Ticket Fraud or Issue")}
                  </h3>
                  <p className="text-xs text-slate-500 timer-digits">
                    PNR: {fraudTarget.pnr || "—"} • ৳{fraudTarget.amount}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={submittingFraud}
                onClick={() => setFraudTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitFraudReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t("সমস্যার কারণ", "Issue Category")}
                </label>
                <select
                  value={fraudReason}
                  onChange={(e) => setFraudReason(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-emerald-600"
                >
                  {FRAUD_REASONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t("বিস্তারিত বিবরণ", "Evidence & Details")}
                </label>
                <textarea
                  rows={4}
                  value={fraudDetails}
                  onChange={(e) => setFraudDetails(e.target.value)}
                  placeholder={t(
                    "TTE বা স্টেশন কাউন্টারে কী সমস্যা হয়েছে তা বিস্তারিত লিখুন...",
                    "Describe what happened (e.g., invalid PNR on Bangladesh Railway portal, duplicate seat, etc.)..."
                  )}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {fraudError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {fraudError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  disabled={submittingFraud}
                  onClick={() => setFraudTarget(null)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  {t("বাতিল", "Cancel")}
                </button>

                <button
                  type="submit"
                  disabled={submittingFraud}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingFraud ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t("ফ্রিজ হচ্ছে...", "Freezing Escrow...")}</span>
                    </>
                  ) : (
                    <span>{t("এসক্রো ফ্রিজ করুন ও রিপোর্ট পাঠান", "Freeze Escrow & Submit")}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}