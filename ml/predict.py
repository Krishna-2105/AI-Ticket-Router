"""
==============================================================================
File: ml/predict.py
Description: Standalone Prediction Module for Ticket Classification
Purpose: Provides reusable functions to load the trained model pipeline and
         generate class predictions with confidence scores.

Why this file exists:
- Decouples ML inference logic from the web framework (FastAPI).
- Enables testing ticket predictions directly from the command line:
    python predict.py "Money was deducted but order failed"
- Can be imported cleanly into FastAPI (main.py) or test suites.
==============================================================================
"""

import os
import sys
import joblib
import numpy as np

# Default model location relative to the ml directory
DEFAULT_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "ticket_classifier.pkl")

# Cached model instance in memory
_cached_pipeline = None

def load_classifier(model_path: str = DEFAULT_MODEL_PATH):
    """
    Loads the serialized Scikit-learn Pipeline from disk.
    Uses an in-memory cache so subsequent calls don't re-read the file.
    """
    global _cached_pipeline
    if _cached_pipeline is not None:
        return _cached_pipeline

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model artifact not found at '{model_path}'. "
            f"Please run 'python train.py' first to train and save the model."
        )

    print(f"[ML Service] Loading model pipeline from: {model_path}")
    _cached_pipeline = joblib.load(model_path)
    return _cached_pipeline

def classify_ticket(ticket_text: str, model_path: str = DEFAULT_MODEL_PATH) -> dict:
    """
    Classifies a support ticket into one of the 6 categories:
    [Payment, Refund, Account, Technical, Delivery, Other]

    Parameters:
        ticket_text (str): The customer problem description.
        model_path (str): Filepath to the saved .pkl pipeline.

    Returns:
        dict: {
            "category": str,      # e.g., "Payment"
            "confidence": float,  # e.g., 0.9123 (rounded to 4 decimal places)
            "probabilities": dict # class probabilities for all categories
        }
    """
    # 1. Input Validation & Sanitization
    if not ticket_text or not isinstance(ticket_text, str) or not ticket_text.strip():
        return {
            "category": "Other",
            "confidence": 0.0,
            "probabilities": {}
        }

    clean_text = ticket_text.strip()
    pipeline = load_classifier(model_path)

    # 2. Probability Estimation via predict_proba
    # Logistic Regression outputs a probability for each category using the softmax function.
    probabilities = pipeline.predict_proba([clean_text])[0]
    classes = pipeline.classes_

    # 3. Find the category with maximum probability
    best_index = int(np.argmax(probabilities))
    predicted_category = str(classes[best_index])
    confidence_score = float(probabilities[best_index])

    # 4. Construct a dictionary of all class probabilities for transparency/debugging
    all_probs = {
        cls_name: round(float(prob), 4)
        for cls_name, prob in zip(classes, probabilities)
    }

    return {
        "category": predicted_category,
        "confidence": round(confidence_score, 4),
        "probabilities": all_probs
    }

if __name__ == "__main__":
    # Allows testing prediction directly from terminal:
    # Example: python predict.py "I cannot login to my account"
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        query = "Money was deducted from my account but my order failed."

    print("=" * 60)
    print("           STANDALONE TICKET CLASSIFICATION TEST")
    print("=" * 60)
    print(f"Input Ticket: \"{query}\"")
    
    result = classify_ticket(query)
    print(f"Predicted Category: {result['category']}")
    print(f"Confidence Score  : {result['confidence'] * 100:.2f}%")
    print("\nClass Probabilities:")
    for cat, prob in result["probabilities"].items():
        bar = "█" * int(prob * 30)
        print(f"  - {cat:<10}: {prob * 100:>5.2f}% {bar}")
    print("=" * 60)
