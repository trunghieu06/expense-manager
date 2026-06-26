import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, type TransactionResponse } from "@/lib/api";
import { Layout } from "@/components/Layout";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { useI18n } from "@/lib/i18n";
import { Pencil, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ amount: string; category: string; currency: string }>({ amount: "", category: "", currency: "" });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const q = useQuery<TransactionResponse[]>({
    queryKey: ["transactions"],
    queryFn: api.listTransactions,
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteTransaction(id),
    onSuccess: () => {
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
    setEditForm({ amount: tx.amount.toString(), category: tx.category, currency: tx.currency });
  };

  const saveEdit = (id: number) => {
    update.mutate({
      id,
      data: {
        amount: parseFloat(editForm.amount),
        category: editForm.category,
        currency: editForm.currency,
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
        <div className="overflow-x-auto rounded-3xl border border-border bg-card">
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
              {q.data.map((tx) => (
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
                    {new Date(tx.created_at).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US")}
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
      )}
    </Layout>
  );
}
