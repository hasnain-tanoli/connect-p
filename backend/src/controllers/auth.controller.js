import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js";
import jwt from "jsonwebtoken";


// Signup Function
export async function signup(req, res) {
  const { email, password, fullName } = req.body;

  try {
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "All fields are required for signup" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists, please use a different one" });
    }

    const idx = Math.floor(Math.random() * 100) + 1;
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;

    const newUser = await User.create({
      email,
      fullName,
      password,
      profilePic: randomAvatar,
    });

    try {
      await upsertStreamUser({
        id: newUser._id.toString(),
        name: newUser.fullName,
        image: newUser.profilePic || "",
      });
      console.log(`Stream user created for ${newUser.fullName}`);
    } catch (error) {
      console.log("Error creating Stream user:", error);
    }

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      secure: process.env.NODE_ENV === "production",
      domain: process.env.NODE_ENV === "production" ? ".railway.app" : undefined,
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    console.log("Error in signup controller", error);
    if (error.code === 11000) { 
        return res.status(400).json({ message: "An account with this email may already exist." });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Login Function
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      secure: process.env.NODE_ENV === "production",
      domain: process.env.NODE_ENV === "production" ? ".railway.app" : undefined,
    });

    res.status(200).json({ success: true, user });
  } catch (error)
 {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Logout Function
export function logout(req, res) {
  res.clearCookie("jwt");
  res.status(200).json({ success: true, message: "Logout successful" });
}

// Onboard Function
export async function onboard(req, res) {
  try {
    const userId = req.user._id;

    // learningLanguage REMOVED from destructuring
    const { username, fullName, bio, nativeLanguage, location, profilePic } = req.body;

    if (!username) {
        return res.status(400).json({ message: "Username is required." });
    }
    const normalizedUsername = username.toLowerCase().trim();

    if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
        return res.status(400).json({ message: "Username must be between 3 and 20 characters." });
    }
    if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
        return res.status(400).json({ message: "Username can only contain letters (a-z), numbers (0-9), and underscores (_)." });
    }

    const existingUserWithUsername = await User.findOne({ username: normalizedUsername });
    if (existingUserWithUsername && existingUserWithUsername._id.toString() !== userId.toString()) {
      return res.status(400).json({ message: "Username is already taken. Please choose another one." });
    }

    if (!fullName || !bio || !nativeLanguage || !location) {
      return res.status(400).json({
        message: "Full name, bio, native language, and location are required.",
        missingFields: [
          !fullName && "fullName",
          !bio && "bio",
          !nativeLanguage && "nativeLanguage",
          !location && "location",
        ].filter(Boolean),
      });
    }

    const updateData = {
      username: normalizedUsername,
      fullName,
      bio,
      nativeLanguage,
      location,
      isOnboarded: true,
    };

    if (profilePic !== undefined) {
      updateData.profilePic = profilePic;
    }
    // learningLanguage update REMOVED

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "",
      });
      console.log(`Stream user updated after onboarding/profile update for ${updatedUser.fullName}`);
    } catch (streamError) {
      console.log("Error updating Stream user during onboarding/profile update:", streamError.message);
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Onboarding/Profile update error:", error);
    if (error.code === 11000 && error.keyPattern && error.keyPattern.username) {
        return res.status(400).json({ message: "This username is already taken. Please choose another one." });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
}
