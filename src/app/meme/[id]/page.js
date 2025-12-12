"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, limit, getDocs, addDoc, deleteDoc, updateDoc, increment, arrayUnion, arrayRemove, orderBy, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Eye, Download, Share2, Star, Music, MessageCircle, Send, Trash2, ThumbsUp, UserPlus, UserCheck, Play, Heart, Smile, X, MoreHorizontal, ChevronDown, Volume2, VolumeX } from "lucide-react";
import MemeGridItem from "@/components/MemeGridItem";
import { useDownloadList } from "@/context/DownloadContext";

export default function MemePage() {
    const params = useParams();
    const router = useRouter();
    const { user, googleLogin } = useAuth();
    const memeId = params.id;

    const [meme, setMeme] = useState(null);
    const [loading, setLoading] = useState(true);
    const [relatedMemes, setRelatedMemes] = useState([]);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [commentSort, setCommentSort] = useState("newest");
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [isFavorited, setIsFavorited] = useState(false);

    // Download timer states
    const [downloadUnlocked, setDownloadUnlocked] = useState(false);
    const [downloadTimer, setDownloadTimer] = useState(5);
    const [userFavorites, setUserFavorites] = useState([]);
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);

    const { addToDownloadList, removeFromDownloadList, isInDownloadList } = useDownloadList();

    // Fetch User Favorites (For Grid)
    useEffect(() => {
        if (user) {
            const fetchFavorites = async () => {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    setUserFavorites(userDoc.data().favorites || []);
                }
            };
            fetchFavorites();
        }
    }, [user]);

    // Fetch meme data
    useEffect(() => {
        if (!memeId) return;

        const fetchMeme = async () => {
            try {
                const memeDoc = await getDoc(doc(db, "memes", memeId));
                if (memeDoc.exists()) {
                    const memeData = { id: memeDoc.id, ...memeDoc.data() };
                    setMeme(memeData);

                    // Increment view count
                    updateDoc(doc(db, "memes", memeId), {
                        views: increment(1)
                    });

                    // Fetch related memes
                    fetchRelatedMemes(memeData);
                    // Fetch comments
                    fetchComments();
                    // Fetch follower count
                    fetchFollowerCount(memeData.uploader_id);
                } else {
                    toast.error("Meme not found");
                    router.push("/");
                }
            } catch (error) {
                console.error("Error fetching meme:", error);
                toast.error("Failed to load meme");
            } finally {
                setLoading(false);
            }
        };

        fetchMeme();
    }, [memeId]);

    // Download timer
    useEffect(() => {
        if (!meme) return;

        const timer = setInterval(() => {
            setDownloadTimer((prev) => {
                if (prev <= 1) {
                    setDownloadUnlocked(true);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [meme]);

    // Check if user is following uploader
    useEffect(() => {
        if (!user || !meme) return;

        const checkFollowing = async () => {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const following = userDoc.data().following || [];
                setIsFollowing(following.includes(meme.uploader_id));
            }
        };

        checkFollowing();
    }, [user, meme]);

    // Check if meme is favorited
    useEffect(() => {
        if (!user || !meme) return;

        const checkFavorite = async () => {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const favorites = userDoc.data().favorites || [];
                setIsFavorited(favorites.includes(memeId));
            }
        };

        checkFavorite();
    }, [user, meme, memeId]);

    // Fetch follower count
    const fetchFollowerCount = async (uploaderId) => {
        try {
            const userDoc = await getDoc(doc(db, "users", uploaderId));
            if (userDoc.exists()) {
                const followers = userDoc.data().followers || [];
                setFollowerCount(followers.length);
            }
        } catch (error) {
            console.error("Error fetching follower count:", error);
        }
    };

    // Fetch related memes (More from User)
    const fetchRelatedMemes = async (currentMeme) => {
        try {
            const q = query(
                collection(db, "memes"),
                where("uploader_id", "==", currentMeme.uploader_id),
                where("status", "==", "published"),
                limit(8)
            );
            const snapshot = await getDocs(q);
            const memes = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(m => m.id !== currentMeme.id)
                .slice(0, 6);
            setRelatedMemes(memes);
        } catch (error) {
            console.error("Error fetching related memes:", error);
        }
    };

    // Fetch comments
    const fetchComments = async () => {
        try {
            const commentsRef = collection(db, "comments", memeId, "comments");
            const q = query(commentsRef, orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setComments(commentsData);
        } catch (error) {
            console.error("Error fetching comments:", error);
        }
    };

    // Handle follow/unfollow
    const handleFollow = async () => {
        if (!user) return toast.error("Please login to follow");
        if (user.uid === meme.uploader_id) return toast.error("You can't follow yourself");

        try {
            const userRef = doc(db, "users", user.uid);
            const uploaderRef = doc(db, "users", meme.uploader_id);

            if (isFollowing) {
                await updateDoc(userRef, { following: arrayRemove(meme.uploader_id) });
                await updateDoc(uploaderRef, { followers: arrayRemove(user.uid) });
                setIsFollowing(false);
                setFollowerCount(prev => prev - 1);
                toast.success("Unfollowed");
            } else {
                await setDoc(userRef, { following: arrayUnion(meme.uploader_id) }, { merge: true });
                await setDoc(uploaderRef, { followers: arrayUnion(user.uid) }, { merge: true });
                setIsFollowing(true);
                setFollowerCount(prev => prev + 1);
                toast.success("Following!");
            }
        } catch (error) {
            console.error("Follow error:", error);
            toast.error("Failed to follow/unfollow");
        }
    };

    // Handle favorite
    const handleFavorite = async () => {
        if (!user) return toast.error("Please login to favorite");

        try {
            const userRef = doc(db, "users", user.uid);
            if (isFavorited) {
                await setDoc(userRef, { favorites: arrayRemove(memeId) }, { merge: true });
                setIsFavorited(false);
                toast.success("Removed from favorites");
            } else {
                await setDoc(userRef, { favorites: arrayUnion(memeId) }, { merge: true });
                setIsFavorited(true);
                toast.success("Added to favorites");
            }
        } catch (error) {
            console.error("Favorite error:", error);
            toast.error("Failed to update favorites");
        }
    };

    // Handle share
    const handleShare = async () => {
        const shareData = {
            title: meme.title,
            text: `Check out this meme on MemeHub HQ: ${meme.title}`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied to clipboard!");
            }
        } catch (err) {
            console.error("Share failed:", err);
        }
    };

    // Handle reaction
    const handleReaction = async () => {
        if (!user) return toast.error("Please login to react");

        try {
            const memeRef = doc(db, "memes", memeId);
            const hasReacted = meme.reactedBy?.includes(user.uid);

            if (hasReacted) {
                await updateDoc(memeRef, {
                    "reactions.haha": increment(-1),
                    reactedBy: arrayRemove(user.uid)
                });
                setMeme(prev => ({
                    ...prev,
                    reactions: { ...prev.reactions, haha: (prev.reactions?.haha || 1) - 1 },
                    reactedBy: prev.reactedBy.filter(id => id !== user.uid)
                }));
            } else {
                await updateDoc(memeRef, {
                    "reactions.haha": increment(1),
                    reactedBy: arrayUnion(user.uid)
                });
                setMeme(prev => ({
                    ...prev,
                    reactions: { ...prev.reactions, haha: (prev.reactions?.haha || 0) + 1 },
                    reactedBy: [...(prev.reactedBy || []), user.uid]
                }));
            }
        } catch (error) {
            console.error("Reaction error:", error);
            toast.error("Failed to react");
        }
    };

    // Handle download
    const handleDownload = async () => {
        if (!downloadUnlocked) return toast("Please wait for download to unlock...", { icon: "⏳" });

        try {
            // Increment download count
            await updateDoc(doc(db, "memes", memeId), {
                downloads: increment(1)
            });

            setMeme(prev => ({ ...prev, downloads: (prev.downloads || 0) + 1 }));

            // Download file
            const response = await fetch(meme.file_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${meme.title}.${meme.file_url.split('.').pop()}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success("Download started!");
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Download failed");
        }
    };

    // Handle add comment
    const handleAddComment = async () => {
        if (!user) {
            toast.error("Please login to comment");
            return;
        }

        if (!newComment.trim()) return;

        try {
            const commentsRef = collection(db, "comments", memeId, "comments");
            await addDoc(commentsRef, {
                userId: user.uid,
                userName: user.displayName || "Anonymous",
                userPic: user.photoURL || "",
                text: newComment,
                timestamp: new Date(),
                likes: 0,
                likedBy: []
            });

            setNewComment("");
            fetchComments();
            toast.success("Comment added!");
        } catch (error) {
            console.error("Comment error:", error);
            toast.error("Failed to add comment");
        }
    };

    // Handle delete comment
    const handleDeleteComment = async (commentId) => {
        if (!user) return;

        try {
            await deleteDoc(doc(db, "comments", memeId, "comments", commentId));
            fetchComments();
            toast.success("Comment deleted");
        } catch (error) {
            console.error("Delete comment error:", error);
            toast.error("Failed to delete comment");
        }
    };

    // Sort comments
    const sortedComments = [...comments].sort((a, b) => {
        if (commentSort === "newest") return b.timestamp?.toDate() - a.timestamp?.toDate();
        if (commentSort === "oldest") return a.timestamp?.toDate() - b.timestamp?.toDate();
        if (commentSort === "likes") return (b.likes || 0) - (a.likes || 0);
        return 0;
    });

    // --- GRID HANDLERS ---
    const handleGridReaction = async (e, targetMeme) => {
        e.stopPropagation();
        if (!user) return toast.error("Please login to react");
        try {
            const hasReacted = targetMeme.reactedBy?.includes(user.uid);
            await updateDoc(doc(db, "memes", targetMeme.id), {
                "reactions.haha": increment(hasReacted ? -1 : 1),
                reactedBy: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
            });
            // Update local state for related memes
            setRelatedMemes(prev => prev.map(m => {
                if (m.id === targetMeme.id) {
                    return {
                        ...m,
                        reactions: { ...m.reactions, haha: (m.reactions?.haha || 0) + (hasReacted ? -1 : 1) },
                        reactedBy: hasReacted ? m.reactedBy.filter(id => id !== user.uid) : [...(m.reactedBy || []), user.uid]
                    };
                }
                return m;
            }));
        } catch (error) {
            console.error("Grid reaction error", error);
        }
    };

    const handleGridDownload = async (e, targetMeme) => {
        e.stopPropagation();
        try {
            await updateDoc(doc(db, "memes", targetMeme.id), { downloads: increment(1) });
            setRelatedMemes(prev => prev.map(m => m.id === targetMeme.id ? { ...m, downloads: (m.downloads || 0) + 1 } : m));
            const response = await fetch(targetMeme.file_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${targetMeme.title}.${targetMeme.media_type === 'video' ? 'mp4' : 'jpg'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error("Grid download error", error);
            window.open(targetMeme.file_url, '_blank');
        }
    };

    const handleGridFavorite = async (e, targetMeme) => {
        e.stopPropagation();
        if (!user) return toast.error("Please login to favorite");
        const isFav = userFavorites.includes(targetMeme.id);
        const newFavs = isFav ? userFavorites.filter(id => id !== targetMeme.id) : [...userFavorites, targetMeme.id];
        setUserFavorites(newFavs);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                favorites: isFav ? arrayRemove(targetMeme.id) : arrayUnion(targetMeme.id)
            });
            toast.success(isFav ? "Removed from favorites" : "Added to favorites");
        } catch {
            setUserFavorites(prev => isFav ? [...prev, targetMeme.id] : prev.filter(id => id !== targetMeme.id));
        }
    };

    const handleGridShare = (e, targetMeme) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/?meme=${targetMeme.id}`;
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#050505] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!meme) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-black dark:text-white pt-20 pb-10">
            {/* Header */}
            <div className="bg-white dark:bg-[#111] border-b border-gray-200 dark:border-[#222] fixed top-16 left-0 right-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-semibold">Back</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleShare}
                            className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-110"
                            title="Share"
                        >
                            <Share2 size={20} />
                        </button>
                        <button
                            onClick={handleFavorite}
                            className={`p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all hover:scale-110 ${isFavorited ? "text-yellow-400" : ""}`}
                            title="Favorite"
                        >
                            <Star size={20} fill={isFavorited ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">

                {/* --- LEFT: MEDIA & INFO (8/12 cols) --- */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Media Player Container */}
                    <div className="bg-white dark:bg-black rounded-3xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-800 relative">
                        {/* Centered Media */}
                        <div className="w-full bg-black/5 dark:bg-[#080808] flex items-center justify-center min-h-[300px] lg:min-h-[500px]">
                            {meme.media_type === "video" || meme.file_url.endsWith(".mp4") ? (
                                <video
                                    src={meme.file_url}
                                    controls
                                    autoPlay
                                    loop
                                    className="w-full h-auto max-h-[80vh] object-contain"
                                    poster={meme.thumbnail_url || ""}
                                />
                            ) : meme.media_type === "audio" || meme.media_type === "raw" ? (
                                <div className="p-10 text-center w-full">
                                    {meme.thumbnail_url && (
                                        <img src={meme.thumbnail_url} className="w-48 h-48 mx-auto mb-6 rounded-xl shadow-lg object-cover" />
                                    )}
                                    <Music className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-pulse" />
                                    <audio src={meme.file_url} controls className="w-full max-w-sm mx-auto" />
                                </div>
                            ) : (
                                <img
                                    src={meme.file_url}
                                    alt={meme.title}
                                    className="w-full h-auto max-h-[80vh] object-contain"
                                />
                            )}
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black mb-2 leading-tight">{meme.title}</h1>
                                <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                                    <span className="bg-gray-100 dark:bg-[#222] px-3 py-1 rounded-full text-xs font-bold uppercase">{meme.category}</span>
                                    <span>•</span>
                                    <span>{new Date(meme.createdAt?.toDate ? meme.createdAt.toDate() : meme.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Reaction Button */}
                                <button
                                    onClick={handleReaction}
                                    className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-transform active:scale-95 ${meme.reactedBy?.includes(user?.uid)
                                        ? "bg-yellow-400 text-black"
                                        : "bg-gray-100 dark:bg-[#222] hover:bg-gray-200 dark:hover:bg-[#333]"}`}
                                >
                                    <span className="text-xl">😂</span>
                                    {meme.reactions?.haha || 0}
                                </button>

                                {/* Download Button */}
                                <button
                                    onClick={handleDownload}
                                    disabled={!downloadUnlocked}
                                    className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-transform active:scale-95 text-black ${!downloadUnlocked
                                        ? "bg-gray-400 cursor-wait text-white"
                                        : "bg-yellow-400 hover:bg-yellow-500 shadow-lg shadow-yellow-400/20"}`}
                                >
                                    {downloadUnlocked ? <Download size={20} /> : <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />}
                                    {downloadUnlocked ? "Download" : `${downloadTimer}s`}
                                </button>
                            </div>
                        </div>

                        {/* Uploader & Description */}
                        <div className="flex items-start gap-4 pt-6 border-t border-gray-100 dark:border-gray-800">
                            <Link href={`/user/${meme.uploader_id}`}>
                                <img src={meme.uploader_pic || "https://ui-avatars.com/api/?name=User"} className="w-12 h-12 rounded-full border-2 border-gray-100 dark:border-gray-700 hover:border-yellow-400 transition-colors object-cover" />
                            </Link>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <Link href={`/user/${meme.uploader_id}`} className="font-bold text-lg hover:text-yellow-500 transition-colors">
                                            {meme.uploader_name}
                                        </Link>
                                        <p className="text-xs text-gray-500">{followerCount} Followers</p>
                                    </div>
                                    {user?.uid !== meme.uploader_id && (
                                        <button
                                            onClick={handleFollow}
                                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${isFollowing
                                                ? "bg-gray-100 dark:bg-[#222] text-black dark:text-white"
                                                : "bg-black dark:bg-white text-white dark:text-black"}`}
                                        >
                                            {isFollowing ? "Following" : "Follow"}
                                        </button>
                                    )}
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                                    {meme.description || "No description provided."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-2 mb-6">
                            <MessageCircle size={20} className="text-yellow-500" />
                            <h3 className="font-bold text-lg">Comments ({comments.length})</h3>
                        </div>

                        {/* Comment Input */}
                        <div className="flex gap-3 mb-8">
                            {user ? (
                                <>
                                    <img src={user.photoURL} className="w-10 h-10 rounded-full object-cover" />
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
                                            placeholder="Write a comment..."
                                            className="w-full bg-gray-100 dark:bg-[#222] rounded-2xl px-5 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all font-medium"
                                        />
                                        <button
                                            onClick={handleAddComment}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-yellow-400 rounded-xl hover:bg-yellow-500 transition-colors text-black"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button onClick={googleLogin} className="w-full py-3 bg-gray-100 dark:bg-[#222] rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors">
                                    Log in to join the discussion
                                </button>
                            )}
                        </div>

                        {/* Comments List */}
                        <div className="space-y-6">
                            {comments.map(c => (
                                <div key={c.id} className="flex gap-3 group">
                                    <img src={c.userPic || "https://ui-avatars.com/api/?name=User"} className="w-10 h-10 rounded-full object-cover" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm">{c.userName}</span>
                                            <span className="text-xs text-gray-500">{new Date(c.timestamp?.toDate()).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-[#222] p-3 rounded-r-2xl rounded-bl-2xl inline-block">
                                            {c.text}
                                        </p>
                                        {user?.uid === c.userId && (
                                            <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-red-500 hover:text-red-600 mt-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT: SIDEBAR (4/12 cols) --- */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Simplified 'More From User' Section */}
                    <div className="bg-white dark:bg-[#151515] p-5 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 sticky top-24">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Play size={18} className="fill-yellow-400 text-yellow-400" />
                                More from {meme.uploader_name}
                            </h3>
                        </div>

                        <div className="flex flex-col gap-3">
                            {relatedMemes.map(m => (
                                <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#222] transition-colors group">
                                    {/* Thumbnail Preview */}
                                    <Link href={`/meme/${m.id}`} className="block w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-black relative">
                                        {m.media_type === "video" || m.file_url.endsWith(".mp4") ? (
                                            <video
                                                src={m.file_url}
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                muted
                                                onMouseOver={e => e.target.play()}
                                                onMouseOut={e => { e.target.pause(); e.target.currentTime = 0; }}
                                            />
                                        ) : m.media_type === "audio" || m.media_type === "raw" ? (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-black">
                                                <Music size={16} className="text-white" />
                                            </div>
                                        ) : (
                                            <img src={m.thumbnail_url || m.file_url} className="w-full h-full object-cover" />
                                        )}
                                        {/* Type Indicator */}
                                        {(m.media_type === "video" || m.file_url.endsWith(".mp4")) && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="bg-black/30 rounded-full p-1">
                                                    <Play size={12} className="text-white fill-white" />
                                                </div>
                                            </div>
                                        )}
                                    </Link>

                                    {/* Info & Side Actions */}
                                    <div className="flex-1 min-w-0 flex items-center justify-between">
                                        <Link href={`/meme/${m.id}`} className="min-w-0 pr-2">
                                            <p className="font-bold text-sm truncate group-hover:text-yellow-500 transition-colors">
                                                {m.title}
                                            </p>
                                            <p className="text-xs text-gray-500">{m.views || 0} views</p>
                                        </Link>

                                        {/* Action Buttons: Fav & Download Only */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => handleGridFavorite(e, m)}
                                                className={`p-2 rounded-full transition-colors ${userFavorites.includes(m.id)
                                                    ? "text-yellow-400 bg-yellow-400/10"
                                                    : "text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]"}`}
                                                title="Favorite"
                                            >
                                                <Star size={16} fill={userFavorites.includes(m.id) ? "currentColor" : "none"} />
                                            </button>
                                            <button
                                                onClick={(e) => handleGridDownload(e, m)}
                                                className="p-2 rounded-full text-gray-400 hover:text-green-500 hover:bg-green-500/10 transition-colors"
                                                title="Download"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {relatedMemes.length === 0 && (
                                <p className="text-center text-gray-500 py-4 text-sm">No other memes found.</p>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
