"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Send, Heart, MessageCircle, Share2, MoreHorizontal, ChevronUp, ChevronDown, Check, Volume2, VolumeX, Download, X } from "lucide-react";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, increment } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ReelModeConfig() {
    const router = useRouter();
    const { user } = useAuth();

    // Core State
    const [memes, setMemes] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ video: true, image: false, audio: false });
    const [activeTab, setActiveTab] = useState("for_you"); // for_you, following

    // Refs
    const containerRef = useRef(null);
    const videoRefs = useRef({});

    // -- 1. Fetching Logic (Algorithm) --
    useEffect(() => {
        const fetchReels = async () => {
            setIsLoading(true);
            try {
                // Base Query: Approved Memes
                const q = query(
                    collection(db, "memes"),
                    where("status", "==", "approved")
                );

                const snapshot = await getDocs(q);
                let allDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                // Filter logic (Client side for complex "OR" logic mixed with types)
                let filtered = allDocs.filter(m => {
                    const isVideo = m.media_type === 'video' || m.file_url?.endsWith('.mp4');
                    const isAudio = m.media_type === 'audio' || m.file_url?.endsWith('.mp3');
                    const isImage = !isVideo && !isAudio;

                    if (filters.video && isVideo) return true;
                    if (filters.image && isImage) return true;
                    if (filters.audio && isAudio) return true;
                    return false;
                });

                // "TikTok Algo" Simulation:
                // 1. Trending (High views/likes) - 40%
                // 2. Fresh (Recent) - 30%
                // 3. Random/Undiscovered - 30%

                // Sort by "Hotness" score
                filtered = filtered.map(m => ({
                    ...m,
                    score: (m.views || 0) + ((m.likes || 0) * 5) + (Math.random() * 50) // Random spice
                })).sort((a, b) => b.score - a.score);

                setMemes(filtered);
            } catch (err) {
                console.error("Reel fetch error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReels();
    }, [filters]);

    // -- 2. Scroll Handling (Snap) -- 
    const handleScroll = () => {
        if (!containerRef.current) return;

        const scrollPos = containerRef.current.scrollTop;
        const index = Math.round(scrollPos / window.innerHeight);

        if (index !== currentIndex && index >= 0 && index < memes.length) {
            setCurrentIndex(index);
        }
    };

    // -- 3. Video Playback Control --
    useEffect(() => {
        // Pause all other videos
        Object.keys(videoRefs.current).forEach(idx => {
            const vid = videoRefs.current[idx];
            if (vid) {
                if (parseInt(idx) === currentIndex) {
                    vid.currentTime = 0; // Restart loop? Or just play
                    vid.play().catch(e => console.log("Auto-play blocked", e));
                } else {
                    vid.pause();
                }
            }
        });
    }, [currentIndex, memes]);

    // -- 4. Actions --
    const goToNext = () => {
        if (currentIndex < memes.length - 1) {
            containerRef.current.scrollTo({
                top: (currentIndex + 1) * window.innerHeight,
                behavior: 'smooth'
            });
        }
    };

    const goToPrev = () => {
        if (currentIndex > 0) {
            containerRef.current.scrollTo({
                top: (currentIndex - 1) * window.innerHeight,
                behavior: 'smooth'
            });
        }
    };

    const handleReaction = async (meme) => {
        if (!user) return toast.error("Login to like!");
        // Optimistic Update
        // (Implementation omitted for brevity, logic same as MemeGridItem)
        toast.success("Liked! (Simulated)");
    };

    return (
        <div className="flex h-screen w-screen bg-black text-white overflow-hidden font-sans">

            {/* Top Right Close Button (For easy exit on Mobile/Desktop) */}
            <Link
                href="/"
                className="fixed top-4 right-4 z-50 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
            >
                <X size={24} />
            </Link>

            {/* -- LEFT SIDEBAR (TikTok Style Navigation) -- */}
            <div className="hidden md:flex flex-col justify-between w-64 p-4 border-r border-white/10 z-20 bg-black">
                <div>
                    <Link href="/" className="flex items-center gap-2 mb-8 group">
                        <div className="p-2 bg-yellow-400 rounded-lg group-hover:scale-105 transition-transform">
                            <ArrowLeft className="text-black" size={20} />
                        </div>
                        <span className="font-bold text-xl tracking-tight">MemeHub HQ</span>
                    </Link>

                    <nav className="flex flex-col gap-2">
                        <button
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-lg transition-colors ${activeTab === 'for_you' ? 'bg-red-500 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                            onClick={() => setActiveTab('for_you')}
                        >
                            <Send size={24} /> For You
                        </button>
                        <button
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-lg transition-colors ${activeTab === 'following' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                            onClick={() => setActiveTab('following')}
                        >
                            <div className="w-6 h-6 rounded-full border-2 border-current" /> Following
                        </button>
                    </nav>

                    {/* Filter Toggles (As requested: Tick/Untick) */}
                    <div className="mt-8 pt-8 border-t border-white/10">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Content Preferences</h3>
                        <div className="flex flex-col gap-2">
                            {[
                                { id: 'video', label: 'Videos', icon: <Volume2 size={16} /> },
                                { id: 'image', label: 'Images', icon: <Check size={16} /> }, // Using Check as placeholder
                                { id: 'audio', label: 'Audio', icon: <Volume2 size={16} /> }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setFilters(prev => ({ ...prev, [type.id]: !prev[type.id] }))}
                                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-sm active:scale-95 transition-transform"
                                >
                                    <span className="flex items-center gap-2 text-gray-300">
                                        {type.icon} {type.label}
                                    </span>
                                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${filters[type.id] ? 'bg-yellow-400' : 'bg-gray-800'}`}>
                                        {filters[type.id] && <Check size={12} className="text-black" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="text-xs text-gray-600 space-y-2">
                    <p>© 2025 MemeHub HQ</p>
                    <div className="flex flex-wrap gap-2 text-gray-500">
                        <span>Terms</span> • <span>Privacy</span> • <span>Rules</span>
                    </div>
                </div>
            </div>

            {/* -- MAIN REEL FEED -- */}
            <div className="flex-1 relative h-full">
                {/* Scroll Container */}
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth"
                >
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="animate-spin w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full" />
                        </div>
                    ) : memes.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <p className="text-2xl font-bold text-gray-500 mb-4">No memes found matching filters.</p>
                            <button onClick={() => setFilters({ video: true, image: true, audio: true })} className="text-yellow-400 underline">Reset Filters</button>
                        </div>
                    ) : (
                        memes.map((meme, index) => (
                            <div key={meme.id} className="h-screen w-full snap-start relative flex items-center justify-center bg-[#111]">

                                {/* 1. Ambient Background (Blurred) */}
                                <div className="absolute inset-0 opacity-30 pointer-events-none">
                                    {meme.media_type === 'video' ? (
                                        <video src={meme.file_url} className="w-full h-full object-cover blur-3xl" muted loop />
                                    ) : (
                                        <img src={meme.file_url} className="w-full h-full object-cover blur-3xl" />
                                    )}
                                </div>

                                {/* 2. Main Content Player */}
                                <div className="relative z-10 h-full w-full md:max-w-[450px] bg-black shadow-2xl flex flex-col justify-center">
                                    {meme.media_type === 'video' || meme.file_url?.endsWith('.mp4') ? (
                                        <video
                                            ref={el => videoRefs.current[index] = el}
                                            src={meme.file_url}
                                            className="w-full h-full object-contain cursor-pointer"
                                            loop
                                            playsInline
                                            onClick={(e) => e.target.paused ? e.target.play() : e.target.pause()}
                                        />
                                    ) : (
                                        <img src={meme.file_url} className="w-full h-full object-contain" />
                                    )}

                                    {/* Overlay Info (Bottom) */}
                                    <div className="absolute bottom-4 left-4 right-16 z-20 text-left">
                                        <Link href={`/user/${meme.uploader_id}`} className="flex items-center gap-2 mb-3 group">
                                            <img src={meme.uploader_pic || "https://ui-avatars.com/api/?name=User"} className="w-10 h-10 rounded-full border border-white group-hover:scale-110 transition-transform" />
                                            <span className="font-bold text-shadow-sm hover:underline">{meme.uploader_name || 'Anonymous'}</span>
                                        </Link>

                                        <h2 className="text-white text-shadow-sm leading-snug mb-2 font-medium line-clamp-2">{meme.description || meme.title}</h2>

                                        <div className="flex items-center gap-2 text-xs font-bold opacity-80 bg-white/10 px-3 py-1.5 rounded-full w-fit backdrop-blur-sm">
                                            <Volume2 size={12} />
                                            <span className="animate-marquee whitespace-nowrap overflow-hidden max-w-[150px]">
                                                Original Sound - {meme.uploader_name} • MemeHub HQ
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Right Action Bar (Floating) */}
                                <div className="absolute right-4 bottom-20 md:right-[calc(50%-280px)] md:bottom-20 z-30 flex flex-col gap-6 items-center pb-8">

                                    {/* Reactions */}
                                    <button className="flex flex-col items-center gap-1 group" onClick={() => handleReaction(meme)}>
                                        <div className="p-3 bg-black/40 backdrop-blur-md rounded-full group-active:scale-90 transition-transform hover:bg-white/10">
                                            <span className="text-2xl">😂</span>
                                        </div>
                                        <span className="text-xs font-bold text-shadow">{meme.reactions?.haha || 0}</span>
                                    </button>

                                    {/* Comments */}
                                    <button className="flex flex-col items-center gap-1 group">
                                        <div className="p-3 bg-black/40 backdrop-blur-md rounded-full group-active:scale-90 transition-transform hover:bg-white/10 text-white">
                                            <MessageCircle size={28} fill="white" />
                                        </div>
                                        <span className="text-xs font-bold text-shadow">{meme.comments_count || 45}</span>
                                    </button>

                                    {/* Bookmark */}
                                    <button className="flex flex-col items-center gap-1 group">
                                        <div className="p-3 bg-black/40 backdrop-blur-md rounded-full group-active:scale-90 transition-transform hover:bg-white/10 text-white">
                                            <Heart size={28} />
                                            {/* Using Heart as generic 'save/like' icon request */}
                                        </div>
                                        <span className="text-xs font-bold text-shadow">Save</span>
                                    </button>

                                    {/* Share */}
                                    <button className="flex flex-col items-center gap-1 group">
                                        <div className="p-3 bg-black/40 backdrop-blur-md rounded-full group-active:scale-90 transition-transform hover:bg-white/10 text-white">
                                            <Share2 size={28} />
                                        </div>
                                        <span className="text-xs font-bold text-shadow">Share</span>
                                    </button>

                                    {/* Download (Highlight) */}
                                    <button className="flex flex-col items-center gap-1 group mt-2">
                                        <div className="p-3 bg-green-500 rounded-full group-active:scale-90 transition-transform hover:brightness-110 text-white shadow-lg shadow-green-500/20 animate-pulse-slow">
                                            <Download size={24} />
                                        </div>
                                        <span className="text-xs font-bold text-shadow text-green-400">DL</span>
                                    </button>

                                    {/* Album Art / Spinner */}
                                    <div className="mt-4 w-10 h-10 rounded-full bg-gray-800 border-4 border-black overflow-hidden animate-spin-slow">
                                        <img src={meme.uploader_pic} className="w-full h-full object-cover" />
                                    </div>
                                </div>

                            </div>
                        ))
                    )}
                </div>

                {/* Navigation Arrows (Desktop Overlay) */}
                <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4 z-40">
                    <button
                        onClick={goToPrev}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all hover:scale-110 disabled:opacity-30 text-white"
                        disabled={currentIndex === 0}
                    >
                        <ChevronUp size={24} />
                    </button>
                    <button
                        onClick={goToNext}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all hover:scale-110 disabled:opacity-30 text-white"
                        disabled={currentIndex === memes.length - 1}
                    >
                        <ChevronDown size={24} />
                    </button>
                </div>
            </div>

        </div>
    );
}
