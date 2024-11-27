const { db } = require("../../credentials/firebase");
const { FirebaseCollectionNames } = require("../../utils/constants");
const {
  convertToNumber,
  removePrice,
  timeToSeconds,
  groupAndSortDataByTime,
  groupAndSortByRepetitions,
  groupAndSortByWeight,
  groupAndSortByTotalPoints,
} = require("../../utils/functions");
const { getAllCategoryUserCount } = require("./utilsFunctions");

const bothWorkoutRanking = async (data) => {
  try {
    const rankingDocSnapshot = await db
      .collection(FirebaseCollectionNames.Ranking)
      .doc(data.id)
      .get();

    if (!rankingDocSnapshot.exists) {
      console.log("No document found for wodId:", data.id);
      return;
    }

    const requestedWorkoutRanking = rankingDocSnapshot.data();
    if (!requestedWorkoutRanking) {
      console.error(`No ranking data found for wodId: ${data.id}`);
      return;
    }

    const completedWorkoutRanking = [];
    const incompleteWorkoutRanking = [];

    // Separate completed and incomplete rankings with deep clones
    for (const [key, value] of Object.entries(requestedWorkoutRanking)) {
      const modifiedValue = {
        ...value,
        category: removePrice(value.category),
      };

      if (value?.uploadTime && value?.liftedWeight) {
        modifiedValue.uploadTime = timeToSeconds(value.uploadTime);
        modifiedValue.liftedWeight = convertToNumber(value.liftedWeight);
        completedWorkoutRanking.push({ ...modifiedValue });
      } else if (value?.repetitions && value?.liftedWeight) {
        modifiedValue.repetitions = Number(value.repetitions);
        modifiedValue.liftedWeight = convertToNumber(value.liftedWeight);
        incompleteWorkoutRanking.push({ ...modifiedValue });
      }
    }

    const users = await getAllCategoryUserCount();

    // Group and sort data with deep clones
    const timeSortedData = {
      ...groupAndSortDataByTime(
        completedWorkoutRanking.map((item) => ({ ...item }))
      ),
    };
    const repetitionsSortedData = {
      ...groupAndSortByRepetitions(
        incompleteWorkoutRanking.map((item) => ({ ...item }))
      ),
    };
    const weightSortedData = {
      ...groupAndSortByWeight(
        [...completedWorkoutRanking, ...incompleteWorkoutRanking].map(
          (item) => ({ ...item })
        )
      ),
    };

    // Merge sorted data into timeRepData
    const timeRepData = {};
    for (const [key, value] of Object.entries(timeSortedData)) {
      timeRepData[key] = [
        ...(timeRepData[key] || []),
        ...value.map((item) => ({ ...item })),
      ];
    }
    for (const [key, value] of Object.entries(repetitionsSortedData)) {
      timeRepData[key] = [
        ...(timeRepData[key] || []),
        ...value.map((item) => ({ ...item })),
      ];
    }

    // Calculate ranks and points for time and repetitions
    for (const [key, value] of Object.entries(timeRepData)) {
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

    // Calculate ranks and points for weight
    for (const [key, value] of Object.entries(weightSortedData)) {
      let rank = 1;
      let currentPoints = users[key] || 0;
      let ties = 0;

      for (let i = 0; i < value.length; i++) {
        if (i > 0) {
          const sameWeight =
            value[i].liftedWeight === value[i - 1].liftedWeight;

          if (!sameWeight) {
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

    const testRankingData = {};

    // Merge timeRepData and weightSortedData into testRankingData
    for (const [key, value] of Object.entries(timeRepData)) {
      for (const user of value) {
        testRankingData[user.docId] = {
          ...user,
          totalPoints: user.points,
        };
      }
    }

    for (const [key, value] of Object.entries(weightSortedData)) {
      for (const user of value) {
        testRankingData[user.docId] = {
          ...user,
          totalPoints: user.points + (testRankingData[user.docId]?.points || 0),
        };
      }
    }

    const rankingData = groupAndSortByTotalPoints(testRankingData);

    // Calculate ranks and points for the combined ranking
    for (const [key, value] of Object.entries(rankingData)) {
      value.sort((a, b) => {
        if (a.totalPoints === b.totalPoints) {
          return a.uploadTime - b.uploadTime;
        }

        return b.totalPoints - a.totalPoints;
      });

      let rank = 1;
      let currentPoints = users[key] || 0;
      let ties = 0;

      for (let i = 0; i < value.length; i++) {
        if (i > 0) {
          const samePoints = value[i].totalPoints === value[i - 1].totalPoints;
          const sameUploadTime =
            value[i].uploadTime === value[i - 1].uploadTime;

          if (!samePoints || !sameUploadTime) {
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

    console.log("timeRepData:", timeRepData);
    console.log("weightSortedData:", weightSortedData);
    console.log("rankingData:", rankingData);

    // Update Firestore with the new ranking data
    await db
      .collection(FirebaseCollectionNames.Ranking)
      .doc(data.id)
      .set(updatedRanking, { merge: true });

    // Additional processing or Firestore updates can be added here as required.
  } catch (error) {
    console.error("Error in bothWorkoutRanking:", error);
    throw error;
  }
};

module.exports = bothWorkoutRanking;
