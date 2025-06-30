import { Link } from "react-router"; // CORRECTED: Ensure it's "react-router-dom"
import { LANGUAGE_TO_FLAG } from "../constants/index.js";
import { capitalize } from "../lib/utils";

// Function to get the flag image URL or null
export function getLanguageFlag(language) {
  if (!language || typeof language !== 'string' || language.trim() === "") {
    return null;
  }

  const langLower = language.toLowerCase().trim();
  const countryCode = LANGUAGE_TO_FLAG[langLower];

  if (countryCode) {
    return (
      <img
        src={`https://flagcdn.com/w20/${countryCode}.png`}
        alt={`${langLower} flag`}
        className="h-3 mr-1.5 inline-block align-middle"
        width="20"
      />
    );
  }
  return null;
}

const FriendCard = ({ friend, unreadCount }) => {
  return (
    <div className="card bg-base-200 hover:shadow-md transition-shadow">
      <div className="card-body p-4 flex flex-col"> {/* main card body */}
        
        {/* USER INFO ROW: Avatar, Name, Username, Unread Badge */}
        <div className="flex justify-between items-start gap-3 mb-1"> {/* Use items-start for vertical alignment */}
          
          {/* Left section: Avatar, Name, Username */}
          <div className="flex items-center gap-3 overflow-hidden"> {/* Container for avatar and text to allow truncation */}
            <div className="avatar flex-shrink-0 size-12 rounded-full overflow-hidden">
              <img
                src={friend.profilePic}
                alt={friend.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col"> {/* Stack name and username */}
              <h3 className="font-semibold truncate leading-tight">{friend.fullName}</h3>
              {/* Conditionally display username */}
              {friend.username && (
                <p className="text-xs text-base-content/70 truncate leading-tight">
                  @{friend.username}
                </p>
              )}
            </div>
          </div>

          {/* Right section: Unread Count Badge */}
          {unreadCount > 0 && (
            <div className="flex-shrink-0 bg-gray-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center mt-1"> {/* mt-1 for slight adjustment */}
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>

        {/* LANGUAGES SECTION */}
        <div className="flex flex-wrap gap-1.5 my-2"> {/* Adjusted margin */}
          {friend && friend.nativeLanguage && typeof friend.nativeLanguage === 'string' && friend.nativeLanguage.trim() !== "" ? (
            <span className="badge badge-secondary text-xs items-center">
              {getLanguageFlag(friend.nativeLanguage)}
              Native: {capitalize(friend.nativeLanguage)}
            </span>
          ) : null}
        </div>

        {/* ACTION BUTTON */}
        <Link to={`/chat/${friend._id}`} className="btn btn-primary btn-sm w-full mt-auto">
          Message
        </Link>
      </div>
    </div>
  );
};
export default FriendCard;