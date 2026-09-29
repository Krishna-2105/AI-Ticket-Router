# AI Customer Support System

A complete, beginner-friendly, production-structured full-stack web application with Classical Natural Language Processing (NLP) for automated customer ticket classification.

Built for **software engineering and machine learning internship/junior role portfolio presentations**.

---

## 1. Project Overview

When a customer contacts customer support, sorting and routing tickets manually is slow and error-prone. This application solves that problem:

1. A customer submits a problem description (e.g., *"Money was deducted from my account but my order failed."*).
2. The Node.js backend forwards the text to an isolated Python FastAPI ML service.
3. A Scikit-learn pipeline converts the text to numerical features using **TF-IDF** and classifies it using **Logistic Regression**.
4. The ML service returns the **predicted category** (e.g., `Payment`) and a **confidence score** (e.g., `69.6%` or `94.2%`).
5. The ticket and ML predictions are persisted in **MySQL**.
6. Customers can view their tickets and track resolution status in real-time.
7. Support administrators have a specialized dashboard with department breakdown statistics and status updating controls (`Open` → `In Progress` → `Resolved`).

---

## 2. High-Level Architecture

```text
                      +-----------------------------------+
                      |      React Frontend (Vite)        |
                      |  - Customer Dashboard             |
                      |  - Ticket Submission Form         |
                      |  - Admin Queue & Operations       |
                      +-----------------+-----------------+
                                        |
                         HTTP REST API  |  JSON / JWT Auth
                                        v
                      +-----------------+-----------------+
                      |    Node.js + Express Backend      |
                      |  - Authentication & JWT Token     |
                      |  - Role-Based Authorization       |
                      |  - Ticket CRUD Business Logic     |
                      +--------+------------------+-------+
                               |                  |
                   SQL Queries |                  | HTTP POST /predict
              (mysql2/promise) |                  | (Axios with Timeout)
                               v                  v
                 +-------------+----+     +-------+---------------+
                 |  MySQL Database  |     |   FastAPI ML Service  |
                 |  - users table   |     |   - Pydantic Schemas  |
                 |  - tickets table |     |   - Scikit-learn      |
                 +------------------+     +-------+---------------+
                                                  |
                                                  v
                                      +-----------+---------------+
                                      |    Trained ML Pipeline    |
                                      |  1. TF-IDF Vectorizer     |
                                      |  2. Logistic Regression   |
                                      +---------------------------+
```

### Detailed Ticket Lifecycle Flow

```text
Customer Types Problem Description
               ↓
React Frontend (CreateTicket.jsx)
               ↓ POST /api/tickets (Authorization: Bearer <JWT>)
Express Controller (ticketController.js)
               ↓ POST http://localhost:8000/predict
FastAPI Endpoint (main.py)
               ↓ Text Feature Extraction
TF-IDF Vectorizer (Converts words to numerical weights)
               ↓ Probability Calculation via Softmax
Logistic Regression Classifier (predict_proba)
               ↓ Returns { category: "Payment", confidence: 0.6960 }
Express Receives Prediction
               ↓ INSERT INTO tickets (...) VALUES (...)
MySQL Stores Persistent Record
               ↓ 201 Created Response
React Displays Real-Time Prediction Card with Confidence Bar
               ↓
Admin Dashboard Views Queue and Updates Status (Open -> In Progress -> Resolved)
```

---

## 3. Technology Stack

| Layer | Technologies | Role in System |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, React Router 6, Axios, Vanilla CSS | Single Page App (SPA) with responsive cards, tables, badges |
| **Backend** | Node.js, Express.js, JWT, bcryptjs, mysql2 | REST API, authentication, authorization, business logic |
| **ML Service** | Python 3, FastAPI, Uvicorn, Pydantic | Microservice for model serving and HTTP inference |
| **Machine Learning** | Pandas, Scikit-learn, Joblib | Classical NLP: TF-IDF vectorization & Logistic Regression |
| **Database** | MySQL (with resilient in-memory fallback) | Relational persistence with foreign keys and indexes |

> **IMPORTANT: Why No LLMs or Complex Transformers?**  
> This project deliberately uses **Classical Scikit-learn (TF-IDF + Logistic Regression)** instead of black-box LLMs (OpenAI, Gemini, HuggingFace). This ensures:
> - You can clearly explain every equation, metric, and step in an engineering interview.
> - Zero external API costs and 100% offline inference capability.
> - High speed (sub-millisecond inference times).
> - Fully reproducible results with a fixed `random_state`.

---

## 4. Ticket Categories & Dataset

The model classifies support tickets into 6 primary departments:

| Category | Example Customer Query |
| :--- | :--- |
| **Payment** | *"Money was deducted from my account but my order failed."* |
| **Refund** | *"I returned the defective item 5 days ago, where is my refund?"* |
| **Account** | *"I forgot my password and cannot login to my account."* |
| **Technical** | *"The web application keeps crashing whenever I open checkout."* |
| **Delivery** | *"My package is delayed and tracking has not updated in 4 days."* |
| **Other** | *"Where is your corporate headquarters located?"* |

- **Dataset Location**: `ml/data/tickets.csv`
- **Total Samples**: 390 realistic customer queries (balanced 65 per category).
- **Generation Script**: `python ml/data/generate_dataset.py`

---

## 5. Machine Learning Pipeline Details

### 1. TF-IDF (Term Frequency - Inverse Document Frequency)
- **Term Frequency (TF)**: Measures how frequently a word occurs inside a single ticket description.
- **Inverse Document Frequency (IDF)**: Penalizes words that appear everywhere across all tickets (e.g., `"the"`, `"is"`, `"to"`) and gives high importance to domain-specific discriminative keywords (e.g., `"refund"`, `"crash"`, `"card"`, `"package"`).
- **Parameters**: `ngram_range=(1, 2)` (captures both single words like `"refund"` and bigrams like `"not received"`), `stop_words='english'`, `max_features=5000`.

### 2. Logistic Regression
- A linear classifier extended to multi-class classification via the **Softmax** function.
- Calculates probabilities across all 6 categories using `predict_proba()`.
- The maximum probability becomes the **confidence score**.

### 3. Model Evaluation Results
Evaluated on an unseen 20% stratified test set ($N=78$):
- **Accuracy**: `91.03%`
- **Weighted Precision**: `91.75%`
- **Weighted Recall**: `91.03%`
- **Weighted F1-Score**: `91.09%`

---

## 6. Database Schema (MySQL)

```sql
CREATE DATABASE IF NOT EXISTS ai_support;
USE ai_support;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets table
CREATE TABLE tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Other',
    confidence DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    status ENUM('Open', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tickets_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_category (category),
    INDEX idx_status (status)
);
```

---

## 7. Project Structure

```text
ai-customer-support-system/
│
├── database/
│   ├── schema.sql              # MySQL database tables, constraints, and indexes
│   └── seed.sql                # Initial test users (customer & admin) and sample tickets
│
├── ml/
│   ├── data/
│   │   ├── tickets.csv         # 390 labeled training samples across 6 categories
│   │   └── generate_dataset.py # Standalone dataset generation script
│   ├── models/
│   │   └── ticket_classifier.pkl # Serialized Scikit-learn Pipeline (TF-IDF + LogReg)
│   ├── train.py                # Model training, train/test split, evaluation & export
│   ├── predict.py              # Standalone prediction module with CLI test runner
│   ├── main.py                 # FastAPI microservice (/predict and /health)
│   ├── test_ml_service.py      # Automated tests for FastAPI endpoints
│   ├── requirements.txt        # Python package dependencies
│   ├── .env.example            # ML environment variable template
│   └── .env                    # Local ML configuration
│
├── backend/
│   ├── config/
│   │   └── db.js               # MySQL pool manager with automatic fallback
│   ├── controllers/
│   │   ├── authController.js   # User registration, bcrypt hashing, JWT issuance
│   │   └── ticketController.js # Ticket CRUD, ML integration, and statistics
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT token verification and role checking
│   │   └── errorHandler.js     # Centralized error and 404 handlers
│   ├── routes/
│   │   ├── authRoutes.js       # /api/auth endpoints
│   │   └── ticketRoutes.js     # /api/tickets endpoints
│   ├── services/
│   │   └── mlService.js        # HTTP client to FastAPI with graceful fallback
│   ├── utils/
│   │   └── validator.js        # Input validators for email, password, and status
│   ├── server.js               # Express application entry point
│   ├── test_backend.js         # Automated backend test suite (10 test cases)
│   ├── package.json            # Node.js dependencies and scripts
│   ├── .env.example            # Backend environment variable template
│   └── .env                    # Local backend configuration
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Role-aware navigation header
│   │   │   ├── ProtectedRoute.jsx  # Auth & role route guard
│   │   │   ├── StatusBadge.jsx     # Color-coded badge for ticket status
│   │   │   └── CategoryBadge.jsx   # Color-coded badge for ML categories
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Global authentication provider
│   │   ├── pages/
│   │   │   ├── Login.jsx           # Sign in page with one-click demo credentials
│   │   │   ├── Register.jsx        # Account registration with role selection
│   │   │   ├── Dashboard.jsx       # Customer dashboard with stats & recent tickets
│   │   │   ├── CreateTicket.jsx    # Ticket form with real-time ML prediction view
│   │   │   ├── TicketList.jsx      # Ticket queue with category & status filters
│   │   │   ├── TicketDetails.jsx   # Full ticket details & admin status updater
│   │   │   └── AdminDashboard.jsx  # Admin overview & queue operations
│   │   ├── services/
│   │   │   └── api.js              # Axios instance with JWT interceptor
│   │   ├── App.jsx                 # React Router routing configuration
│   │   ├── main.jsx                # React DOM root render
│   │   └── index.css               # Clean, modern, responsive CSS design
│   ├── index.html                  # HTML entry point
│   ├── vite.config.js              # Vite bundler configuration with backend proxy
│   └── package.json                # Frontend dependencies
│
├── README.md                   # Comprehensive documentation and interview guide
└── .gitignore                  # Git exclusions (node_modules, .env, etc.)
```

---

## 8. API Documentation

### Authentication (`/api/auth`)

| Method | Endpoint | Access | Description | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Registers a new account | `{ name, email, password, role }` |
| `POST` | `/api/auth/login` | Public | Authenticates credentials | `{ email, password }` |
| `GET` | `/api/auth/me` | User | Gets current authenticated user | Header: `Bearer <token>` |

### Tickets (`/api/tickets`)

| Method | Endpoint | Access | Description | Request Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/tickets` | User | Submits ticket, triggers ML prediction | `{ description }` |
| `GET` | `/api/tickets` | User | Lists tickets (own for customer, all for admin) | `?status=Open&category=Payment` |
| `GET` | `/api/tickets/:id` | User | Views details of a specific ticket | URL parameter: `:id` |
| `PATCH` | `/api/tickets/:id/status`| Admin | Updates status (`Open`, `In Progress`, `Resolved`) | `{ status: "Resolved" }` |
| `GET` | `/api/tickets/stats` | User | Gets queue and category counts | None |

### ML Microservice (`FastAPI`)

| Method | Endpoint | Description | Request Body | Response Body |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Health check probe | None | `{"status": "ML service is running"}` |
| `POST` | `/predict` | Predicts ticket category | `{"ticket": "..."}` | `{"category": "Payment", "confidence": 0.696}` |

---

## 9. How to Run the Project (Step-by-Step)

Follow these exact steps to start all three tiers:

### Step 1: Initialize Database (MySQL)

Start your MySQL server and execute the schema:

```bash
# Connect to MySQL and run schema
mysql -u root -p < database/schema.sql

# (Optional) Seed with sample accounts and initial tickets
mysql -u root -p < database/seed.sql
```

> **Note on Portability**: If you don't have MySQL installed yet, the backend automatically detects this and seamlessly operates in **in-memory fallback mode** populated with seed data so you can test immediately!

---

### Step 2: Start the Python ML Service

Open a new terminal:

```bash
cd ml

# 1. Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate       # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Train the model (generates models/ticket_classifier.pkl)
python train.py

# 4. (Optional) Run automated ML tests
python test_ml_service.py

# 5. Start the FastAPI server on port 8000
uvicorn main:app --reload --port 8000
```

Verify in your browser: `http://localhost:8000/health` or `http://localhost:8000/docs` (Swagger UI).

---

### Step 3: Start the Node.js Express Backend

Open a second terminal:

```bash
cd backend

# 1. Install dependencies
npm install

# 2. (Optional) Run the automated test suite
npm test

# 3. Start the backend development server on port 5000
npm run dev
```

Verify in your browser: `http://localhost:5000/api/health`.

---

### Step 4: Start the React Frontend

Open a third terminal:

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start the Vite React development server
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 10. Default Demo Test Accounts

You can log in directly using the pre-seeded accounts (or use the one-click demo buttons on the Login page):

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@example.com` | `password123` | Create tickets, view personal tickets & stats |
| **Admin** | `admin@support.com` | `admin123` | View all tickets, update ticket statuses, see system analytics |

---

## 11. Interview Preparation & Technical Q&A

This section prepares you for common interview questions related to this project:

### Machine Learning & NLP Concepts

#### Q1: Why did you use TF-IDF + Logistic Regression instead of an LLM or Deep Learning?
> **Answer**:  
> In customer support ticket classification, there is a fixed set of predefined departments (Payment, Refund, Account, Technical, Delivery, Other). A classical supervised approach using TF-IDF and Logistic Regression is:
> 1. **Extremely fast**: Millisecond inference latency without GPU overhead.
> 2. **Cost-effective**: Zero token/API costs.
> 3. **Interpretable**: You can directly inspect feature weights to see which words contributed to a category.
> 4. **Reliable & calibrated**: `predict_proba()` gives genuine mathematical class probabilities that translate directly to a confidence score.

#### Q2: How does TF-IDF work mathematically?
> **Answer**:  
> TF-IDF is the product of two statistics:
> $$\text{TF-IDF}(t, d, D) = \text{TF}(t, d) \times \text{IDF}(t, D)$$
> - **Term Frequency $\text{TF}(t, d)$**: How many times term $t$ appears in document $d$ divided by total words in $d$.
> - **Inverse Document Frequency $\text{IDF}(t, D)$**: $\ln\left(\frac{1 + |D|}{1 + |\{d \in D : t \in d\}|}\right) + 1$, where $|D|$ is the total number of documents.
> Words that occur across almost every ticket (like *"the"*, *"customer"*) receive an IDF close to zero, while discriminative terms (like *"chargeback"*, *"crash"*, *"tracking"*) receive high weights.

#### Q3: What is the difference between Precision and Recall in this project?
> **Answer**:  
> - **Precision**: Out of all tickets our model predicted as `Payment`, how many were actually `Payment`? (Minimizes false alarms).
> - **Recall**: Out of all actual `Payment` tickets submitted by customers, how many did the model correctly identify? (Minimizes missed tickets).
> - **F1-Score**: Harmonic mean of Precision and Recall ($\frac{2 \cdot P \cdot R}{P + R}$), providing a single balanced metric especially useful for multi-class classification.

#### Q4: How is the confidence score calculated?
> **Answer**:  
> Logistic Regression applies the Softmax function across the linear outputs $z_k = \mathbf{w}_k^T \mathbf{x} + b_k$ for each category $k$:
> $$P(y = k \mid \mathbf{x}) = \frac{e^{z_k}}{\sum_{j=1}^{K} e^{z_j}}$$
> The predicted category is $\arg\max_k P(y = k \mid \mathbf{x})$, and the confidence score is the maximum probability value between $0.00$ and $1.00$.

---

### Backend & System Design Concepts

#### Q5: Why decouple the ML service into FastAPI rather than running Python inside Node?
> **Answer**:  
> 1. **Separation of Concerns**: Node.js excels at high-concurrency I/O (handling user sessions, database queries, web requests), whereas Python has the premier numerical and machine learning ecosystem (Scikit-learn, NumPy).
> 2. **Independent Scalability**: If ticket volume spikes, the FastAPI inference container can be horizontally scaled independently of the Express API.
> 3. **Fault Isolation**: An ML library failure or memory spike will not crash the authentication or database server.

#### Q6: What happens if the ML microservice goes down?
> **Answer**:  
> The Node.js `mlService.js` implements **Graceful Degradation** with multi-tier resilience:
> - If the HTTP request to FastAPI times out or fails (e.g. `ECONNREFUSED`), Express catches the error without crashing.
> - The ticket is still safely saved into MySQL with category `"Other"` and confidence `0.0`.
> - This ensures customer tickets are **never lost**, and support agents can still review and resolve them manually.

#### Q7: How does JWT Authentication work in this project?
> **Answer**:  
> 1. Customer submits credentials to `POST /api/auth/login`.
> 2. Server verifies email and compares password against the stored bcrypt hash using `bcrypt.compare()`.
> 3. If valid, the server signs a JSON Web Token containing `{ id, name, email, role }` using a secret key.
> 4. React stores the token in `localStorage` and attaches it as `Authorization: Bearer <token>` on subsequent requests.
> 5. Express `authMiddleware.js` verifies the token signature on protected routes using `jwt.verify()`.

---

## 12. License

This project is licensed under the MIT License. Created for educational and portfolio demonstration purposes.
