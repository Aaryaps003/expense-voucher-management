
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const readline = require("readline");

const User = require("../models/User");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const name = (await ask("Staff name: ")).trim();
    const email = (await ask("Staff email: ")).trim().toLowerCase();
    const role = (await ask("Role (Director/Accounts): ")).trim();

    if (!["Director", "Accounts"].includes(role)) {
      throw new Error("Role must be Director or Accounts.");
    }

    if (!name || !email) {
      throw new Error("Name and email are required.");
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error("A user with this email already exists.");
    }

    const password = await ask("Password (input will be visible): ");

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    console.log(`${role} account created successfully.`);
    console.log(`User ID: ${user._id}`);
    console.log(`Email: ${user.email}`);
  } catch (error) {
    console.error("Staff account creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect().catch(() => {});
  }
}

main();
