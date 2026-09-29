"""
Unit and integration test for FastAPI ML service
"""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ML service is running"
    print("✓ Health check test passed:", data)

def test_predict_payment():
    response = client.post("/predict", json={"ticket": "Money was deducted from my account but order failed"})
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "Payment"
    assert 0.0 <= data["confidence"] <= 1.0
    print("✓ Payment ticket test passed:", data)

def test_predict_delivery():
    response = client.post("/predict", json={"ticket": "Where is my package? The courier delivery is delayed."})
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "Delivery"
    print("✓ Delivery ticket test passed:", data)

def test_predict_account():
    response = client.post("/predict", json={"ticket": "I forgot my password and cannot login to my account."})
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "Account"
    print("✓ Account ticket test passed:", data)

if __name__ == "__main__":
    print("Running ML Service tests...")
    test_health()
    test_predict_payment()
    test_predict_delivery()
    test_predict_account()
    print("All ML service tests passed successfully!")
