"use client";

import { Moon, Sun } from "lucide-react";

export function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch {}
}

export function ThemeToggle() {
  return (
    <button type="button" onClick={toggleTheme} className="icon-btn" aria-label="Toggle dark mode" title="Toggle dark mode">
      <Moon className="theme-icon-dark" />
      <Sun className="theme-icon-light" />
    </button>
  );
}

/** Runs before paint: theme (stored or system) and sidebar collapse state. */
export const themeScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.dataset.theme=t;if(localStorage.getItem('sidebar')==='collapsed')d.dataset.sidebar='collapsed'}catch(e){}})();`;
