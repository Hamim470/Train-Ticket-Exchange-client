"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
    Ticket,
    CheckCircle2,
    XCircle,
    Eye,
    ShieldAlert,
    Loader2,
    Calendar,
    Clock,
    MapPin,
    Train,
    ExternalLink,
    X,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";
import { getUserData } from "@/lib/api/me";
import { getAdminTickets } from "@/lib/api/tickets";
import { reviewTicketListing } from "@/lib/actions/tickets";

const STATUS_TABS = [
    { key: "pending_approval", bn: "অপেক্ষমাণ (Pending)", en: "Pending Approval" },
    { key: "available", bn: "অনুমোদিত (Live)", en: "Approved (Live)" },
    { key: "rejected", bn: "বাতিলকৃত (Rejected)", en: "Rejected" },
    { key: "all", bn: "সব টিকিট", en: "All Tickets" },
];

export default function AdminTicketsPage() {
    const router = useRouter();
    const { data: session, isPending } = useSession();
    const { t } = useLanguage();

    const [profile, setProfile] = useState(null);
    const [checkingRole, setCheckingRole] = useState(true);
    const [activeTab, setActiveTab] = useState("pending_approval");
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);

    const [selectedTicket, setSelectedTicket] = useState(null);
    const [rejectModalTicket, setRejectModalTicket] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [banner, setBanner] = useState(null);

    useEffect(() => {
        if (isPending) return;

        if (!session?.user) {
            router.push("/login");
            return;
        }

        let cancelled = false;

        async function loadProfile() {
            try {
                const res = await getUserData();
                if (!cancelled && res.ok) {
                    setProfile(res.data);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error("Failed to fetch profile:", err);
                }
            } finally {
                if (!cancelled) {
                    setCheckingRole(false);
                }
            }
        }

        loadProfile();

        return () => {
            cancelled = true;
        };
    }, [isPending, session, router]);

    const role = profile?.role || session?.user?.role;
    const isAdmin = role === "admin";

    useEffect(() => {
        if (checkingRole || !isAdmin) return;

        let cancelled = false;

        async function fetchQueue() {
            try {
                const res = await getAdminTickets(activeTab);
                if (cancelled) return;

                if (res.ok && Array.isArray(res.data)) {
                    setTickets(res.data);
                } else {
                    setTickets([]);
                }
            } catch (err) {
                if (cancelled) return;
                console.error("Load tickets error:", err);
                setBanner({
                    type: "error",
                    text: t("টিকিট কিউ লোড করতে সমস্যা হয়েছে।", "Failed to load ticket approval queue."),
                });
            } finally {
                if (!cancelled) {
                    setLoadingTickets(false);
                }
            }
        }

        fetchQueue();

        return () => {
            cancelled = true;
        };
    }, [checkingRole, isAdmin, activeTab, t]);

    const refreshTickets = useCallback(async (statusKey) => {
        try {
            const res = await getAdminTickets(statusKey);
            if (res.ok && Array.isArray(res.data)) {
                setTickets(res.data);
            } else {
                setTickets([]);
            }
        } catch (err) {
            console.error("Refresh tickets error:", err);
        } finally {
            setLoadingTickets(false);
        }
    }, []);

    const handleTabChange = (tabKey) => {
        setLoadingTickets(true);
        setActiveTab(tabKey);
    };

    const handleReview = async (ticketId, action, reason = "") => {
        setBanner(null);
        setActionLoadingId(ticketId);

        try {
            const res = await reviewTicketListing(ticketId, {
                action,
                rejectionReason: reason,
            });

            if (!res.ok) {
                setBanner({
                    type: "error",
                    text:
                        res.data?.message ||
                        t("রিভিউ আপডেট করতে ব্যর্থ হয়েছে।", "Failed to update ticket review."),
                });
                setActionLoadingId(null);
                return;
            }

            setBanner({
                type: "success",
                text:
                    action === "approve"
                        ? t(
                            "টিকিট অনুমোদিত হয়েছে এবং মার্কেটপ্লেসে লাইভ করা হয়েছে।",
                            "Ticket approved and published to the marketplace."
                        )
                        : t("টিকিটটি বাতিল করা হয়েছে।", "Ticket listing rejected."),
            });

            setRejectModalTicket(null);
            setRejectionReason("");
            if (selectedTicket?._id === ticketId) {
                setSelectedTicket(null);
            }

            await refreshTickets(activeTab);
        } catch (err) {
            console.error("Review action error:", err);
            setBanner({
                type: "error",
                text: t("সার্ভার ত্রুটি হয়েছে।", "Server error while updating ticket."),
            });
        } finally {
            setActionLoadingId(null);
        }
    };

    if (isPending || checkingRole) {
        return (
            <div className="max-w-6xl mx-auto px-4 py-14 flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-3">
                    <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <h1 className="text-lg font-bold text-red-900">
                            {t("অ্যাডমিন অ্যাক্সেস প্রয়োজন", "Admin Access Required")}
                        </h1>
                        <p className="text-sm text-red-800 mt-1">
                            {t(
                                "শুধুমাত্র অ্যাডমিনরা টিকিট অনুমোদন কিউ পরিচালনা করতে পারেন।",
                                "Only administrators can review and approve submitted train tickets."
                            )}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                        <Ticket className="w-6 h-6 text-emerald-600" />
                        <span>{t("অ্যাডমিন টিকিট অনুমোদন কিউ", "Admin Ticket Approval Queue")}</span>
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                        {t(
                            "ই-টিকিটের ছবি, PNR ও যাত্রার তথ্য যাচাই করে মার্কেটপ্লেসে লাইভ করুন।",
                            "Inspect uploaded ticket files, PNR, coach/seat, and fare before publishing live."
                        )}
                    </p>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map((tab) => {
                    const active = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => handleTabChange(tab.key)}
                            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${active
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                                }`}
                        >
                            {t(tab.bn, tab.en)}
                        </button>
                    );
                })}
            </div>

            {/* Feedback Banner */}
            <AnimatePresence mode="wait">
                {banner && (
                    <motion.div
                        key={banner.text}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className={`p-3.5 rounded-xl border text-sm flex items-center justify-between gap-3 ${banner.type === "error"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-emerald-50 border-emerald-200 text-emerald-800"
                            }`}
                    >
                        <span>{banner.text}</span>
                        <button
                            type="button"
                            onClick={() => setBanner(null)}
                            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Listings Queue */}
            {loadingTickets ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
                </div>
            ) : tickets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
                    <p className="text-base font-semibold text-slate-800">
                        {t("এই স্ট্যাটাসে কোনো টিকিট নেই", "No tickets found in this queue")}
                    </p>
                    <p className="text-sm text-slate-500">
                        {t(
                            "নতুন টিকিট জমা হলে এখানে দেখা যাবে।",
                            "Newly submitted seller tickets will appear here for verification."
                        )}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tickets.map((item) => {
                        const busy = actionLoadingId === item._id;

                        return (
                            <div
                                key={item._id}
                                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-4"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                                                <Train className="w-4 h-4 text-emerald-600 shrink-0" />
                                                <span>
                                                    {item.trainName}{" "}
                                                    <span className="text-slate-500 font-normal timer-digits">
                                                        ({item.trainNumber})
                                                    </span>
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {t("বিক্রেতা:", "Seller:")}{" "}
                                                <span className="font-semibold text-slate-700">
                                                    {item.sellerName || item.sellerId}
                                                </span>
                                            </p>
                                        </div>

                                        <span
                                            className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${item.status === "available"
                                                ? "bg-emerald-100 text-emerald-800"
                                                : item.status === "rejected"
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-amber-100 text-amber-800"
                                                }`}
                                        >
                                            {item.status}
                                        </span>
                                    </div>

                                    {/* Route & Schedule */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            <span className="truncate font-medium">
                                                {item.fromStation} → {item.toStation}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 timer-digits">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>{item.journeyDate}</span>
                                            <Clock className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
                                            <span>{item.departureTime}</span>
                                        </div>
                                    </div>

                                    {/* Ticket Verification Details */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                        <div className="p-2.5 rounded-lg border border-slate-200">
                                            <span className="text-slate-400 block">{t("কোচ/সিট", "Coach / Seat")}</span>
                                            <span className="font-bold text-slate-900 timer-digits">
                                                {item.coach} / {item.seatNumber}
                                            </span>
                                        </div>
                                        <div className="p-2.5 rounded-lg border border-slate-200">
                                            <span className="text-slate-400 block">PNR</span>
                                            <span className="font-bold text-slate-900 timer-digits">
                                                {item.pnr}
                                            </span>
                                        </div>
                                        <div className="p-2.5 rounded-lg border border-slate-200">
                                            <span className="text-slate-400 block">{t("শ্রেণি", "Class")}</span>
                                            <span className="font-bold text-slate-900">
                                                {item.seatClass}
                                            </span>
                                        </div>
                                        <div className="p-2.5 rounded-lg border border-slate-200">
                                            <span className="text-slate-400 block">{t("ভাড়া", "Fare")}</span>
                                            <span className="font-bold text-emerald-700 timer-digits">
                                                ৳{item.fare}
                                            </span>
                                        </div>
                                    </div>

                                    {item.rejectionReason && (
                                        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                            {t("বাতিলের কারণ:", "Rejection Reason:")} {item.rejectionReason}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTicket(item)}
                                        className="min-h-[44px] px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Eye className="w-4 h-4" />
                                        <span>{t("টিকিট ফাইল দেখুন", "Inspect File")}</span>
                                    </button>

                                    {item.status === "pending_approval" && (
                                        <>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => handleReview(item._id, "approve")}
                                                className="min-h-[44px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                                            >
                                                {busy ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                )}
                                                <span>{t("অনুমোদন দিন", "Approve")}</span>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => {
                                                    setRejectModalTicket(item);
                                                    setRejectionReason("");
                                                }}
                                                className="min-h-[44px] px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                <span>{t("বাতিল করুন", "Reject")}</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Inspect Ticket File Modal */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    {selectedTicket.trainName} ({selectedTicket.trainNumber})
                                </h2>
                                <p className="text-xs text-slate-500 timer-digits">
                                    PNR: {selectedTicket.pnr} • {selectedTicket.coach}/{selectedTicket.seatNumber} • ৳
                                    {selectedTicket.fare}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedTicket(null)}
                                className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex items-center justify-center min-h-64">
                            {selectedTicket.ticketFileUrl ? (
                                <Image
                                    src={selectedTicket.ticketFileUrl}
                                    alt="Uploaded E-Ticket"
                                    width={720}
                                    height={420}
                                    unoptimized
                                    className="max-h-96 w-auto object-contain rounded-lg"
                                />
                            ) : (
                                <p className="text-sm text-slate-500">
                                    {t("কোনো ফাইল সংযুক্ত নেই", "No ticket file URL attached")}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            {selectedTicket.ticketFileUrl && (
                                <a
                                    href={selectedTicket.ticketFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                                >
                                    <span>{t("নতুন ট্যাবে মূল ফাইল খুলুন", "Open Original File")}</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}

                            <button
                                type="button"
                                onClick={() => setSelectedTicket(null)}
                                className="min-h-[44px] px-5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                            >
                                {t("বন্ধ করুন", "Close")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Reason Modal */}
            {rejectModalTicket && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl">
                        <h2 className="text-lg font-bold text-slate-900">
                            {t("টিকিট বাতিলের কারণ লিখুন", "Reject Ticket Listing")}
                        </h2>
                        <p className="text-xs text-slate-600">
                            {t(
                                "বিক্রেতাকে এই কারণটি ইমেইলে জানানো হবে।",
                                "This reason will be recorded in audit logs and emailed to the seller."
                            )}
                        </p>

                        <textarea
                            rows={3}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder={t(
                                "যেমন: PNR নম্বর বা টিকিটের স্ক্রিনশট অস্পষ্ট।",
                                "e.g., Ticket screenshot is blurry or PNR does not match."
                            )}
                            className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setRejectModalTicket(null);
                                    setRejectionReason("");
                                }}
                                className="min-h-[44px] px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                            >
                                {t("বাতিল", "Cancel")}
                            </button>

                            <button
                                type="button"
                                disabled={!rejectionReason.trim() || actionLoadingId === rejectModalTicket._id}
                                onClick={() =>
                                    handleReview(rejectModalTicket._id, "reject", rejectionReason)
                                }
                                className="min-h-[44px] px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                                {actionLoadingId === rejectModalTicket._id && (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                )}
                                <span>{t("নিশ্চিতভাবে বাতিল করুন", "Confirm Reject")}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}