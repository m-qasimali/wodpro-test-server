const number = require("@hapi/joi/lib/types/number");
const { db } = require("../credentials/firebase");
const { FirebaseCollectionNames, workout1ID } = require("../utils/constants");

const registerNewUserInWorkout = async (userData) => {
  try {
    // Get the workout document
    const workoutDoc = await db
      .collection(FirebaseCollectionNames.Workouts)
      .doc(workout1ID)
      .get();

    if (!workoutDoc.exists) {
      console.error(`Document with ID ${workout1ID} does not exist.`);
      return null;
    }

    const workout = workoutDoc.data();

    // Reference to the ranking document
    const docRef = db.doc(
      `${FirebaseCollectionNames.Ranking}/${workout.docId}`
    );

    const docSnapshot = await docRef.get();

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

    console.log("User registered in workout successfully");
  } catch (error) {
    console.error(
      `Error registering user ${userData?.userId} in workout ${workout1ID}:`,
      error
    );
  }
};

module.exports = registerNewUserInWorkout;
