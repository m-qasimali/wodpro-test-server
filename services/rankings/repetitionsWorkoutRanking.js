const { db } = require("../../credentials/firebase");
const { FirebaseCollectionNames } = require("../../utils/constants");
const {
  convertToNumber,
  groupAndSortByWeight,
  removePrice,
  groupAndSortByRepetitions,
} = require("../../utils/functions");
const { getAllCategoryUserCount } = require("./utilsFunctions");

const repetitionsWorkoutRanking = async (data) => {
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

    // Process ranking data
    for (const [key, value] of Object.entries(requestedWorkoutRanking)) {
      const modifiedValue = {
        ...value,
        category: removePrice(value.category),
      };

      if (value?.repetitions) {
        modifiedValue.repetitions = convertToNumber(value.repetitions);
      } else {
        modifiedValue.repetitions = 0;
      }
      completedWorkoutRanking.push(modifiedValue);
    }

    const users = await getAllCategoryUserCount();
    // Group and sort data
    const rankingData = groupAndSortByRepetitions(completedWorkoutRanking);

    // Calculate ranks and points
    for (const [key, value] of Object.entries(rankingData)) {
      let rank = 1;

      let currentPoints = users[key] || 0;
      let ties = 0;

      for (let i = 0; i < value.length; i++) {
        if (i > 0) {
          const sameRepetitions =
            value[i].repetitions === value[i - 1].repetitions;

          if (!sameRepetitions) {
            currentPoints -= 1 + ties;
            ties = 0;
            rank++;
          } else {
            ties++;
          }
        }

        value[i].points = currentPoints;
        value[i].rank = rank;

        if (value[i].repetitions === 0) {
          value[i].points = 0;
          value[i].rank = 0;
        }
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

    await db
      .collection(FirebaseCollectionNames.Ranking)
      .doc(data.id)
      .set(updatedRanking, { merge: true });
  } catch (error) {
    console.error("Error in repetionsWorkoutRanking:", error);
    throw error;
  }
};

module.exports = repetitionsWorkoutRanking;
