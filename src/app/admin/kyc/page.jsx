"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  XCircle,
  CheckCircle2,
  ExternalLink,
  IdCard,
  Phone,
  Mail,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";
import { getAdminKycQueue, reviewAdminKyc } from "@/lib/actions/admin-kyc";

export default function AdminKycPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { t } = useLanguage();

  const [queue, setQueue] = useState([]);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [alert, setAlert] = useState(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminKycQueue(filterStatus);
      // Supports both raw array (if server.js returns res.json()) and { ok, data }
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setQueue(list);
    } catch (err) {
      console.error("Failed to load KYC queue:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
      return;
    }
    if (!isPending && session?.user?.role !== "admin") {
      router.push("/forbidden");
      return;
    }
    if (session?.user?.role === "admin") {
      loadQueue();
    }
  }, [isPending, session, router, loadQueue]);

  const handleDecision = async (userId, action) => {
    let rejectionReason = "";
    if (action === "reject") {
      rejectionReason =
        window.prompt(
          t("বাতিল করার কারণ লিখুন (বাধ্যতামূলক):", "Enter rejection reason (required):")
        ) || "";
      if (!rejectionReason.trim()) return;
    }

    setProcessingId(userId);
    setAlert(null);

    try {
      const res = await reviewAdminKyc(userId, { action, rejectionReason });
      const isError = res?.ok === false;
      if (isError) {
        setAlert({
          type: "error",
          text: res?.data?.message || t("আপডেট ব্যর্থ হয়েছে।", "Failed to update KYC status."),
        });
      } else {
        setAlert({
          type: "success",
          text:
            action === "approve"
              ? t("সেলার এনআইডি অনুমোদিত হয়েছে!", "Seller NID approved!")
              : t("আবেদনটি বাতিল করা হয়েছে।", "KYC submission rejected."),
        });
        await loadQueue();
      }
    } catch (err) {
      setAlert({
        type: "error",
        text: t("সার্ভার ত্রুটি হয়েছে।", "Server error while reviewing KYC."),
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (isPending || loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            {t("অ্যাডমিন KYC যাচাই কিউ", "Admin Seller KYC Queue")}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {t(
              "বিক্রেতাদের এনআইডি এবং সেলফি যাচাই করে অনুমোদন দিন",
              "Review seller NID numbers, NID front photos, and selfies before granting listing access"
            )}
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 self-start">
          {["pending", "verified", "rejected", "all"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition min-h-[36px] cursor-pointer ${
                filterStatus === status
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Motion Alert Banner */}
      <AnimatePresence mode="wait">
        {alert && (
          <motion.div
            key={alert.text}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-3.5 rounded-xl border text-sm flex items-center gap-2.5 ${
              alert.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            {alert.type === "error" ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{alert.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue List */}
      {queue.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
          {t(
            "এই ক্যাটাগরিতে কোনো KYC আবেদন পাওয়া যায়নি।",
            `No ${filterStatus} KYC submissions found.`
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {queue.map((item) => {
            const nid = item.nidData || {};
            const isBusy = processingId === item._id;

            return (
              <div
                key={item._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900">{item.name}</h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                      {item.kycStatus}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5 timer-digits">
                      <IdCard className="w-4 h-4 text-emerald-600" />
                      <strong>NID:</strong> {nid.nidNumber || "N/A"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 timer-digits">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {item.phone || "N/A"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {item.email}
                    </span>
                  </div>

                  {nid.rejectionReason && (
                    <p className="text-xs text-red-600">
                      <strong>{t("বাতিলের কারণ:", "Rejection Reason:")}</strong>{" "}
                      {nid.rejectionReason}
                    </p>
                  )}

                  {/* Document Links */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {nid.nidPhotoUrl && (
                      <a
                        href={nid.nidPhotoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                        {t("এনআইডি ছবি দেখুন", "View NID Photo")}
                      </a>
                    )}
                    {nid.selfieUrl && (
                      <a
                        href={nid.selfieUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                        {t("সেলফি দেখুন", "View Selfie")}
                      </a>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    disabled={isBusy || item.kycStatus === "verified"}
                    onClick={() => handleDecision(item._id, "approve")}
                    className="px-4 h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {isBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {t("অনুমোদন দিন", "Approve KYC")}
                  </button>

                  <button
                    type="button"
                    disabled={isBusy || item.kycStatus === "rejected"}
                    onClick={() => handleDecision(item._id, "reject")}
                    className="px-4 h-11 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-700 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    {t("বাতিল করুন", "Reject")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}