import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Layout } from "@/components/Layout";
import { ErrorBlock } from "@/components/StateViews";
import { useI18n } from "@/lib/i18n";
import { Check, Loader2 } from "lucide-react";

export const Route = createFileRoute("/add")({
  component: AddPage,
});

const CATEGORY_PRESETS = [
  "Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Other",
];

function AddPage() {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const m = useMutation({
    mutationFn: () =>
      api.addManual({
        amount: parseFloat(amount),
        currency: currency,
        category: category.trim(),
        note: note.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["summary"] });
      setJustSaved(true);
      setAmount("");
      setNote("");
      setTimeout(() => setJustSaved(false), 2500);
      router.invalidate();
    },
  });

  const canSubmit = !!amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && !!category.trim();

  return (
    <Layout>
      <section className="mb-10 max-w-2xl">
        <div className="text-xs uppercase tracking-[0.2em] text-coral font-medium">
          — {t("nav_add")}
        </div>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">{t("add_title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("add_subtitle")}</p>
      </section>

      <form
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) m.mutate(); }}
        className="max-w-xl rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6"
      >
        <div>
          <label className="block text-sm font-medium mb-2">{t("amount")}</label>
          <div className="flex gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-xl border border-input bg-background px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </select>
            <input
              type="number" step="0.01" min="0" required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 w-full rounded-xl border border-input bg-background px-4 py-3 font-display text-2xl focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t("category")}</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {CATEGORY_PRESETS.map((c) => (
              <button
                type="button" key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                  category === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            type="text" required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t("note")}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("note_placeholder")}
            rows={3}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {m.error && <ErrorBlock error={m.error} />}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit || m.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95"
          >
            {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {m.isPending ? t("saving") : t("submit")}
          </button>
          {justSaved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-primary">
              <Check className="h-4 w-4" /> {t("saved")}
            </span>
          )}
        </div>
      </form>
    </Layout>
  );
}
