
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("./models/User");
const Voucher = require("./models/Voucher");

async function testModels() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected!");
    console.log("User model loaded:", User.modelName);
    console.log("Voucher model loaded:", Voucher.modelName);

    console.log("User collection:", User.collection.name);
    console.log("Voucher collection:", Voucher.collection.name);
  } catch (error) {
    console.error("Test failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
}

testModels();
