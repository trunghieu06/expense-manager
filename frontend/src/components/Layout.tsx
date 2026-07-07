import { Link, useRouterState, Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { LayoutDashboard, PlusCircle, ScanLine, History, LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export function Layout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const nav = [
    { to: "/", label: t("nav_dashboard"), icon: LayoutDashboard },
    { to: "/history", label: t("nav_history"), icon: History },
    { to: "/add", label: t("nav_add"), icon: PlusCircle },
    { to: "/scan", label: t("nav_scan"), icon: ScanLine },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-cream/80 backdrop-blur sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-6xl px-5 py-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-xl">
              Ơ
            </div>
            <div className="min-w-0">
              <div className="font-display text-xl leading-none truncate">{t("appName")}</div>
              <div className="text-xs text-muted-foreground truncate">{t("tagline")}</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LangSwitch lang={lang} setLang={setLang} />
            <button 
              onClick={logout}
              className="p-2 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-3 pb-2 flex gap-1 overflow-x-auto">
          {nav.map((n) => {
            const active = pathname === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12">{children}</main>
      <footer className="mx-auto max-w-6xl px-5 py-10 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] text-xs text-muted-foreground">
        Â© {new Date().getFullYear()} {t("appName")}
      </footer>
    </div>
  );
}

function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="inline-flex shrink-0 rounded-full border border-border bg-card p-1 text-xs font-medium">
      {(["en", "vi"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-full px-3 py-1 transition-colors ${
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l === "en" ? "EN" : "VI"}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      title="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
