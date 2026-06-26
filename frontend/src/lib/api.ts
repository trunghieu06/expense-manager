export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "";

export interface TransactionCreate {
  amount: number;
  currency: string;
  category: string;
  note?: string | null;
}

export interface TransactionUpdate {
  amount?: number;
  currency?: string;
  category?: string;
  note?: string | null;
}

export interface TransactionResponse {
  id: number;
  amount: number;
  currency: string;
  category: string;
  note?: string | null;
  created_at: string;
}

export interface CategorySummary {
  category: string;
  currency: string;
  total_amount: number;
}

export interface MonthlySummary {
  month: string;
  currency: string;
  total_amount: number;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = typeof j?.detail === "string" ? j.detail : JSON.stringify(j?.detail ?? j);
    } catch {}
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  addManual: (data: TransactionCreate) =>
    fetch(`${API_BASE_URL}/api/v1/transactions/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handle<TransactionResponse>),

  scanInvoice: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_BASE_URL}/api/v1/transactions/scan-invoice`, {
      method: "POST",
      body: fd,
    }).then(handle<TransactionResponse>);
  },

  listTransactions: () =>
    fetch(`${API_BASE_URL}/api/v1/transactions`).then(handle<TransactionResponse[]>),

  updateTransaction: (id: number, data: TransactionUpdate) =>
    fetch(`${API_BASE_URL}/api/v1/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handle<TransactionResponse>),

  deleteTransaction: (id: number) =>
    fetch(`${API_BASE_URL}/api/v1/transactions/${id}`, {
      method: "DELETE",
    }).then(handle<{ detail: string }>),

  bulkDelete: (ids: number[]) =>
    fetch(`${API_BASE_URL}/api/v1/transactions/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).then(handle<{ detail: string }>),

  summary: () =>
    fetch(`${API_BASE_URL}/api/v1/transactions/summary`).then(handle<CategorySummary[]>),

  monthlySummary: () =>
    fetch(`${API_BASE_URL}/api/v1/transactions/monthly-summary`).then(handle<MonthlySummary[]>),
};
