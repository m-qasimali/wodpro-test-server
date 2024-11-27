const admin = require("firebase-admin");
const { db, app } = require("../../credentials/firebase");

require("dotenv").config();

const CountryController = {
  // Check country in database
  async checkCountry(req, res) {
    try {
        const { country, province, city } = req.body;
        if (!country || !province || !city) {
          return res.status(400).send("Please provide country, province, and city.");
        }
  
        // Reference to the country document
        const docRef = db.collection("countries").doc(country);
        const docSnapshot = await docRef.get();
  
        if (!docSnapshot.exists) {
          // Initialize the document with an empty object if it's being created for the first time
          await docRef.set({});
        }
  
        // Check if the province exists in the document
        const data = docSnapshot.data();
        if (data && data[province]) {
          // If the province exists, update the array of cities directly under the province
          await docRef.update({
            [province]: admin.firestore.FieldValue.arrayUnion(city), // Push city to the array under province
          });
        } else {
          // If the province doesn't exist, create an array with the city as the first element
          await docRef.update({
            [province]: [city], // Initialize the province with an array containing the city
          });
        }
  
        res.status(200).send("Data stored successfully!");
      } catch (error) {
        console.error("Error storing data:", error);
        res.status(500).send("Error storing data.");
      }
  },
};

module.exports = CountryController;
