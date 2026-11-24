"use client";

import { createContext, useContext, useState } from "react";

const LanguageContext = createContext({
  lang: "en",
  setLang: () => {},
  toggleLang: () => {},
  t: (_bn, en) => en,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage.getItem("tte_lang");
    return saved === "bn" || saved === "en" ? saved : "en";
  });

  const setLang = (nextLang) => {
    const normalized = nextLang === "bn" ? "bn" : "en";
    setLangState(normalized);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("tte_lang", normalized);
    }
  };

  const toggleLang = () => {
    setLang(lang === "bn" ? "en" : "bn");
  };

  const t = (bnText, enText) => (lang === "bn" ? bnText : enText);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}