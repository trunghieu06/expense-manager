import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Layout } from "@/components/Layout";
import { ErrorBlock } from "@/components/StateViews";
import { useI18n } from "@/lib/i18n";
import { Check, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/add")({
  component: AddPage,
});

const CATEGORY_GROUPS = [
  {
    title: "1. Chi tiêu Thiết yếu (Needs) – Khoản bắt buộc phải chi",
    description: "Đây là những khoản bạn không thể không trả mỗi tháng để duy trì cuộc sống cơ bản.",
    items: [
      { name: "Ăn uống (Cơ bản)", desc: "Đi chợ, siêu thị mua nhu yếu phẩm, cơm trưa đi làm/đi học." },
      { name: "Nhà ở", desc: "Tiền thuê nhà, tiền điện, nước, internet, phí chung cư." },
      { name: "Di chuyển", desc: "Xăng xe, phí gửi xe, sửa xe, hoặc vé xe buýt/Grab phục vụ nhu cầu đi lại bắt buộc." },
      { name: "Học tập & Công việc", desc: "Học phí, tài liệu, tiền mạng 4G, các phần mềm/dịch vụ bắt buộc phục vụ công việc." },
      { name: "Sức khỏe", desc: "Thuốc men, khám bệnh, bảo hiểm y tế." }
    ]
  },
  {
    title: "2. Chi tiêu Linh hoạt / Cá nhân (Wants) – Khoản có thể điều chỉnh",
    description: "Những khoản giúp nâng cao chất lượng cuộc sống, có thể cắt giảm nếu tài chính eo hẹp.",
    items: [
      { name: "Ăn uống (Hưởng thụ)", desc: "Cà phê đi chơi với bạn bè, trà sữa, ăn nhà hàng, đặt đồ ăn qua app khi lười nấu." },
      { name: "Mua sắm / Quần áo", desc: "Quần áo, giày dép, phụ kiện, đồ công nghệ (phục vụ sở thích)." },
      { name: "Giải trí", desc: "Vé xem phim, đăng ký dịch vụ (Netflix, Spotify, Premium...), chơi game." },
      { name: "Giao lưu & Mối quan hệ", desc: "Quà sinh nhật, đám cưới, tụ tập bạn bè, người yêu." },
      { name: "Chăm sóc cá nhân", desc: "Cắt tóc, mỹ phẩm, gym/thể thao." }
    ]
  }
];

function AddPage() {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [category, setCategory] = useState("Ăn uống (Cơ bản)");
  const [note, setNote] = useState("");
  const [createdAt, setCreatedAt] = useState(() => {
    // Current local datetime formatted for datetime-local input
    const now = new Date();
    const tzoffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzoffset).toISOString().slice(0, 16);
  });
  const [smartText, setSmartText] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const m = useMutation({
    mutationFn: () =>
      api.addManual({
        amount: parseFloat(amount),
        currency: currency,
        category: category.trim(),
        note: note.trim() || null,
        created_at: createdAt ? createdAt : undefined,
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

  const mSmart = useMutation({
    mutationFn: () => api.smartEntry(smartText),
    onSuccess: (data) => {
      if (data.amount) setAmount(data.amount.toString());
      if (data.currency) setCurrency(data.currency);
      if (data.category) setCategory(data.category);
      if (data.note) setNote(data.note);
      if (data.created_at) {
        // Truncate to YYYY-MM-DDTHH:mm
        setCreatedAt(data.created_at.slice(0, 16));
      }
      setSmartText("");
    },
  });

  const canSubmit = !!amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && !!category.trim();

  return (
    <Layout>
      <section className="mb-10">
        <div className="text-xs uppercase tracking-[0.2em] text-coral font-medium">
          — {t("nav_add")}
        </div>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">{t("add_title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("add_subtitle")}</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Column 1: AI Smart Entry */}
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8 space-y-4">
        <label className="flex items-center gap-2 text-sm font-bold text-primary mb-2">
          <Sparkles className="h-4 w-4" /> AI Smart Entry
        </label>
        <div className="flex flex-col gap-3">
          <textarea
            value={smartText}
            onChange={(e) => setSmartText(e.target.value)}
            placeholder={t("smart_entry_placeholder")}
            rows={2}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none shadow-sm"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => mSmart.mutate()}
              disabled={!smartText.trim() || mSmart.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50 transition-colors"
            >
              {mSmart.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {mSmart.isPending ? t("analyzing") : t("smart_entry_button")}
            </button>
          </div>
        </div>
        {mSmart.error && <ErrorBlock error={mSmart.error} />}
        </div>
        
        {/* Column 2: Manual Form */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (canSubmit) m.mutate(); }}
          className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm"
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
          <label className="block text-sm font-medium mb-4">{t("category")}</label>
          <div className="space-y-6">
            {CATEGORY_GROUPS.map((group) => (
              <div key={group.title} className="space-y-3">
                <div className="mb-2">
                  <h3 className="font-semibold text-primary">{group.title}</h3>
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.items.map((c) => (
                    <button
                      type="button"
                      key={c.name}
                      onClick={() => setCategory(c.name)}
                      className={`text-left p-4 rounded-2xl border transition-all ${
                        category === c.name
                          ? "bg-primary/10 border-primary shadow-sm"
                          : "bg-background border-border hover:border-primary/40 hover:bg-muted/50"
                      }`}
                    >
                      <div className={`font-medium mb-1 ${category === c.name ? "text-primary" : "text-foreground"}`}>
                        {c.name}
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {c.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-border">
            <label className="block text-sm font-medium mb-2 opacity-70">Hoặc nhập danh mục tự chọn khác</label>
            <input
              type="text" required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring opacity-70 focus:opacity-100 transition-opacity"
            />
          </div>
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

        <div>
          <label className="block text-sm font-medium mb-2">{t("date")}</label>
          <input
            type="datetime-local"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
      </div>
    </Layout>
  );
}
