# 💰 AI Expense Manager (Quản Lý Chi Tiêu Thông Minh)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green)
![Capacitor](https://img.shields.io/badge/Capacitor-Ready-blueviolet)

AI Expense Manager là một ứng dụng quản lý tài chính cá nhân đa nền tảng (Web/Mobile), kết hợp sức mạnh của Trí tuệ Nhân tạo (AI) để giúp việc ghi chép và theo dõi chi tiêu trở nên nhàn rỗi, thú vị hơn bao giờ hết.

## ✨ Tính năng nổi bật

- 🤖 **AI Smart Entry:** Nhập liệu siêu tốc bằng ngôn ngữ tự nhiên. Chỉ cần gõ *"Ăn phở 40k lúc 8h sáng"*, AI (Llama 3) sẽ tự động bóc tách số tiền, danh mục, thời gian và ghi chú chính xác.
- 📸 **Scan Hóa Đơn (OCR):** Tự động đọc dữ liệu từ ảnh chụp hóa đơn (hỗ trợ cả định dạng HEIC của iOS) và trích xuất số tiền thanh toán.
- 💅 **Giao diện Hiện đại & Dark Mode:** UI/UX được chăm chút tỉ mỉ với TailwindCSS, hỗ trợ Dark Mode chuẩn native và mượt mà.
- 📊 **Phân tích Trực quan:** Các biểu đồ (Pie, Bar, Line) sinh động từ thư viện Recharts giúp bạn nắm bắt cơ cấu danh mục, xu hướng theo tháng và thói quen tiêu tiền theo từng khung giờ trong ngày.
- 💡 **AI Insight (Trợ lý "xéo xắt"):** Không chỉ là những con số khô khan, AI sẽ đóng vai một chuyên gia tài chính hài hước, châm biếm nhẹ nhàng để cảnh tỉnh mỗi khi bạn tiêu lố tay cho trà sữa hay mua sắm.
- 📱 **Mobile Ready:** Sẵn sàng build ra app iOS/Android thông qua Capacitor với hiệu năng cực tốt.
- 💱 **Đa Tiền Tệ:** Hỗ trợ linh hoạt chuyển đổi hiển thị giữa VND và USD.

## 🛠️ Công nghệ sử dụng

**Frontend:**
- [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- [TanStack Router](https://tanstack.com/router) & [TanStack Query](https://tanstack.com/query)
- [TailwindCSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/) (Data Visualization)
- [Embla Carousel](https://www.embla-carousel.com/)

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/) (Python)
- [PostgreSQL](https://www.postgresql.org/) + [SQLAlchemy](https://www.sqlalchemy.org/) (ORM)
- [Groq API](https://groq.com/) (Chạy model LLaMA 3 cho xử lý ngôn ngữ tự nhiên)
- Tesseract OCR & Pillow (Xử lý ảnh)

## 🚀 Hướng dẫn Cài đặt & Chạy dự án

### 1. Yêu cầu hệ thống
- Node.js (v18+)
- Python (3.10+)
- PostgreSQL (Đang chạy local hoặc dùng cloud database như Supabase/Neon)
- Tesseract OCR (Đã cài đặt sẵn trên máy)

### 2. Cài đặt Backend
```bash
cd backend

# Tạo môi trường ảo và cài thư viện
python -m venv venv
source venv/bin/activate  # Hoặc venv\Scripts\activate trên Windows
pip install -r requirements.txt

# Tạo file .env và cấu hình (Xem file .env.example)
# DATABASE_URL=postgresql://user:password@localhost/expense_db
# GROQ_API_KEY=your_groq_api_key

# Chạy server
uvicorn main:app --reload
```

### 3. Cài đặt Frontend
```bash
cd frontend

# Cài đặt thư viện
npm install

# Tạo file .env và trỏ API URL về Backend
# VITE_API_URL=http://localhost:8000

# Chạy server phát triển
npm run dev
```

## 📱 Build cho Mobile (Capacitor)
Dự án đã được tích hợp sẵn Capacitor để dễ dàng chuyển đổi thành ứng dụng di động thực thụ.

```bash
cd frontend
npm run build
npx cap sync
npx cap open ios      # Mở Xcode để build iOS
npx cap open android  # Mở Android Studio để build Android
```

## 📜 License
Dự án được phân phối dưới giấy phép MIT. Bạn có thể tự do sử dụng và chỉnh sửa cho mục đích cá nhân.
