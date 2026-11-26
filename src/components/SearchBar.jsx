"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Search, ArrowRightLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import SearchableSelect from "@/components/SearchableSelect";

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

export default function SearchBar({
    initialFrom = "",
    initialTo = "",
    initialDate = "",
    onSearch,
    compact = false,
}) {
    const router = useRouter();
    const { t } = useLanguage();

    const [from, setFrom] = useState(initialFrom);
    const [to, setTo] = useState(initialTo);
    const [date, setDate] = useState(initialDate);
    const [todayMinDate, setTodayMinDate] = useState("");

    useEffect(() => {
        const bdToday = new Date(Date.now() + 6 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];
        setTodayMinDate(bdToday);
    }, []);

    const handleSwapStations = () => {
        setFrom(to);
        setTo(from);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const params = new URLSearchParams();
        if (from.trim()) params.set("from", from.trim());
        if (to.trim()) params.set("to", to.trim());
        if (date.trim()) params.set("date", date.trim());

        const qs = params.toString();

        if (typeof onSearch === "function") {
            onSearch({ from: from.trim(), to: to.trim(), date: date.trim() });
        }

        router.push(`/tickets${qs ? `?${qs}` : ""}`);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${compact ? "p-3 sm:p-4" : "p-4 sm:p-6"
                }`}
        >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                {/* From Station */}
                <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t("যাত্রা শুরু (From Station)", "From Station")}
                    </label>
                    <SearchableSelect
                        options={BD_STATIONS}
                        value={from}
                        icon={MapPin}
                        placeholder={t("শুরুর স্টেশন বাছাই করুন", "Any departure station")}
                        searchPlaceholder={t("স্টেশন খুঁজুন...", "Search station...")}
                        emptyText={t("কোনো স্টেশন পাওয়া যায়নি", "No matching station")}
                        onChange={(station) => setFrom(station)}
                    />
                </div>

                {/* Swap Button (Desktop) + To Station */}
                <div className="md:col-span-4 flex items-end gap-1.5">
                    <button
                        type="button"
                        onClick={handleSwapStations}
                        title={t("স্টেশন অদলবদল করুন", "Swap stations")}
                        aria-label={t("স্টেশন অদলবদল করুন", "Swap stations")}
                        className="min-h-[44px] h-11 w-11 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 flex items-center justify-center shrink-0 transition cursor-pointer"
                    >
                        <ArrowRightLeft className="w-4 h-4" />
                    </button>

                    <div className="flex-1 min-w-0">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            {t("গন্তব্য (To Station)", "To Station")}
                        </label>
                        <SearchableSelect
                            options={BD_STATIONS}
                            value={to}
                            icon={MapPin}
                            placeholder={t("গন্তব্য স্টেশন বাছাই করুন", "Any destination station")}
                            searchPlaceholder={t("স্টেশন খুঁজুন...", "Search station...")}
                            emptyText={t("কোনো স্টেশন পাওয়া যায়নি", "No matching station")}
                            onChange={(station) => setTo(station)}
                        />
                    </div>
                </div>

                {/* Journey Date */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t("যাত্রার তারিখ", "Journey Date")}
                    </label>
                    <div className="relative">
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="date"
                            min={todayMinDate || undefined}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full min-h-[44px] h-11 pl-9 pr-2.5 rounded-lg border border-slate-300 text-sm timer-digits focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                    </div>
                </div>

                {/* Search CTA */}
                <div className="md:col-span-2">
                    <button
                        type="submit"
                        className="w-full min-h-[44px] h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                    >
                        <Search className="w-4 h-4 shrink-0" />
                        <span>{t("টিকিট খুঁজুন", "Search")}</span>
                    </button>
                </div>
            </div>
        </form>
    );
}