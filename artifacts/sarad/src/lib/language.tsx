import { createContext, useContext, useState, useEffect } from "react";

type Lang = "ar" | "en";

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  isRTL: boolean;
  t: (ar: string, en: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: "ar",
  setLang: () => {},
  isRTL: true,
  t: (ar) => ar,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("sarad_lang") as Lang) || "ar";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("sarad_lang", l);
  };

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const isRTL = lang === "ar";

  return (
    <LangContext.Provider value={{ lang, setLang, isRTL, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
