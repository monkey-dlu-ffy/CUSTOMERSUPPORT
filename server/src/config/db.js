const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Our debugging line to ensure the right string is loaded
    console.log("Attempting to connect with URI:"); 

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      family: 4, // Forces IPv4 to prevent routing timeouts
    });

    console.log(`MongoDB Connected`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Exit with failure
  }
};

module.exports = connectDB;