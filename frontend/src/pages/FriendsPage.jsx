import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserFriends, getStreamToken } from "../lib/api";
import { Link } from "react-router"; // Corrected import
import { UsersIcon } from "lucide-react";

import FriendCard from "../components/FriendCard";
import NoFriendsFound from "../components/NoFriendsFound";
import useAuthUser from "../hooks/useAuthUser";
import { StreamChat } from "stream-chat";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const FriendsPage = () => {
  const { authUser, isLoading: loadingAuthUser } = useAuthUser();
  const [streamClient, setStreamClient] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    enabled: !!authUser, // Only fetch friends if authUser is available
  });

  const { data: tokenData, isLoading: loadingStreamToken } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    const initStream = async () => {
      if (!tokenData?.token || !authUser || !STREAM_API_KEY || !friends?.length) { // Added !friends?.length check
        if (friends?.length === 0 && authUser && tokenData) { // If no friends, still set client for potential future use, but no channels to query
            const client = StreamChat.getInstance(STREAM_API_KEY, { timeout: 6000 });
             try {
                await client.connectUser(
                  {
                    id: authUser._id,
                    name: authUser.fullName,
                    image: authUser.profilePic,
                  },
                  tokenData.token
                );
                setStreamClient(client);
             } catch (error) {
                console.error("Error connecting Stream user with no friends:", error);
             }
        }
        return;
      }


      const client = StreamChat.getInstance(STREAM_API_KEY, { timeout: 6000 });

      try {
        if (client.userID !== authUser._id) { // Connect only if not already connected or different user
            await client.connectUser(
              {
                id: authUser._id,
                name: authUser.fullName,
                image: authUser.profilePic,
              },
              tokenData.token
            );
        }
        setStreamClient(client);

        const friendIds = friends.map(f => f._id);
        const filter = {
          type: "messaging",
          members: { $in: [authUser._id] },
          // Optimization: Only query channels that involve current user and one of their friends
          id: { $in: friendIds.map(friendId => [authUser._id, friendId].sort().join('-')) }
        };
        const sort = { last_message_at: -1 };
        
        const channels = await client.queryChannels(filter, sort, {
          watch: true,
          state: true,
        });

        const counts = {};
        channels.forEach((channel) => {
          const otherMember = Object.values(channel.state.members).find(
            (member) => member.user_id !== authUser._id
          );
          if (otherMember) {
            counts[otherMember.user_id] = channel.state.unreadCount;
          }
        });
        setUnreadCounts(counts);

        client.on((event) => {
          if (event.type === 'message.new' || event.type === 'notification.mark_read' || event.type === 'connection.changed') {
             // Re-evaluate unread counts for relevant channels
            const updatedChannelId = event.cid;
            if (updatedChannelId) {
                const targetChannel = client.channel('messaging', updatedChannelId.split(':')[1]); // get id from cid
                // Or more simply, re-query for the specific channel if needed
                // For this example, we'll focus on channel.unread_count event type for simplicity
            }
          }

          if (event.total_unread_count !== undefined || event.unread_channels !== undefined) {
            // This event is useful. Let's re-calculate from queried channels or specific event channel.
            if (event.channel && event.channel.id) {
                 const channelId = event.channel.id;
                 const ch = client.channel('messaging', channelId); // get channel instance
                 const otherMember = Object.values(ch.state.members).find(member => member.user_id !== authUser._id);
                 if (otherMember) {
                    setUnreadCounts(prevCounts => ({
                        ...prevCounts,
                        [otherMember.user_id]: ch.state.unreadCount
                    }));
                 }
            } else {
                // Fallback to re-query all relevant channels if a specific channel update isn't clear
                // This is less efficient but ensures data consistency
                const fetchUnread = async () => {
                    const newChannels = await client.queryChannels(filter, sort, { state: true });
                    const newCounts = {};
                    newChannels.forEach((c) => {
                        const otherM = Object.values(c.state.members).find(m => m.user_id !== authUser._id);
                        if (otherM) newCounts[otherM.user_id] = c.state.unreadCount;
                    });
                    setUnreadCounts(newCounts);
                };
                fetchUnread();
            }
          }
        });

      } catch (error) {
        console.error("Error initializing Stream client or fetching channels:", error);
         if (error.message.includes("connectUser") && client) {
            // Potentially disconnect if connectUser failed partially
            // await client.disconnectUser();
        }
      }
    };

    if (authUser && tokenData && friends) { // check friends too
      initStream();
    }

    return () => {
      if (streamClient) {
        streamClient.off(); // Remove all event listeners
        // Consider disconnecting user only if this component is truly unmounting from the app
        // streamClient.disconnectUser(); 
      }
    };
  }, [tokenData, authUser, friends]); // Add friends as a dependency

  const isLoading = loadingAuthUser || loadingFriends || (!!authUser && loadingStreamToken); // Adjusted loading state

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto space-y-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Friends</h2>
          <Link to="/notifications" className="btn btn-outline btn-sm">
            <UsersIcon className="mr-2 size-4" />
            Friend Requests
          </Link>
        </div>

        {isLoading && !friends.length ? ( // Show spinner only if loading and no friends yet
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : friends.length === 0 ? (
          <NoFriendsFound />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {friends.map((friend) => (
              <FriendCard
                key={friend._id}
                friend={friend}
                unreadCount={unreadCounts[friend._id] || 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;