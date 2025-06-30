import { useState, useRef, useEffect } from "react";
import useAuthUser from "../hooks/useAuthUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { completeOnboarding } from "../lib/api";
import {
    LoaderIcon,
    MapPinIcon,
    ShipWheelIcon,
    ShuffleIcon,
    ImageIcon,
    CameraIcon,
    UserIcon,
} from "lucide-react";
import { LANGUAGES } from "../constants";
import { useNavigate } from "react-router";

const DICEBEAR_STYLES = [
    "adventurer", "adventurer-neutral", "big-ears", "big-ears-neutral", "bottts",
    "croodles", "croodles-neutral", "fun-emoji", "icons", "identicon", "micah",
    "miniavs", "open-peeps", "personas", "shapes", "thumbs",
];

const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const OnboardingPage = () => {
    const { authUser, isLoading: authUserLoading } = useAuthUser();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [formState, setFormState] = useState({
        username: "",
        fullName: "",
        bio: "",
        nativeLanguage: "",
        location: "",
        profilePic: "",
    });
    const [isDicebearModalOpen, setIsDicebearModalOpen] = useState(false);
    const [selectedDicebearStyle, setSelectedDicebearStyle] = useState(DICEBEAR_STYLES[0]);
    const [dicebearSeed, setDicebearSeed] = useState(Math.random().toString(36).substring(7));
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (authUser) {
            setFormState({
                username: authUser.username || "",
                fullName: authUser.fullName || "",
                bio: authUser.bio || "",
                nativeLanguage: authUser.nativeLanguage || "",
                location: authUser.location || "",
                profilePic: authUser.profilePic || `https://avatar.iran.liara.run/public/${Math.floor(Math.random() * 100) + 1}.png`,
            });
        }
    }, [authUser]);

    const { mutate: onboardingMutation, isPending } = useMutation({
        mutationFn: completeOnboarding,
        onSuccess: async (data) => { // Make onSuccess async
            toast.success("Profile updated successfully!");
            // Invalidate and ensure refetch is complete before navigating
            await queryClient.invalidateQueries({ queryKey: ["authUser"] });
            await queryClient.refetchQueries({ queryKey: ["authUser"], exact: true }); // Ensure this specific query is refetched

            // Now that authUser query is updated, proceed with navigation
            if (data && data.user && data.user.isOnboarded) {
                navigate("/");
            } else {
                // This case should ideally not happen if onboarding means setting isOnboarded to true
                // but as a fallback, still navigate.
                navigate("/"); 
            }
        },
        onError: (error) => {
            const message = error.response?.data?.message || "Failed to update profile. Please try again.";
            toast.error(message);
        },
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "username") {
            setFormState(prevState => ({ ...prevState, [name]: value.toLowerCase().replace(/\s/g, '') }));
        } else {
            setFormState(prevState => ({ ...prevState, [name]: value }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formState.username || formState.username.trim().length < 3) {
            toast.error("Username is required and must be at least 3 characters.");
            return;
        }
        if (!/^[a-z0-9_]+$/.test(formState.username.trim())) {
            toast.error("Username can only contain lowercase letters, numbers, and underscores.");
            return;
        }
        onboardingMutation(formState);
    };

    const handleRandomAvatar = () => {
        const idx = Math.floor(Math.random() * 100) + 1;
        const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;
        setFormState(prevState => ({ ...prevState, profilePic: randomAvatar }));
        toast.success("Random profile picture generated!");
    };

    const handleLocalImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error("Invalid file type. Please select an image.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`The selected Image is larger than ${MAX_FILE_SIZE_MB}MB.`);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormState(prevState => ({ ...prevState, profilePic: reader.result }));
            toast.success("Profile picture selected.");
        };
        reader.onerror = () => {
            toast.error("Failed to read the selected image.");
            if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsDataURL(file);
    };

    const handleUploadButtonClick = () => fileInputRef.current.click();
    const openDicebearModal = () => setIsDicebearModalOpen(true);
    const closeDicebearModal = () => setIsDicebearModalOpen(false);
    const handleDicebearStyleChange = (e) => setSelectedDicebearStyle(e.target.value);
    const regenerateDicebearAvatar = () => setDicebearSeed(Math.random().toString(36).substring(7));

    const selectDicebearAvatar = () => {
        const dicebearAvatarUrl = `https://api.dicebear.com/7.x/${selectedDicebearStyle}/svg?seed=${dicebearSeed}`;
        setFormState(prevState => ({ ...prevState, profilePic: dicebearAvatarUrl }));
        toast.success("Avatar Selected!");
        closeDicebearModal();
    };

    const currentDicebearAvatarUrl = `https://api.dicebear.com/7.x/${selectedDicebearStyle}/svg?seed=${dicebearSeed}`;

    // Initial loading check for the page itself
    if (authUserLoading && !authUser && !formState.username) { 
        return (
            <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
                <LoaderIcon className="animate-spin size-10 text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
            <div className="card bg-base-200 w-full max-w-3xl shadow-xl">
                <div className="card-body p-6 sm:p-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6">
                        {authUser?.isOnboarded ? "Update Your Profile" : "Complete Your Profile"}
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* ... rest of the form JSX ... */}
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="size-32 rounded-full bg-base-300 overflow-hidden">
                                {formState.profilePic ? (
                                    <img src={formState.profilePic} alt="Profile Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <CameraIcon className="size-12 text-base-content opacity-40" />
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-center">
                                <button type="button" onClick={handleRandomAvatar} className="btn btn-accent btn-sm">
                                    <ShuffleIcon className="size-4 mr-1 sm:mr-2" /> Random
                                </button>
                                <button type="button" onClick={openDicebearModal} className="btn btn-info btn-sm">
                                    <ImageIcon className="size-4 mr-1 sm:mr-2" /> Select
                                </button>
                                <button type="button" onClick={handleUploadButtonClick} className="btn btn-secondary btn-sm">
                                    <ImageIcon className="size-4 mr-1 sm:mr-2" /> Upload
                                </button>
                                <input 
                                    type="file" 
                                    accept="image/png, image/jpeg, image/gif, image/webp"
                                    onChange={handleLocalImageChange} 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Username</span>
                                <span className="label-text-alt text-xs">(3-20 chars, lowercase, a-z, 0-9, _)</span>
                            </label>
                            <div className="relative">
                                <UserIcon className="absolute top-1/2 transform -translate-y-1/2 left-3 size-5 text-base-content opacity-70" />
                                <input
                                    type="text"
                                    name="username"
                                    value={formState.username}
                                    onChange={handleChange}
                                    className="input input-bordered w-full pl-10"
                                    placeholder="Choose a unique username"
                                    minLength="3"
                                    maxLength="20"
                                    title="Username must be 3-20 chars, lowercase letters, numbers, or underscores."
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Full Name</span></label>
                            <input type="text" name="fullName" value={formState.fullName} onChange={handleChange} className="input input-bordered w-full" placeholder="Your full name" required />
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Bio</span></label>
                            <textarea name="bio" value={formState.bio} onChange={handleChange} className="textarea textarea-bordered h-24" placeholder="Tell others about yourself..." required />
                        </div>

                        <div className="form-control">
                            <label className="label"><span className="label-text">Native Language</span></label>
                            <select name="nativeLanguage" value={formState.nativeLanguage} onChange={handleChange} className="select select-bordered w-full" required>
                                <option value="">Select your native language</option>
                                {LANGUAGES.map((lang) => (<option key={`native-${lang}`} value={lang.toLowerCase()}>{lang}</option>))}
                            </select>
                        </div>
                        
                        <div className="form-control">
                            <label className="label"><span className="label-text">Location</span></label>
                            <div className="relative">
                                <MapPinIcon className="absolute top-1/2 transform -translate-y-1/2 left-3 size-5 text-base-content opacity-70" />
                                <input type="text" name="location" value={formState.location} onChange={handleChange} className="input input-bordered w-full pl-10" placeholder="City, Country" required />
                            </div>
                        </div>

                        <button className="btn btn-primary w-full" disabled={isPending || authUserLoading} type="submit">
                            {isPending ? (<LoaderIcon className="animate-spin size-5 mr-2" />) : (<ShipWheelIcon className="size-5 mr-2" />)}
                            {isPending ? "Saving..." : (authUser?.isOnboarded ? "Update Profile" : "Complete Onboarding")}
                        </button>
                    </form>

                    {isDicebearModalOpen && (
                        <div className="modal modal-open">
                            <div className="modal-box">
                                <h3 className="font-bold text-lg">Select DiceBear Avatar Style</h3>
                                <div className="py-4">
                                    <label htmlFor="dicebear-style" className="label"><span className="label-text">Style</span></label>
                                    <select id="dicebear-style" className="select select-bordered w-full" value={selectedDicebearStyle} onChange={handleDicebearStyleChange}>
                                        {DICEBEAR_STYLES.map((style) => (<option key={style} value={style}>{style}</option>))}
                                    </select>
                                    <div className="mt-4 flex flex-col items-center">
                                        <img src={currentDicebearAvatarUrl} alt="DiceBear Avatar Preview" className="size-24 rounded-full bg-base-300" />
                                        <button type="button" className="btn btn-sm mt-2" onClick={regenerateDicebearAvatar}>Regenerate</button>
                                    </div>
                                </div>
                                <div className="modal-action">
                                    <button type="button" className="btn" onClick={closeDicebearModal}>Cancel</button>
                                    <button type="button" className="btn btn-primary" onClick={selectDicebearAvatar}>Select</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingPage;