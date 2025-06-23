// ConnectP/frontend/pages/HomePage.jsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
    getOutgoingFriendReqs,
    getRecommendedUsers,
    getUserFriends,
    sendFriendRequest,
    getStreamToken,
    searchUsersAPI,
} from "../lib/api";
import { Link } from "react-router";
import { CheckCircleIcon, MapPinIcon, UserPlusIcon, UsersIcon, SearchIcon, XCircleIcon } from "lucide-react";
import { capitalize } from "../lib/utils";
import FriendCard, { getLanguageFlag as getCardLanguageFlag } from "../components/FriendCard";
import NoFriendsFound from "../components/NoFriendsFound";
import useAuthUser from "../hooks/useAuthUser";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const HomePage = () => {
    const queryClient = useQueryClient();
    const [outgoingRequestsIds, setOutgoingRequestsIds] = useState(new Set());
    // CORRECTLY DESTRUCTURED AND RENAMED HERE
    const { authUser, isLoading: authUserIsLoading } = useAuthUser(); // Changed to authUserIsLoading
    const [streamClient, setStreamClient] = useState(null);
    const [homePageUnreadCounts, setHomePageUnreadCounts] = useState({});

    const [searchKeyword, setSearchKeyword] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState("");

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchKeyword(searchKeyword);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchKeyword]);

    const { data: friends = [], isLoading: friendsAreLoading } = useQuery({ // Renamed for clarity
        queryKey: ["friends"],
        queryFn: getUserFriends,
        enabled: !!authUser,
    });

    const { data: tokenData, isLoading: tokenIsLoading } = useQuery({ // Renamed for clarity
        queryKey: ["streamTokenHome"],
        queryFn: getStreamToken,
        enabled: !!authUser,
    });

    const { data: recommendedUsersData, isLoading: recommendedAreLoading } = useQuery({ // Renamed for clarity
        queryKey: ["recommendedUsers"],
        queryFn: getRecommendedUsers,
        enabled: !!authUser && !isSearching,
    });
    const recommendedUsers = recommendedUsersData || [];

    const { data: searchResultsData, isLoading: searchIsLoading, error: searchError } = useQuery({ // Renamed for clarity
        queryKey: ["searchResults", debouncedSearchKeyword],
        queryFn: () => searchUsersAPI(debouncedSearchKeyword),
        enabled: isSearching && !!debouncedSearchKeyword.trim(),
        keepPreviousData: true,
    });
    const searchResults = searchResultsData || [];

    useEffect(() => {
        if (searchError) {
            toast.error(searchError.response?.data?.message || "Failed to fetch search results.");
        }
    }, [searchError]);

    const { data: outgoingFriendReqs } = useQuery({
        queryKey: ["outgoingFriendReqs"],
        queryFn: getOutgoingFriendReqs,
        enabled: !!authUser,
    });

    const { mutate: sendRequestMutation, isPending: sendingRequest } = useMutation({
        mutationFn: sendFriendRequest,
        onSuccess: (data, userIdSentTo) => {
            queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
            setOutgoingRequestsIds(prev => new Set(prev).add(userIdSentTo));
            toast.success("Friend request sent!");
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to send friend request.");
        }
    });

    useEffect(() => {
        const outgoingIds = new Set();
        if (outgoingFriendReqs && outgoingFriendReqs.length > 0) {
            outgoingFriendReqs.forEach((req) => {
                if (req.recipient && req.recipient._id) {
                    outgoingIds.add(req.recipient._id.toString());
                } else if (typeof req.recipient === 'string') {
                    outgoingIds.add(req.recipient);
                }
            });
            setOutgoingRequestsIds(outgoingIds);
        }
    }, [outgoingFriendReqs]);

    useEffect(() => {
        const initStreamForHomePage = async () => {
            if (!tokenData?.token || !authUser || !STREAM_API_KEY || !friends?.length) {
                 if (friends?.length === 0 && authUser && tokenData && STREAM_API_KEY && !streamClient) {
                    const client = StreamChat.getInstance(STREAM_API_KEY, { timeout: 6000 });
                    try {
                        if (!client.userID) {
                            await client.connectUser(
                                { id: authUser._id, name: authUser.fullName, image: authUser.profilePic },
                                tokenData.token
                            );
                        }
                        setStreamClient(client);
                    } catch (error) {
                        console.error("Stream init error (no friends) HomePage:", error);
                    }
                }
                return;
            }
            let client = streamClient;
            if (!client) {
                client = StreamChat.getInstance(STREAM_API_KEY, { timeout: 6000 });
            }

            try {
                if (!client.userID || client.userID !== authUser._id || client.tokenManager.token !== tokenData.token) {
                    if(client.userID) await client.disconnectUser();
                    await client.connectUser(
                        { id: authUser._id, name: authUser.fullName, image: authUser.profilePic },
                        tokenData.token
                    );
                }
                if(!streamClient) setStreamClient(client);

                const friendIds = friends.map(f => f._id);
                const filter = { type: 'messaging', members: { $in: [authUser._id] }, id: { $in: friendIds.map(friendId => [authUser._id, friendId].sort().join('-')) } };
                const sort = { last_message_at: -1 };
                
                const channels = await client.queryChannels(filter, sort, { state: true, watch: true });

                const counts = {};
                channels.forEach(channel => {
                    const otherMember = Object.values(channel.state.members).find(m => m.user_id !== authUser._id);
                    if (otherMember) counts[otherMember.user_id] = channel.state.unreadCount;
                });
                setHomePageUnreadCounts(counts);

                client.on(event => {
                    if (event.channel && event.channel.id && event.channel.type === 'messaging' && (event.type === 'message.new' || event.type === 'notification.mark_read')) {
                        const chInstance = client.channel('messaging', event.channel.id);
                        chInstance.queryState().then(state => {
                            const otherMember = state.members ? Object.values(state.members).find(m => m.user_id !== authUser._id) : null;
                            if (otherMember && state.unread_count !== undefined) {
                                setHomePageUnreadCounts(prev => ({ ...prev, [otherMember.user_id]: state.unread_count }));
                            }
                        }).catch(err => console.error("Error querying channel state on event:", err));
                    }
                });
            } catch (error) { console.error("Stream init error HomePage:", error); }
        };

        if (authUser && tokenData && friends) {
            initStreamForHomePage();
        }

        return () => {
            if (streamClient) {
                streamClient.off();
            }
        };
    }, [tokenData, authUser, friends]);


    const handleSearchInputChange = (e) => {
        setSearchKeyword(e.target.value);
        if (e.target.value.trim() !== "") {
            setIsSearching(true);
        } else {
            setIsSearching(false);
        }
    };

    const clearSearch = () => {
        setSearchKeyword("");
        setIsSearching(false);
    };

    // Determine which list of users to display
    const usersToDisplay = isSearching && debouncedSearchKeyword.trim() !== "" ? searchResults : recommendedUsers;
    // Determine overall loading state for the "Meet New People / Search Results" section
    const displaySectionIsLoading = isSearching ? searchIsLoading : recommendedAreLoading;


    const renderUserCard = (user) => {
        const hasRequestBeenSent = outgoingRequestsIds.has(user._id.toString());
        const isCurrentRequestPending = sendingRequest && queryClient.isMutating({ mutationKey: ['sendFriendRequest', user._id] });

        return (
            <div key={user._id} className="card bg-base-200 hover:shadow-lg transition-all duration-300">
                <div className="card-body p-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="avatar size-16 rounded-full overflow-hidden">
                            <img src={user.profilePic} alt={user.fullName} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{user.fullName}</h3>
                            {user.username && <p className="text-xs text-base-content/70">@{user.username}</p>}
                            {user.location && (
                                <div className="flex items-center text-xs opacity-70 mt-1">
                                    <MapPinIcon className="size-3 mr-1" />{user.location}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {user.nativeLanguage && (
                            <span className="badge badge-secondary items-center text-xs">
                                {getCardLanguageFlag(user.nativeLanguage)} Native: {capitalize(user.nativeLanguage)}
                            </span>
                        )}
                    </div>
                    {user.bio && <p className="text-sm opacity-70 line-clamp-2">{user.bio}</p>}
                    <button
                        className={`btn w-full mt-2 ${hasRequestBeenSent || isCurrentRequestPending ? "btn-disabled" : "btn-primary"}`}
                        onClick={() => { if (!hasRequestBeenSent && !isCurrentRequestPending) sendRequestMutation(user._id); }}
                        disabled={hasRequestBeenSent || isCurrentRequestPending}
                    >
                        {isCurrentRequestPending ? <span className="loading loading-spinner loading-xs"></span> :
                            hasRequestBeenSent ? <><CheckCircleIcon className="size-4 mr-2" />Request Sent</> :
                                <><UserPlusIcon className="size-4 mr-2" />Send Request</>}
                    </button>
                </div>
            </div>
        );
    };

    // Overall page loading state: if authUser is still loading, show a page-level spinner
    if (authUserIsLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen p-4">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="container mx-auto space-y-10">
                {/* Your Friends Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Friends</h2>
                    <Link to="/notifications" className="btn btn-outline btn-sm">
                        <UsersIcon className="mr-2 size-4" />Friend Requests
                    </Link>
                </div>
                {/* Loading state for friends section */}
                {friendsAreLoading && !friends.length ? (
                    <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>
                ) : friends.length === 0 ? <NoFriendsFound /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {friends.map((friend) => (
                            <FriendCard key={friend._id} friend={friend} unreadCount={homePageUnreadCounts[friend._id] || 0} />
                        ))}
                    </div>
                )}

                {/* Meet New People / Search Section */}
                <section>
                    <div className="mb-6 sm:mb-8">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                    {isSearching && searchKeyword.trim() ? "Search Results" : "Meet New People"}
                                </h2>
                                <p className="opacity-70">
                                    {isSearching && searchKeyword.trim() ? `Showing results for "${searchKeyword}"` : "Discover People Worldwide!"}
                                </p>
                            </div>
                            <form onSubmit={(e) => e.preventDefault()} className="w-full sm:w-auto flex gap-2 items-center">
                                <div className="relative w-full sm:max-w-xs">
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        className="input input-bordered w-full pr-10"
                                        value={searchKeyword}
                                        onChange={handleSearchInputChange}
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                        {searchKeyword ? (
                                            <button type="button" onClick={clearSearch} className="p-1 focus:outline-none focus:shadow-outline">
                                                <XCircleIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                            </button>
                                        ) : (
                                            <SearchIcon className="h-5 w-5 text-gray-400" />
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* CORRECTED LOADING CONDITION FOR THIS SECTION */}
                    {displaySectionIsLoading ? (
                        <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg" /></div>
                    ) : usersToDisplay.length === 0 ? (
                        <div className="card bg-base-200 p-6 text-center">
                            <h3 className="font-semibold text-lg mb-2">
                                {isSearching && searchKeyword.trim() ? "No users found" : "No new people to suggest right now."}
                            </h3>
                            <p className="text-base-content opacity-70">
                                {isSearching && searchKeyword.trim() ? "Try a different search term." : "Check back later or try searching for specific users!"}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {usersToDisplay.map(renderUserCard)}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};
export default HomePage;