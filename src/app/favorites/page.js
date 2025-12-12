"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, increment, arrayUnion, arrayRemove } from "firebase/firestore";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { Star, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import MemeGridItem from "@/components/MemeGridItem";
import { useDownloadList } from "@/context/DownloadContext";

export default function FavoritesPage() {
    const { user, googleLogin } = useAuth();
    const router = useRouter();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userFavoritesIds, setUserFavoritesIds] = useState([]); // Use this for the grid item prop

    const { addToDownloadList, removeFromDownloadList, isInDownloadList } = useDownloadList();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchFavorites = async () => {
            try {
                // Get user's favorite meme IDs
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const favoriteIds = userDoc.data().favorites || [];
                    setUserFavoritesIds(favoriteIds);

                    if (favoriteIds.length === 0) {
                        setFavorites([]);
                        setLoading(false);
                        return;
                    }

                    // Fetch all favorite memes
                    // Firestore 'in' query supports up to 10 items, so we batch if needed
                    const batchSize = 10;
                    const allMemes = [];

                    for (let i = 0; i < favoriteIds.length; i += batchSize) {
                        const batch = favoriteIds.slice(i, i + batchSize);
                        const q = query(
                            collection(db, "memes"),
                            where("__name__", "in", batch)
                        );
                        const snapshot = await getDocs(q);
                        const memes = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        allMemes.push(...memes);
                    }

                    setFavorites(allMemes);
                }
            } catch (error) {
                console.error("Error fetching favorites:", error);
                toast.error("Failed to load favorites");
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, [user]);

    // --- GRID HANDLERS ---
    const handleReaction = async (e, meme) => {
        e.stopPropagation();
        if (!user) return toast.error("Please login to react");

        try {
            const hasReacted = meme.reactedBy?.includes(user.uid);
            await updateDoc(doc(db, "memes", meme.id), {
                "reactions.haha": increment(hasReacted ? -1 : 1),
                reactedBy: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
            });

            // Optimistic update
            setFavorites(prev => prev.map(m => {
                if (m.id === meme.id) {
                    return {
                        ...m,
                        reactions: { ...m.reactions, haha: (m.reactions?.haha || 0) + (hasReacted ? -1 : 1) },
                        reactedBy: hasReacted ? m.reactedBy.filter(id => id !== user.uid) : [...(m.reactedBy || []), user.uid]
                    };
                }
                return m;
            }));
        } catch (error) {
            console.error("Reaction error", error);
        }
    };

    const handleDownload = async (e, meme) => {
        e.stopPropagation();
        try {
            await updateDoc(doc(db, "memes", meme.id), { downloads: increment(1) });
            setFavorites(prev => prev.map(m => m.id === meme.id ? { ...m, downloads: (m.downloads || 0) + 1 } : m));

            const response = await fetch(meme.file_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${meme.title}.${meme.media_type === 'video' ? 'mp4' : 'jpg'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error("Download error", error);
            window.open(meme.file_url, '_blank');
        }
    };

    const handleFavorite = async (e, meme) => {
        e.stopPropagation();
        if (!user) return toast.error("Please login to favorite");

        // Since we are on favorites page, clicking favorite (star) implies removing it
        const isFav = userFavoritesIds.includes(meme.id);

        // Optimistic update
        const newFavIds = isFav ? userFavoritesIds.filter(id => id !== meme.id) : [...userFavoritesIds, meme.id];
        setUserFavoritesIds(newFavIds);

        // If removing, we just update the visual state (unstar) but keep it in the list
        // so the user can re-favorite if it was a mistake, or just see it until they leave.
        if (isFav) {
            toast.success("Removed from favorites");
        } else {
            toast.success("Added to favorites");
        }

        try {
            await updateDoc(doc(db, "users", user.uid), {
                favorites: isFav ? arrayRemove(meme.id) : arrayUnion(meme.id)
            });
        } catch (error) {
            // Revert on error
            console.error("Favorite error", error);
            if (isFav) {
                setUserFavoritesIds(prev => [...prev, meme.id]);
                // We can't easily re-add the meme object to the list without fetching it again if we removed it
                // So we might just force a reload or accept the glitch. 
                // For now, let's just toast error.
                toast.error("Failed to update favorite status");
            }
        }
    };

    const handleShare = (e, meme) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/?meme=${meme.id}`;
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#050505] flex items-center justify-center pt-20">
                <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#050505] flex items-center justify-center pt-20">
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="bg-yellow-400 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Star size={40} className="text-black" />
                    </div>
                    <h1 className="text-3xl font-black text-black dark:text-white mb-4">
                        Login to View Favorites
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        Sign in to save and view your favorite memes
                    </p>
                    <button
                        onClick={googleLogin}
                        className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-yellow-400/20"
                    >
                        Login with Google
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] pt-20 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 mb-6 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-bold">Back</span>
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-yellow-400 p-2 rounded-lg">
                            <Star size={24} className="text-black" fill="currentColor" />
                        </div>
                        <h1 className="text-4xl font-black text-black dark:text-white">
                            My Favorites
                        </h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                        {favorites.length} {favorites.length === 1 ? 'meme' : 'memes'} saved
                    </p>
                </div>

                {/* Favorites Grid */}
                {favorites.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="bg-gray-100 dark:bg-[#1a1a1a] w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Star size={48} className="text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-black dark:text-white mb-3">
                            No Favorites Yet
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                            Start exploring and click the star icon on memes you love to save them here!
                        </p>
                        <Link
                            href="/"
                            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-yellow-400/20"
                        >
                            Explore Memes
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {favorites.map((meme) => (
                            <MemeGridItem
                                key={meme.id}
                                meme={meme}
                                user={user}
                                isAdmin={false}
                                isSelectionMode={false}
                                selectedMemes={[]}
                                openMeme={(m) => router.push(`/meme/${m.id}`)}
                                toggleMemeSelection={() => { }}
                                handleReaction={handleReaction}
                                handleDownload={handleDownload}
                                handleShare={handleShare}
                                handleFavorite={handleFavorite}
                                addToDownloadList={addToDownloadList}
                                removeFromDownloadList={removeFromDownloadList}
                                isInDownloadList={isInDownloadList}
                                userFavorites={userFavoritesIds}
                                canDelete={() => false} // Can't delete memes from favs page
                                openMenuId={null}
                                setOpenMenuId={() => { }}
                                openEditModal={() => { }}
                                handleDelete={() => { }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
