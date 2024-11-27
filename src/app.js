const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const router = require("../routes/main");
const initSocket = require("../routes/socket");
const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
const admin = require("firebase-admin");
const initializeFirestoreListener = require("../middlewares/firestoreListenerMiddleware");
const initCronJobs = require("../cron/cronJobs");

const allowedOrigins = [
  "https://effervescent-beignet-af79c4.netlify.app",
  "https://backend.wodproleague.es",
  "*",
];

class App {
  constructor() {
    dotenv.config(); // Load environment variables at the beginning
    this.app = express();
    this.http = http.Server(this.app);
    this.io = require("socket.io")(this.http, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      cors: {
        origin: [
          "https://effervescent-beignet-af79c4.netlify.app",
          "https://backend.wodproleague.es/api/v1/payments/intent",
          "*",
        ],
      },
    });
    this.PORT = process.env.PORT || 8000;
    this.initMiddleware();

    initializeFirestoreListener();
    this.initRoutes();

    initCronJobs();
  }

  initMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());

    // Initialize CORS for all routes
    this.app.use((req, res, next) => {
      const { origin } = req.headers;
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        res.setHeader("Access-Control-Allow-Origin", origin || "*");
      }
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      ); // Include PUT method
      res.header("Access-Control-Allow-Credentials", "true"); // Allow credentials if needed

      next();
    });
  }

  // connectToMongoDB() {
  //   const db = process.env.MONGO_CONNECTION;
  //   mongoose.connect(
  //     db,
  //     {
  //       useNewUrlParser: true,
  //       useUnifiedTopology: true,
  //       useCreateIndex: true,
  //     },
  //     (err, db) => {
  //       if (err) {
  //         console.log("err", err);
  //       } else {
  //         console.log("db connected");
  //       }
  //     }
  //   );
  // }

  initRoutes() {
    const folderPath = __dirname;
    const publicPath = path.join(folderPath, "..", "public");

    this.app.use(express.static(publicPath));
    this.app.use("/", router);
    initSocket(this.io);
  }

  createServer() {
    this.http.listen(this.PORT, () => {
      console.log(`Server started at port ${this.PORT}`);
    });
  }
}

module.exports = App;
