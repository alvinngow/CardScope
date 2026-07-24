"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "cardscope-theme";
type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function chooseTheme(nextTheme: Theme) {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  function toggleTheme() {
    chooseTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <button
      aria-label="Toggle dark mode"
      aria-pressed={theme === "dark"}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-ink transition hover:border-brand hover:shadow-lg"
      onClick={toggleTheme}
      suppressHydrationWarning
      type="button"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function initialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
