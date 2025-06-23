// ConnectP/backend/controllers/user.controller.js
import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import mongoose from "mongoose";

export async function searchUsers(req, res) {
  try {
    if (!req.user || !req.user.id) {
      console.error("User not authenticated or user ID missing in searchUsers");
      return res.status(401).json({ message: "Unauthorized: User data not found." });
    }
    const currentUserId = req.user.id;
    const currentUserFriends = Array.isArray(req.user.friends) ? req.user.friends : [];

    const { keyword } = req.query;

    if (!keyword || keyword.trim() === "") {
      return res.status(200).json([]);
    }

    const trimmedKeyword = keyword.trim();
    const regex = new RegExp(trimmedKeyword, "i");

    if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
        console.error("Invalid currentUserId for ObjectId conversion in searchUsers:", currentUserId);
        return res.status(400).json({ message: "Invalid user identifier." });
    }
    const currentObjectId = new mongoose.Types.ObjectId(currentUserId);

    const friendObjectIds = currentUserFriends
        .filter(friendId => mongoose.Types.ObjectId.isValid(String(friendId)))
        .map(friendId => new mongoose.Types.ObjectId(String(friendId)));

    const query = {
      _id: { $ne: currentObjectId, $nin: friendObjectIds },
      isOnboarded: true,
      $or: [
        { fullName: regex },
        { username: regex },
      ],
    };

    const users = await User.find(query)
      .select("fullName username profilePic nativeLanguage location bio isOnboarded")
      .limit(30);

    res.status(200).json(users);
  } catch (error) {
    console.error("ERROR_DETAILS in searchUsers controller:", error);
    res.status(500).json({ message: "Internal Server Error during user search." });
  }
}

export async function getRecommendedUsers(req, res) {
  try {
    if (!req.user || !req.user.id) {
      console.error("[LOG] getRecommendedUsers: User not authenticated or user ID missing.");
      return res.status(401).json({ message: "Unauthorized: User data not found." });
    }
    const currentUserIdString = req.user.id.toString();

    if (!mongoose.Types.ObjectId.isValid(currentUserIdString)) {
        console.error(`[LOG] getRecommendedUsers: Invalid currentUserId for ObjectId conversion: ${currentUserIdString}`);
        return res.status(400).json({ message: "Invalid user identifier." });
    }
    const currentObjectId = new mongoose.Types.ObjectId(currentUserIdString);
    // console.log(`[LOG] getRecommendedUsers: Current User ObjectId: ${currentObjectId}`); // Keep for debugging if needed

    const currentUserFriendsStrings = Array.isArray(req.user.friends)
        ? req.user.friends.map(f => f.toString())
        : [];
    // console.log(`[LOG] getRecommendedUsers: Current User Friends (string IDs): ${JSON.stringify(currentUserFriendsStrings)}`); // Keep for debugging

    const limit = 20;

    const friendObjectIds = currentUserFriendsStrings
        .filter(friendIdString => mongoose.Types.ObjectId.isValid(friendIdString))
        .map(friendIdString => new mongoose.Types.ObjectId(friendIdString));
    // console.log(`[LOG] getRecommendedUsers: Friend ObjectIds for query: ${JSON.stringify(friendObjectIds)}`); // Keep for debugging

    const matchQuery = {
      _id: {
        $ne: currentObjectId,
        $nin: friendObjectIds,
      },
      isOnboarded: true,
    };
    // console.log(`[LOG] getRecommendedUsers: MongoDB $match query: ${JSON.stringify(matchQuery)}`); // Keep for debugging

    const potentialUserCount = await User.countDocuments(matchQuery);
    // console.log(`[LOG] getRecommendedUsers: Count of users matching criteria (before $sample): ${potentialUserCount}`); // Keep for debugging


    const recommendedUsers = await User.aggregate([
      { $match: matchQuery },
      { $sample: { size: limit } },
      {
        // CORRECTED $project STAGE (Inclusion Mode)
        $project: {
          _id: 1, // Include _id
          fullName: 1,
          username: 1,
          profilePic: 1,
          nativeLanguage: 1,
          location: 1,
          bio: 1,
          isOnboarded: 1,
          // 'password', 'friends', 'email', '__v', 'createdAt', 'updatedAt' etc.
          // will be excluded by default because they are not listed with a '1'.
        },
      },
    ]);

    // console.log(`[LOG] getRecommendedUsers: Number of recommended users found: ${recommendedUsers.length}`); // Keep for debugging

    res.status(200).json(recommendedUsers);
  } catch (error) {
    console.error("[LOG] ERROR_DETAILS in getRecommendedUsers controller:", error);
    res.status(500).json({ message: "Internal Server Error while fetching recommendations." });
  }
}


export async function getMyFriends(req, res) {
  try {
    if (!req.user || !req.user.id) {
      console.error("User not authenticated or user ID missing in getMyFriends");
      return res.status(401).json({ message: "Unauthorized: User data not found." });
    }
    const currentUserId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
        console.error("Invalid currentUserId for ObjectId conversion in getMyFriends:", currentUserId);
        return res.status(400).json({ message: "Invalid user identifier." });
    }

    const user = await User.findById(currentUserId)
      .select("friends")
      .populate({
          path: "friends",
          select: "fullName username profilePic nativeLanguage location bio isOnboarded _id" // Added _id for friends
      });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.friends || []);
  } catch (error) {
    console.error("ERROR_DETAILS in getMyFriends controller", error);
    res.status(500).json({ message: "Internal Server Error while fetching friends." });
  }
}

export async function sendFriendRequest(req, res) {
  try {
    if (!req.user || !req.user.id) {
      console.error("User not authenticated or user ID missing in sendFriendRequest");
      return res.status(401).json({ message: "Unauthorized: User data not found." });
    }
    const myId = req.user.id;
    const { id: recipientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(myId) || !mongoose.Types.ObjectId.isValid(recipientId)) {
        console.error("Invalid sender or recipient ID for ObjectId conversion in sendFriendRequest");
        return res.status(400).json({ message: "Invalid user identifier(s)." });
    }
    const senderObjectId = new mongoose.Types.ObjectId(myId);
    const recipientObjectId = new mongoose.Types.ObjectId(recipientId);


    if (senderObjectId.equals(recipientObjectId)) {
      return res.status(400).json({ message: "You can't send a friend request to yourself." });
    }

    const recipientUser = await User.findById(recipientObjectId).select("friends");
    if (!recipientUser) {
      return res.status(404).json({ message: "Recipient not found." });
    }

    if (recipientUser.friends && recipientUser.friends.some(friendId => friendId.equals(senderObjectId))) {
      return res.status(400).json({ message: "You are already friends with this user." });
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderObjectId, recipient: recipientObjectId },
        { sender: recipientObjectId, recipient: senderObjectId },
      ],
    });

    if (existingRequest) {
      let message = "A friend request already exists between you and this user.";
      if (existingRequest.sender.equals(senderObjectId)) {
        message = "You have already sent a friend request to this user.";
      } else if (existingRequest.recipient.equals(senderObjectId)) {
        message = "This user has already sent you a friend request.";
      }
      return res.status(400).json({ message });
    }

    const friendRequest = await FriendRequest.create({
      sender: senderObjectId,
      recipient: recipientObjectId,
    });

    res.status(201).json(friendRequest);
  } catch (error) {
    console.error("ERROR_DETAILS in sendFriendRequest controller", error);
    res.status(500).json({ message: "Internal Server Error while sending friend request." });
  }
}

export async function acceptFriendRequest(req, res) {
  try {
    if (!req.user || !req.user.id) {
      console.error("User not authenticated or user ID missing in acceptFriendRequest");
      return res.status(401).json({ message: "Unauthorized: User data not found." });
    }
    const myId = req.user.id;
    const { id: requestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(myId) || !mongoose.Types.ObjectId.isValid(requestId)) {
        console.error("Invalid user or request ID for ObjectId conversion in acceptFriendRequest");
        return res.status(400).json({ message: "Invalid identifier(s)." });
    }
    const myObjectId = new mongoose.Types.ObjectId(myId);

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    if (!friendRequest.recipient.equals(myObjectId)) {
      return res.status(403).json({ message: "You are not authorized to accept this request." });
    }

    if (friendRequest.status === "accepted") {
        return res.status(400).json({ message: "Friend request has already been accepted." });
    }

    friendRequest.status = "accepted";
    await friendRequest.save();

    await User.findByIdAndUpdate(friendRequest.sender, {
      $addToSet: { friends: friendRequest.recipient },
    });

    await User.findByIdAndUpdate(friendRequest.recipient, {
      $addToSet: { friends: friendRequest.sender },
    });

    res.status(200).json({ message: "Friend request accepted." });
  } catch (error) {
    console.error("ERROR_DETAILS in acceptFriendRequest controller", error);
    res.status(500).json({ message: "Internal Server Error while accepting friend request." });
  }
}

export async function getFriendRequests(req, res) {
  try {
    if (!req.user || !req.user.id) {
      console.error("User not authenticated or user ID missing in getFriendRequests");
      return res.status(401).json({ message: "Unauthorized: User data not found." });
    }
    const myId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(myId)) {
        console.error("Invalid user ID for ObjectId conversion in getFriendRequests");
        return res.status(400).json({ message: "Invalid user identifier." });
    }
    const myObjectId = new mongoose.Types.ObjectId(myId);

    const incomingReqs = await FriendRequest.find({
      recipient: myObjectId,
      status: "pending",
    })
    .populate("sender", "fullName username profilePic nativeLanguage location bio isOnboarded _id"); // Added _id

    const acceptedByOthersReqs = await FriendRequest.find({
      sender: myObjectId,
      status: "accepted",
    })
    .populate("recipient", "fullName username profilePic nativeLanguage location bio isOnboarded _id"); // Added _id

    res.status(200).json({ incomingReqs, acceptedByOthersReqs });
  } catch (error) {
    console.error("ERROR_DETAILS in getFriendRequests controller", error);
    res.status(500).json({ message: "Internal Server Error while fetching friend requests." });
  }
}

export async function getOutgoingFriendReqs(req, res) {
  try {
    if (!req.user || !req.user.id) {
      console.error("User not authenticated or user ID missing in getOutgoingFriendReqs");
      return res.status(401).json({ message: "Unauthorized: User data not found." });
    }
    const myId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(myId)) {
        console.error("Invalid user ID for ObjectId conversion in getOutgoingFriendReqs");
        return res.status(400).json({ message: "Invalid user identifier." });
    }
    const myObjectId = new mongoose.Types.ObjectId(myId);

    const outgoingRequests = await FriendRequest.find({
      sender: myObjectId,
      status: "pending",
    })
    .populate("recipient", "fullName username profilePic nativeLanguage location bio isOnboarded _id"); // Added _id

    res.status(200).json(outgoingRequests);
  } catch (error) {
    console.error("ERROR_DETAILS in getOutgoingFriendReqs controller", error);
    res.status(500).json({ message: "Internal Server Error while fetching outgoing friend requests." });
  }
}