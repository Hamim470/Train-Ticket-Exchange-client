"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

export default function SearchableSelect({
    options = [],
    value = "",
    onChange,
    placeholder = "Select an option",
    searchPlaceholder = "Type to search...",
    icon: Icon,
    required = false,
    emptyText = "No matches found",
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = options.filter((opt) => {
        const label = typeof opt === "string" ? opt : opt.label;
        return label.toLowerCase().includes(query.toLowerCase());
    });

    const selectedOption = options.find((opt) =>
        typeof opt === "string" ? opt === value : opt.value === value
    );

    const displayLabel = selectedOption
        ? typeof selectedOption === "string"
            ? selectedOption
            : selectedOption.label
        : "";

    return (
        <div ref={containerRef} className="relative">
            {/* Hidden input for native HTML5 required validation */}
            <input
                type="text"
                tabIndex={-1}
                required={required}
                value={value}
                onChange={() => { }}
                className="sr-only"
                aria-hidden="true"
            />

            <button
                type="button"
                onClick={() => {
                    setOpen((prev) => !prev);
                    setQuery("");
                }}
                className="w-full min-h-[44px] h-11 px-3.5 rounded-lg border border-slate-300 bg-white text-left text-sm flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
            >
                <span className="flex items-center gap-2.5 truncate">
                    {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
                    <span className={displayLabel ? "text-slate-900 truncate" : "text-slate-400 truncate"}>
                        {displayLabel || placeholder}
                    </span>
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""
                        }`}
                />
            </button>

            {open && (
                <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            type="text"
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full bg-transparent text-sm text-slate-900 focus:outline-none"
                        />
                    </div>

                    <ul className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                        {filtered.length === 0 ? (
                            <li className="px-3.5 py-3 text-xs text-slate-500 text-center">
                                {emptyText}
                            </li>
                        ) : (
                            filtered.map((opt) => {
                                const optValue = typeof opt === "string" ? opt : opt.value;
                                const optLabel = typeof opt === "string" ? opt : opt.label;
                                const isSelected = optValue === value;

                                return (
                                    <li key={optValue}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onChange(opt);
                                                setOpen(false);
                                                setQuery("");
                                            }}
                                            className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between gap-2 hover:bg-emerald-50 transition cursor-pointer ${isSelected
                                                    ? "bg-emerald-50/70 font-semibold text-emerald-700"
                                                    : "text-slate-700"
                                                }`}
                                        >
                                            <span className="truncate">{optLabel}</span>
                                            {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                                        </button>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}