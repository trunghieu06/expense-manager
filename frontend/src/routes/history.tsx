import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api, type TransactionResponse } from "@/lib/api";
import { Layout } from "@/components/Layout";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { useI18n } from "@/lib/i18n";
import { Pencil, Trash2, X, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ amount: string; category: string; currency: string; created_at: string }>({ amount: "", category: "", currency: "", created_at: "" });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});

  const q = useQuery<TransactionResponse[]>({
    queryKey: ["transactions"],
    queryFn: api.listTransactions,
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteTransaction(id),
    onSuccess: (_, id) => {
      setSelectedIds(prev => prev.filter(selected => selected !== id));
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["monthlySummary"] });
    },
  });

  const bulkDel = useMutation({
    mutationFn: (ids: number[]) => api.bulkDelete(ids),
    onSuccess: () => {
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["monthlySummary"] });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateTransaction(id, data),
    onSuccess: () => {
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["monthlySummary"] });
    },
  });

  const formatCurrency = (n: number, currency: string) => {
    return new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: currency === "VND" ? 0 : 2,
    }).format(n);
  };

  const startEdit = (tx: TransactionResponse) => {
    setEditingId(tx.id);
    const dateObj = new Date(tx.created_at);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localDateTime = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
    
    setEditForm({ 
      amount: tx.amount.toString(), 
      category: tx.category, 
      currency: tx.currency,
      created_at: localDateTime
    });
  };

  const saveEdit = (id: number) => {
    update.mutate({
      id,
      data: {
        amount: parseFloat(editForm.amount),
        category: editForm.category,
        currency: editForm.currency,
        created_at: editForm.created_at ? editForm.created_at : undefined,
      },
    });
  };

  const toggleSelectAll = () => {
    if (q.data) {
      if (selectedIds.length === q.data.length) {
        setSelectedIds([]);
      } else {
        setSelectedIds(q.data.map(tx => tx.id));
      }
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const groupedData = useMemo(() => {
    if (!q.data) return {};
    // Group by YYYY-MM-DD
    const groups = q.data.reduce((acc, tx) => {
      // Create local date string safely
      const date = new Date(tx.created_at);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(tx);
      return acc;
    }, {} as Record<string, TransactionResponse[]>);
    
    // Sort keys descending
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    const sortedGroups: Record<string, TransactionResponse[]> = {};
    for (const key of sortedKeys) {
      sortedGroups[key] = groups[key];
    }
    return sortedGroups;
  }, [q.data]);

  const fetchSummary = async (dateStr: string) => {
    setLoadingSummaries(prev => ({ ...prev, [dateStr]: true }));
    try {
      const res = await api.dailySummary(dateStr);
      setSummaries(prev => ({ ...prev, [dateStr]: res.summary }));
    } catch (err) {
      alert("Error generating summary.");
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [dateStr]: false }));
    }
  };

  return (
    <Layout>
      <section className="mb-10 max-w-2xl">
        <div className="flex items-center gap-4">
          <div className="text-xs uppercase tracking-[0.2em] text-coral font-medium">
            — {t("nav_history")}
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={() => {
                if (confirm(lang === 'vi' ? `Bạn có chắc chắn muốn xóa ${selectedIds.length} mục đã chọn?` : `Are you sure you want to delete ${selectedIds.length} selected items?`)) {
                  bulkDel.mutate(selectedIds);
                }
              }}
              disabled={bulkDel.isPending}
              className="ml-4 inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {t("delete_selected")} ({selectedIds.length})
            </button>
          )}
        </div>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">{t("history_title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("history_subtitle")}</p>
      </section>

      {q.isLoading ? (
        <LoadingBlock />
      ) : q.error ? (
        <ErrorBlock error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          {t("no_data")}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedData).map(([dateStr, txs]) => (
            <div key={dateStr} className="overflow-x-auto rounded-3xl border border-border bg-card">
              {/* Header cho mỗi ngày */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border bg-secondary/20 gap-4">
                <div className="font-semibold text-lg">
                  {new Date(dateStr).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                
                <button
                  onClick={() => fetchSummary(dateStr)}
                  disabled={loadingSummaries[dateStr]}
                  className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  {loadingSummaries[dateStr] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {lang === 'vi' ? "AI Kể chuyện" : "AI Insight"}
                </button>
              </div>

              {/* Hiển thị tóm tắt AI nếu có */}
              {summaries[dateStr] && (
                <div className="p-4 bg-primary/5 text-sm leading-relaxed border-b border-border">
                  <span className="font-bold text-primary mr-2">✨ AI:</span>
                  {summaries[dateStr]}
                </div>
              )}

              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="border-b border-border bg-secondary/50">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={q.data && q.data.length > 0 && selectedIds.length === q.data.length}
                    onChange={toggleSelectAll}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-6 py-4 font-medium">{t("date")}</th>
                <th className="px-6 py-4 font-medium">{t("category")}</th>
                <th className="px-6 py-4 font-medium text-right">{t("amount")}</th>
                <th className="px-6 py-4 font-medium">{t("note")}</th>
                <th className="px-6 py-4 font-medium text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {txs.map((tx) => (
                <tr key={tx.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(tx.id)}
                      onChange={() => toggleSelect(tx.id)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {editingId === tx.id ? (
                      <input 
                        type="datetime-local" 
                        value={editForm.created_at}
                        onChange={(e) => setEditForm({...editForm, created_at: e.target.value})}
                        className="rounded border border-input px-2 py-1 bg-background text-foreground"
                      />
                    ) : (
                      new Date(tx.created_at).toLocaleTimeString(lang === "vi" ? "vi-VN" : "en-US", { hour: '2-digit', minute: '2-digit' })
                    )}
                  </td>
                  
                  {/* Category Column */}
                  <td className="px-6 py-4">
                    {editingId === tx.id ? (
                      <input 
                        type="text" 
                        value={editForm.category}
                        onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                        className="rounded border border-input px-2 py-1 bg-background"
                      />
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                        {tx.category}
                      </span>
                    )}
                  </td>
                  
                  {/* Amount Column */}
                  <td className="px-6 py-4 text-right font-medium">
                    {editingId === tx.id ? (
                      <div className="flex justify-end gap-1">
                        <select 
                          value={editForm.currency}
                          onChange={(e) => setEditForm({...editForm, currency: e.target.value})}
                          className="rounded border border-input px-2 py-1 bg-background"
                        >
                          <option value="VND">VND</option>
                          <option value="USD">USD</option>
                        </select>
                        <input 
                          type="number" step="0.01"
                          value={editForm.amount}
                          onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                          className="rounded border border-input px-2 py-1 bg-background w-24 text-right"
                        />
                      </div>
                    ) : (
                      formatCurrency(tx.amount, tx.currency)
                    )}
                  </td>

                  <td className="px-6 py-4 text-muted-foreground max-w-[200px] truncate">
                    {tx.note || "—"}
                  </td>

                  <td className="px-6 py-4 text-right">
                    {editingId === tx.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => saveEdit(tx.id)} disabled={update.isPending} className="text-primary hover:underline">{t("save")}</button>
                        <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:underline"><X className="h-4 w-4"/></button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button onClick={() => startEdit(tx)} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(lang === 'vi' ? 'Bạn có chắc chắn muốn xóa không?' : 'Are you sure you want to delete?')) {
                              del.mutate(tx.id);
                            }
                          }} 
                          className="text-red-500 hover:text-red-600 disabled:opacity-50"
                          disabled={del.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
