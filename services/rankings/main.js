const { db } = require("../../credentials/firebase");
const { FirebaseCollectionNames } = require("../../utils/constants");
const bothWorkoutRanking = require("./bothWorkoutRanking");
const timeWorkoutRanking = require("./timeWorkoutRanking");
const weightWorkoutRanking = require("./weightWorkoutRanking");

const calculateRankings = (() => {
  const processingTasks = new Set(); // Track currently processing `data.id`

  return async (data) => {
    if (!data?.id || data.id === "globalRanking") {
      console.log("Skipping globalRanking or invalid data.");
      return;
    }

    // Skip if already processing the same `data.id`
    if (processingTasks.has(data.id)) {
      console.log(`Ranking calculation already in progress for id: ${data.id}`);
      return;
    }

    try {
      processingTasks.add(data.id); // Mark as processing

      const workoutDoc = await db
        .collection(FirebaseCollectionNames.Workouts)
        .doc(data.id)
        .get();

      const workoutData = workoutDoc.data();

      if (!workoutData) {
        console.error(`Workout data not found for id: ${data.id}`);
        return;
      }

      const workoutResultType = workoutData.resultType;

      console.log("workoutResultType: ", workoutResultType);

      if (!["time", "weight", "both"].includes(workoutResultType)) {
        console.log("Unknown or missing workout result type.");
        return;
      }

      // Process based on workout result type
      if (workoutResultType === "time") {
        await timeWorkoutRanking(data);
      } else if (workoutResultType === "weight") {
        await weightWorkoutRanking(data);
      } else if (workoutResultType === "both") {
        await bothWorkoutRanking(data);
      }
    } catch (error) {
      console.error(`Error calculating rankings for id: ${data.id}`, error);
    } finally {
      processingTasks.delete(data.id); // Remove from processing set
    }
  };
})();

module.exports = calculateRankings;
