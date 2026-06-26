import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app

# Sử dụng in-memory SQLite database cho việc test
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_create_transaction_manual():
    response = client.post(
        "/api/v1/transactions/manual",
        json={"amount": 100000, "category": "Food", "currency": "VND", "note": "Lunch"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == 100000
    assert data["category"] == "Food"
    assert data["currency"] == "VND"
    assert "id" in data

def test_get_transactions():
    # Tạo một transaction
    client.post(
        "/api/v1/transactions/manual",
        json={"amount": 50000, "category": "Transport", "currency": "VND"}
    )
    response = client.get("/api/v1/transactions")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["amount"] == 50000

def test_update_transaction():
    # Tạo một transaction
    create_resp = client.post(
        "/api/v1/transactions/manual",
        json={"amount": 50000, "category": "Transport", "currency": "VND"}
    )
    transaction_id = create_resp.json()["id"]

    # Cập nhật category
    update_resp = client.patch(
        f"/api/v1/transactions/{transaction_id}",
        json={"category": "Travel"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["category"] == "Travel"

def test_delete_transaction():
    # Tạo một transaction
    create_resp = client.post(
        "/api/v1/transactions/manual",
        json={"amount": 50000, "category": "Transport", "currency": "VND"}
    )
    transaction_id = create_resp.json()["id"]

    # Xóa
    del_resp = client.delete(f"/api/v1/transactions/{transaction_id}")
    assert del_resp.status_code == 200

    # Kiểm tra lại danh sách
    get_resp = client.get("/api/v1/transactions")
    assert len(get_resp.json()) == 0

def test_monthly_summary():
    client.post(
        "/api/v1/transactions/manual",
        json={"amount": 50, "category": "Food", "currency": "USD"}
    )
    response = client.get("/api/v1/transactions/monthly-summary")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["currency"] == "USD"
    assert data[0]["total_amount"] == 50
    assert "month" in data[0]
