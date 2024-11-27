const validator = require("email-validator");
const admin = require("firebase-admin");
const { db, app } = require("../../credentials/firebase");
const invoice = require("../../template/invoice");

const Stripe = require("stripe");
require("dotenv").config();
const stripe = Stripe(process.env.STRIPE_LIVE);

const {
  SESClient,
  GetIdentityVerificationAttributesCommand,
  VerifyEmailIdentityCommand,
  SendEmailCommand,
} = require("@aws-sdk/client-ses");

require("dotenv").config();
const nodemailer = require("nodemailer");
const { FirebaseCollectionNames } = require("../../utils/constants");

const REGION = process.env.AWS_REGION; // Ensure this matches your AWS SES region
const API_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const sesClient = new SESClient({
  region: REGION,
  credentials: {
    accessKeyId: API_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

async function getEmailVerificationStatus(email) {
  const params = {
    Identities: [email],
  };

  const command = new GetIdentityVerificationAttributesCommand(params);
  try {
    const data = await sesClient.send(command);
    const verificationAttributes = data.VerificationAttributes[email];
    return verificationAttributes?.VerificationStatus === "Success";
  } catch (err) {
    console.error("Error getting email verification status:", err);
    throw err;
  }
}

const otpController = {
  async createUser(req, res) {
    try {
      const { email, password } = req.body;
      const userRecord = await admin.auth().createUser({
        email,
        password,
      });

      res.status(201).send({
        success: true,
        message: "User created successfully",
        data: userRecord,
      });
    } catch (err) {
      res.status(500).send({
        success: false,
        error: err.message || "Error creating user",
      });
    }
  },

  async sendParticipantNotification(req, res) {
    try {
      // Fetch all videos
      const videosSnapshot = await db
        .collection(FirebaseCollectionNames.Videos)
        .get();
      const participatedUserIds = new Set();

      videosSnapshot.forEach((doc) => {
        const video = doc.data();
        participatedUserIds.add(video.userId);
      });

      // Fetch all users
      const usersSnapshot = await db
        .collection(FirebaseCollectionNames.Users)
        .get();
      const allUsers = [];
      const emailToUserIdMap = new Map();

      usersSnapshot.forEach((doc) => {
        const user = doc.data();
        allUsers.push(user);
        emailToUserIdMap.set(user.email, user.userId); // Map email to userId
      });

      // Fetch all teams
      const teamSnapshot = await db
        .collection(FirebaseCollectionNames.Teams)
        .get();

      teamSnapshot.forEach((doc) => {
        const team = doc.data();

        // Check if any team member has participated based on their userId
        if (
          team.teammateEmails.some((email) =>
            participatedUserIds.has(emailToUserIdMap.get(email))
          )
        ) {
          // Mark all team members as participated
          team.teammateEmails.forEach((email) => {
            const userId = emailToUserIdMap.get(email);
            if (userId) {
              participatedUserIds.add(userId);
            }
          });
        }
      });

      // Find users who have not participated
      const notParticipatedUsers = allUsers.filter(
        (user) => !participatedUserIds.has(user.userId)
      );

      // Send notification to users who have not participated
      const message = {
        notification: {
          title: "¡Se perdió la fecha límite para WOD1!",
          body: "¡Parece que no cumpliste con la fecha límite para WOD1! Pero no te preocupes, se te presentan más oportunidades. ¡Estén atentos y sigan avanzando!",
        },
        tokens: notParticipatedUsers
          .map((user) => user?.FCMToken)
          .filter((token) => token),
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(
              "Failed to send notification to:",
              notParticipatedUsers[idx]?.email,
              "Error:",
              resp.error
            );
            failedTokens.push(notParticipatedUsers[idx].FCMToken);
          } else {
            console.log(
              "Notification sent successfully to",
              notParticipatedUsers[idx].email
            );
          }
        });
        return res.status(500).send({
          message: "Failed to send notification to some users.",
          failedTokens: failedTokens,
        });
      } else {
        return res
          .status(200)
          .send("Notification sent successfully to all selected users.");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      return res.status(500).send({
        message: "An error occurred while fetching participation data",
        error: error.message,
      });
    }
  },

  async verifyEmail(req, res) {
    const { email } = req.body;

    try {
      // Validate email format
      if (!validator.validate(email)) {
        return res.status(400).send({
          success: false,
          error: "Invalid email address",
        });
      }

      // Check if email is already verified
      const isVerified = await getEmailVerificationStatus(email);

      if (isVerified) {
        return res.status(200).send({
          success: true,
          verified: true,
          message: "Email already verified",
        });
      }

      // Initiate email verification if not already verified
      const params = { EmailAddress: email };
      const command = new VerifyEmailIdentityCommand(params);

      const data = await sesClient.send(command);

      res.status(200).send({
        success: true,
        verified: false,
        message: "Email sent for verification",
      });
    } catch (err) {
      res.status(500).send({
        success: false,
        error: "Error initiating email verification",
      });
    }
  },

  async sendEmailSES(req, res) {
    const { to, subject, text, senderEmail } = req.body;

    if (!to || !subject || !text || !senderEmail) {
      return res.status(400).send({
        success: false,
        error: "Missing required fields: to, subject, text, senderEmail",
      });
    }

    // Validate sender and recipient email addresses
    if (!validator.validate(senderEmail)) {
      return res.status(400).send({
        success: false,
        error: "Invalid sender email address",
      });
    }

    if (Array.isArray(to)) {
      // If `to` is an array of email addresses
      if (to.some((email) => !validator.validate(email))) {
        return res.status(400).send({
          success: false,
          error: "Invalid email address in `to` array",
        });
      }
    } else {
      // If `to` is a single email address
      if (!validator.validate(to)) {
        return res.status(400).send({
          success: false,
          error: "Invalid email address",
        });
      }
    }

    // Construct params object based on `to` being single or array
    const params = {
      Source: senderEmail,
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to],
      },
      Message: {
        Subject: {
          Data: subject,
        },
        Body: {
          Text: {
            Data: text,
          },
        },
      },
    };

    const command = new SendEmailCommand(params);

    try {
      const data = await sesClient.send(command);
      res.status(200).send({
        success: true,
        message: "Email sent successfully",
      });
    } catch (err) {
      res.status(500).send({
        success: false,
        error: `Error sending email: ${err.message}`,
      });
    }
  },

  async sendMailWithoutVerification(req, res) {
    try {
      const { subject, to, text, metadata } = req.body;

      console.log("body is...", req.body);

      // let testAccount = await nodemailer.createTestAccount()

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: "send.one.com",
        port: 587, // Use port 25 for unencrypted SMTP
        secureConnection: false, // For port 25, this should be false
        auth: {
          user: process.env.EMAIL,
          pass: process.env.APP_PASSWORD,
        },
        tls: {
          // Do not fail on invalid certs
          rejectUnauthorized: false,
        },
        // logger: true, // Enable logging
        // debug: true // Enable debug output
      });

      // Send mail
      const result = await transporter.sendMail({
        from: ` WOD PRO League -  <info@wodproleague.es> `, // Include sender name
        to: to,
        subject: subject,
        html: text,
        headers: metadata,
      });

      res.status(200).send({
        success: true,
        message: "Mail sent successfullyy",
      });
    } catch (err) {
      console.error("Error sending mail:", err);
      res.status(500).send({
        success: false,
        error: err.message || "Failed to send email.",
      });
    }
  },

  async sendNotification(req, res) {
    const { to, title, body } = req.body;

    if (!Array.isArray(to) || to.length === 0 || !title || !body) {
      return res
        .status(400)
        .send("A list of tokens, title, and body are required.");
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      tokens: to,
    };

    try {
      const response = await admin.messaging().sendMulticast(message);

      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(to[idx]);
          }
        });
        return res.status(500).send({
          message: "Failed to send notification to some users.",
          failedTokens: failedTokens,
        });
      } else {
        return res
          .status(200)
          .send("Notification sent successfully to all selected users.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      return res.status(500).send("Failed to send notification.");
    }
  },

  async sendTopicNotification(req, res) {
    try {
      const { title, body } = req.body;

      if (!title || !body) {
        return res.status(400).send("Notification title and body are required");
      }

      const topic = "all";

      const message = {
        notification: {
          title: title,
          body: body,
        },
        topic: topic,
      };

      const response = await admin.messaging().send(message);

      return res.status(200).send({
        message: `Notification sent successfully to topic: ${topic}`,
        response,
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      return res.status(500).send("Internal Server Error");
    }
  },

  // check user in database

  async checkUser(req, res) {
    try {
      let { email } = req.params;
      await admin
        .auth()
        .getUserByEmail(email)
        .then((user) => {
          return res.status(200).send(user);
        })
        .catch((error) => {
          if (error.code === "auth/user-not-found") {
            return res.status(400).send("User donot exist");
          } else {
            return res.status(400).send(error);
          }
        });
    } catch (error) {
      return res.status(400).send(error);
    }
  },

  // check team in database
  async checkTeam(req, res) {
    try {
      let { email } = req.params;
      if (!email) {
        return res.status(200).send("please provide an email");
      }
      const teamsSnapshot = await db
        .collection("teams")
        .where("teammateEmails", "array-contains", email)
        .get();
      // Check if the query returned any documents
      if (teamsSnapshot.empty) {
        return res.status(404).send("No teams found for the specified email.");
      }

      // Extract the team data from each document
      const teams = [];
      teamsSnapshot.forEach((doc) => {
        teams.push({ id: doc.id, ...doc.data() });
      });

      // Send the retrieved team data as the response
      return res.status(200).send(teams);
    } catch (error) {
      console.log("error is...", error);
      return res.status(400).send(error);
    }
  },
  // ...................................... send invoice ..........................
  async sendInvoice(req, res) {
    try {
      const {
        subject,
        to,
        name,
        metadata,
        category,
        totalPrice,
        paidPrice,
        customerId,
        paymentId,
      } = req.body;
      console.log("req . body is", req.body);
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

      const paymentMethod = await stripe.customers.retrievePaymentMethod(
        customerId,
        paymentIntent.payment_method
      );
      // Create transporter
      const transporter = nodemailer.createTransport({
        host: "send.one.com",
        port: 587, // Use port 25 for unencrypted SMTP
        secureConnection: false, // For port 25, this should be false
        auth: {
          user: process.env.EMAIL,
          pass: process.env.APP_PASSWORD,
        },
        tls: {
          // Do not fail on invalid certs
          rejectUnauthorized: false,
        },
        // logger: true, // Enable logging
        // debug: true // Enable debug output
      });
      let last4 = paymentMethod.card.last4;
      let brand = paymentMethod.card.brand;

      // Send mail
      const result = await transporter.sendMail({
        from: ` WOD PRO League -  <info@wodproleague.es> `, // Include sender name
        to: to,
        subject: subject,
        html: invoice(name, category, totalPrice, paidPrice, last4, brand),
        headers: metadata,
      });

      res.status(200).send({
        success: true,
        message: "Mail sent successfullyy",
      });
    } catch (err) {
      console.error("Error sending mail:", err);
      res.status(500).send({
        success: false,
        error: err.message || "Failed to send email.",
      });
    }
  },
};

module.exports = otpController;
