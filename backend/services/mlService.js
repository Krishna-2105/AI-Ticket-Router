/**
 * ==============================================================================
 * File: backend/services/mlService.js
 * Description: Client Service for ML Model Prediction (HTTP REST + Local Fallback)
 * Purpose: Handles communication between Node.js Express and the Python ML Pipeline.
 *
 * Why this file exists:
 * - Decouples machine learning inference from web server business logic.
 * - Multi-Tier Resilience:
 *     Tier 1: High-performance HTTP REST call to FastAPI (http://localhost:8000/predict).
 *     Tier 2: Direct local Python runner fallback (python predict.py) if FastAPI server is offline.
 *     Tier 3: Graceful degradation: Assigns category 'Other' (confidence 0.0) so customer
 *             tickets are NEVER lost even during an outage.
 * ==============================================================================
 */

const axios = require('axios');
const { execFile } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';
const ML_REQUEST_TIMEOUT_MS = 3000;

// Path to standalone Python predictor script
const PREDICT_SCRIPT_PATH = path.resolve(__dirname, '../../ml/predict.py');

/**
 * Predicts ticket category using local Python script when HTTP service is unreachable.
 */
function predictLocallyViaPython(ticketDescription) {
  return new Promise((resolve) => {
    execFile(
      'python3',
      [PREDICT_SCRIPT_PATH, ticketDescription],
      { timeout: 4000 },
      (error, stdout) => {
        if (error || !stdout) {
          return resolve({
            category: 'Other',
            confidence: 0.0,
            ml_available: false,
            mode: 'safe-fallback'
          });
        }

        try {
          // Parse output from predict.py:
          // "Predicted Category: Payment"
          // "Confidence Score  : 69.60%"
          const catMatch = stdout.match(/Predicted Category:\s*([A-Za-z]+)/);
          const confMatch = stdout.match(/Confidence Score\s*:\s*([\d\.]+)%/);

          const category = catMatch ? catMatch[1].trim() : 'Other';
          const confidence = confMatch ? parseFloat(confMatch[1]) / 100 : 0.0;

          resolve({
            category,
            confidence: roundToFour(confidence),
            ml_available: true,
            mode: 'python-direct'
          });
        } catch (e) {
          resolve({
            category: 'Other',
            confidence: 0.0,
            ml_available: false,
            mode: 'safe-fallback'
          });
        }
      }
    );
  });
}

function roundToFour(num) {
  return Math.round(num * 10000) / 10000;
}

/**
 * Sends customer ticket description to FastAPI and returns predicted category & confidence.
 *
 * @param {string} ticketDescription - Problem text submitted by the customer.
 * @returns {Promise<{category: string, confidence: number, ml_available: boolean}>}
 */
async function predictTicketCategory(ticketDescription) {
  // 1. Attempt Primary Tier: HTTP REST API to FastAPI
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/predict`,
      { ticket: ticketDescription },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: ML_REQUEST_TIMEOUT_MS
      }
    );

    const { category, confidence } = response.data;
    return {
      category: category || 'Other',
      confidence: typeof confidence === 'number' ? roundToFour(confidence) : 0.0,
      ml_available: true,
      mode: 'fastapi-http'
    };
  } catch (httpError) {
    // 2. Secondary Tier: Fallback to direct Python runner
    console.warn(`[ML Service] FastAPI HTTP unreachable (${httpError.message}). Trying direct Python runner...`);
    const localResult = await predictLocallyViaPython(ticketDescription);
    if (localResult.ml_available) {
      console.log(`[ML Service] Direct Python runner predicted: ${localResult.category} (${localResult.confidence * 100}%)`);
      return localResult;
    }

    // 3. Tertiary Tier: Safe default
    console.warn('[ML Service] Python runner unavailable. Assigning default category "Other" (0.00 confidence).');
    return {
      category: 'Other',
      confidence: 0.0,
      ml_available: false,
      mode: 'safe-fallback'
    };
  }
}

/**
 * Checks if the FastAPI ML microservice is online via /health.
 */
async function checkMlServiceHealth() {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 1500 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

module.exports = {
  predictTicketCategory,
  checkMlServiceHealth
};
