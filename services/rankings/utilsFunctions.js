const { db } = require("../../credentials/firebase");
const { FirebaseCollectionNames } = require("../../utils/constants");
const { removePrice } = require("../../utils/functions");

const getAllCategoryUserCount = async () => {
  const usersCollection = db.collection(FirebaseCollectionNames.Users);
  const categoryCounts = {};

  try {
    const snapshot = await usersCollection.get();
    const users = snapshot.docs.map((doc) => doc.data());
    const teamIds = [];

    for (const user of users) {
      const category = removePrice(user.categoryName);
      const userTeamId = user.teamId;
      if (userTeamId) {
        if (!teamIds.includes(userTeamId)) {
          teamIds.push(userTeamId);
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      } else {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    }

    return categoryCounts;
  } catch (error) {
    console.error("Error updating user categories:", error);
    throw error;
  }
};

module.exports = {
  getAllCategoryUserCount,
};
