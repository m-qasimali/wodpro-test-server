const { db } = require("../credentials/firebase");
const registerNewUserInWorkout = require("../services/registerNewUserInWorkout");
const { FirebaseCollectionNames } = require("../utils/constants");
const rankingTaskQueue = require("../utils/queues");

let isListenerInitialized = false;

const initializeFirestoreListener = () => {
  if (!isListenerInitialized) {
    const userCollectionRef = db.collection(FirebaseCollectionNames?.Users);
    const rankingCollectionRef = db.collection(
      FirebaseCollectionNames?.Ranking
    );

    let initialUserLoad = true;
    let initialVideoLoad = true;
    let isProcessingRanking = false; // Mutex lock for ranking updates
    let debounceTimeout; // Debounce timer for ranking updates

    userCollectionRef.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        // Skip processing for initial load
        if (initialUserLoad) return;

        if (change.type === "added") {
          const data = change.doc.data();
          registerNewUserInWorkout(data);
        }
      });

      // Mark initial load as complete after first snapshot processing
      initialUserLoad = false;
    });

    rankingCollectionRef.onSnapshot((snapshot) => {
      // Skip initial load
      if (initialVideoLoad) {
        initialVideoLoad = false;
        return;
      }

      // Debounce ranking updates
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        if (isProcessingRanking) return; // Skip if already processing

        isProcessingRanking = true; // Acquire mutex lock

        Promise.all(
          snapshot
            .docChanges()
            .filter((change) => change.type === "modified")
            .map((change) => rankingTaskQueue.add({ id: change.doc.id }))
        )
          .then(() => {
            console.log("Ranking updates processed successfully.");
          })
          .catch((error) => {
            console.error("Error processing ranking updates:", error);
          })
          .finally(() => {
            isProcessingRanking = false; // Release mutex lock
          });
      }, 300); // Adjust debounce delay as needed
    });

    isListenerInitialized = true;
  }
};

module.exports = initializeFirestoreListener;
