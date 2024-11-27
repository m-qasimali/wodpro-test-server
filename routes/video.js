const express = require("express");
const videoController = require("../controller/user/videoController");

const videoRouter = express.Router();

videoRouter.post("/upload", videoController.uploadVideo);

module.exports = videoRouter;
