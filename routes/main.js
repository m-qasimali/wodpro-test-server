const express = require("express");
const userRouter = require("./user");
const countryRouter = require("./country");
const stripeRouter = require("./stripe");
const testRouter = require("./testRouter");
const handleGlobalRanking = require("../cron/tasks/globalRanking");

const router = express.Router();

router.get("/", (req, res) => {
  res.send("WodProLeague Backend");
});

router.get("/globalRanking", handleGlobalRanking);

router.use("/user", userRouter);
router.use("/addCountry", countryRouter);

router.use("/test", testRouter);

router.use("/api/v1/payments", stripeRouter);

module.exports = router;
