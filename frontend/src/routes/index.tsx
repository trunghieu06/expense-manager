import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Sparkles, Loader2, X } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { api, type CategorySummary, type MonthlySummary, type TransactionResponse } from "@/lib/api";
import { Layout } from "@/components/Layout";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

const PALETTE = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)",
  "var(--chart-4)", "var(--chart-5)",
];

function formatCurrency(n: number, lang: "en" | "vi", currency: string = "VND") {
  return new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2
  }).format(n);
}

function formatCompactNumber(n: number, lang: "en" | "vi") {
  return new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", {
    notation: "compact",
    compactDisplay: "short",
  }).format(n);
}

function DashboardPage() {
  const { t, lang } = useI18n();
  const [selectedCurrency, setSelectedCurrency] = useState("VND");

  const [insightModal, setInsightModal] = useState<{
    open: boolean;
    title: string;
    contextText: string;
    data: any[];
  }>({ open: false, title: "", contextText: "", data: [] });

  const mInsight = useMutation({
    mutationFn: (req: { context: string; data: any[] }) => api.analyzeInsights(req.context, req.data),
  });

  const handleAnalyze = (title: string, contextText: string, data: any[]) => {
    setInsightModal({ open: true, title, contextText, data });
    mInsight.mutate({ context: contextText, data });
  };

  const q = useQuery<CategorySummary[]>({
    queryKey: ["summary"],
    queryFn: api.summary,
  });

  const mQuery = useQuery<MonthlySummary[]>({
    queryKey: ["monthlySummary"],
    queryFn: api.monthlySummary,
  });

  const txQuery = useQuery<TransactionResponse[]>({
    queryKey: ["transactions"],
    queryFn: api.listTransactions,
  });

  const filteredData = (q.data ?? []).filter(c => c.currency === selectedCurrency);
  const filteredMonthly = (mQuery.data ?? []).filter(c => c.currency === selectedCurrency);
  const total = filteredData.reduce((s, c) => s + c.total_amount, 0);

  // Xử lý dữ liệu biểu đồ theo giờ
  const dailyHourlyData = useMemo(() => {
    if (!txQuery.data) return [];
    
    const groups: Record<string, TransactionResponse[]> = {};
    for (const tx of txQuery.data) {
      if (tx.currency !== selectedCurrency) continue;
      
      const d = new Date(tx.created_at);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(tx);
    }
    
    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a)).slice(0, 14);
    
    return sortedDates.map(dateStr => {
      const hourly = Array.from({ length: 24 }, (_, i) => ({
        hour: `${String(i).padStart(2, '0')}:00`,
        amount: 0
      }));
      
      for (const tx of groups[dateStr]) {
        const d = new Date(tx.created_at);
        hourly[d.getHours()].amount += tx.amount;
      }
      
      return {
        dateStr,
        hourly,
        total: hourly.reduce((sum, h) => sum + h.amount, 0)
      };
    });
  }, [txQuery.data, selectedCurrency]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <Layout>
      {insightModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setInsightModal(prev => ({ ...prev, open: false }))}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-primary font-bold mb-4 font-display text-xl">
              <Sparkles className="h-5 w-5 text-coral" />
              AI Phân Tích: {insightModal.title}
            </div>
            
            <div className="min-h-[100px] text-sm leading-relaxed p-4 rounded-2xl bg-secondary/50 border border-border">
              {mInsight.isPending ? (
                <div className="flex flex-col h-32 items-center justify-center text-muted-foreground gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="animate-pulse">AI đang "soi mói" dữ liệu của bạn...</span>
                </div>
              ) : mInsight.isError ? (
                <div className="text-destructive font-medium">Lỗi: {mInsight.error.message}</div>
              ) : (
                <div className="whitespace-pre-wrap text-foreground font-medium">
                  {mInsight.data?.insight}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-coral font-medium">
            — {t("nav_dashboard")}
          </div>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl text-foreground max-w-2xl">
            {t("dashboard_title")}
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl">{t("dashboard_subtitle")}</p>
        </div>
        <select
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          className="rounded-xl border border-input bg-background px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-ring self-start sm:self-end"
        >
          <option value="VND">VND</option>
          <option value="USD">USD</option>
        </select>
      </section>

      {q.isLoading || mQuery.isLoading ? (
        <LoadingBlock />
      ) : q.error || mQuery.error ? (
        <ErrorBlock error={(q.error || mQuery.error) as Error} onRetry={() => { q.refetch(); mQuery.refetch(); }} />
      ) : (!q.data || q.data.length === 0) && (!mQuery.data || mQuery.data.length === 0) ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          {t("no_data")}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-6 flex flex-col min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("total")}
              </div>
              <button 
                onClick={() => handleAnalyze("Tổng quan", "Phân tích tình hình tài chính dựa trên tổng quan", filteredData)}
                className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Phân tích tổng quan"
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 font-display text-4xl sm:text-5xl text-primary">
              {formatCurrency(total, lang, selectedCurrency)}
            </div>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={filteredData}
                    dataKey="total_amount"
                    nameKey="category"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={3}
                  >
                    {filteredData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                    formatter={(v: number) => formatCurrency(v, lang, selectedCurrency)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {filteredData.map((c, i) => (
                <li key={c.category} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="truncate">{c.category}</span>
                  </span>
                  <span className="text-muted-foreground">{formatCurrency(c.total_amount, lang, selectedCurrency)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3 rounded-3xl border border-border bg-card p-6 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("by_category")}
              </div>
              <button 
                onClick={() => handleAnalyze("Cơ cấu danh mục", "Phân tích cơ cấu chi tiêu xem tôi đang chi nhiều cho cái gì", filteredData)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Sparkles className="h-3 w-3" /> Phân tích
              </button>
            </div>
            <div className="h-64 mb-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredData} margin={{ left: -10, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="category" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => formatCompactNumber(v, lang)} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                    formatter={(v: number) => formatCurrency(v, lang, selectedCurrency)}
                  />
                  <Bar dataKey="total_amount" radius={[10, 10, 0, 0]} fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between mb-4 mt-8 pt-8 border-t border-border">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("monthly_trend")}
              </div>
              <button 
                onClick={() => handleAnalyze("Xu hướng tháng", "Phân tích xu hướng tăng giảm chi tiêu qua các tháng", filteredMonthly)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Sparkles className="h-3 w-3" /> Phân tích
              </button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredMonthly} margin={{ left: -10, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => formatCompactNumber(v, lang)} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                    formatter={(v: number) => formatCurrency(v, lang, selectedCurrency)}
                  />
                  <Bar dataKey="total_amount" radius={[10, 10, 0, 0]} fill="var(--chart-3)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Hourly Trend Section */}
          <div className="lg:col-span-5 rounded-3xl border border-border bg-card p-6 mt-2 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Xu hướng theo giờ (Vuốt để xem)
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={scrollPrev} 
                  disabled={!canScrollPrev}
                  className="p-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button 
                  onClick={scrollNext} 
                  disabled={!canScrollNext}
                  className="p-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {dailyHourlyData.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">Không có dữ liệu chi tiêu.</div>
            ) : (
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-4">
                  {dailyHourlyData.map((dayData) => (
                    <div key={dayData.dateStr} className="flex-[0_0_100%] sm:flex-[0_0_80%] lg:flex-[0_0_50%] min-w-0 border border-border/50 rounded-2xl p-4 bg-background">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-semibold text-primary">
                          {new Date(dayData.dateStr).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            {formatCurrency(dayData.total, lang, selectedCurrency)}
                          </span>
                          <button 
                            onClick={() => handleAnalyze(`Ngày ${dayData.dateStr}`, `Phân tích chi tiêu của tôi trong ngày ${dayData.dateStr}`, dayData.hourly)}
                            className="p-1 rounded-full text-coral bg-coral/10 hover:bg-coral/20 transition-colors"
                            title="Phân tích ngày"
                          >
                            <Sparkles className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dayData.hourly} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                              dataKey="hour" 
                              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} 
                              axisLine={false} 
                              tickLine={false} 
                              interval={3}
                            />
                            <YAxis 
                              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} 
                              axisLine={false} 
                              tickLine={false} 
                              width={40}
                              tickFormatter={(v) => formatCompactNumber(v, lang)}
                            />
                            <Tooltip
                              cursor={{ fill: "var(--muted)" }}
                              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                              formatter={(v: number) => formatCurrency(v, lang, selectedCurrency)}
                              labelFormatter={(label) => `Giờ: ${label}`}
                            />
                            <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="var(--chart-4)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
