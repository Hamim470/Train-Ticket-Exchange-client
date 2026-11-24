"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
    Train,
    MapPin,
    Calendar,
    Clock,
    Ticket,
    Lock,
    ShieldAlert,
    ShieldCheck,
    Upload,
    AlertCircle,
    CheckCircle2,
    Loader2,
    ArrowRight,
    Banknote,
    FileCheck2,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";
import { getUserData } from "@/lib/api/me";
import { createTicketListing } from "@/lib/actions/tickets";
import SearchableSelect from "@/components/SearchableSelect";
import { useBdtMinDate } from "@/lib/hooks/bdtDate";

const BD_STATIONS = [
    "Dhaka (Kamalapur)",
    "Dhaka Airport (Biman Bandar)",
    "Chattogram",
    "Cox's Bazar",
    "Sylhet",
    "Rajshahi",
    "Khulna",
    "Rangpur",
    "Dinajpur",
    "Mymensingh",
    "Cumilla",
    "Feni",
    "Brahmanbaria",
    "Srimangal",
    "Kulaura",
    "Ishwardi",
    "Bogura",
    "Santahar",
    "Jashore",
    "Kushtia Court",
    "Noakhali",
    "Chandpur",
    "Kishoreganj",
    "Bhairab Bazar",
    "Tangail",
    "Sirajganj Bazar",
    "Panchagarh",
    "Lalmonirhat",
];

const POPULAR_TRAINS = [
    { value: "Suborno Express", label: "Suborno Express (702 / 701)", number: "702" },
    { value: "Sonar Bangla Express", label: "Sonar Bangla Express (788 / 787)", number: "788" },
    { value: "Turna Express", label: "Turna Express (742 / 741)", number: "742" },
    { value: "Mohanagar Provati", label: "Mohanagar Provati (704 / 703)", number: "704" },
    { value: "Mohanagar Godhuli", label: "Mohanagar Godhuli (703 / 704)", number: "703" },
    { value: "Cox's Bazar Express", label: "Cox's Bazar Express (814 / 813)", number: "814" },
    { value: "Parjotak Express", label: "Parjotak Express (816 / 815)", number: "816" },
    { value: "Parabat Express", label: "Parabat Express (709 / 710)", number: "709" },
    { value: "Upaban Express", label: "Upaban Express (739 / 740)", number: "739" },
    { value: "Jayantika Express", label: "Jayantika Express (717 / 718)", number: "717" },
    { value: "Kalni Express", label: "Kalni Express (773 / 774)", number: "773" },
    { value: "Silkcity Express", label: "Silkcity Express (753 / 754)", number: "753" },
    { value: "Padma Express", label: "Padma Express (759 / 760)", number: "759" },
    { value: "Dhumketu Express", label: "Dhumketu Express (769 / 770)", number: "769" },
    { value: "Banalata Express", label: "Banalata Express (791 / 792)", number: "791" },
    { value: "Sundarban Express", label: "Sundarban Express (726 / 725)", number: "726" },
    { value: "Chitra Express", label: "Chitra Express (764 / 763)", number: "764" },
    { value: "Benapole Express", label: "Benapole Express (796 / 795)", number: "796" },
    { value: "Rangpur Express", label: "Rangpur Express (771 / 772)", number: "771" },
    { value: "Ekota Express", label: "Ekota Express (705 / 706)", number: "705" },
    { value: "Drutojan Express", label: "Drutojan Express (757 / 758)", number: "757" },
    { value: "Panchagarh Express", label: "Panchagarh Express (793 / 794)", number: "793" },
    { value: "Agnibina Express", label: "Agnibina Express (735 / 736)", number: "735" },
    { value: "Jamuna Express", label: "Jamuna Express (745 / 746)", number: "745" },
    { value: "Upakul Express", label: "Upakul Express (711 / 712)", number: "711" },
];

const SEAT_CLASSES = [
    { value: "AC_B", labelBn: "এসি বার্থ (AC_B)", labelEn: "AC Berth (AC_B)" },
    { value: "AC_S", labelBn: "এসি সিট (AC_S)", labelEn: "AC Seat (AC_S)" },
    { value: "SNIGDHA", labelBn: "স্নিগ্ধা (SNIGDHA)", labelEn: "Snigdha (AC Chair)" },
    { value: "F_BERTH", labelBn: "ফার্স্ট বার্থ (F_BERTH)", labelEn: "First Berth (F_BERTH)" },
    { value: "F_SEAT", labelBn: "ফার্স্ট সিট (F_SEAT)", labelEn: "First Seat (F_SEAT)" },
    { value: "S_CHAIR", labelBn: "শোভন চেয়ার (S_CHAIR)", labelEn: "Shovon Chair (S_CHAIR)" },
    { value: "SHOVAN", labelBn: "শোভন (SHOVAN)", labelEn: "Shovan" },
];

const uploadToImgBB = async (file) => {
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (!apiKey) {
        throw new Error("ImgBB API key is missing in environment configuration.");
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: "POST",
        body: formData,
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.error?.message || "Failed to upload ticket image.");
    }

    return result.data.url;
};

export default function SellTicketPage() {
    const router = useRouter();
    const { data: session, isPending } = useSession();
    const { lang, t } = useLanguage();
    const todayMinDate = useBdtMinDate();

    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    const [form, setForm] = useState({
        trainName: "",
        trainNumber: "",
        seatClass: "S_CHAIR",
        fromStation: "",
        toStation: "",
        journeyDate: "",
        departureTime: "",
        coach: "",
        seatNumber: "",
        pnr: "",
        fare: "",
    });

    const [policyAccepted, setPolicyAccepted] = useState(false);
    const [ticketFile, setTicketFile] = useState(null);
    const [ticketPreview, setTicketPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState(null);

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
                    console.error("Profile fetch error:", err);
                }
            } finally {
                if (!cancelled) {
                    setLoadingProfile(false);
                }
            }
        }

        loadProfile();

        return () => {
            cancelled = true;
        };
    }, [isPending, session, router]);

    useEffect(() => {
        return () => {
            if (ticketPreview) URL.revokeObjectURL(ticketPreview);
        };
    }, [ticketPreview]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAlert(null);

        if (!form.trainName || !form.fromStation || !form.toStation) {
            setAlert({
                type: "error",
                text: t(
                    "অনুগ্রহ করে ট্রেন, যাত্রা শুরু এবং গন্তব্য স্টেশন নির্বাচন করুন।",
                    "Please select the train, departure station, and destination station."
                ),
            });
            return;
        }

        if (form.fromStation.trim().toLowerCase() === form.toStation.trim().toLowerCase()) {
            setAlert({
                type: "error",
                text: t(
                    "যাত্রা শুরু এবং গন্তব্য স্টেশন একই হতে পারবে না।",
                    "Departure and destination stations cannot be the same."
                ),
            });
            return;
        }

        if (!ticketFile) {
            setAlert({
                type: "error",
                text: t(
                    "অনুগ্রহ করে বাংলাদেশ রেলওয়ের ই-টিকিটের স্ক্রিনশট বা ছবি আপলোড করুন।",
                    "Please upload your Bangladesh Railway e-ticket screenshot or photo."
                ),
            });
            return;
        }

        if (!policyAccepted) {
            setAlert({
                type: "error",
                text: t(
                    "টিকিট জমা দেওয়ার আগে বাংলাদেশ রেলওয়ে TTE ও অ্যান্টি-স্ক্যালপিং নীতিমালায় সম্মত হন।",
                    "Please accept the Bangladesh Railway TTE & anti-scalping policy before submitting."
                ),
            });
            return;
        }

        setSubmitting(true);
        try {
            const ticketFileUrl = await uploadToImgBB(ticketFile);

            const res = await createTicketListing({
                ...form,
                fare: Number(form.fare),
                ticketFileUrl,
            });

            if (!res.ok) {
                setAlert({
                    type: "error",
                    text:
                        res.data?.message ||
                        t("টিকিট লিস্ট করতে সমস্যা হয়েছে।", "Failed to list ticket."),
                });
                setSubmitting(false);
                return;
            }

            setAlert({
                type: "success",
                text: t(
                    "টিকিট সফলভাবে জমা হয়েছে! অ্যাডমিন যাচাইয়ের পর এটি মার্কেটপ্লেসে লাইভ হবে।",
                    "Ticket submitted for admin verification! It will go live once approved."
                ),
            });

            setTimeout(() => {
                router.push("/tickets");
            }, 1300);
        } catch (err) {
            setAlert({
                type: "error",
                text:
                    err.message ||
                    t("সার্ভার বা ছবি আপলোড ত্রুটি হয়েছে।", "Upload or network error."),
            });
            setSubmitting(false);
        }
    };

    if (isPending || loadingProfile) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-12 flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            </div>
        );
    }

    const user = profile || session?.user;
    const isVerified = user?.kycStatus === "verified" || user?.role === "admin";

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    {t("অব্যবহৃত ট্রেনের টিকিট বিক্রি করুন", "Post an Unused Train Ticket")}
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                    {t(
                        "ক্রেতার এসক্রো পেমেন্ট নিশ্চিত না হওয়া পর্যন্ত আপনার সিট নম্বর, PNR এবং টিকিটের ছবি সম্পূর্ণ গোপন থাকবে।",
                        "Your exact seat number, PNR code, and ticket file remain hidden until escrow payment clears."
                    )}
                </p>
            </div>

            {/* Seller KYC Guard */}
            {!isVerified ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h2 className="text-base font-bold text-amber-900">
                                {t(
                                    "টিকিট বিক্রি করতে এনআইডি ভেরিফিকেশন প্রয়োজন",
                                    "NID Verification Required to Sell Tickets"
                                )}
                            </h2>
                            <p className="text-sm text-amber-800 mt-1">
                                {t(
                                    "ক্রেতাদের নিরাপত্তা নিশ্চিত করতে শুধুমাত্র এনআইডি-ভেরিফাইড বিক্রেতারা টিকিট লিস্ট করতে পারেন।",
                                    "To prevent ticket fraud, only sellers with approved NID verification can list tickets."
                                )}
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/dashboard/profile"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold min-h-[44px]"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        {t("প্রোফাইলে গিয়ে এনআইডি জমা দিন", "Complete NID Verification")}
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs">
                    <AnimatePresence mode="wait">
                        {alert && (
                            <motion.div
                                key={alert.text}
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className={`mb-6 p-3.5 rounded-xl border text-sm flex items-start gap-2.5 ${alert.type === "error"
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

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Train Name (Searchable Dropdown) & Train Number */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    {t("ট্রেনের নাম নির্বাচন করুন", "Select Intercity Train")}
                                </label>
                                <SearchableSelect
                                    options={POPULAR_TRAINS}
                                    value={form.trainName}
                                    icon={Train}
                                    required
                                    placeholder={t("ট্রেন নির্বাচন করুন...", "Choose a train...")}
                                    searchPlaceholder={t("ট্রেনের নাম বা নম্বর লিখুন...", "Search train name or number...")}
                                    emptyText={t("কোনো ট্রেন পাওয়া যায়নি", "No matching train found")}
                                    onChange={(selected) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            trainName: selected.value,
                                            trainNumber: selected.number || prev.trainNumber,
                                        }))
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    {t("ট্রেন নম্বর", "Train No.")}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.trainNumber}
                                    onChange={(e) => setForm({ ...form, trainNumber: e.target.value })}
                                    placeholder="702"
                                    className="w-full min-h-[44px] h-11 px-3.5 rounded-lg border border-slate-300 text-sm timer-digits focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                />
                            </div>
                        </div>

                        {/* From & To Stations (Searchable Dropdowns) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    {t("যাত্রা শুরুর স্টেশন (From)", "From Station")}
                                </label>
                                <SearchableSelect
                                    options={BD_STATIONS}
                                    value={form.fromStation}
                                    icon={MapPin}
                                    required
                                    placeholder={t("শুরুর স্টেশন বাছাই করুন", "Select departure station")}
                                    searchPlaceholder={t("স্টেশনের নাম লিখুন...", "Search station...")}
                                    emptyText={t("কোনো স্টেশন পাওয়া যায়নি", "No matching station")}
                                    onChange={(station) => setForm((prev) => ({ ...prev, fromStation: station }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    {t("গন্তব্য স্টেশন (To)", "To Station")}
                                </label>
                                <SearchableSelect
                                    options={BD_STATIONS}
                                    value={form.toStation}
                                    icon={MapPin}
                                    required
                                    placeholder={t("গন্তব্য স্টেশন বাছাই করুন", "Select destination station")}
                                    searchPlaceholder={t("স্টেশনের নাম লিখুন...", "Search station...")}
                                    emptyText={t("কোনো স্টেশন পাওয়া যায়নি", "No matching station")}
                                    onChange={(station) => setForm((prev) => ({ ...prev, toStation: station }))}
                                />
                            </div>
                        </div>

                        {/* Journey Date, Departure Time & Seat Class */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    {t("যাত্রার তারিখ", "Journey Date")}
                                </label>
                                <div className="relative">
                                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="date"
                                        required
                                        min={todayMinDate || undefined}
                                        value={form.journeyDate}
                                        onChange={(e) => setForm({ ...form, journeyDate: e.target.value })}
                                        className="w-full min-h-[44px] h-11 pl-10 pr-3 rounded-lg border border-slate-300 text-sm timer-digits focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    {t("ছাড়ার সময়", "Departure Time")}
                                </label>
                                <div className="relative">
                                    <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="time"
                                        required
                                        value={form.departureTime}
                                        onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                                        className="w-full min-h-[44px] h-11 pl-10 pr-3 rounded-lg border border-slate-300 text-sm timer-digits focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    {t("আসনের শ্রেণি", "Seat Class")}
                                </label>
                                <select
                                    value={form.seatClass}
                                    onChange={(e) => setForm({ ...form, seatClass: e.target.value })}
                                    className="w-full min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                >
                                    {SEAT_CLASSES.map((sc) => (
                                        <option key={sc.value} value={sc.value}>
                                            {lang === "bn" ? sc.labelBn : sc.labelEn}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Privacy-Protected Seat, PNR & Official Fare */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                    {t(
                                        "সিট নম্বর ও PNR পাবলিক মার্কেটপ্লেসে লুকানো থাকবে — শুধুমাত্র পেমেন্টের পর ক্রেতা দেখতে পাবেন।",
                                        "Seat Number & PNR are masked publicly — revealed only after buyer escrow payment."
                                    )}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        {t("কোচ (Coach)", "Coach")}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.coach}
                                        onChange={(e) => setForm({ ...form, coach: e.target.value })}
                                        placeholder="KA"
                                        className="w-full min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        {t("সিট নম্বর (গোপন)", "Seat No. (Hidden)")}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.seatNumber}
                                        onChange={(e) => setForm({ ...form, seatNumber: e.target.value })}
                                        placeholder="KA-14"
                                        className="w-full min-h-[44px] h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm uppercase timer-digits focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        {t("PNR নম্বর (গোপন)", "PNR Code (Hidden)")}
                                    </label>
                                    <div className="relative">
                                        <Ticket className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="text"
                                            required
                                            value={form.pnr}
                                            onChange={(e) => setForm({ ...form, pnr: e.target.value })}
                                            placeholder="83920194"
                                            className="w-full min-h-[44px] h-11 pl-8 pr-2.5 rounded-lg border border-slate-300 bg-white text-sm uppercase timer-digits focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        {t("মূল ভাড়া (৳)", "Official Fare (৳)")}
                                    </label>
                                    <div className="relative">
                                        <Banknote className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="number"
                                            required
                                            min={30}
                                            max={10000}
                                            value={form.fare}
                                            onChange={(e) => setForm({ ...form, fare: e.target.value })}
                                            placeholder="855"
                                            className="w-full min-h-[44px] h-11 pl-8 pr-2.5 rounded-lg border border-slate-300 bg-white text-sm timer-digits focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* E-Ticket File Upload */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                {t(
                                    "বাংলাদেশ রেলওয়ে ই-টিকিটের স্ক্রিনশট বা ছবি আপলোড করুন",
                                    "Upload Bangladesh Railway E-Ticket Screenshot / Photo"
                                )}
                            </label>

                            <label className="flex flex-col items-center justify-center w-full min-h-44 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-400 cursor-pointer transition overflow-hidden">
                                {ticketPreview ? (
                                    <div className="w-full p-3 text-center space-y-2">
                                        <Image
                                            src={ticketPreview}
                                            alt="E-Ticket Preview"
                                            width={640}
                                            height={176}
                                            unoptimized
                                            className="w-full h-44 object-contain"
                                        />
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                                            <FileCheck2 className="w-3.5 h-3.5" />
                                            {ticketFile?.name}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="text-center p-6">
                                        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                        <p className="text-sm font-medium text-slate-700">
                                            {t("ই-টিকিটের ছবি নির্বাচন করুন", "Choose E-Ticket Screenshot / Photo")}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            JPG, PNG or WEBP (Max 5MB — kept private until payment clears)
                                        </p>
                                    </div>
                                )}

                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        if (file.size > 5 * 1024 * 1024) {
                                            setAlert({
                                                type: "error",
                                                text: t(
                                                    "ছবির সাইজ ৫ মেগাবাইটের কম হতে হবে।",
                                                    "Ticket file must be under 5MB."
                                                ),
                                            });
                                            e.target.value = "";
                                            return;
                                        }

                                        setTicketPreview((prev) => {
                                            if (prev) URL.revokeObjectURL(prev);
                                            return URL.createObjectURL(file);
                                        });
                                        setTicketFile(file);
                                    }}
                                />
                            </label>
                        </div>

                        {/* Bangladesh Railway TTE & Anti-Scalping Policy Disclaimer */}
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2.5">
                            <p className="font-bold text-amber-900">
                                {t(
                                    "বাংলাদেশ রেলওয়ে TTE ও অ্যান্টি-স্ক্যালপিং নীতিমালা (গুরুত্বপূর্ণ):",
                                    "Bangladesh Railway TTE & Anti-Scalping Policy Disclaimer:"
                                )}
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-amber-900">
                                <li>
                                    {t(
                                        "বাংলাদেশ রেলওয়ের নিয়ম অনুযায়ী ভ্রমণের সময় TTE মূল এনআইডি/ফোন নম্বর যাচাই করতে পারেন; প্রয়োজনে ক্রেতাকে ফোনে সহযোগিতা করতে হবে।",
                                        "Bangladesh Railway TTEs may verify passenger details onboard; sellers agree to remain reachable by phone during the journey."
                                    )}
                                </li>
                                <li>
                                    {t(
                                        "শুধুমাত্র নির্ধারিত সরকারি ভাড়ায় (Face Value) টিকিট হস্তান্তর করা যাবে; অতিরিক্ত দাম দাবি করলে অ্যাকাউন্ট স্থায়ীভাবে বন্ধ হবে।",
                                        "Tickets may only be exchanged at official face value; scalping results in permanent account suspension."
                                    )}
                                </li>
                                <li>
                                    {t(
                                        "ভুয়া বা ইতিমধ্যে ব্যবহৃত/বাতিলকৃত টিকিট লিস্ট করলে এসক্রো পেআউট বাতিল করে ক্রেতাকে সম্পূর্ণ অর্থ ফেরত দেওয়া হবে।",
                                        "Listing fake, canceled, or duplicate tickets forfeits escrow payout and refunds the buyer in full."
                                    )}
                                </li>
                            </ul>

                            <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={policyAccepted}
                                    onChange={(e) => setPolicyAccepted(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-amber-400 text-emerald-600 focus:ring-emerald-600"
                                />
                                <span className="font-semibold text-amber-950">
                                    {t(
                                        "আমি নিশ্চিত করছি যে এই টিকিটটি বৈধ, পূর্বে ব্যবহৃত নয় এবং আমি উপরের নীতিমালায় সম্মত।",
                                        "I confirm this e-ticket is valid, unused, listed at face value, and I agree to the TTE handover terms."
                                    )}
                                </span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !ticketFile || !policyAccepted}
                            className="w-full sm:w-auto min-h-[44px] px-8 py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>{t("আপলোড ও জমা হচ্ছে...", "Uploading & Submitting...")}</span>
                                </>
                            ) : (
                                <>
                                    <span>{t("যাচাইয়ের জন্য টিকিট জমা দিন", "Submit Ticket for Review")}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}