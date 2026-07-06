import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "vi";

const dict = {
  en: {
    appName: "Ledger",
    tagline: "Smart expense management",
    nav_dashboard: "Dashboard",
    nav_history: "History",
    nav_add: "Add expense",
    nav_scan: "Scan invoice",
    dashboard_title: "Where your money went",
    dashboard_subtitle: "A breakdown of spending across categories.",
    monthly_trend: "Monthly Trend",
    total: "Total spent",
    by_category: "By category",
    no_data: "No transactions yet. Add one to begin.",
    loading: "Loading\u2026",
    error: "Something went wrong",
    retry: "Try again",
    add_title: "Add an expense",
    add_subtitle: "Log a transaction by hand.",
    amount: "Amount",
    category: "Category",
    note: "Note",
    note_placeholder: "Optional note",
    submit: "Save expense",
    saving: "Saving\u2026",
    saved: "Expense saved",
    scan_title: "Scan an invoice",
    scan_subtitle: "Drop a receipt photo and let OCR do the rest.",
    drop_here: "Drop image here, or click to choose",
    formats: "PNG, JPG up to ~10MB",
    uploading: "Reading invoice\u2026",
    pick_file: "Choose file",
    parsed_as: "Parsed as",
    language: "Language",
    history_title: "Transaction History",
    history_subtitle: "Manage your past expenses.",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    date: "Date",
    actions: "Actions",
    edit_title: "Edit transaction",
    delete_selected: "Delete Selected",
    capture: "Capture",
    retake: "Retake",
    camera_error: "Cannot access camera. Please allow permissions.",
    use_upload: "Use upload instead",
    open_camera: "Open Camera",
    smart_entry_placeholder: "Type natural language (e.g., Coffee 50k)",
    smart_entry_button: "Analyze with AI",
    analyzing: "Analyzing...",
  },
  vi: {
    appName: "S\u1ed5 Chi",
    tagline: "Qu\u1ea3n l\u00fd chi ti\u00eau th\u00f4ng minh",
    nav_dashboard: "Tổng quan",
    nav_history: "Lịch sử",
    nav_add: "Thêm chi tiêu",
    nav_scan: "Quét hóa đơn",
    dashboard_title: "Tiền của bạn đã đi đâu",
    dashboard_subtitle: "Phân tích chi tiêu theo từng danh mục.",
    monthly_trend: "Xu hướng hàng tháng",
    total: "Tổng chi",
    by_category: "Theo danh m\u1ee5c",
    no_data: "Ch\u01b0a c\u00f3 giao d\u1ecbch. H\u00e3y th\u00eam m\u1ed9t kho\u1ea3n.",
    loading: "\u0110ang t\u1ea3i\u2026",
    error: "\u0110\u00e3 x\u1ea3y ra l\u1ed7i",
    retry: "Th\u1eed l\u1ea1i",
    add_title: "Th\u00eam chi ti\u00eau",
    add_subtitle: "Ghi nh\u1eadn m\u1ed9t giao d\u1ecbch th\u1ee7 c\u00f4ng.",
    amount: "S\u1ed1 ti\u1ec1n",
    category: "Danh m\u1ee5c",
    note: "Ghi ch\u00fa",
    note_placeholder: "Ghi ch\u00fa t\u00f9y ch\u1ecdn",
    submit: "L\u01b0u chi ti\u00eau",
    saving: "\u0110ang l\u01b0u\u2026",
    saved: "\u0110\u00e3 l\u01b0u chi ti\u00eau",
    scan_title: "Qu\u00e9t h\u00f3a \u0111\u01a1n",
    scan_subtitle: "Th\u1ea3 \u1ea3nh h\u00f3a \u0111\u01a1n, OCR s\u1ebd lo ph\u1ea7n c\u00f2n l\u1ea1i.",
    drop_here: "Th\u1ea3 \u1ea3nh v\u00e0o \u0111\u00e2y, ho\u1eb7c nh\u1ea5p \u0111\u1ec3 ch\u1ecdn",
    formats: "PNG, JPG t\u1ed1i \u0111a ~10MB",
    uploading: "\u0110ang \u0111\u1ecdc h\u00f3a \u0111\u01a1n\u2026",
    pick_file: "Ch\u1ecdn t\u1eadp tin",
    parsed_as: "Kết quả",
    language: "Ngôn ngữ",
    history_title: "Lịch sử giao dịch",
    history_subtitle: "Quản lý các khoản chi tiêu của bạn.",
    edit: "Sửa",
    delete: "Xóa",
    save: "Lưu",
    cancel: "Hủy",
    date: "Ngày",
    actions: "Thao tác",
    edit_title: "Sửa giao dịch",
    delete_selected: "Xóa mục đã chọn",
    capture: "Chụp ảnh",
    retake: "Chụp lại",
    camera_error: "Không thể truy cập camera. Vui lòng cấp quyền.",
    use_upload: "Dùng tính năng tải lên",
    open_camera: "Mở Camera",
    smart_entry_placeholder: "Nhập chi tiêu bằng lời nói (VD: Uống trà sữa 35k)...",
    smart_entry_button: "Phân tích bằng AI",
    analyzing: "Đang phân tích...",
  },
} as const;

type Key = keyof typeof dict.en;

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    if (saved === "en" || saved === "vi") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (k: Key) => dict[lang][k] ?? dict.en[k];

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
}
