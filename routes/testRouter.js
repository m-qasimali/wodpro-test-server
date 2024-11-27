const express = require("express");
const testController = require("../controller/testController");

const testRouter = express.Router();

testRouter.post("/uploadVideo", testController.uploadVideo);
testRouter.get("/clone", testController.cloneCollection);
testRouter.get("/users", testController.getUers);
testRouter.get("/videos", testController.getVideos);
testRouter.get("/ranking", testController.getRanking);
testRouter.delete("/delete", testController.deleteCollection);
testRouter.post("/addVideo", testController.addVideo);

module.exports = testRouter;
