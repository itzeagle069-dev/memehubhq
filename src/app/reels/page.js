"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, orderBy, doc, updateDoc, arrayUnion, arrayRemove, setDoc, increment, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { X, ChevronUp, ChevronDown, Heart, MessageCircle, Share2, Download, Volume2, VolumeX } from 'lucide-react';
import { detectNetworkSpeed, getOptimizedMediaUrl } from '@/lib/networkUtils';

export default function MemeReels() {
    const router = useRouter();
    const { user } = useAuth();

    const [memes, setMemes] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [userFavorites, setUserFavorites] = useState([]);
    const [networkSpeed, setNetworkSpeed] = useState('medium');
    const [hasMore, setHasMore] = useState(true);
    const [isMuted, setIsMuted] = useState(false); // Default unmuted

    const containerRef = useRef(null);
    const videoRefs = useRef({});
    const tickingRef = useRef(false);

    // Detect network speed
    useEffect(() => {
        const checkSpeed = async () => {
            const speed = await detectNetworkSpeed();
            setNetworkSpeed(speed);
        };
        checkSpeed();

        // Monitor network changes every 30 seconds
        const interval = setInterval(checkSpeed, 30000);
        return () => clearInterval(interval);
    }, []);

    // FIX 5: FETCH LESS DATA (15 instead of 200)
    useEffect(() => {
        const fetchMemes = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, "memes"),
                    orderBy("createdAt", "desc"),
                    limit(15) // Only 15 initially
                );
                const snapshot = await getDocs(q);
                let rawData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    reactions: doc.data().reactions || { haha: 0 },
                    reactedBy: doc.data().reactedBy || []
                }));

                rawData = rawData.filter(m => m.status === "published" || m.status === "approved");
                rawData = rawData.filter(m => m.media_type === 'video' || m.file_url?.endsWith('.mp4'));

                // Shuffle
                for (let i = rawData.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [rawData[i], rawData[j]] = [rawData[j], rawData[i]];
                }

                setMemes(rawData);
                setHasMore(rawData.length === 15);
            } catch (error) {
                console.error("Error fetching memes:", error);
                toast.error("Failed to load memes");
            } finally {
                setLoading(false);
            }
        };

        fetchMemes();
    }, []);

    // Fetch user favorites
    useEffect(() => {
        if (!user) return;
        const fetchFavorites = async () => {
            try {
                const userDoc = await getDocs(query(collection(db, "users")));
                const userData = userDoc.docs.find(d => d.id === user.uid)?.data();
                setUserFavorites(userData?.favorites || []);
            } catch (err) {
                console.error("Error fetching favorites:", err);
            }
        };
        fetchFavorites();
    }, [user]);

    // Handle Reaction
    const handleReaction = async (e, meme) => {
        e.stopPropagation();
        if (!user) return toast.error("Please login to react!");

        const hasReacted = meme.reactedBy?.includes(user.uid);
        const memeRef = doc(db, "memes", meme.id);

        setMemes(prev => prev.map(m => {
            if (m.id === meme.id) {
                return {
                    ...m,
                    reactions: { ...m.reactions, haha: (m.reactions?.haha || 0) + (hasReacted ? -1 : 1) },
                    reactedBy: hasReacted
                        ? m.reactedBy.filter(id => id !== user.uid)
                        : [...(m.reactedBy || []), user.uid]
                };
            }
            return m;
        }));

        try {
            if (hasReacted) {
                await updateDoc(memeRef, {
                    "reactions.haha": increment(-1),
                    reactedBy: arrayRemove(user.uid)
                });
            } else {
                await updateDoc(memeRef, {
                    "reactions.haha": increment(1),
                    reactedBy: arrayUnion(user.uid)
                });
            }
        } catch (error) {
            console.error("Error updating reaction:", error);
        }
    };

    // Handle Favorite
    const handleFavorite = async (e, meme) => {
        e.stopPropagation();
        if (!user) return toast.error("Please login to save favorites!");

        const isFavorite = userFavorites.includes(meme.id);
        const userRef = doc(db, "users", user.uid);

        setUserFavorites(prev => isFavorite ? prev.filter(id => id !== meme.id) : [...prev, meme.id]);

        try {
            await setDoc(userRef, {
                favorites: isFavorite ? arrayRemove(meme.id) : arrayUnion(meme.id)
            }, { merge: true });
            toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
        } catch (error) {
            console.error("Error updating favorites:", error);
            setUserFavorites(prev => isFavorite ? [...prev, meme.id] : prev.filter(id => id !== meme.id));
        }
    };

    // Auto play/pause logic with FIX 4: Don't reset currentTime
    useEffect(() => {
        Object.keys(videoRefs.current).forEach((key) => {
            const video = videoRefs.current[key];
            if (video) {
                const videoIndex = parseInt(key);
                if (videoIndex === currentIndex) {
                    // FIX 4: Don't reset, just play if paused
                    if (video.paused) {
                        video.play().catch(e => {
                            console.log("Autoplay prevented, user interaction needed");
                            // If autoplay fails (browser policy), unmute might help
                        });
                    }
                } else {
                    video.pause();
                }
            }
        });
    }, [currentIndex]);

    // FIX 6: THROTTLED SCROLL HANDLER
    const handleScroll = () => {
        if (!tickingRef.current) {
            window.requestAnimationFrame(() => {
                if (containerRef.current) {
                    const newIndex = Math.round(containerRef.current.scrollTop / window.innerHeight);
                    if (newIndex !== currentIndex) {
                        setCurrentIndex(newIndex);
                    }
                }
                tickingRef.current = false;
            });
            tickingRef.current = true;
        }
    };

    const scrollTo = (idx) => {
        containerRef.current?.scrollTo({ top: idx * window.innerHeight, behavior: 'smooth' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-xl font-bold">Loading Reels...</p>
                </div>
            </div>
        );
    }

    // FIX 1: ONLY RENDER 3 REELS (Virtual Scrolling)
    const visibleMemes = memes.slice(
        Math.max(0, currentIndex - 1),
        currentIndex + 2
    );

    return (
        <div className="flex h-screen w-screen bg-black text-white font-sans overflow-hidden">
            <Link href="/" className="fixed top-4 right-4 z-50 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors">
                <X size={24} />
            </Link>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 relative">
                {memes.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/80 backdrop-blur-sm">
                        <h2 className="text-2xl font-bold mb-2">No Reels Found</h2>
                        <p className="text-gray-400">Try again later</p>
                    </div>
                )}

                {/* Desktop Nav Arrows */}
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40 hidden lg:flex">
                    <button onClick={() => scrollTo(currentIndex - 1)} disabled={currentIndex === 0} className="p-3 bg-gray-800/50 hover:bg-gray-700 rounded-full text-white disabled:opacity-0 transition-all">
                        <ChevronUp />
                    </button>
                    <button onClick={() => scrollTo(currentIndex + 1)} disabled={currentIndex === memes.length - 1} className="p-3 bg-gray-800/50 hover:bg-gray-700 rounded-full text-white disabled:opacity-0 transition-all">
                        <ChevronDown />
                    </button>
                </div>

                {/* SCROLL CONTAINER */}
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
                >
                    {visibleMemes.map((meme, i) => {
                        const index = Math.max(0, currentIndex - 1) + i;

                        return (
                            <div key={meme.id} className="h-screen w-full snap-start relative flex items-center justify-center overflow-hidden">
                                {/* FIX 2: Background MUST be IMAGE, not video */}
                                <div className="absolute inset-0 z-0">
                                    <img
                                        src={getOptimizedMediaUrl(meme.thumbnail_url || meme.file_url, networkSpeed, 'image')}
                                        className="w-full h-full object-cover blur-[50px] opacity-40"
                                        alt=""
                                    />
                                    <div className="absolute inset-0 bg-black/20" />
                                </div>

                                {/* Main Content */}
                                <div className="relative z-10 h-full w-full max-w-[500px] bg-black shadow-2xl flex flex-col justify-center">
                                    {/* FIX 3: PRELOAD STRATEGY */}
                                    <video
                                        ref={el => videoRefs.current[index] = el}
                                        src={getOptimizedMediaUrl(meme.file_url, networkSpeed, 'video')}
                                        poster={getOptimizedMediaUrl(meme.thumbnail_url, networkSpeed, 'image')}
                                        preload={index === currentIndex ? "auto" : "metadata"}
                                        className="w-full h-full object-contain"
                                        loop
                                        muted={isMuted}
                                        playsInline
                                        onClick={(e) => e.target.paused ? e.target.play() : e.target.pause()}
                                    />

                                    {/* Mute/Unmute Button */}
                                    <button
                                        onClick={() => setIsMuted(!isMuted)}
                                        className="absolute top-4 left-4 z-30 p-3 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-all"
                                    >
                                        {isMuted ? (
                                            <VolumeX size={24} className="text-red-400" />
                                        ) : (
                                            <Volume2 size={24} className="text-yellow-400" />
                                        )}
                                    </button>

                                    {/* Bottom Info Overlay */}
                                    <div className="absolute bottom-0 left-0 w-full p-4 pb-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-24">
                                        <div className="pr-16">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-bold text-shadow">@{meme.uploader_name || 'User'}</h3>
                                            </div>
                                            <p className="text-white/90 text-sm mb-3 line-clamp-2">{meme.description || meme.title}</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="absolute bottom-8 right-2 flex flex-col gap-5 items-center z-20">
                                        {/* Haha React */}
                                        <button
                                            onClick={(e) => handleReaction(e, meme)}
                                            className="flex flex-col items-center gap-1 group"
                                        >
                                            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full group-hover:bg-white/20 transition-all">
                                                <span className={`text-2xl group-active:scale-125 block transition-transform ${meme.reactedBy?.includes(user?.uid) ? 'animate-bounce' : ''}`}>😂</span>
                                            </div>
                                            <span className="text-xs font-bold">{meme.reactions?.haha || 0}</span>
                                        </button>

                                        {/* Comments */}
                                        <button
                                            onClick={() => router.push(`/meme/${meme.id}`)}
                                            className="flex flex-col items-center gap-1 group"
                                        >
                                            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full group-hover:bg-white/20 transition-all">
                                                <MessageCircle size={26} fill="white" className="text-white" />
                                            </div>
                                            <span className="text-xs font-bold">{meme.comments_count || 0}</span>
                                        </button>

                                        {/* Favorite */}
                                        <button
                                            onClick={(e) => handleFavorite(e, meme)}
                                            className="flex flex-col items-center gap-1 group"
                                        >
                                            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full group-hover:bg-white/20 transition-all">
                                                <Heart
                                                    size={26}
                                                    className={`text-white transition-all ${userFavorites.includes(meme.id) ? 'fill-red-500 text-red-500' : ''}`}
                                                />
                                            </div>
                                            <span className="text-xs font-bold">Save</span>
                                        </button>

                                        {/* Share */}
                                        <button className="flex flex-col items-center gap-1 group">
                                            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full group-hover:bg-white/20 transition-all">
                                                <Share2 size={26} className="text-white" />
                                            </div>
                                            <span className="text-xs font-bold">Share</span>
                                        </button>

                                        {/* Download */}
                                        <button onClick={() => toast.success("Downloading...")} className="flex flex-col items-center gap-1 group">
                                            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full group-hover:bg-white/20 transition-all">
                                                <Download size={24} className="text-white" />
                                            </div>
                                            <span className="text-xs font-bold">DL</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
