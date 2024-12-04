const { Timestamp } = require("firebase-admin/firestore");
const { db } = require("../credentials/firebase");
const { FirebaseCollectionNames } = require("../utils/constants");
const { generateRandomNumber } = require("../utils/functions");

const testController = {
  async uploadVideo(req, res) {
    const data = req.body;

    try {
      const docRef = await db.collection(FirebaseCollectionNames.Videos).add({
        data,
        videos: ["", ""],
        uploadTime: Timestamp.now(),
      });

      await docRef.update({
        docId: docRef.id,
      });

      res.status(200).json({
        status: "success",
        message: "Video uploaded successfully",
        data: { ...data, docId: docRef.id }, // Include docId in response data
      });
    } catch (error) {
      console.log("error", error);
      res.status(500).json({
        status: "error",
        message: "Failed to upload video",
        error: error.message,
      });
    }
  },

  async deleteCollection(req, res) {
    const collectionRef = db.collection("test_clone_teams");
    const query = collectionRef.limit(100);

    return new Promise(async (resolve, reject) => {
      try {
        let deleted = 0;

        async function deleteBatch() {
          const snapshot = await query.get();

          if (snapshot.empty) {
            console.log(`Deleted ${deleted} documents from collection`);
            resolve();
            return;
          }

          const batch = db.batch();

          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });

          await batch.commit();
          deleted += snapshot.size;

          // Recursively delete the next batch
          process.nextTick(deleteBatch);
        }

        await deleteBatch();
        res.status(200).json({
          status: "success",
          message: "Collection deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting collection:", error);
        reject(error);
      }
    });
  },

  async cloneCollection(req, res) {
    try {
      const sourceCollection = "test_cloned_rankings_production";
      const targetCollection = "rankings_production";

      // Get all documents from the source collection
      const snapshot = await db.collection(sourceCollection).get();

      if (snapshot.empty) {
        console.log("No documents found in source collection.");
        return;
      }

      // Iterate over each document in the source collection
      const clonePromises = snapshot.docs.map(async (doc) => {
        const data = doc.data();
        for (const [key, value] of Object.entries(data)) {
          data[key] = value;
        }
        // Set the document in the target collection with the same document ID
        await db.collection(targetCollection).doc(doc.id).set(data);
        console.log(`Cloned document ${doc.id} to ${targetCollection}`);
      });

      // Wait for all clone operations to complete
      await Promise.all(clonePromises);
      console.log("All documents cloned successfully.");
      res.status(200).json({
        status: "success",
        message: "All documents cloned successfully",
      });
    } catch (error) {
      console.error("Error cloning collection:", error);
    }
  },

  async getRanking(req, res) {
    try {
      const usersSnapshot = await db
        .collection(FirebaseCollectionNames.Users)
        .get();
      const users = usersSnapshot.docs.map((doc) => doc.data());
      const workoutID = "eOUDzuvc91Na8UK8ZVXr";

      const workoutSnapshot = await db
        .collection(FirebaseCollectionNames.Workouts)
        .doc(workoutID)
        .get();

      const workout = workoutSnapshot.data();

      const rankingRef = db
        .collection(FirebaseCollectionNames.Ranking)
        .doc(workoutID);

      const rankingData = {};

      users.forEach((user) => {
        const userData = {
          category: user?.categoryName,
          country: user?.country,
          docId: user?.userId,
          firstName: user?.firstName,
          geographicArea: user?.city,
          isActive: true,
          isParticipated: true,
          lastName: user.lastName,
          liftedWeight: "",
          number: user?.boxNumber,
          points: 0,
          profilePicture: user?.profilePicture || "",
          province: user?.province || "",
          rank: 0,
          repetitions: `${generateRandomNumber()}`,
          teamBanner: user?.teamBanner || "",
          teamId: user?.teamId || "",
          teamName: user?.teamName || "",
          time: new Date().toISOString(),
          uploadTime: "",
          wod: workout.wod,
          wodNumber: workout.wodNumber,
          year: "2024-2025",
        };

        rankingData[user.userId] = userData;
      });

      await rankingRef.set(rankingData, { merge: true });

      res.status(200).json({
        status: "success",
        message: "Ranking fetched successfully",
        // totalData: count,
        // data: ranking,
      });
    } catch (error) {
      console.error("Error fetching ranking:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch ranking",
        error: error.message,
      });
    }
  },

  async getVideos(req, res) {
    try {
      // Fetch test_prod_ranking document data
      // const videosRef = await db.collection("Videos").get();
      // const usersRef = await db.collection("users").get();

      // const users = {};

      // const userVideos = new Set();
      // const teamVideos = new Set();

      // usersRef.docs.forEach((doc) => {
      //   const user = doc.data();
      //   users[doc.id] = user;
      // });

      // const videos = videosRef.docs.map((doc) => {
      //   const video = doc.data();

      //   if (video?.userId) {
      //     const user = users[video.userId];

      //     if (user?.teamId) {
      //       teamVideos.add(user.teamId);
      //     } else {
      //       userVideos.add(video.userId);
      //     }
      //   }

      //   return video;
      // });

      const workout1ID = "qsgwcOqPvJjgHE6bpO1s";
      const workoutDoc = await db
        .collection(FirebaseCollectionNames.Workouts)
        .doc(workout1ID)
        .get();

      if (!workoutDoc.exists) {
        console.error(`Document with ID ${workout1ID} does not exist.`);
        return null;
      }

      const workout = workoutDoc.data();

      const docRef = db.doc(
        `${FirebaseCollectionNames.Ranking}/${workout.docId}`
      );

      const docSnapshot = await docRef.get();

      const userDataSnapShot = await db
        .collection(FirebaseCollectionNames.Users)
        .doc("0EmO9CBkm7Rf0xZgFeHW8KjPSmb2")
        .get();

      const userData = await userDataSnapShot.data();

      // Define the user's data
      const userDataEntry = {
        category: userData?.categoryName,
        country: userData?.country,
        docId: userData?.userId,
        firstName: userData?.firstName,
        geographicArea: userData?.city,
        isActive: true,
        isParticipated: true,
        lastName: userData?.lastName,
        liftedWeight: "",
        number: userData?.boxNumber,
        points: 0,
        profilePicture: userData?.profilePicture,
        province: userData?.province,
        rank: 0,
        repetitions: "",
        teamBanner: userData?.teamBanner || "",
        teamId: userData?.teamId || "",
        teamName: userData?.teamName || "",
        time: new Date()?.toISOString(),
        uploadTime: "",
        wod: workout?.wod,
        wodNumber: workout?.wodNumber,
        year: "2024-2025",
      };

      if (docSnapshot.exists) {
        // Update existing document
        await docRef.update({
          [`${userData.userId}`]: userDataEntry,
        });
      } else {
        // Create new document
        await docRef.set({
          [`${userData.userId}`]: userDataEntry,
        });
      }

      res.status(200).json({
        status: "success",
      });
    } catch (error) {
      console.error("Error updating ranking:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update ranking",
        error: error.message,
      });
    }
  },

  async getUers(req, res) {
    try {
      const snapshot = await db
        .collection(FirebaseCollectionNames.Users)
        .where("isActive", "==", true)
        .get();
      const users = snapshot.docs.map((doc) => {
        const user = doc.data();

        if (!user.isActive) {
          console.log("User is not active:", user);
        }

        return user;
      });

      res.status(200).json({
        status: "success",
        message: "Users fetched successfully",
        totalData: users.length,
        data: users,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch users",
        error: error.message,
      });
    }
  },

  async addVideo(req, res) {
    const data = req.body;

    const docRef = await db.collection("Videos").doc();

    const validData = {
      ...data,
      docId: docRef.id,
      uploadTime: Timestamp.now(),
    };

    console.log("validData: ", validData);

    await docRef.set(validData, { merge: true });

    res.status(200).json({
      status: "success",
      message: "Video added successfully",
      data: validData,
    });
  },
};

module.exports = testController;
