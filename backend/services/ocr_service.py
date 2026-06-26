import re
import io
import pytesseract
from PIL import Image

class OCRService:
    @staticmethod
    def process_image(file_bytes: bytes) -> str:
        """
        Xử lý file ảnh bằng Tesseract OCR.
        """
        try:
            image = Image.open(io.BytesIO(file_bytes))
            # Sử dụng pytesseract để nhận diện chữ
            # Nếu máy chưa cài gói ngôn ngữ tiếng Việt, có thể xoá lang='vie+eng' hoặc cài thêm
            text = pytesseract.image_to_string(image, lang='vie+eng')
            return text
        except Exception as e:
            print(f"Lỗi OCR: {e}")
            return ""
    @staticmethod
    def extract_info(text: str) -> dict:
        """
        Trích xuất số tiền và phân loại dựa trên nội dung OCR.
        """
        info = {
            "amount": 0.0,
            "currency": "VND",
            "category": "Other",
            "note": ""
        }
        
        # 1. Tìm từ dưới lên (reverse) các dòng chứa "thanh toán", "tổng", "total", "téng"
        # Bắt từ dưới lên giúp lấy được "Tổng thanh toán cuối cùng" thay vì "Tổng tiền hàng" chưa giảm giá
        lines = text.lower().split('\n')
        for line in reversed(lines):
            if "thanh toán" in line or "tổng" in line or "total" in line or "téng" in line:
                numbers = re.findall(r'[\d\.\,]+', line)
                if numbers:
                    val = re.sub(r'[\,\.]', '', numbers[-1])
                    # Phải lớn hơn 100 để tránh các dòng như "Tổng SL: 41" bị nhận nhầm
                    if val.isdigit() and int(val) > 100:
                        info["amount"] = float(val)
                        break
        
        # 2. Nếu chưa tìm thấy, tìm số có định dạng hàng nghìn lớn nhất (ví dụ: 10,000 hay 545.000)
        # Giúp bắt được tổng tiền ngay cả khi không có từ khóa
        if info["amount"] == 0:
            all_numbers = re.findall(r'\b\d{1,3}(?:[\,\.]\d{3})+\b', text)
            if all_numbers:
                numeric_values = [int(re.sub(r'[\,\.]', '', n)) for n in all_numbers]
                if numeric_values:
                    info["amount"] = float(max(numeric_values))

        # 3. Nếu vẫn không được, dùng Regex tìm số có đuôi VND, đ, vnđ
        if info["amount"] == 0:
            amount_match = re.search(r'([\d\.\,]+)\s*(VND|đ|vnđ)\b', text, re.IGNORECASE)
            if amount_match:
                val = re.sub(r'[\,\.]', '', amount_match.group(1))
                if val.isdigit():
                    info["amount"] = float(val)

        # 4. Cuối cùng mới tìm số có tiền tố $ (ưu tiên thấp nhất để tránh nhận nhầm chữ "Số" thành "$")
        if info["amount"] == 0:
            usd_match = re.search(r'\$\s*([\d\.\,]+)', text)
            if usd_match:
                raw_val = usd_match.group(1).replace(',', '')
                try:
                    info["amount"] = float(raw_val)
                    info["currency"] = "USD"
                except:
                    pass
            
        # Phân loại tự động dựa trên từ khóa
        text_lower = text.lower()
        if "coffee" in text_lower or "cafe" in text_lower or "ăn" in text_lower or "uống" in text_lower or "bánh" in text_lower or "sữa" in text_lower:
            info["category"] = "Eating"
        elif "grab" in text_lower or "taxi" in text_lower or "bus" in text_lower:
            info["category"] = "Transport"
        elif "siêu thị" in text_lower or "mart" in text_lower or "tạp hóa" in text_lower:
            info["category"] = "Shopping"
            
        return info
