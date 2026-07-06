from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database import get_db
from models.transaction import Transaction
from models.user import User
from schemas.transaction import TransactionCreate, TransactionResponse, CategorySummary, TransactionUpdate, MonthlySummary, BulkDeleteRequest, SmartEntryRequest
from services.ocr_service import OCRService
from services.ai_service import AIService
from dependencies import get_current_user

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
def get_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.created_at.desc()).offset(skip).limit(limit).all()
    return transactions

@router.post("/manual", response_model=TransactionResponse)
def add_manual_transaction(transaction: TransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        data = transaction.model_dump(exclude_unset=True) if hasattr(transaction, 'model_dump') else transaction.dict(exclude_unset=True)
        data['user_id'] = current_user.id
        new_transaction = Transaction(**data)
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)
        return new_transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu chi tiêu: {str(e)}")

@router.post("/smart-entry", response_model=dict)
def parse_smart_entry(req: SmartEntryRequest, current_user: User = Depends(get_current_user)):
    try:
        extracted = AIService.parse_smart_entry(req.text)
        return extracted
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý Smart Entry: {str(e)}")

@router.post("/scan-invoice", response_model=TransactionResponse)
async def scan_invoice(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        file_bytes = await file.read()
        if file.filename and file.filename.lower().endswith((".heic", ".heif")):
            image = Image.open(io.BytesIO(file_bytes))
            img_byte_arr = io.BytesIO()
            image.convert("RGB").save(img_byte_arr, format='JPEG')
            file_bytes = img_byte_arr.getvalue()
            
        ocr_text = OCRService.process_image(file_bytes)
        extracted_data = OCRService.extract_info(ocr_text)
        
        if extracted_data["amount"] == 0:
            raise HTTPException(status_code=400, detail="Không tìm thấy số tiền hợp lệ trong hóa đơn.")
            
        new_transaction = Transaction(
            amount=extracted_data["amount"],
            currency=extracted_data["currency"],
            category=extracted_data["category"],
            note=extracted_data["note"],
            user_id=current_user.id
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
def get_transactions_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        summary = db.query(
            Transaction.category, 
            Transaction.currency,
            func.sum(Transaction.amount).label("total_amount")
        ).filter(Transaction.user_id == current_user.id).group_by(Transaction.category, Transaction.currency).all()
        
        return [{"category": item.category, "currency": item.currency, "total_amount": item.total_amount} for item in summary]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy thống kê: {str(e)}")

@router.get("/monthly-summary", response_model=List[MonthlySummary])
def get_monthly_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        summary = db.query(
            func.strftime('%Y-%m', Transaction.created_at).label("month"),
            Transaction.currency,
            func.sum(Transaction.amount).label("total_amount")
        ).filter(Transaction.user_id == current_user.id).group_by("month", Transaction.currency).all()
        
        return [{"month": item.month, "currency": item.currency, "total_amount": item.total_amount} for item in summary]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy thống kê theo tháng: {str(e)}")

@router.get("/daily-summary")
def get_daily_summary(date: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        transactions = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            func.date(Transaction.created_at) == date
        ).all()
        
        tx_list = [
            {
                "amount": tx.amount,
                "currency": tx.currency,
                "category": tx.category,
                "note": tx.note,
                "created_at": tx.created_at.isoformat()
            }
            for tx in transactions
        ]
        
        summary = AIService.generate_daily_summary(tx_list, date)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo tóm tắt ngày: {str(e)}")

@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_transaction = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id).first()
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
def bulk_delete_transactions(req: BulkDeleteRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        db.query(Transaction).filter(Transaction.id.in_(req.ids), Transaction.user_id == current_user.id).delete(synchronize_session=False)
        db.commit()
        return {"detail": f"Đã xóa {len(req.ids)} chi tiêu."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa hàng loạt: {str(e)}")

@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(transaction_id: int, transaction: TransactionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_transaction = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id).first()
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
