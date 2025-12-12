"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Send, Heart, MessageCircle, Share2, ChevronUp, ChevronDown, Check, Volume2, Download, X, Play } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase"; // Your firebase config
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { toast } from "react-hot-toast";

export default function MemeReels() {
    // -- STATE --
    const [memes, setMemes] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    // Filters: Default Video=TRUE, others FALSE
    const [filters, setFilters] = useState({ video: true, image: false, audio: false });
    const [activeTab, setActiveTab] = useState("for_you");

    // Refs for scrolling and video control
    const containerRef = useRef(null);
    const videoRefs = useRef({});

    // -- 1. THE ALGORITHM (Viral + Fresh + Random) --
    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            try {
                // Fetch approved memes (In a real app, use pagination/infinite scroll)
                // Fetch approved/published memes
                // We use orderBy("createdAt", "desc") to get newest first, matching homepage strategy
                const q = query(
                    collection(db, "memes"),
                    // where("status", "==", "published"), // Removed generic 'where' to rely on client filter or simple ordering to avoid index issues
                    limit(50)
                );
                const snapshot = await getDocs(q);
                let rawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filter for Published/Approved statuses on client side
                rawData = rawData.filter(m => m.status === "published" || m.status === "approved");

                // A. TYPE FILTERING
                let filtered = rawData.filter(m => {
                    const url = m.file_url || m.url || '';
                    const type = (m.media_type || m.type || '').toLowerCase();

                    const isVid = type === 'video' || url.endsWith('.mp4') || url.endsWith('.webm');
                    const isImg = type === 'image' || (!isVid && (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.gif') || url.endsWith('.webp')));

                    // Logic: Return true if the specific filter is ON and type matches
                    if (filters.video && isVid) return true;
                    if (filters.image && isImg) return true;
                    return false;
                });

                console.log("Reels Fetch:", { raw: rawData.length, filtered: filtered.length });

                // B. THE "TIKTOK" SORTING ALGORITHM
                // We calculate a 'Hot Score' for every meme, then shuffle slightly
                const scoredAndSorted = filtered.map(item => {
                    // Weight Factors
                    const viewsWeight = item.views || 0;
                    const likesWeight = (item.likes || 0) * 10; // Likes are worth more
                    const recencyBoost = new Date() - (item.createdAt?.toDate ? item.createdAt.toDate() : new Date()) < 604800000 ? 500 : 0; // Boost if < 1 week old
                    const randomDiscovery = Math.random() * 1000; // The "Wildcard" factor

                    return {
                        ...item,
                        score: viewsWeight + likesWeight + recencyBoost + randomDiscovery
                    };
                }).sort((a, b) => b.score - a.score); // Highest score first

                setMemes(scoredAndSorted);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [filters]); // Re-run if user changes filters

    // -- 2. AUTO PLAY / PAUSE LOGIC --
    useEffect(() => {
        // Pause all videos except the current one
        Object.keys(videoRefs.current).forEach((index) => {
            const video = videoRefs.current[index];
            if (video) {
                if (parseInt(index) === currentIndex) {
                    video.currentTime = 0;
                    video.play().catch(e => console.log("Autoplay prevented:", e));
                } else {
                    video.pause();
                }
            }
        });
    }, [currentIndex, memes]);

    // -- 3. SCROLL HANDLER --
    const handleScroll = () => {
        if (!containerRef.current) return;
        const scrollPosition = containerRef.current.scrollTop;
        const windowHeight = window.innerHeight;
        // Calculate which index we are snapped to
        const newIndex = Math.round(scrollPosition / windowHeight);
        if (newIndex !== currentIndex) setCurrentIndex(newIndex);
    };

    // Navigation Helpers
    const scrollTo = (idx) => {
        containerRef.current.scrollTo({ top: idx * window.innerHeight, behavior: 'smooth' });
    };

    return (
        <div className="flex h-screen w-screen bg-black text-white font-sans overflow-hidden">

            {/* Top Right Close Button (For easy exit on Mobile/Desktop) */}
            <Link
                href="/"
                className="fixed top-4 right-4 z-50 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
            >
                <X size={24} />
            </Link>

            {/* --- LEFT SIDEBAR (TikTok Style) --- */}
            <div className="hidden lg:flex w-[260px] flex-col border-r border-gray-800 bg-black z-20">
                {/* Logo Area */}
                <div className="p-6">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform">
                            <span className="text-2xl">😂</span>
                        </div>
                        <h1 className="font-bold text-2xl tracking-tighter">MemeHub</h1>
                    </Link>
                </div>

                {/* Main Nav Tabs */}
                <div className="flex flex-col px-4 gap-2">
                    <button
                        onClick={() => setActiveTab('for_you')}
                        className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'for_you' ? 'bg-[#FE2C55] text-white' : 'hover:bg-gray-900 text-gray-400'}`}
                    >
                        <Send size={20} /> For You
                    </button>
                    <button
                        onClick={() => setActiveTab('following')}
                        className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${activeTab === 'following' ? 'bg-gray-800 text-white' : 'hover:bg-gray-900 text-gray-400'}`}
                    >
                        <div className="w-5 h-5 border-2 border-current rounded-full" /> Following
                    </button>
                </div>

                <div className="my-6 border-t border-gray-800 mx-6"></div>

                {/* FILTER SECTION (Tick/Untick) */}
                <div className="px-6">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">Content Filter</h3>
                    <div className="flex flex-col gap-3">
                        {/* Video Toggle */}
                        <div
                            onClick={() => setFilters(p => ({ ...p, video: !p.video }))}
                            className="flex items-center justify-between cursor-pointer group"
                        >
                            <span className="flex items-center gap-2 font-medium text-gray-300 group-hover:text-white">
                                <Play size={16} /> Videos
                            </span>
                            <div className={`w-5 h-5 rounded border ${filters.video ? 'bg-yellow-400 border-yellow-400' : 'border-gray-600'} flex items-center justify-center`}>
                                {filters.video && <Check size={14} className="text-black stroke-[3]" />}
                            </div>
                        </div>

                        {/* Image Toggle */}
                        <div
                            onClick={() => setFilters(p => ({ ...p, image: !p.image }))}
                            className="flex items-center justify-between cursor-pointer group"
                        >
                            <span className="flex items-center gap-2 font-medium text-gray-300 group-hover:text-white">
                                <div className="w-4 h-4 bg-gray-500 rounded-sm" /> Images
                            </span>
                            <div className={`w-5 h-5 rounded border ${filters.image ? 'bg-yellow-400 border-yellow-400' : 'border-gray-600'} flex items-center justify-center`}>
                                {filters.image && <Check size={14} className="text-black stroke-[3]" />}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1"></div>

                {/* FOOTER LINKS (Hidden Main Footer, moved here) */}
                <div className="p-6 text-[11px] text-gray-500 leading-relaxed border-t border-gray-800">
                    <div className="flex flex-wrap gap-2 mb-2">
                        <a href="#" className="hover:underline">About</a>
                        <a href="#" className="hover:underline">Newsroom</a>
                        <a href="#" className="hover:underline">Contact</a>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                        <a href="#" className="hover:underline">Terms</a>
                        <a href="#" className="hover:underline">Privacy</a>
                        <a href="#" className="hover:underline">Rules</a>
                    </div>
                    <p>© 2025 MemeHub HQ</p>
                </div>
            </div>

            {/* --- MAIN FEED AREA --- */}
            <div className="flex-1 relative bg-[#121212]">

                {/* Loading State */}
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-50">
                        <div className="animate-spin w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full"></div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && memes.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                        <p className="text-xl mb-4">No content found.</p>
                        <button
                            onClick={() => setFilters({ video: true, image: true, audio: false })}
                            className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold"
                        >
                            Show All Types
                        </button>
                    </div>
                )}

                {/* Desktop Nav Arrows (Outside video) */}
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
                    {memes.map((meme, index) => (
                        <div key={meme.id} className="h-screen w-full snap-start relative flex items-center justify-center overflow-hidden">

                            {/* 1. AMBIENT BACKGROUND (Desktop Blur) */}
                            <div className="absolute inset-0 z-0">
                                {meme.media_type === 'video' || meme.file_url?.endsWith('.mp4') ? (
                                    <video src={meme.file_url} className="w-full h-full object-cover blur-[50px] opacity-40" muted />
                                ) : (
                                    <img src={meme.file_url} className="w-full h-full object-cover blur-[50px] opacity-40" />
                                )}
                                <div className="absolute inset-0 bg-black/20" /> {/* Overlay to darken bg */}
                            </div>

                            {/* 2. MAIN CONTENT (Centered) */}
                            <div className="relative z-10 h-full w-full max-w-[500px] bg-black shadow-2xl flex flex-col justify-center">
                                {meme.media_type === 'video' || meme.file_url?.endsWith('.mp4') ? (
                                    <video
                                        ref={el => videoRefs.current[index] = el}
                                        src={meme.file_url}
                                        className="w-full h-full object-contain"
                                        loop
                                        playsInline
                                        onClick={(e) => e.target.paused ? e.target.play() : e.target.pause()}
                                    />
                                ) : (
                                    <img src={meme.file_url} className="w-full h-full object-contain" />
                                )}

                                {/* 3. BOTTOM INFO OVERLAY */}
                                <div className="absolute bottom-0 left-0 w-full p-4 pb-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-24">
                                    <div className="pr-16"> {/* Padding right so text doesnt hit buttons */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-bold text-shadow hover:underline cursor-pointer">@{meme.uploader_name || 'User'}</h3>
                                            <span className="text-blue-400 text-xs bg-blue-400/10 px-1 rounded">Editor</span>
                                        </div>
                                        <p className="text-white/90 text-sm mb-3 line-clamp-2">{meme.description || meme.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-white/70">
                                            <Volume2 size={12} /> Original Audio
                                        </div>
                                    </div>
                                </div>

                                {/* 4. ACTION BUTTONS (Floating Right) */}
                                <div className="absolute bottom-8 right-2 flex flex-col gap-5 items-center z-20">

                                    {/* Profile Pic */}
                                    <div className="relative mb-2">
                                        <img src={meme.uploader_pic || `https://ui-avatars.com/api/?name=${meme.uploader_name || 'U'}`} className="w-10 h-10 rounded-full border border-white" />
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#FE2C55] rounded-full p-0.5">
                                            <div className="w-3 h-0.5 bg-white"></div> {/* Plus icon fake */}
                                        </div>
                                    </div>

                                    {/* Haha React */}
                                    <button className="flex flex-col items-center gap-1 group">
                                        <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full group-hover:bg-white/20 transition-all">
                                            <span className="text-2xl group-active:scale-125 block transition-transform">😂</span>
                                        </div>
                                        <span className="text-xs font-bold shadow-black drop-shadow-md">{meme.reactions?.haha || 125}</span>
                                    </button>

                                    {/* Comments */}
                                    <button className="flex flex-col items-center gap-1 group">
                                        <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full group-hover:bg-white/20 transition-all">
                                            <MessageCircle size={26} fill="white" className="text-white" />
                                        </div>
                                        <span className="text-xs font-bold shadow-black drop-shadow-md">{meme.comments_count || 42}</span>
                                    </button>

                                    {/* Favorites */}
                                    <button className="flex flex-col items-center gap-1 group">
                                        <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full group-hover:bg-white/20 transition-all">
                                            <Heart size={26} className="text-white group-active:fill-red-500 group-active:text-red-500" />
                                        </div>
                                        <span className="text-xs font-bold shadow-black drop-shadow-md">Save</span>
                                    </button>

                                    {/* Share */}
                                    <button className="flex flex-col items-center gap-1 group">
                                        <div className="p-3 bg-white/10 backdrop-blur-sm rounded-full group-hover:bg-white/20 transition-all">
                                            <Share2 size={26} className="text-white" />
                                        </div>
                                        <span className="text-xs font-bold shadow-black drop-shadow-md">Share</span>
                                    </button>

                                    {/* DOWNLOAD (Highlighted) */}
                                    <button
                                        onClick={() => toast.success("Downloading...")}
                                        className="flex flex-col items-center gap-1 group mt-2"
                                    >
                                        <div className="p-3 bg-green-500 rounded-full hover:scale-110 transition-transform shadow-lg shadow-green-500/30 animate-pulse">
                                            <Download size={24} className="text-white" />
                                        </div>
                                        <span className="text-xs font-bold text-green-400 shadow-black drop-shadow-md">DL</span>
                                    </button>

                                    {/* Rotating Audio Disc */}
                                    <div className="mt-4 w-10 h-10 bg-gray-900 rounded-full border-4 border-gray-800 overflow-hidden animate-spin-slow">
                                        <img src={meme.uploader_pic || `https://ui-avatars.com/api/?name=${meme.uploader_name || 'U'}`} className="opacity-70" />
                                    </div>
                                </div>

                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
