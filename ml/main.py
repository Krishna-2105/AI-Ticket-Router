"""
==============================================================================
File: ml/main.py
Description: FastAPI Microservice for Ticket Classification
Purpose: Exposes HTTP REST endpoints (/predict and /health) so the Node.js backend
         can send ticket descriptions and receive ML predictions with confidence scores.

Why this file exists:
- Provides a clean separation of concerns:
    * Node.js handles user sessions, business logic, and MySQL persistence.
    * FastAPI handles ML model execution and high-performance inference.
- Uses Pydantic for automated request/response validation and documentation.
- Demonstrates modern microservice API-to-API communication for technical interviews.
==============================================================================
"""

import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from predict import load_classifier, classify_ticket, DEFAULT_MODEL_PATH

# Load environment variables from .env
load_dotenv()

PORT = int(os.getenv("PORT", 8000))
MODEL_PATH = os.getenv("MODEL_PATH", DEFAULT_MODEL_PATH)
if not os.path.isabs(MODEL_PATH):
    MODEL_PATH = os.path.join(os.path.dirname(__file__), MODEL_PATH)

# ------------------------------------------------------------------------------
# Lifespan Context Manager
# ------------------------------------------------------------------------------
# Pre-loads the ML model into memory when FastAPI starts up, avoiding cold-start
# latency on the first HTTP request.
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("       FASTAPI ML PREDICTION SERVICE STARTING UP")
    print("=" * 60)
    try:
        load_classifier(MODEL_PATH)
        print("[Lifespan] ML model loaded and ready to serve predictions.")
    except Exception as e:
        print(f"[Lifespan WARNING] Could not load model: {e}")
        print("[Lifespan WARNING] Ensure 'python train.py' has been executed.")
    yield
    print("[Lifespan] FastAPI ML service shutting down.")

# Initialize FastAPI application
app = FastAPI(
    title="AI Customer Support - ML Service",
    description="Microservice providing TF-IDF + Logistic Regression classification for customer support tickets.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Pydantic Request & Response Schemas
# ------------------------------------------------------------------------------
# Why Pydantic?
# Pydantic validates incoming JSON against strict Python types and automatically
# serializes output objects into clean JSON payloads with Swagger / OpenAPI docs.

class TicketRequest(BaseModel):
    ticket: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Customer support ticket problem description.",
        example="Money was deducted from my account but my order failed."
    )

class TicketResponse(BaseModel):
    category: str = Field(
        ...,
        description="Predicted category: Payment, Refund, Account, Technical, Delivery, or Other.",
        example="Payment"
    )
    confidence: float = Field(
        ...,
        description="Confidence score between 0.0000 and 1.0000.",
        example=0.6960
    )

class HealthResponse(BaseModel):
    status: str = Field(..., example="ML service is running")

# ------------------------------------------------------------------------------
# API Endpoints
# ------------------------------------------------------------------------------

@app.get("/", tags=["Info"])
def root_info():
    """Returns basic service metadata and welcome message."""
    return {
        "service": "AI Customer Support ML Microservice",
        "model": "TF-IDF + Logistic Regression",
        "categories": ["Payment", "Refund", "Account", "Technical", "Delivery", "Other"],
        "docs_url": "/docs",
        "health_url": "/health"
    }

@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """
    Health check endpoint.
    Used by Express backend and monitoring tools to verify the ML service is alive.
    """
    return {"status": "ML service is running"}

@app.post("/predict", response_model=TicketResponse, status_code=status.HTTP_200_OK, tags=["Prediction"])
def predict_ticket_category(payload: TicketRequest):
    """
    Predicts the category of a support ticket along with a confidence score.

    Workflow:
    1. Receives ticket description string in JSON body.
    2. Passes text through TF-IDF Vectorizer to extract numerical features.
    3. Runs Logistic Regression inference to predict class probabilities.
    4. Identifies argmax class and highest probability (confidence).
    5. Returns JSON response: { "category": "...", "confidence": 0.xx }.
    """
    try:
        result = classify_ticket(payload.ticket, model_path=MODEL_PATH)
        return TicketResponse(
            category=result["category"],
            confidence=result["confidence"]
        )
    except FileNotFoundError as fnf_err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model artifact not found: {str(fnf_err)}. Run 'python train.py' to generate."
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(err)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
