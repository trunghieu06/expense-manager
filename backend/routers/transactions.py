from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database import get_db
from models.transaction import Transaction
from schemas.transaction import TransactionCreate, TransactionResponse, CategorySummary, TransactionUpdate, MonthlySummary, BulkDeleteRequest
from services.ocr_service import OCRService

import io
from PIL import Image
from pillow_heif import register_heif_opener

# Đăng ký HEIF opener cho Pillow
register_heif_opener()

router = APIRouter(
    prefix="/api/v1/transactions",
    tags=["Transactions"]
)

@router.get("", response_model=List[TransactionResponse])
def get_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    API lấy danh sách các khoản chi tiêu.
    """
    transactions = db.query(Transaction).order_by(Transaction.created_at.desc()).offset(skip).limit(limit).all()
    return transactions

@router.post("/manual", response_model=TransactionResponse)
def add_manual_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    """
    API thêm chi tiêu thủ công thông qua dữ liệu JSON.
    """
    try:
        new_transaction = Transaction(**transaction.model_dump() if hasattr(transaction, 'model_dump') else transaction.dict())
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)
        return new_transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu chi tiêu: {str(e)}")

@router.post("/scan-invoice", response_model=TransactionResponse)
async def scan_invoice(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    API nhận file ảnh hóa đơn, xử lý qua OCR và tự động lưu chi tiêu.
    """
    try:
        # Đọc nội dung file ảnh (bytes)
        file_bytes = await file.read()
        
        # Kiểm tra nếu là file HEIC/HEIF thì chuyển đổi sang JPEG bytes
        if file.filename and file.filename.lower().endswith((".heic", ".heif")):
            image = Image.open(io.BytesIO(file_bytes))
            img_byte_arr = io.BytesIO()
            # Convert sang RGB để lưu dạng JPEG (loại bỏ Alpha channel nếu có)
            image.convert("RGB").save(img_byte_arr, format='JPEG')
            file_bytes = img_byte_arr.getvalue()
            
        # Gọi OCRService giả lập
        ocr_text = OCRService.process_image(file_bytes)
        
        # Trích xuất thông tin từ text
        extracted_data = OCRService.extract_info(ocr_text)
        
        if extracted_data["amount"] == 0:
            raise HTTPException(status_code=400, detail="Không tìm thấy số tiền hợp lệ trong hóa đơn.")
            
        # Lưu vào database
        new_transaction = Transaction(
            amount=extracted_data["amount"],
            currency=extracted_data["currency"],
            category=extracted_data["category"],
            note=extracted_data["note"]
        )
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)
        return new_transaction
        
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý hóa đơn: {str(e)}")

@router.get("/summary", response_model=List[CategorySummary])
def get_transactions_summary(db: Session = Depends(get_db)):
    """
    API thống kê tổng chi tiêu theo nhóm danh mục (category) để vẽ biểu đồ.
    """
    try:
        summary = db.query(
            Transaction.category, 
            Transaction.currency,
            func.sum(Transaction.amount).label("total_amount")
        ).group_by(Transaction.category, Transaction.currency).all()
        
        return [{"category": item.category, "currency": item.currency, "total_amount": item.total_amount} for item in summary]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy thống kê: {str(e)}")

@router.get("/monthly-summary", response_model=List[MonthlySummary])
def get_monthly_summary(db: Session = Depends(get_db)):
    """
    API thống kê tổng chi tiêu theo tháng và đơn vị tiền tệ.
    """
    try:
        # Nhóm theo tháng (YYYY-MM) sử dụng hàm của SQLite
        summary = db.query(
            func.strftime('%Y-%m', Transaction.created_at).label("month"),
            Transaction.currency,
            func.sum(Transaction.amount).label("total_amount")
        ).group_by("month", Transaction.currency).all()
        
        return [{"month": item.month, "currency": item.currency, "total_amount": item.total_amount} for item in summary]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy thống kê theo tháng: {str(e)}")

@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """
    API xóa một chi tiêu dựa trên ID.
    """
    db_transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Không tìm thấy chi tiêu.")
    try:
        db.delete(db_transaction)
        db.commit()
        return {"detail": "Đã xóa thành công."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa chi tiêu: {str(e)}")

@router.post("/bulk-delete")
def bulk_delete_transactions(req: BulkDeleteRequest, db: Session = Depends(get_db)):
    """
    API xóa hàng loạt chi tiêu.
    """
    try:
        db.query(Transaction).filter(Transaction.id.in_(req.ids)).delete(synchronize_session=False)
        db.commit()
        return {"detail": f"Đã xóa {len(req.ids)} chi tiêu."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa hàng loạt: {str(e)}")

@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(transaction_id: int, transaction: TransactionUpdate, db: Session = Depends(get_db)):
    """
    API cập nhật thông tin một chi tiêu.
    """
    db_transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Không tìm thấy chi tiêu.")
    try:
        update_data = transaction.model_dump(exclude_unset=True) if hasattr(transaction, 'model_dump') else transaction.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_transaction, key, value)
        
        db.commit()
        db.refresh(db_transaction)
        return db_transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật chi tiêu: {str(e)}")
