const Queue = require("bull");
const calculateRankings = require("../services/rankings/main");

const rankingTaskQueue = new Queue("jobQueue", {
  limiter: {
    max: 1000,
    duration: 60000,
  },
  settings: {
    stallInterval: 30000, // Increase the stall interval to 30 seconds
    maxStalledCount: 10, // Increase the max stalled count to allow more retries
    retryProcessDelay: 5000, // Delay between retries set to 5 seconds
    lockDuration: 3600000, // Set the lock duration to 1 hour (adjust based on your longest job)
    backoffStrategies: {
      exponential: function (attemptsMade, err) {
        return Math.min(60 * 1000, Math.pow(2, attemptsMade) * 1000); // Exponential backoff with max 1 minute delay
      },
    },
  },
  defaultJobOptions: {
    attempts: 10, // Number of retry attempts
    backoff: {
      type: "exponential",
      delay: 3000, // Initial delay of 3 seconds, increasing exponentially
    },
    timeout: 43200000, // 12 hours timeout, make sure it covers your longest possible job duration
    // removeOnComplete: true, // Automatically remove completed jobs
    // removeOnFail: true, // Automatically remove failed jobs
    removeOnComplete: 100, // Automatically remove completed jobs after 100 completed jobs
    removeOnFail: 100, // Automatically remove failed jobs after 100 failed jobs
  },
});

rankingTaskQueue.process(async (job, done) => {
  const data = job.data;

  calculateRankings(data);

  done();
});

module.exports = rankingTaskQueue;
