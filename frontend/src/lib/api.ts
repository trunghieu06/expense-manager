export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "";

// Lấy token từ localStorage an toàn cho SSR
export const getToken = () => typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
export const setToken = (token: string) => typeof window !== "undefined" && localStorage.setItem("access_token", token);
export const removeToken = () => typeof window !== "undefined" && localStorage.removeItem("access_token");

// Hàm fetch có gán Bearer Token
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}

export interface TransactionCreate {
  amount: number;
  currency: string;
  category: string;
  note?: string | null;
  created_at?: string;
}

export interface TransactionUpdate {
  amount?: number;
  currency?: string;
  category?: string;
  note?: string | null;
  created_at?: string;
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
    if (res.status === 401) {
      removeToken();
      window.dispatchEvent(new Event("auth-expired"));
    }
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
  // --- AUTH ---
  login: (data: FormData) => 
    fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      body: data,
    }).then(handle<{ access_token: string; token_type: string }>),

  register: (data: any) =>
    fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handle<any>),

  // --- TRANSACTIONS ---
  addManual: (data: TransactionCreate) =>
    fetchWithAuth(`${API_BASE_URL}/api/v1/transactions/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handle<TransactionResponse>),

  smartEntry: (text: string) => {
    const local_time = new Date().toISOString();
    return fetchWithAuth(`${API_BASE_URL}/api/v1/transactions/smart-entry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, local_time }),
    }).then(handle<Partial<TransactionCreate>>);
  },

  scanInvoice: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetchWithAuth(`${API_BASE_URL}/api/v1/transactions/scan-invoice`, {
      method: "POST",
      body: fd,
    }).then(handle<TransactionResponse>);
  },

  listTransactions: () =>
    fetchWithAuth(`${API_BASE_URL}/api/v1/transactions`).then(handle<TransactionResponse[]>),

  updateTransaction: (id: number, data: TransactionUpdate) =>
    fetchWithAuth(`${API_BASE_URL}/api/v1/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handle<TransactionResponse>),

  deleteTransaction: (id: number) =>
    fetchWithAuth(`${API_BASE_URL}/api/v1/transactions/${id}`, {
      method: "DELETE",
    }).then(handle<{ detail: string }>),

  bulkDelete: (ids: number[]) =>
    fetchWithAuth(`${API_BASE_URL}/api/v1/transactions/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).then(handle<{ detail: string }>),

  summary: () =>
    fetchWithAuth(`${API_BASE_URL}/api/v1/transactions/summary`).then(handle<CategorySummary[]>),

  monthlySummary: () =>
    fetchWithAuth(`${API_BASE_URL}/api/v1/transactions/monthly-summary`).then(handle<MonthlySummary[]>),

  dailySummary: (date: string) =>
    fetchWithAuth(`${API_BASE_URL}/api/v1/transactions/daily-summary?date=${date}`).then(handle<{ summary: string }>),

  analyzeInsights: (context: string, data: any[]) =>
    fetchWithAuth(`${API_BASE_URL}/api/v1/transactions/analyze-insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, data }),
    }).then(handle<{ insight: string }>),
};
