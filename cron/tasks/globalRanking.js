const { db } = require("../../credentials/firebase");
const {
  FirebaseCollectionNames,
  workout1ID,
} = require("../../utils/constants");
const {
  sortAndAssignRanks,
  updateLastCronJobUpdateTime,
} = require("../../utils/functions");

const wod1ID = workout1ID;

const handleGlobalRanking = async () => {
  try {
    const rankingDocSnapshots = await db
      .collection(FirebaseCollectionNames.Ranking)
      .get();

    if (rankingDocSnapshots.empty) {
      console.log("No documents found in the Ranking collection");
      // return res.status(404).json({ error: "No ranking data found" });
    }

    // Exclude the document with ID 'globalRanking'
    const workoutsRanking = rankingDocSnapshots.docs
      .filter((doc) => doc.id !== "globalRanking")
      .map((doc) => ({
        [doc.id]: doc.data(),
      }));

    if (!workoutsRanking.length) {
      return;
    }

    const users = {};
    const teams = {};

    for (const workoutRank of workoutsRanking) {
      for (const [workoutId, workoutRanking] of Object.entries(workoutRank)) {
        for (const [userId, userRanking] of Object.entries(workoutRanking)) {
          if (userRanking?.teamId) {
            if (!teams[userRanking.teamId]) {
              teams[userRanking.teamId] = {};
            }
            teams[userRanking.teamId][workoutId] = userRanking?.points;
          } else {
            if (!users[userId]) {
              users[userId] = {};
            }
            users[userId][workoutId] = userRanking?.points;
          }
        }
      }
    }

    const updatedUsers = {};
    const updatedTeams = {};

    for (const [userId, userRankings] of Object.entries(users)) {
      for (const [workoutId, points] of Object.entries(userRankings)) {
        if (!updatedUsers[userId]) {
          updatedUsers[userId] = 0;
        }
        updatedUsers[userId] += points;
      }
    }

    for (const [teamId, teamRankings] of Object.entries(teams)) {
      for (const [workoutId, points] of Object.entries(teamRankings)) {
        if (!updatedTeams[teamId]) {
          updatedTeams[teamId] = 0;
        }
        updatedTeams[teamId] += points;
      }
    }

    const wod1rankingDocSnapshot = await db
      .collection(FirebaseCollectionNames.Ranking)
      .doc(wod1ID)
      .get();

    if (!wod1rankingDocSnapshot.exists) {
      console.log("No document found for wodId:", wod1ID);
      return;
    }

    const wod1Ranking = wod1rankingDocSnapshot.data();

    for (const [userId, userRanking] of Object.entries(wod1Ranking)) {
      if (userRanking.teamId) {
        userRanking.points = updatedTeams[userRanking.teamId];
        userRanking.rank = 0;
        userRanking.wodNumber = "General";
      } else {
        userRanking.points = updatedUsers[userId];
        userRanking.rank = 0;
        userRanking.wodNumber = "General";
      }
    }

    const rankedData = sortAndAssignRanks(wod1Ranking);

    await db
      .collection(FirebaseCollectionNames.Ranking)
      .doc("globalRanking")
      .set(rankedData, { merge: true });

    updateLastCronJobUpdateTime();
    // await res.status(200).json({
    //   message: "Global ranking updated successfully",
    //   data: wod1Ranking,
    // });
  } catch (error) {
    console.error("Error retrieving global ranking:", error);
    // res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = handleGlobalRanking;
