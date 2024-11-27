const express = require("express");
const countryController = require("../controller/user/addCountry");

const countryRouter = express.Router();
//

countryRouter.post("/", countryController.checkCountry);


module.exports = countryRouter;
