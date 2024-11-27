const cron = require("node-cron");
const handleGlobalRanking = require("./tasks/globalRanking");

function initCronJobs() {
  // cron.schedule("0 */5 * * * *", handleGlobalRanking);
  // cron.schedule("0 */3 * * *", handleGlobalRanking);
  cron.schedule("0 0 * * * *", handleGlobalRanking);
}

module.exports = initCronJobs;
