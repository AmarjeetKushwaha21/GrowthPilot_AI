// ─── Customer Routes ───
const express = require("express");
const customerController = require("../controllers/customerController");

const router = express.Router();

router.get("/customers", customerController.getCustomers);
router.get("/customers/:id", customerController.getCustomerById);

module.exports = router;
