"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { useLocalStoragePreference } from "@/hooks/useLocalStoragePreference";

const THEME_STORAGE_KEY = "cardscope-theme";
type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useLocalStoragePreference<Theme>({
    fallback: "light",
    key: THEME_STORAGE_KEY,
    parse: parseTheme,
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <button
      aria-label="Toggle dark mode"
      aria-pressed={theme === "dark"}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-ink transition hover:border-brand hover:shadow-lg"
      onClick={toggleTheme}
      type="button"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function parseTheme(storedTheme: string | null): Theme | null {
  return storedTheme === "dark" || storedTheme === "light" ? storedTheme : null;
}
