const express = require("express");
const userController = require("../controller/user/otp");

const userRouter = express.Router();

userRouter.post("/createUser", userController.createUser);

userRouter.post("/verifyEmail", userController.verifyEmail);
userRouter.post("/sendEmail-SES", userController.sendEmailSES);
userRouter.post(
  "/sendEmail-nodemailer",
  userController.sendMailWithoutVerification
);
userRouter.post("/sendInvoice", userController.sendInvoice);
userRouter.get("/checkUser/:email", userController.checkUser);
userRouter.get("/checkTeam/:email", userController.checkTeam);

userRouter.post("/sendNotification", userController.sendNotification);
userRouter.post(
  "/send-topic-notification",
  userController.sendTopicNotification
);
userRouter.post(
  "/sendNotificationToNotParticipatedUser",
  userController.sendParticipantNotification
);

module.exports = userRouter;
