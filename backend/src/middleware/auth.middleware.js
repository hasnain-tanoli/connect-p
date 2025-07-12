import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectRoute = async (req, res, next) => {
  try {
    console.log("Protecting route. Cookies received:", req.cookies);
    const token = req.cookies.jwt;

    if (!token) {
      console.log("No JWT token found in cookies.");
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      // This block is technically unreachable as jwt.verify throws on error
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Unauthorized - User not found" });
    }

    req.user = user;

    next();
  } catch (error) {
    console.log("Error in protectRoute middleware:", error.name, error.message);
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: `Unauthorized - ${error.message}` });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};
