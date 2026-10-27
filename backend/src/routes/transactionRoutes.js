// ─── Transaction Routes ───
const express = require("express");
const transactionController = require("../controllers/transactionController");

const router = express.Router();

router.get("/transactions", transactionController.getTransactions);
router.get("/transactions/:id", transactionController.getTransactionById);
router.post("/transactions", transactionController.createTransaction);
router.patch("/transactions/:id", transactionController.updateTransaction);
router.delete("/transactions/:id", transactionController.deleteTransaction);
router.post("/import-transactions", transactionController.importTransactions);

module.exports = router;
