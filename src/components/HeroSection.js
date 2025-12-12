"use client";

import { useRef } from "react";
import { Sparkles, Volume2, VolumeX, Play, Pause } from "lucide-react";
import { db } from "@/lib/firebase"; // Import db
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore"; // Import Firestore functions

export default function HeroSection({ user, googleLogin, router, memes: initialMemes, openMeme }) {
    const [heroMemes, setHeroMemes] = useState([]); // Local memes state
    const [currentMeme, setCurrentMeme] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [history, setHistory] = useState([]);
    const [scrollY, setScrollY] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const [userWantsAudio, setUserWantsAudio] = useState(false); // Track user intent
    const [isPlaying, setIsPlaying] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);

    const videoRef = useRef(null);
    const bgVideoRef = useRef(null);

    // Scroll Listener & Auto-Mute/Resume
    useEffect(() => {
        const handleScroll = () => requestAnimationFrame(() => {
            const currentScroll = window.scrollY;
            setScrollY(currentScroll);

            // Auto-mute when scrolling down past 300px
            if (currentScroll > 300) {
                setIsMuted(true);
            } else {
                // Resume audio if user previously unmuted
                if (userWantsAudio) {
                    setIsMuted(false);
                }
            }
        });
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [userWantsAudio]); // Re-bind when intent changes

    // Fetch Random/Fresh Memes for Hero
    useEffect(() => {
        const fetchHeroMemes = async () => {
            try {
                // Fetch Top 300 APPROVED memes to ensure a large pool (randomized client-side)
                const q = query(collection(db, "memes"), where("status", "==", "approved"), orderBy("createdAt", "desc"), limit(300));
                const snapshot = await getDocs(q);
                let fetched = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(m => m.media_type !== "audio" && m.media_type !== "raw" && !m.file_url.endsWith(".mp3"));

                // Simple Random Shuffle
                fetched.sort(() => Math.random() - 0.5);

                setHeroMemes(fetched);
            } catch (error) {
                console.error("Error fetching hero memes:", error);
            }
        };

        fetchHeroMemes();
    }, []);

    // Determine which pool to use (Fetched > Initial Props)
    const activePool = heroMemes.length > 0 ? heroMemes : initialMemes;

    // Viewport Calculations
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const heroOpacity = Math.max(0, 1 - scrollY / (viewportHeight * 0.7));
    const showExplore = scrollY < (viewportHeight * 0.3);

    // Pick Random Meme Logic
    const pickRandomMeme = () => {
        if (!activePool || activePool.length === 0) return;

        setIsTransitioning(true);

        setTimeout(() => {
            // Filter memes that haven't been shown recently
            let available = activePool.filter(m => !history.includes(m.id));
            let resetHistory = false;

            // If we've shown all of them, reset history and pick from full list
            if (available.length === 0) {
                available = activePool;
                resetHistory = true;
            }

            // Pick random from available
            if (available.length === 0) return;

            const random = available[Math.floor(Math.random() * available.length)];

            setCurrentMeme(random);
            setIsVideoLoaded(false); // Reset loaded state for new meme

            if (resetHistory) {
                setHistory([random.id]);
            } else {
                setHistory(prev => [...prev, random.id]);
            }

            setIsTransitioning(false);
        }, 800);
    };

    // Initialize First Meme
    useEffect(() => {
        if (activePool && activePool.length > 0 && !currentMeme) {
            const random = activePool[Math.floor(Math.random() * activePool.length)];
            setCurrentMeme(random);
            setIsVideoLoaded(false);
            setHistory([random.id]);
        }
    }, [activePool]);

    // IMAGE Handling: Fallback interval if it's NOT a video
    useEffect(() => {
        if (!currentMeme) return;

        // If video, we rely on onEnded events (handled in the video tag)
        if (currentMeme.media_type === "video" || currentMeme.file_url.endsWith(".mp4")) {
            return;
        }

        // If Image, just show for 5 seconds then switch
        const interval = setInterval(pickRandomMeme, 5000);
        return () => clearInterval(interval);
    }, [currentMeme]);


    // Video Event Handlers
    const handleVideoEnded = (e) => {
        pickRandomMeme();
    };

    // Sync Play/Pause with State
    useEffect(() => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.play().catch(() => { });
            else videoRef.current.pause();
        }
        if (bgVideoRef.current) {
            if (isPlaying) bgVideoRef.current.play().catch(() => { });
            else bgVideoRef.current.pause();
        }
    }, [isPlaying, currentMeme, isVideoLoaded]);

    if (!currentMeme) {
        return (
            <section className="relative h-screen min-h-[600px] bg-[#050505] flex items-center justify-center pt-16">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-4 w-32 bg-gray-800 rounded mb-4"></div>
                    <div className="h-10 w-64 bg-gray-800 rounded mb-4"></div>
                </div>
            </section>
        );
    }

    return (
        <section
            className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden pt-16 group cursor-pointer bg-[#050505]"
            onClick={() => currentMeme && openMeme(currentMeme)}
        >

            {/* 1. RANDOM BACKGROUND CLIP */}
            <div
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isTransitioning ? "opacity-0" : "opacity-100"}`}
                style={{ opacity: isTransitioning ? 0 : heroOpacity }}
            >
                {/* A. BLURRED BACKGROUND FILL */}
                <div className="absolute inset-0 overflow-hidden">
                    {currentMeme.media_type === "video" || currentMeme.file_url.endsWith(".mp4") ? (
                        <video
                            ref={bgVideoRef}
                            key={currentMeme.id + "_bg"}
                            src={currentMeme.file_url}
                            autoPlay={isPlaying}
                            muted={true} // Always mute background to prevent echo
                            playsInline
                            crossOrigin="anonymous"
                            preload="auto"
                            onError={() => pickRandomMeme()} // Skip if error
                            className="w-full h-full object-cover blur-2xl opacity-100 scale-125"
                        // No loop here, follows main video logic implicitly via currentMeme change
                        />
                    ) : (
                        <img
                            key={currentMeme.id + "_bg"}
                            src={currentMeme.thumbnail_url || currentMeme.file_url}
                            className="w-full h-full object-cover blur-2xl opacity-100 scale-125"
                            alt="back-blur"
                        />
                    )}
                </div>

                {/* B. MAIN CONTENT */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {currentMeme.media_type === "video" || currentMeme.file_url.endsWith(".mp4") ? (
                        <>
                            {/* Dummy Thumbnail while Loading */}
                            {!isVideoLoaded && (
                                <img
                                    src={currentMeme.thumbnail_url || currentMeme.file_url}
                                    className="absolute inset-0 h-full w-auto max-w-full object-contain mx-auto z-10"
                                    alt="loading-thumb"
                                />
                            )}
                            <video
                                ref={videoRef}
                                key={currentMeme.id + "_main"}
                                src={currentMeme.file_url}
                                autoPlay={isPlaying}
                                muted={isMuted}
                                playsInline
                                crossOrigin="anonymous"
                                preload="auto"
                                onLoadedData={() => setIsVideoLoaded(true)}
                                onEnded={handleVideoEnded}
                                onError={() => pickRandomMeme()} // Skip if error
                                className={`h-full w-auto max-w-full object-contain shadow-2xl brightness-110 transition-opacity duration-500 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                            />
                        </>
                    ) : (
                        <img
                            key={currentMeme.id + "_main"}
                            src={currentMeme.thumbnail_url || currentMeme.file_url}
                            className="h-full w-auto max-w-full object-contain shadow-2xl brightness-110"
                            alt={currentMeme.title}
                        />
                    )}
                </div>
            </div>

            {/* 2. OVERLAY */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10"
                style={{ opacity: heroOpacity }}
            />

            {/* 3. VIGNETTE */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />


            {/* 4. CONTENT CONTAINER */}
            <div
                className="relative z-20 w-full max-w-7xl mx-auto px-4 flex flex-col items-center justify-center text-center"
                style={{ opacity: heroOpacity }}
            >

                {/* Tagline */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/20 text-yellow-500 font-bold text-sm mb-8 animate-fade-in-up border border-yellow-400/20 backdrop-blur-md">
                    <Sparkles size={16} />
                    <span>The #1 Place for Viral Memes</span>
                </div>

                {/* Main Heading */}
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-none drop-shadow-2xl text-white">
                    Looking for meme clips ? <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">For your videos</span>
                </h1>

                {/* Subtitle */}
                <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
                    HD meme clips for editors — easy download, clean UI, no signup.
                </p>

                {/* Action Buttons Row - Reverted Position (Removed mt-16) */}
                <div className="flex flex-col sm:flex-row items-center gap-4 z-20 transition-transform hover:scale-105">
                    {/* Upload Button */}
                    <button
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (!user) {
                                try {
                                    await googleLogin();
                                } catch (err) {
                                    console.error(err);
                                    return;
                                }
                            }
                            router.push('/upload');
                        }}
                        className="px-8 py-3 bg-white/10 border border-white/30 text-white font-bold text-lg rounded-full backdrop-blur-md transition-all hover:bg-white/20 hover:scale-105 hover:border-white/50 flex items-center gap-2 group shadow-lg"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Upload Meme
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-y-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                        </span>
                    </button>

                    {/* Request Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push('/request');
                        }}
                        className="px-8 py-3 bg-yellow-400/90 text-black font-black text-lg rounded-full backdrop-blur-md transition-all hover:bg-yellow-400 hover:scale-105 hover:shadow-yellow-400/30 flex items-center gap-2 group shadow-lg"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Request Meme
                            <span className="text-xl">✨</span>
                        </span>
                    </button>
                </div>

            </div>

            {/* 5. PREVIEW HINT & MUTE CONTROL */}
            <div className={`absolute bottom-8 right-8 z-30 flex items-center gap-4 transition-opacity duration-500 ${showExplore ? "opacity-100" : "opacity-0"}`}>

                {/* Text Hint */}
                <div className="flex items-center gap-2 text-white/50 font-medium text-xs pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="animate-pulse">Previewing • Click to Watch</span>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsPlaying(!isPlaying);
                    }}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-full backdrop-blur-md transition-all hover:scale-105 border border-white/5"
                    title={isPlaying ? "Pause to save data" : "Play"}
                >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>

                {/* Mute Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        const newMuteState = !isMuted;
                        setIsMuted(newMuteState);
                        setUserWantsAudio(!newMuteState); // If unmuted, user wants audio
                    }}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-full backdrop-blur-md transition-all hover:scale-105 border border-white/5"
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
            </div>

            {/* 6. SCROLL DOWN INDICATOR */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    const actionSection = document.getElementById('hero-actions');
                    if (actionSection) actionSection.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`absolute bottom-10 z-30 flex flex-col items-center gap-2 text-white/50 hover:text-white transition-opacity duration-500 animate-bounce ${showExplore ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
                <span className="text-xs font-bold uppercase tracking-widest">Explore</span>
                <div className="p-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>
                </div>
            </button>

        </section>
    );
}
