# GrowthPilot AI — Sample Dataset Documentation

## Dataset Overview
- **File**: `transactions.csv`
- **Total Records**: 426 transactions (plus header row = 427 lines)
- **Merchants Represented**:
  1. `Sharma Café` (258 transactions)
  2. `Gupta Sweets` (84 transactions)
  3. `FreshBite Corner` (84 transactions)

## Columns & Data Types
| Column Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `transaction_id` | String | Unique transaction identifier | `TXN0001` |
| `merchant_name` | String | Associated merchant outlet | `Sharma Café` |
| `amount` | Number | Transaction monetary value in INR | `66` |
| `date` | Date/String | ISO timestamp of the purchase | `2025-09-12 07:41:39` |
| `hour` | Integer (0–23) | Extracted hour of day | `7` |
| `minute` | Integer (0–59) | Extracted minute | `41` |
| `category` | String | Item category classification | `Tea`, `Coffee`, `Lunch`, `Snacks` |
| `payment_status`| String | Payment outcome (`SUCCESS`, `FAILED`, `REFUNDED`) | `SUCCESS` |

## Migration and Persistence
The migration script located at `backend/src/scripts/importTransactions.js` (and `backend/scripts/migrate.js`) reads this file and performs an idempotent bulk upsert (`$set` by `transaction_id`) into MongoDB Atlas (database: `GrowthPilotAI`, collection: `transactions`).
Running the migration repeatedly will never produce duplicates.
