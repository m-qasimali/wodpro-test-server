const { db } = require("../../credentials/firebase");
const { FirebaseCollectionNames } = require("../../utils/constants");
const {
  removePrice,
  timeToSeconds,
  groupAndSortDataByTime,
  groupAndSortByRepetitions,
} = require("../../utils/functions");
const { getAllCategoryUserCount } = require("./utilsFunctions");

const timeWorkoutRanking = async (data) => {
  try {
    const rankingDocSnapshot = await db
      .collection(FirebaseCollectionNames.Ranking)
      .doc(data.id)
      .get();

    if (!rankingDocSnapshot.exists) {
      console.log("No document found for wodId:", data.wodId);
      return;
    }

    const requestedWorkoutRanking = rankingDocSnapshot.data();
    if (!requestedWorkoutRanking) {
      console.error(`No ranking data found for wodId: ${data.wodId}`);
      return;
    }

    const completedWorkoutRanking = [];
    const incompleteWorkoutRanking = [];

    // Process ranking data
    for (const [key, value] of Object.entries(requestedWorkoutRanking)) {
      const modifiedValue = {
        ...value,
        category: removePrice(value.category),
      };

      if (value.uploadTime) {
        modifiedValue.uploadTime = timeToSeconds(value.uploadTime);
        completedWorkoutRanking.push(modifiedValue);
      } else if (value.repetitions) {
        modifiedValue.repetitions = +value.repetitions;
        incompleteWorkoutRanking.push(modifiedValue);
      }
    }

    const users = await getAllCategoryUserCount();

    // Group and sort data
    const timeSortedData = groupAndSortDataByTime(completedWorkoutRanking);
    const repetitionsSortedData = groupAndSortByRepetitions(
      incompleteWorkoutRanking
    );

    // Merge sorted data
    const rankingData = { ...timeSortedData };
    for (const [key, value] of Object.entries(repetitionsSortedData)) {
      rankingData[key] = [...(rankingData[key] || []), ...value];
    }

    // Calculate ranks and points
    for (const [key, value] of Object.entries(rankingData)) {
      let rank = 1;
      let currentPoints = users[key] || 0;
      let ties = 0;

      for (let i = 0; i < value.length; i++) {
        if (i > 0) {
          const sameUploadTime =
            value[i].uploadTime === value[i - 1].uploadTime;
          const sameRepetitions =
            value[i].repetitions === value[i - 1].repetitions;

          if (!sameUploadTime || !sameRepetitions) {
            currentPoints -= 1 + ties; // Deduct points for ties
            ties = 0;
            rank++;
          } else {
            ties++;
          }
        }

        value[i].points = currentPoints;
        value[i].rank = rank;
      }
    }

    // console.log("rankingData:", rankingData);

    // Update Firestore
    const updatedRanking = {};
    for (const [key, value] of Object.entries(rankingData)) {
      value.forEach((user) => {
        updatedRanking[user.docId] = {
          ...requestedWorkoutRanking[user.docId],
          points: user.points,
          rank: user.rank,
        };
      });
    }

    await db
      .collection(FirebaseCollectionNames.Ranking)
      .doc(data.id)
      .set(updatedRanking, { merge: true });

    console.log("Time workout ranking updated successfully");
  } catch (error) {
    console.error("Error in timeWorkoutRanking:", error);
    throw error;
  }
};

module.exports = timeWorkoutRanking;
