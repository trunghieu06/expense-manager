import re
import os
import json
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

class ExpenseInfo(BaseModel):
    amount: float = Field(description="Số tiền trích xuất được")
    currency: str = Field(description="Loại tiền tệ, mặc định VND")
    category: str = Field(description="Danh mục chi tiêu chính xác theo danh sách cho phép")
    note: str = Field(description="Nội dung rút gọn của chi tiêu")
    created_at: str = Field(description="Thời gian chi tiêu định dạng ISO 8601 (YYYY-MM-DDTHH:mm:ss)")

class AIService:
    @staticmethod
    def parse_smart_entry(text: str) -> dict:
        api_key = os.environ.get("GROQ_API_KEY")
        if api_key and api_key != "YOUR_OPENAI_API_KEY_HERE" and OpenAI:
            try:
                client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
                now = datetime.now()
                
                categories_list = [
                    "Ăn uống (Cơ bản)", "Nhà ở", "Di chuyển", "Học tập & Công việc", "Sức khỏe",
                    "Ăn uống (Hưởng thụ)", "Mua sắm / Quần áo", "Giải trí", "Giao lưu & Mối quan hệ", 
                    "Chăm sóc cá nhân", "Khác"
                ]
                
                prompt = f"""
Trích xuất thông tin chi tiêu từ câu: '{text}'.
- Trả về ĐÚNG MỘT JSON OBJECT với các trường: amount (số), currency (VND), category (chuỗi), note (chuỗi), created_at (chuỗi định dạng YYYY-MM-DDTHH:mm:ss).
- Thời gian hiện tại là: {now.isoformat()}. Suy luận ngày giờ 'created_at' dựa trên thời gian hiện tại (VD: 'hôm qua' trừ đi 1 ngày, 'sáng nay' là 08:00 hôm nay...).
- Danh mục 'category' PHẢI CHÍNH XÁC là một trong các giá trị sau: {', '.join(categories_list)}.
- Lưu ý quy tắc tính tiền: k/cành x1000, xị x100000, củ/tr x1000000. Nếu không có đơn vị, tự lấy số lớn nhất làm tiền.
"""
                
                completion = client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[
                        {"role": "system", "content": "Bạn là trợ lý AI thông minh chuyên phân tích và bóc tách dữ liệu thu chi tài chính. Chỉ trả về chuỗi JSON hợp lệ."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"},
                    max_tokens=500
                )
                
                return json.loads(completion.choices[0].message.content)
            except Exception as e:
                print(f"Lỗi gọi Groq API: {e}. Fallback to Regex.")

        info = {
            "amount": 0.0,
            "currency": "VND",
            "category": "Khác",
            "note": text.strip()
        }
        
        text_lower = text.lower()
        
        # 1. Trích xuất số tiền
        patterns = [
            r'([\d\.\,]+)\s*(k|nghìn|ngàn|cành)\b', # 40k, 50 cành
            r'([\d\.\,]+)\s*(củ|tr|triệu)\b',      # 1 củ, 1.5 tr
            r'([\d\.\,]+)\s*(xị|lít)\b',           # 2 xị (200k)
            r'([\d\.\,]+)\s*(vnd|đ|vnđ)\b',        # 50000đ
            r'\$\s*([\d\.\,]+)'                    # $50
        ]
        
        found_amount = False
        for i, pattern in enumerate(patterns):
            match = re.search(pattern, text_lower)
            if match:
                raw_str = match.group(1).replace(',', '.')
                try:
                    if i in [0, 1, 2]: # k, củ, xị -> decimal point
                        val = float(raw_str)
                    else: # vnd, đ, $ -> thousands separator
                        val = float(raw_str.replace('.', ''))
                        
                    if i == 0: # k, nghìn, ngàn, cành -> * 1000
                        val *= 1000
                    elif i == 1: # củ, tr, triệu -> * 1000000
                        val *= 1000000
                    elif i == 2: # xị, lít -> * 100000
                        val *= 100000
                    elif i == 4: # USD
                        info["currency"] = "USD"
                        
                    info["amount"] = val
                    found_amount = True
                    break
                except ValueError:
                    continue
        
        if not found_amount:
            # Fallback: Find largest raw number
            all_numbers = re.findall(r'\b\d{1,3}(?:[\,\.]\d{3})+\b|\b\d{4,}\b', text)
            if all_numbers:
                numeric_values = [int(re.sub(r'[\,\.]', '', n)) for n in all_numbers]
                if numeric_values:
                    info["amount"] = float(max(numeric_values))

        # 2. Phân loại danh mục
        categories = {
            "Ăn uống (Cơ bản)": ["cơm", "phở", "bún", "chợ", "siêu thị", "nhu yếu phẩm", "bánh mì", "đồ ăn"],
            "Nhà ở": ["nhà", "điện", "nước", "internet", "wifi", "chung cư", "phòng trọ", "rác"],
            "Di chuyển": ["xăng", "grab", "taxi", "gojek", "be", "xe bus", "xe ôm", "gửi xe", "sửa xe", "vé xe", "tàu", "rửa xe"],
            "Học tập & Công việc": ["học phí", "tài liệu", "4g", "3g", "phần mềm", "sách", "khoá học", "học"],
            "Sức khỏe": ["thuốc", "khám bệnh", "bảo hiểm", "bệnh viện", "y tế", "khám"],
            "Ăn uống (Hưởng thụ)": ["cafe", "cà phê", "trà sữa", "nhà hàng", "nhậu", "bia", "ăn ngoài", "highland", "starbuck"],
            "Mua sắm / Quần áo": ["mua sắm", "quần áo", "giày", "dép", "công nghệ", "shopee", "lazada", "tiki", "áo", "quần", "phụ kiện"],
            "Giải trí": ["xem phim", "netflix", "spotify", "game", "nạp game", "du lịch", "karaoke", "vé xem phim"],
            "Giao lưu & Mối quan hệ": ["quà", "đám cưới", "sinh nhật", "bạn bè", "người yêu", "mừng cưới", "thăm"],
            "Chăm sóc cá nhân": ["cắt tóc", "mỹ phẩm", "gym", "spa", "thể thao", "yoga", "làm đẹp"]
        }
        
        for cat, keywords in categories.items():
            # Check word boundaries for exact match or substring depending on context
            if any(re.search(r'\b' + kw + r'\b', text_lower) for kw in keywords):
                info["category"] = cat
                break
                
        # 3. Trích xuất ngày giờ
        now = datetime.now()
        target_date = now.date()
        target_time = now.time()
        
        # 3.1. Tìm ngày cụ thể: 15/7, 15/07/2026, ngày 15 tháng 7
        date_match = re.search(r'(?:ngày\s+)?(\d{1,2})(?:\s*tháng\s*|\/|\-)(\d{1,2})(?:(?:\s*năm\s*|\/|\-)(\d{4}))?', text_lower)
        if date_match:
            d, m = int(date_match.group(1)), int(date_match.group(2))
            y = int(date_match.group(3)) if date_match.group(3) else now.year
            try:
                target_date = datetime(y, m, d).date()
            except ValueError:
                pass
        else:
            # 3.2. Tìm ngày tương đối
            if re.search(r'\b(?:hôm\s+)?qua\b|\btối\s+qua\b|\bsáng\s+qua\b|\bchiều\s+qua\b|\bđêm\s+qua\b', text_lower):
                target_date = (now - timedelta(days=1)).date()
            elif re.search(r'\b(?:hôm\s+)?kia\b', text_lower):
                target_date = (now - timedelta(days=2)).date()
            elif re.search(r'\b(?:ngày\s+)?mai\b', text_lower):
                target_date = (now + timedelta(days=1)).date()
            
        # 3.3. Tìm giờ cụ thể: 10h30, 14h, 15:30
        time_match = re.search(r'\b(\d{1,2})h(\d{1,2})?\b|\b(\d{1,2}):(\d{2})\b', text_lower)
        time_set = False
        if time_match:
            h_str = time_match.group(1) or time_match.group(3)
            m_str = time_match.group(2) or time_match.group(4) or '0'
            h, m_val = int(h_str), int(m_str)
            if 0 <= h <= 23 and 0 <= m_val <= 59:
                target_time = datetime(2000, 1, 1, h, m_val).time()
                time_set = True
                
        # 3.4. Tìm buổi trong ngày
        if not time_set:
            if re.search(r'\bsáng\b', text_lower):
                target_time = datetime(2000, 1, 1, 8, 0).time()
            elif re.search(r'\btrưa\b', text_lower):
                target_time = datetime(2000, 1, 1, 12, 0).time()
            elif re.search(r'\bchiều\b', text_lower):
                target_time = datetime(2000, 1, 1, 15, 0).time()
            elif re.search(r'\btối\b', text_lower):
                target_time = datetime(2000, 1, 1, 20, 0).time()
            elif re.search(r'\bđêm\b', text_lower):
                target_time = datetime(2000, 1, 1, 22, 0).time()
                
        target_datetime = datetime.combine(target_date, target_time)
        info["created_at"] = target_datetime.isoformat()
                
        return info

    @staticmethod
    def generate_daily_summary(transactions: list[dict], date_str: str) -> str:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key or api_key == "YOUR_OPENAI_API_KEY_HERE" or not OpenAI:
            return "Vui lòng cấu hình API Key trong file .env để AI có thể tóm tắt ngày của bạn nhé!"
            
        if not transactions:
            return "Bạn chưa có chi tiêu nào trong ngày này."
            
        try:
            client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
            
            # Format transactions for the prompt
            tx_list_str = "\n".join([
                f"- {datetime.fromisoformat(tx['created_at']).strftime('%H:%M')}: {tx['amount']:,.0f} {tx['currency']} cho {tx['category']} (Ghi chú: {tx.get('note', 'Không có')})"
                for tx in sorted(transactions, key=lambda x: x['created_at'])
            ])
            
            prompt = f"""
Dưới đây là danh sách chi tiêu trong ngày {date_str} của tôi, được sắp xếp theo thời gian từ sáng đến tối:
{tx_list_str}

Hãy viết một đoạn văn ngắn (khoảng 2-3 câu) kể lại diễn biến chi tiêu trong ngày của tôi một cách sinh động, thân thiện và tự nhiên. Chỉ trả về nội dung đoạn văn, không thêm các câu mào đầu như 'Đây là tóm tắt...'.
"""
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "Bạn là trợ lý AI tài chính cá nhân thân thiện. Nhiệm vụ của bạn là kể lại một ngày chi tiêu của người dùng thành một câu chuyện ngắn gọn."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=250
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"Lỗi khi tạo Daily Summary: {e}")
            return "Hiện tại AI đang bận hoặc hết hạn mức. Vui lòng thử lại sau nhé!"
