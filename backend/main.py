from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import transactions, auth
from models import user, transaction
from dotenv import load_dotenv

load_dotenv()

# Khởi tạo bảng trong database (nếu chưa có)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Expense Manager API",
    description="API cho ứng dụng quản lý chi tiêu thông minh hỗ trợ AI OCR",
    version="1.0.0"
)

# Cấu hình CORS cho phép Frontend gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Thay đổi * thành URL của frontend trong thực tế
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký router
app.include_router(transactions.router)
app.include_router(auth.router)

@app.get("/")
def root():
    return {"message": "Chào mừng đến với Smart Expense Manager API. Truy cập /docs để xem API docs."}
git 