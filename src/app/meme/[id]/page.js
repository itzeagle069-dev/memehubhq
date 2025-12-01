"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, limit, getDocs, addDoc, deleteDoc, updateDoc, increment, arrayUnion, arrayRemove, orderBy, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Eye, Download, Share2, Star, Heart, MessageCircle, Send, Trash2, ThumbsUp, User, UserPlus, UserCheck } from "lucide-react";

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
                    await updateDoc(doc(db, "memes", memeId), {
                        views: increment(1)
                    });

                    // Fetch related memes
                    fetchRelatedMemes(memeData);
                    // Fetch comments
                    fetchComments();
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

    // Fetch related memes
    const fetchRelatedMemes = async (currentMeme) => {
        try {
            const q = query(
                collection(db, "memes"),
                where("category", "==", currentMeme.category),
                where("status", "==", "published"),
                limit(6)
            );
            const snapshot = await getDocs(q);
            const memes = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(m => m.id !== currentMeme.id)
                .slice(0, 5);
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#050505] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!meme) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-black dark:text-white">
            {/* Header */}
            <div className="bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-semibold">Back</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleShare}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Share"
                        >
                            <Share2 size={20} />
                        </button>
                        <button
                            onClick={handleFavorite}
                            className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isFavorited ? "text-yellow-400" : ""}`}
                            title="Favorite"
                        >
                            <Star size={20} fill={isFavorited ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Left 2/3 */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Media Player */}
                    <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                        {meme.media_type === "video" || meme.file_url.endsWith(".mp4") ? (
                            <video src={meme.file_url} controls className="w-full h-full" />
                        ) : meme.media_type === "audio" || meme.media_type === "raw" ? (
                            <div className="text-center p-8">
                                <audio src={meme.file_url} controls className="w-full" autoPlay />
                            </div>
                        ) : (
                            <img src={meme.file_url} alt={meme.title} className="max-w-full max-h-full object-contain" />
                        )}
                    </div>

                    {/* Meme Info */}
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 space-y-4">
                        <h1 className="text-2xl font-bold">{meme.title}</h1>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><Eye size={16} /> {meme.views || 0} views</span>
                            <span className="flex items-center gap-1"><Download size={16} /> {meme.downloads || 0} downloads</span>
                            <span className="flex items-center gap-1">😂 {meme.reactions?.haha || 0} reactions</span>
                        </div>

                        {/* User Info + Follow */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                            <Link href={`/user/${meme.uploader_id}`} className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                                <img src={meme.uploader_pic || "https://ui-avatars.com/api/?name=User"} alt={meme.uploader_name} className="w-12 h-12 rounded-full" />
                                <div>
                                    <p className="font-bold">{meme.uploader_name}</p>
                                    <p className="text-xs text-gray-500">{followerCount} followers</p>
                                </div>
                            </Link>

                            {user?.uid !== meme.uploader_id && (
                                <button
                                    onClick={handleFollow}
                                    className={`px-4 py-2 rounded-full font-bold text-sm transition-colors flex items-center gap-2 ${isFollowing
                                            ? "bg-gray-200 dark:bg-gray-800 text-black dark:text-white"
                                            : "bg-yellow-400 text-black hover:bg-yellow-500"
                                        }`}
                                >
                                    {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                                    {isFollowing ? "Following" : "Follow"}
                                </button>
                            )}
                        </div>

                        {/* Description */}
                        {meme.description && (
                            <div className="pt-4">
                                <p className="text-gray-700 dark:text-gray-300">{meme.description}</p>
                            </div>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-[#222] text-xs font-bold">{meme.category}</span>
                            <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-[#222] text-xs font-bold">{meme.language}</span>
                            {meme.tags?.map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 text-xs font-bold">
                                    #{tag}
                                </span>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleReaction}
                                className={`flex-1 py-3 rounded-xl font-bold transition-colors ${meme.reactedBy?.includes(user?.uid)
                                        ? "bg-yellow-400 text-black"
                                        : "bg-gray-100 dark:bg-[#222] hover:bg-gray-200 dark:hover:bg-[#333]"
                                    }`}
                            >
                                😂 {meme.reactedBy?.includes(user?.uid) ? "Reacted" : "React"}
                            </button>

                            <button
                                onClick={handleDownload}
                                disabled={!downloadUnlocked}
                                className={`flex-1 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${!downloadUnlocked
                                        ? "bg-gray-200 dark:bg-gray-800 cursor-not-allowed text-gray-500"
                                        : "bg-yellow-400 text-black hover:bg-yellow-500"
                                    }`}
                            >
                                {!downloadUnlocked ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                                        Wait {downloadTimer}s
                                    </>
                                ) : (
                                    <>
                                        <Download size={18} />
                                        Download
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <MessageCircle size={20} />
                                Comments ({comments.length})
                            </h3>

                            <select
                                value={commentSort}
                                onChange={(e) => setCommentSort(e.target.value)}
                                className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-[#222] text-sm border-none outline-none"
                            >
                                <option value="newest">Newest</option>
                                <option value="oldest">Oldest</option>
                                <option value="likes">Most Liked</option>
                            </select>
                        </div>

                        {/* Add Comment */}
                        {user ? (
                            <div className="flex gap-3">
                                <img src={user.photoURL || "https://ui-avatars.com/api/?name=User"} alt={user.displayName} className="w-10 h-10 rounded-full" />
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add a comment..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
                                        className="flex-1 px-4 py-2 rounded-full bg-gray-100 dark:bg-[#222] outline-none focus:ring-2 focus:ring-yellow-400"
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        className="p-2 rounded-full bg-yellow-400 text-black hover:bg-yellow-500 transition-colors"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-500 mb-4">Please login to comment</p>
                                <button
                                    onClick={googleLogin}
                                    className="px-6 py-2 bg-yellow-400 text-black rounded-full font-bold hover:bg-yellow-500 transition-colors"
                                >
                                    Login with Google
                                </button>
                            </div>
                        )}

                        {/* Comments List */}
                        <div className="space-y-4 mt-6">
                            {sortedComments.map(comment => (
                                <div key={comment.id} className="flex gap-3">
                                    <img src={comment.userPic || "https://ui-avatars.com/api/?name=User"} alt={comment.userName} className="w-10 h-10 rounded-full flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="bg-gray-100 dark:bg-[#222] rounded-2xl px-4 py-3">
                                            <p className="font-bold text-sm">{comment.userName}</p>
                                            <p className="text-sm mt-1">{comment.text}</p>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 px-4 text-xs text-gray-500">
                                            <button className="hover:text-yellow-500 transition-colors flex items-center gap-1">
                                                <ThumbsUp size={12} />
                                                {comment.likes || 0}
                                            </button>
                                            <span>{comment.timestamp?.toDate().toLocaleDateString()}</span>
                                            {user?.uid === comment.userId && (
                                                <button
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    className="hover:text-red-500 transition-colors flex items-center gap-1"
                                                >
                                                    <Trash2 size={12} />
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar - Right 1/3 */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4">
                        <h3 className="font-bold mb-4">Related Memes</h3>
                        <div className="space-y-3">
                            {relatedMemes.map(relatedMeme => (
                                <Link
                                    key={relatedMeme.id}
                                    href={`/meme/${relatedMeme.id}`}
                                    className="flex gap-3 hover:bg-gray-50 dark:hover:bg-[#222] rounded-lg p-2 transition-colors"
                                >
                                    <div className="w-32 h-20 bg-black rounded-lg overflow-hidden flex-shrink-0">
                                        {relatedMeme.thumbnail_url ? (
                                            <img src={relatedMeme.thumbnail_url} alt={relatedMeme.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={relatedMeme.file_url} alt={relatedMeme.title} className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm line-clamp-2">{relatedMeme.title}</p>
                                        <p className="text-xs text-gray-500 mt-1">{relatedMeme.uploader_name}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                            <span className="flex items-center gap-1"><Eye size={10} /> {relatedMeme.views || 0}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
