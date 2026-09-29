"""
==============================================================================
File: ml/train.py
Description: ML Training Pipeline for Ticket Classification
Purpose: Trains a Scikit-Learn TF-IDF + Logistic Regression pipeline on
         customer support tickets and saves the model artifact for inference.

Why this file exists:
- Implements beginner-friendly Classical NLP without complex deep learning.
- Demonstrates supervised text classification for software engineering/ML interviews.
- Uses TF-IDF for feature extraction and Logistic Regression for classification.
==============================================================================
"""

import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix,
)

def train_ticket_classifier(
    data_path: str = "data/tickets.csv",
    model_output_path: str = "models/ticket_classifier.pkl",
    random_state: int = 42
):
    """
    Loads dataset, splits into train/test sets, builds a Scikit-learn Pipeline
    with TF-IDF and Logistic Regression, trains the model, evaluates performance,
    and serializes the pipeline using Joblib.
    """
    print("=" * 70)
    print("      AI CUSTOMER SUPPORT SYSTEM - ML MODEL TRAINING PIPELINE")
    print("=" * 70)

    # --------------------------------------------------------------------------
    # Step 1: Load Dataset using Pandas
    # --------------------------------------------------------------------------
    # What it does: Reads the CSV file into a DataFrame.
    # Why it is needed: Machine learning models require structured tabular data.
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Training data not found at {data_path}. Please generate it first.")

    print(f"\n[1/7] Loading dataset from: {data_path}")
    df = pd.read_csv(data_path)

    # Clean missing values if any
    df.dropna(subset=["text", "category"], inplace=True)
    total_samples = len(df)
    print(f"      Total samples loaded: {total_samples}")

    # Inspect category distribution
    category_counts = df["category"].value_counts()
    print("\n      Class Distribution:")
    for cat, count in category_counts.items():
        print(f"      - {cat:<12}: {count} samples ({count/total_samples*100:.1f}%)")

    # --------------------------------------------------------------------------
    # Step 2: Separate Features (X) and Labels (y)
    # --------------------------------------------------------------------------
    # Features (X): The input customer ticket text.
    # Labels (y): The target category we want the model to learn to predict.
    X = df["text"].astype(str)
    y = df["category"].astype(str)

    # --------------------------------------------------------------------------
    # Step 3: Train / Test Split
    # --------------------------------------------------------------------------
    # What it does: Splits data into 80% training (for learning) and 20% test (for evaluation).
    # Why it is needed: Evaluates how well the model generalizes to unseen tickets.
    # 'stratify=y' ensures balanced distribution of all categories in both splits.
    # 'random_state=42' ensures reproducible results every time the script runs.
    print(f"\n[2/7] Splitting data into 80% train and 20% test sets (random_state={random_state})...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.20,
        random_state=random_state,
        stratify=y
    )
    print(f"      Training set size : {len(X_train)} samples")
    print(f"      Testing set size  : {len(X_test)} samples")

    # --------------------------------------------------------------------------
    # Step 4: Define Scikit-Learn Pipeline
    # --------------------------------------------------------------------------
    # What is a Pipeline?
    # A Pipeline chains data transformation and classification into a single unified object.
    # When predicting new tickets, raw text automatically flows through TF-IDF -> Logistic Regression.
    #
    # Component A: TfidfVectorizer
    # - Converts text into numerical feature vectors.
    # - TF (Term Frequency): How frequently a word appears in the current ticket.
    # - IDF (Inverse Document Frequency): Downweights common words like 'the', 'is'
    #   and boosts informative words like 'refund', 'crash', 'delayed'.
    # - 'ngram_range=(1, 2)': Extracts both individual words ("refund") and word pairs ("not received").
    # - 'max_features=5000': Limits vocabulary size to keep the model fast and lightweight.
    # - 'stop_words='english'': Removes common non-discriminative English words.
    #
    # Component B: LogisticRegression
    # - A linear classifier that calculates probabilities using the softmax function.
    # - 'max_iter=1000' allows gradient descent / optimizer to converge smoothly.
    # - 'C=1.0' controls L2 regularization strength to prevent overfitting.
    print("\n[3/7] Building Scikit-Learn Pipeline (TF-IDF + Logistic Regression)...")
    pipeline = Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                ngram_range=(1, 2),
                max_features=5000,
                stop_words="english",
                lowercase=True
            ),
        ),
        (
            "classifier",
            LogisticRegression(
                max_iter=1000,
                random_state=random_state,
                C=3.0,
                solver="lbfgs"
            ),
        ),
    ])

    # --------------------------------------------------------------------------
    # Step 5: Train the Model (Fitting)
    # --------------------------------------------------------------------------
    # The pipeline fits TF-IDF vocabulary on X_train and learns the linear weights
    # for each category in Logistic Regression.
    print("\n[4/7] Training pipeline on training set...")
    pipeline.fit(X_train, y_train)
    print("      Training complete!")

    # --------------------------------------------------------------------------
    # Step 6: Evaluate on Test Set
    # --------------------------------------------------------------------------
    print("\n[5/7] Evaluating model performance on unseen test data...")
    y_pred = pipeline.predict(X_test)

    # Core Metrics:
    # - Accuracy: Total correct predictions / Total test samples
    # - Precision: When model predicts class C, how often is it right?
    # - Recall: Out of all actual class C samples, how many did the model catch?
    # - F1-score: Harmonic mean of Precision and Recall.
    acc = accuracy_score(y_test, y_pred)
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="weighted")

    print("\n" + "=" * 50)
    print(f"Accuracy : {acc * 100:.2f}%")
    print(f"Precision: {prec * 100:.2f}% (weighted)")
    print(f"Recall   : {rec * 100:.2f}% (weighted)")
    print(f"F1-Score : {f1 * 100:.2f}% (weighted)")
    print("=" * 50)

    print("\nDetailed Classification Report:")
    print(classification_report(y_test, y_pred, digits=4))

    labels = sorted(list(set(y_test)))
    cm = confusion_matrix(y_test, y_pred, labels=labels)
    print("Confusion Matrix:")
    header = f"{'Actual \\ Pred':<14} " + " ".join([f"{l[:7]:>7}" for l in labels])
    print(header)
    print("-" * len(header))
    for idx, row in enumerate(cm):
        row_str = " ".join([f"{val:>7}" for val in row])
        print(f"{labels[idx]:<14} {row_str}")

    # --------------------------------------------------------------------------
    # Step 7: Save Model Artifact using Joblib
    # --------------------------------------------------------------------------
    # Why Joblib?
    # Joblib is optimized for serializing large NumPy arrays and Scikit-learn pipelines.
    # The saved .pkl file contains both the TF-IDF vocabulary and trained weights.
    print(f"\n[6/7] Saving trained pipeline to: {model_output_path}")
    os.makedirs(os.path.dirname(model_output_path), exist_ok=True)
    joblib.dump(pipeline, model_output_path)
    print("      Model saved successfully!")

    # --------------------------------------------------------------------------
    # Verification with Sample Inference
    # --------------------------------------------------------------------------
    print("\n[7/7] Running test predictions on sample tickets:")
    test_samples = [
        "Money was deducted from my account but my order failed.",
        "I have not received my refund after returning the package.",
        "I forgot my password and cannot login to my account.",
        "The web application keeps crashing on Safari browser.",
        "Where is my package? The courier tracking is delayed.",
        "Where are your corporate headquarters located?",
    ]

    for sample in test_samples:
        # predict_proba returns the probability distribution across all classes
        probs = pipeline.predict_proba([sample])[0]
        classes = pipeline.classes_
        top_idx = int(np.argmax(probs))
        pred_cat = classes[top_idx]
        confidence = float(probs[top_idx])

        print(f"\n      Ticket: \"{sample}\"")
        print(f"      → Predicted: {pred_cat} (Confidence: {confidence * 100:.2f}%)")

    print("\n" + "=" * 70)
    print("                TRAINING COMPLETED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    train_ticket_classifier(
        data_path="data/tickets.csv",
        model_output_path="models/ticket_classifier.pkl",
        random_state=42
    )
