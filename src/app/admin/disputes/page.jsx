"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ShieldAlert,
    RotateCcw,
    CheckCircle2,
    Loader2,
    AlertCircle,
    ExternalLink,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";
import {
    resolveBookingDispute
} from "@/lib/actions/disputes";
import { getAdminDisputes } from "@/lib/api/disputes";

export default function AdminDisputesPage() {
    const router = useRouter();
    const { data: session, isPending } = useSession();
    const { t } = useLanguage();

    const [disputes, setDisputes] = useState([]);
    const [filterStatus, setFilterStatus] = useState("open");
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [notesByDispute, setNotesByDispute] = useState({});
    const [resolvingId, setResolvingId] = useState("");

    const loadDisputes = useCallback(
        async (statusToLoad = filterStatus) => {
            setLoading(true);
            try {
                const res = await getAdminDisputes(statusToLoad);
                if (res.ok && Array.isArray(res.data)) {
                    setDisputes(res.data);
                    setErrorMsg("");
                } else {
                    setErrorMsg(
                        res.data?.message ||
                        t("ডিসপিউট তালিকা লোড করা যায়নি।", "Failed to load disputes.")
                    );
                }
            } catch (err) {
                console.error("Load disputes error:", err);
                setErrorMsg(t("সার্ভার সংযোগে সমস্যা হয়েছে।", "Network error loading disputes."));
            } finally {
                setLoading(false);
            }
        },
        [filterStatus, t]
    );

    useEffect(() => {
        if (isPending) return;
        if (!session?.user) {
            router.push("/login");
            return;
        }
        loadDisputes(filterStatus);
    }, [isPending, session, filterStatus, router, loadDisputes]);

    const handleResolve = async (disputeId, resolution) => {
        if (!disputeId || resolvingId) return;
        setResolvingId(disputeId);
        setErrorMsg("");
        setSuccessMsg("");

        const action = resolution === "refund_buyer" ? "refund" : "release";

        try {
            const res = await resolveBookingDispute(disputeId, {
                action,
                resolution,
                adminNote: (notesByDispute[disputeId] || "").trim(),
            });

            if (!res.ok) {
                setErrorMsg(
                    res.data?.message ||
                    t("ডিসপিউট নিষ্পত্তি করতে সমস্যা হয়েছে।", "Failed to resolve dispute.")
                );
                setResolvingId("");
                return;
            }

            setSuccessMsg(
                res.data?.message ||
                t(
                    "ডিসপিউট সফলভাবে নিষ্পত্তি হয়েছে।",
                    "Dispute resolved and logged to audit trail."
                )
            );
            await loadDisputes(filterStatus);
        } catch (err) {
            console.error("Resolve dispute error:", err);
            setErrorMsg(
                t("সার্ভার সংযোগে সমস্যা হয়েছে।", "Network error resolving dispute.")
            );
        } finally {
            setResolvingId("");
        }
    };

    if (isPending || loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-14 flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-red-600" />
                        <span>{t("অ্যাডমিন এসক্রো ডিসপিউট প্যানেল", "Admin Escrow Disputes")}</span>
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                        {t(
                            "ফ্রিজ হওয়া এসক্রো বুকিং যাচাই করে ক্রেতাকে রিফান্ড দিন অথবা বিক্রেতাকে পেমেন্ট রিলিজ করুন।",
                            "Review frozen escrow bookings, refund buyers on verified fraud, or release payouts to sellers."
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {["open", "resolved", "all"].map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setFilterStatus(tab)}
                            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase border cursor-pointer ${filterStatus === tab
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {successMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}

            {errorMsg && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {disputes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
                    {t("এই ফিল্টারে কোনো ডিসপিউট নেই।", "No disputes found for this filter.")}
                </div>
            ) : (
                <div className="space-y-4">
                    {disputes.map((item) => {
                        const isOpen = item.status === "open";
                        const isBusy = resolvingId === item._id;

                        return (
                            <div
                                key={item._id}
                                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-bold text-slate-900">
                                                {item.trainName || "Train Booking"}
                                            </span>
                                            <span className="text-xs text-slate-500 timer-digits">
                                                PNR: {item.pnr || "—"} • Coach/Seat: {item.coach || "—"}/
                                                {item.seatNumber || "—"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1 timer-digits">
                                            {item.fromStation} → {item.toStation} • Date: {item.journeyDate} •{" "}
                                            <strong>Frozen Amount: ৳{item.amount}</strong>
                                        </p>
                                    </div>

                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isOpen
                                            ? "bg-red-50 text-red-700 border border-red-200"
                                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            }`}
                                    >
                                        {item.status} {item.resolution ? `(${item.resolution})` : ""}
                                    </span>
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                                    <p className="font-bold text-slate-900">
                                        Reason: {item.reason}
                                    </p>
                                    <p className="text-slate-700 leading-relaxed">{item.description}</p>
                                    {item.ticketFileUrl && (
                                        <a
                                            href={item.ticketFileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-emerald-700 font-semibold pt-1 hover:underline"
                                        >
                                            <span>Inspect Uploaded Ticket File</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                </div>

                                {isOpen ? (
                                    <div className="space-y-3 pt-1">
                                        <input
                                            type="text"
                                            value={notesByDispute[item._id] || ""}
                                            onChange={(e) =>
                                                setNotesByDispute((prev) => ({
                                                    ...prev,
                                                    [item._id]: e.target.value,
                                                }))
                                            }
                                            placeholder={t(
                                                "অ্যাডমিন নোট (অডিট লগে সংরক্ষিত হবে)...",
                                                "Optional admin decision note (saved in audit_logs)..."
                                            )}
                                            className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                                        />

                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => handleResolve(item._id, "refund_buyer")}
                                                className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                {isBusy ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <RotateCcw className="w-4 h-4" />
                                                )}
                                                <span>Refund Buyer (৳{item.amount})</span>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => handleResolve(item._id, "release_seller")}
                                                className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                {isBusy ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                )}
                                                <span>Release Payout to Seller (৳{item.fare ?? item.amount})</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    item.adminNote && (
                                        <p className="text-xs text-slate-500">
                                            <strong>Admin Note:</strong> {item.adminNote}
                                        </p>
                                    )
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}