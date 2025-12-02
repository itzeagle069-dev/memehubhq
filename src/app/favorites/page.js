"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { Star, Eye, Download, Heart } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FavoritesPage() {
    const { user, googleLogin } = useAuth();
    const router = useRouter();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {favorites.map((meme) => (
                            <Link
                                key={meme.id}
                                href={`/meme/${meme.id}`}
                                className="group bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-yellow-400/10 transition-all duration-300 hover:-translate-y-1"
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-video bg-black overflow-hidden">
                                    {meme.media_type === "video" || meme.file_url?.endsWith(".mp4") ? (
                                        <video
                                            src={meme.file_url}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                            muted
                                        />
                                    ) : meme.media_type === "audio" || meme.media_type === "raw" ? (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500">
                                            <span className="text-6xl">🎵</span>
                                        </div>
                                    ) : (
                                        <img
                                            src={meme.thumbnail_url || meme.file_url}
                                            alt={meme.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                        />
                                    )}

                                    {/* Favorite indicator */}
                                    <div className="absolute top-2 right-2 bg-yellow-400 text-black p-1.5 rounded-full">
                                        <Star size={14} fill="currentColor" />
                                    </div>

                                    {/* Media type badge */}
                                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-md text-xs font-bold text-white">
                                        {meme.media_type === "video" || meme.file_url?.endsWith(".mp4") ? "VIDEO" :
                                            meme.media_type === "audio" || meme.media_type === "raw" ? "AUDIO" : "IMAGE"}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <h3 className="font-bold text-black dark:text-white line-clamp-2 mb-2 group-hover:text-yellow-400 transition-colors">
                                        {meme.title}
                                    </h3>

                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Eye size={12} />
                                            {meme.views || 0}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Download size={12} />
                                            {meme.downloads || 0}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            😂 {meme.reactions?.haha || 0}
                                        </span>
                                    </div>

                                    {/* Category */}
                                    <div className="mt-3">
                                        <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-[#222] rounded-md text-xs font-bold text-gray-700 dark:text-gray-300">
                                            {meme.category}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
