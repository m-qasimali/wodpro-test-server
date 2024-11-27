const { db } = require("../credentials/firebase");
const { FirebaseCollectionNames } = require("./constants");

const removePrice = (category) => {
  if (typeof category !== "string") {
    console.error("Invalid input to removePrice:", category);
    return "";
  }
  return category
    .replace(/\s\d+\s?€/, "")
    .trim()
    .toLowerCase();
};

const timeToSeconds = (time) => {
  const [minutes, seconds] = time.match(/\d+/g).map(Number);
  return minutes * 60 + seconds;
};

function groupAndSortDataByTime(data) {
  const groupedData = data.reduce((acc, item) => {
    if (!acc[item.category?.toLowerCase()]) {
      acc[item.category?.toLowerCase()] = [];
    }
    acc[item.category?.toLowerCase()].push(item);
    return acc;
  }, {});

  for (const category in groupedData) {
    groupedData[category?.toLowerCase()].sort(
      (a, b) => a.uploadTime - b.uploadTime
    );
  }

  return groupedData;
}

const groupAndSortByTotalPoints = (data) => {
  const dataArray = Object.values(data);

  const groupedData = dataArray.reduce((acc, item) => {
    if (!acc[item.category?.toLowerCase()]) {
      acc[item.category?.toLowerCase()] = [];
    }
    acc[item.category?.toLowerCase()].push(item);
    return acc;
  }, {});

  // Sort each group by `totalPoints` in descending order
  for (const category in groupedData) {
    groupedData[category].sort((a, b) => b.totalPoints - a.totalPoints);
  }

  return groupedData;
};

function groupAndSortByWeight(data) {
  const groupedData = data.reduce((acc, item) => {
    if (!acc[item.category?.toLowerCase()]) {
      acc[item.category?.toLowerCase()] = [];
    }
    acc[item.category?.toLowerCase()].push(item);
    return acc;
  }, {});

  Object.keys(groupedData).forEach((category) => {
    groupedData[category?.toLowerCase()].sort((a, b) => {
      const weightA = a.liftedWeight || 0;
      const weightB = b.liftedWeight || 0;

      if (!isNaN(weightA) && !isNaN(weightB)) {
        return weightB - weightA;
      } else {
        return String(weightA).localeCompare(String(weightB));
      }
    });
  });

  return groupedData;
}

function groupAndSortByRepetitions(data) {
  const groupedData = data.reduce((acc, item) => {
    if (!acc[item.category?.toLowerCase()]) {
      acc[item.category?.toLowerCase()] = [];
    }
    acc[item.category?.toLowerCase()].push(item);
    return acc;
  }, {});

  Object.keys(groupedData).forEach((category) => {
    groupedData[category?.toLowerCase()].sort((a, b) => {
      const repA = a.repetitions || 0;
      const repB = b.repetitions || 0;

      if (!isNaN(repA) && !isNaN(repB)) {
        return Number(repB) - Number(repA);
      } else {
        return String(repA).localeCompare(String(repB));
      }
    });
  });

  return groupedData;
}

const convertToNumber = (str) => {
  if (str === "") return 0; // Handle empty string
  const number = parseFloat(str);
  return isNaN(number) ? null : number;
};

const generateRandomNumber = () => {
  return Math.floor(Math.random() * 60);
};

function sortAndAssignRanks(data) {
  const users = Object.values(data);

  users.sort((a, b) => b.points - a.points);

  let currentRank = 1;
  for (let i = 0; i < users.length; i++) {
    if (i > 0 && users[i].points !== users[i - 1].points) {
      currentRank = currentRank + 1;
    }
    users[i].rank = currentRank;
  }

  const sortedData = {};
  users.forEach((user) => {
    sortedData[user.docId] = user;
  });

  return sortedData;
}

async function updateLastCronJobUpdateTime() {
  const date = new Date();
  const lastCronJobUpdateTime = date.getTime();

  await db
    .collection(FirebaseCollectionNames.Config)
    .doc("lastCronJobUpdateTime")
    .set({
      lastUpdatedAt: lastCronJobUpdateTime,
    });

  console.log("Last cron job update time updated to:", lastCronJobUpdateTime);
}

module.exports = {
  removePrice,
  timeToSeconds,
  groupAndSortByRepetitions,
  groupAndSortDataByTime,
  convertToNumber,
  groupAndSortByWeight,
  generateRandomNumber,
  sortAndAssignRanks,
  updateLastCronJobUpdateTime,
  groupAndSortByTotalPoints,
};
