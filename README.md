# 🚀 GrowthPilot AI — From Insights to Intelligent Action

<div align="center">

[![Hackathon](https://img.shields.io/badge/Paytm%20AI%20Hackathon-Track%201%3A%20Merchant%20Growth%20AI-002E6E?style=for-the-badge&logo=paytm&logoColor=white)](#hackathon-track)
[![Team](https://img.shields.io/badge/Team-ApexCoders-FF6F00?style=for-the-badge)](#hackathon-track)
[![Author](https://img.shields.io/badge/Author-Amarjeet%20Kushwaha-24292e?style=for-the-badge&logo=github)](#author)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20MongoDB%20Atlas%20%7C%20Sarvam%20AI-00C853?style=for-the-badge)](#technology-stack)

</div>

**GrowthPilot AI** is a full-stack, AI-powered merchant growth intelligence platform designed to help small and medium businesses analyze live sales, discover high-impact growth opportunities, execute targeted promotions, and continuously learn from empirical campaign outcomes.

- **Frontend Deployment (Vercel):** [https://growth-pilot-ai-lyart.vercel.app/](https://growth-pilot-ai-lyart.vercel.app/)
- **Backend Deployment (Render):** [https://growthpilot-ai-2-ofr7.onrender.com/](https://growthpilot-ai-2-ofr7.onrender.com/)
- **GitHub Repository:** [https://github.com/AmarjeetKushwaha21/GrowthPilot_AI](https://github.com/AmarjeetKushwaha21/GrowthPilot_AI)

---

## 📌 Table of Contents

- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [Key Features](#-key-features)
- [Architecture & Technology Stack](#️-architecture--technology-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Database Schema & Data Persistence](#-database-schema--data-persistence)
- [Getting Started & Local Development](#-getting-started--local-development)
- [CSV Data Migration Tool](#-csv-data-migration-tool)
- [REST API Reference & Automated Tests](#-rest-api-reference--automated-tests)
- [Production Deployment Guide](#-production-deployment-guide)
- [Author & Hackathon Track](#-author)

---

## 🎯 Problem Statement

Small and local merchants regularly process hundreds of transactions, yet they lack dedicated business intelligence teams or enterprise analytics tools. Common challenges include:
- **Opaque revenue patterns:** Merchants struggle to identify whether daily sales are improving compared to historical averages.
- **Unaddressed off-peak dips:** Footfall slows during specific hours, causing perishable inventory waste and lost revenue.
- **Trial-and-error marketing:** Promotions are run blindly without knowing the baseline or calculating actual uplift.
- **Lost historical context:** Previous campaign outcomes are rarely analyzed or used to calibrate future promotions.

---

## 💡 Our Solution

**GrowthPilot AI** closes the feedback loop from insights to intelligent action:
1. **Real Data Persistence:** 426+ transactions, customer profiles, product catalog, and campaign logs are stored in **MongoDB Atlas** (`GrowthPilotAI` database).
2. **Deterministic Intelligence:** Real-time mathematical calculation of today's sales, average previous-day sales, day-over-day change, and hourly baseline comparisons.
3. **Contextual AI Recommendations:** Integrates **Sarvam AI** with historical feedback loops to generate realistic, grounded growth actions.
4. **Approval & Outcome Loop:** Merchants maintain full agency to approve, customize, or reject campaigns, with post-campaign uplift and merchant ratings recorded to refine future AI cycles.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 6, Chart.js, Lucide Icons | Responsive interactive dashboard with live metrics, charts, and agent controls |
| **Backend** | Node.js, Express 5 (modular architecture) | RESTful API, aggregation pipeline, AI agent coordination, middleware |
| **Database** | MongoDB Atlas (Mongoose ODM) | Persistent storage for Transactions, Customers, Products, Insights, and Campaigns |
| **AI Integration** | Sarvam AI (`sarvam-105b`) | Generative executive summaries and contextual promotional actions |
| **Hosting** | Vercel (Frontend), Render (Backend) | Production cloud deployments with environment variable isolation |

---

## 📂 Project Directory Structure

```text
GrowthPilot_AI/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/              # Icons and static media
│   │   ├── components/          # Reusable UI cards, charts, and agent widgets
│   │   ├── layouts/             # DashboardLayout (Sidebar + Topbar wrapper)
│   │   ├── pages/               # Dashboard view page
│   │   ├── hooks/               # useDashboard state management hook
│   │   ├── context/             # DashboardContext provider
│   │   ├── services/            # Centralized API service (api.js)
│   │   ├── utils/               # Currency, percentage, and date formatters
│   │   ├── constants/           # Global defaults, statuses, and flow steps
│   │   ├── App.jsx              # Application root component
│   │   ├── main.jsx             # React entry point
│   │   └── index.css            # Modern responsive CSS design system
│   ├── .env.example             # Frontend environment template
│   ├── .env.production          # Production Render API endpoint config
│   ├── package.json             # Frontend dependencies and Vite scripts
│   └── vite.config.js           # Vite build configuration
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js      # Resilient MongoDB Atlas connection module
│   │   │   └── env.js           # Environment variable validation & masking
│   │   ├── models/
│   │   │   ├── Transaction.js   # Indexed transaction model with virtual aliases
│   │   │   ├── Customer.js      # Customer profile and segmentation model
│   │   │   ├── Product.js       # Product catalog, stock, and pricing model
│   │   │   ├── Insight.js       # AI business intelligence persistence model
│   │   │   ├── Recommendation.js# AI recommendation persistence model
│   │   │   ├── Campaign.js      # Campaign history and outcome metrics model
│   │   │   └── Merchant.js      # Merchant metadata model
│   │   ├── controllers/
│   │   │   ├── dashboardController.js   # Summary, sales, hourly, top products
│   │   │   ├── transactionController.js # Transaction CRUD & CSV import
│   │   │   ├── customerController.js    # Customer profiles & patron analytics
│   │   │   ├── insightController.js     # AI insights & agent cycle orchestrator
│   │   │   └── campaignController.js    # Campaign approval & feedback loop
│   │   ├── routes/
│   │   │   ├── healthRoutes.js          # Health and database diagnostic route
│   │   │   ├── dashboardRoutes.js       # Dashboard REST endpoints
│   │   │   ├── transactionRoutes.js     # Transaction CRUD routes
│   │   │   ├── customerRoutes.js        # Customer routes
│   │   │   ├── insightRoutes.js         # AI analysis and agent cycle routes
│   │   │   └── campaignRoutes.js        # Campaign execution & feedback routes
│   │   ├── middleware/
│   │   │   ├── errorHandler.js          # Centralized error handler
│   │   │   └── notFound.js              # 404 handler
│   │   ├── services/
│   │   │   ├── analyticsService.js      # Deterministic sales calculations & queries
│   │   │   ├── aiService.js             # Sarvam AI chat completion & prompt engine
│   │   │   ├── historicalIntelligence.js# Financial ratio calculations
│   │   │   └── campaignFeedback.js      # Outcome tracking & benchmark seeder
│   │   ├── scripts/
│   │   │   └── importTransactions.js    # Idempotent CSV bulk upsert migration tool
│   │   ├── app.js                       # Express app configuration & middleware
│   │   └── server.js                    # Server startup and database bootstrap
│   ├── data/
│   │   ├── transactions.csv             # 426 sample transaction records
│   │   └── README.md                    # Dataset schema documentation
│   ├── test_endpoints.js                # Automated 30-endpoint verification suite
│   ├── .env.example                     # Backend environment template
│   ├── server.js                        # Forwarding entrypoint (Render compatible)
│   └── package.json                     # Backend scripts and dependencies
│
├── .gitignore                           # Git ignore rules (secrets protected)
├── package.json                         # Root monorepo script runner
└── README.md                            # Comprehensive project guide
```

---

## 🗄️ Database Schema & Data Persistence

GrowthPilot AI stores all application data persistently in MongoDB Atlas under the database name `GrowthPilotAI`.

### Collections & Models:
1. **`transactions` (`Transaction.js`)**:
   - `transaction_id`: Unique identifier (e.g. `TXN0001`).
   - `merchant_name`: Associated merchant (indexed).
   - `amount`: Monetary value in INR.
   - `date`: Valid ISO timestamp (indexed).
   - `hour` (0–23) and `minute` (0–59): Extracted temporal fields for fast hourly aggregations.
   - `category`: Classification (`Tea`, `Coffee`, `Lunch`, `Snacks`, `Combo`).
   - `payment_status`: `SUCCESS`, `FAILED`, `REFUNDED` (indexed).
   - Compound index: `{ merchant_name: 1, payment_status: 1, date: 1 }`.
2. **`customers` (`Customer.js`)**:
   - `customerId`, `name`, `segment` (`VIP`, `Regular`, `Occasional`), `totalSpent`, `totalOrders`.
3. **`products` (`Product.js`)**:
   - `productId`, `name`, `category`, `price`, `stock`, `status`, `salesCount`, `totalRevenue`.
4. **`insights` (`Insight.js`)**:
   - `insightId`, `merchant_name`, `type`, `title`, `description`, `supportingMetrics`, `source`, `status`.
5. **`campaigns` (`Campaign.js`)**:
   - `campaign_id`, `merchant_name`, `title`, `discount`, `target_window`, `status`, `baseline_metrics`, `outcome_metrics`, `merchant_feedback`.

---

## 🚀 Getting Started & Local Development

### 1. Clone the Repository
```bash
git clone https://github.com/AmarjeetKushwaha21/GrowthPilot_AI.git
cd GrowthPilot_AI
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Configure Local Environment Variables
Create `.env` in `backend/`:
```env
PORT=5001
HOST=0.0.0.0
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.qd7znlr.mongodb.net/GrowthPilotAI?retryWrites=true&w=majority
SARVAM_API_KEY=your_sarvam_api_key_here
```

Create `.env` in `frontend/`:
```env
VITE_API_BASE_URL=http://localhost:5001/api
```

### 4. Run the CSV Migration Tool
```bash
cd backend
npm run migrate
```

### 5. Start the Application
In terminal 1 (Backend):
```bash
cd backend
npm start
# Server runs on http://localhost:5001
```

In terminal 2 (Frontend):
```bash
cd frontend
npm run dev
# Vite runs on http://localhost:5173
```

---

## 📥 CSV Data Migration Tool

The migration script (`backend/src/scripts/importTransactions.js`) safely synchronizes `transactions.csv` into MongoDB Atlas:
- **Idempotent:** Uses Mongoose `bulkWrite` with `updateOne` and `{ upsert: true }` keyed by `transaction_id`.
- **Safe Rerun:** Can be executed multiple times without creating duplicate records.
- **Entity Derivation:** Automatically populates derived `Product` categories and `Customer` records.
- **Execution:**
  ```bash
  cd backend
  npm run migrate
  ```
- **CLI Output:**
  ```text
  ============================================================
     GrowthPilot AI — Production Data Migration Script        
  ============================================================
  [1/3] Reading transaction records from: backend/data/transactions.csv
  [2/3] Connecting and Synchronizing to MongoDB Atlas...
  [3/3] Migration Complete!
  ------------------------------------------------------------
    Records in CSV:       426
    New records inserted: 0
    Existing matched:     426
    Existing updated:     426
    Total in MongoDB:     426
    Merchants:            FreshBite Corner, Gupta Sweets, Sharma Café
  ------------------------------------------------------------
  ```

---

## 🧪 REST API Reference & Automated Tests

Run the complete 30-endpoint automated verification suite:
```bash
cd backend
npm test
```

### Endpoint Summary:
| Category | Method | Path | Description |
| :--- | :--- | :--- | :--- |
| **System** | `GET` | `/` | Root server status |
| **Health** | `GET` | `/api/health` | Server and MongoDB Atlas connectivity status |
| **Merchants** | `GET` | `/api/merchants` | List available merchants |
| **Dashboard** | `GET` | `/api/dashboard/summary` | Today's sales, average previous-day, DoD change |
| **Dashboard** | `GET` | `/api/dashboard/sales` | Hourly breakdown & daytime vs evening sales |
| **Dashboard** | `GET` | `/api/dashboard/top-products` | Top categories/products by volume & sales |
| **Dashboard** | `GET` | `/api/dashboard/recent-transactions` | Latest 10 transactions |
| **Dashboard** | `GET` | `/api/business-health` | Revenue split before and after 6 PM |
| **Dashboard** | `GET` | `/api/hourly-analysis` | Hourly comparison vs historical baseline |
| **Dashboard** | `GET` | `/api/trigger-check` | Automated threshold deviation check |
| **Dashboard** | `GET` | `/api/opportunity` | Low-activity window detection |
| **Transactions**| `GET` | `/api/transactions` | Paginated and filtered transaction search |
| **Transactions**| `GET` | `/api/transactions/:id` | Single transaction by ID |
| **Transactions**| `POST` | `/api/transactions` | Create and persist new transaction |
| **Transactions**| `PATCH`| `/api/transactions/:id` | Update existing transaction |
| **Transactions**| `DELETE`| `/api/transactions/:id` | Delete transaction |
| **Transactions**| `POST` | `/api/import-transactions`| Trigger programmatic CSV synchronization |
| **Customers** | `GET` | `/api/customers` | List customer profiles |
| **Customers** | `GET` | `/api/customers/:id` | Get customer by ID |
| **Insights** | `GET` | `/api/insights` | Retrieve persisted AI business insights |
| **Insights** | `POST` | `/api/insights/generate` | Generate and persist new insight |
| **AI** | `GET` | `/api/ai-business-analysis` | 2-sentence executive summary via Sarvam AI |
| **AI** | `GET` | `/api/ai-growth-recommendation`| Contextual growth recommendations |
| **AI Agent** | `POST` | `/api/agent/cycle` | Execute AI Growth Agent cycle |
| **Campaigns** | `GET` | `/api/campaigns` | Retrieve campaign history and feedback |
| **Campaigns** | `POST` | `/api/campaigns` | Create and stage new campaign |
| **Campaigns** | `PATCH`| `/api/campaigns/:id/status`| Update status (`approved`, `active`, etc.) |
| **Campaigns** | `POST` | `/api/campaigns/:id/feedback` | Record merchant rating (1–5) and review |
| **Campaigns** | `POST` | `/api/action` | Activate campaign action |
| **Campaigns** | `GET` | `/api/campaign-result` | Projected uplift and simulation outcome |

---

## 🌐 Production Deployment Guide

### Backend on Render:
1. **Service Type:** Web Service
2. **Root Directory:** `backend`
3. **Build Command:** `npm install`
4. **Start Command:** `npm start` (runs `node server.js` which boots `src/server.js`)
5. **Environment Variables:**
   - `PORT`: `5001` (Render automatically assigns port)
   - `HOST`: `0.0.0.0`
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `mongodb+srv://...`
   - `SARVAM_API_KEY`: `sk_...`
   - `FRONTEND_URL`: `https://growth-pilot-ai-lyart.vercel.app`

### Frontend on Vercel:
1. **Framework Preset:** Vite
2. **Root Directory:** `frontend`
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. **Environment Variable:**
   - `VITE_API_BASE_URL`: `https://growthpilot-ai-2-ofr7.onrender.com/api`
   *(Important: If you update environment variables in Vercel, trigger a redeploy so Vite bakes the updated variable into the production bundle).*

---

## 👨‍💻 Author

**Amarjeet Kushwaha**  
*B.Tech Computer Science and Engineering*  
ABES Engineering College, Ghaziabad, Uttar Pradesh, India  

- **GitHub:** [@AmarjeetKushwaha21](https://github.com/AmarjeetKushwaha21)
- **LinkedIn:** [Amarjeet Kushwaha](https://www.linkedin.com/in/amarjeet-kushwaha-2627a7397/)

---

<div align="center">

### 🚀 GrowthPilot AI
*From Insights to Intelligent Action.*

**Built with ❤️ for the Paytm AI Hackathon.**

</div>