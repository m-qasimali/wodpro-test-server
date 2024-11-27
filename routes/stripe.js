const express = require("express");
const { paymentController } = require("../controller/stripe");

const router = express.Router();

router.post('/intent', paymentController);

module.exports = router;
