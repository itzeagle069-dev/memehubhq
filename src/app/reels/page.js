"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, orderBy, doc, updateDoc, arrayUnion, arrayRemove, setDoc, increment, limit, getDoc, startAfter } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { Menu, X, ChevronUp, ChevronDown, Heart, MessageCircle, Share2, Download, Volume2, VolumeX, Send, Home, Compass, Users, Video, Upload, User, MoreHorizontal, Bookmark, Moon, Sun, FileQuestion, Star, LogIn, LayoutGrid, Search, Play, Clapperboard } from 'lucide-react';
import { detectNetworkSpeed, getOptimizedMediaUrl } from '@/lib/networkUtils';
import AdUnit from '@/components/AdUnit';

export default function MemeReels() {
    const router = useRouter();
    const { user } = useAuth();

    const [memes, setMemes] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [userFavorites, setUserFavorites] = useState([]);
    const [networkSpeed, setNetworkSpeed] = useState('medium');
    const [isMuted, setIsMuted] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [lastDoc, setLastDoc] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    const containerRef = useRef(null);
    const videoRefs = useRef({});
    const tickingRef = useRef(false);
    const lastTapRef = useRef(0);
    const clickTimerRef = useRef(null);

    const [hearts, setHearts] = useState([]); // Array of { id, x, y, rotation }
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Detect network speed
    useEffect(() => {
        const checkSpeed = async () => {
            const speed = await detectNetworkSpeed();
            setNetworkSpeed(speed);
        };
        checkSpeed();
        const interval = setInterval(checkSpeed, 30000);
        return () => clearInterval(interval);
    }, []);

    // Fetch memes
    useEffect(() => {
        const fetchMemes = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, "memes"), orderBy("createdAt", "desc"), limit(50));
                const snapshot = await getDocs(q);
                let rawData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    reactions: doc.data().reactions || { haha: 0 },
                    reactedBy: doc.data().reactedBy || []
                }));

                rawData = rawData.filter(m => m.status === "published" || m.status === "approved");
                rawData = rawData.filter(m => m.media_type === 'video' || m.file_url?.endsWith('.mp4'));

                for (let i = rawData.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [rawData[i], rawData[j]] = [rawData[j], rawData[i]];
                }

                // Smart Transition: Check for Hero Meme ID
                const heroId = sessionStorage.getItem('smart_reel_start_id');
                let heroMeme = null;

                if (heroId) {
                    // Try to finding it in fetched batch first
                    const heroIndex = rawData.findIndex(m => m.id === heroId);
                    if (heroIndex !== -1) {
                        heroMeme = rawData[heroIndex];
                        rawData.splice(heroIndex, 1); // Remove from list
                    } else {
                        // Fetch explicitly if not in batch
                        try {
                            const heroDoc = await getDoc(doc(db, "memes", heroId));
                            if (heroDoc.exists()) {
                                heroMeme = { id: heroDoc.id, ...heroDoc.data(), reactions: heroDoc.data().reactions || { haha: 0 }, reactedBy: heroDoc.data().reactedBy || [] };
                            }
                        } catch (e) { console.error("Error fetching smart start meme", e); }
                    }
                    sessionStorage.removeItem('smart_reel_start_id'); // Clear it
                }

                // Insert Hero Meme at START
                if (heroMeme) {
                    rawData.unshift(heroMeme);
                }

                if (!snapshot.empty) {
                    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
                }

                // Insert Ads
                const finalMemes = [];
                let itemsSinceAd = 0;
                let nextAdGap = Math.floor(Math.random() * 16) + 15;

                rawData.forEach((item) => {
                    finalMemes.push(item);
                    itemsSinceAd++;

                    if (itemsSinceAd >= nextAdGap) {
                        finalMemes.push({
                            id: `ad-initial-${Date.now()}-${finalMemes.length}`,
                            type: 'ad'
                        });
                        itemsSinceAd = 0;
                        nextAdGap = Math.floor(Math.random() * 16) + 15;
                    }
                });

                setMemes(finalMemes);

                // Check for ID in URL params (from search)
                const urlParams = new URLSearchParams(window.location.search);
                const targetId = urlParams.get('id');
                if (targetId) {
                    const targetIndex = rawData.findIndex(m => m.id === targetId);
                    if (targetIndex !== -1) {
                        setCurrentIndex(targetIndex);
                        setTimeout(() => {
                            containerRef.current?.scrollTo({ top: targetIndex * window.innerHeight, behavior: 'smooth' });
                        }, 500);
                    }
                }
            } catch (error) {
                console.error("Error fetching memes:", error);
                toast.error("Failed to load memes");
            } finally {
                setLoading(false);
            }
        };

        fetchMemes();
    }, []);

    // Load more memes for endless scroll
    const loadMoreMemes = async () => {
        if (!lastDoc || loadingMore) return;
        setLoadingMore(true);

        try {
            const nextQuery = query(
                collection(db, "memes"),
                orderBy("createdAt", "desc"),
                startAfter(lastDoc),
                limit(20)
            );
            const snapshot = await getDocs(nextQuery);

            if (!snapshot.empty) {
                let newMemes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    reactions: doc.data().reactions || { haha: 0 },
                    reactedBy: doc.data().reactedBy || []
                }));

                newMemes = newMemes.filter(m => m.status === "published" || m.status === "approved");
                newMemes = newMemes.filter(m => m.media_type === 'video' || m.file_url?.endsWith('.mp4'));

                // Shuffle new batch
                for (let i = newMemes.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [newMemes[i], newMemes[j]] = [newMemes[j], newMemes[i]];
                }

                // Insert Ads into new batch
                const memsWithAds = [];
                let adGap = Math.floor(Math.random() * 16) + 15;
                newMemes.forEach((m, idx) => {
                    memsWithAds.push(m);
                    if ((idx + 1) % adGap === 0) {
                        memsWithAds.push({ id: `ad-${Date.now()}-${idx}`, type: 'ad' });
                        adGap = Math.floor(Math.random() * 16) + 15;
                    }
                });

                setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
                setMemes(prev => [...prev, ...memsWithAds]);
            }
        } catch (error) {
            console.error("Error loading more memes:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    // Trigger load more when approaching end
    useEffect(() => {
        if (memes.length > 0 && currentIndex >= memes.length - 5) {
            loadMoreMemes();
        }
    }, [currentIndex, memes.length]);

    // Filter memes based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = memes.filter(meme =>
            meme.title?.toLowerCase().includes(query) ||
            meme.description?.toLowerCase().includes(query) ||
            meme.uploader_name?.toLowerCase().includes(query) ||
            meme.tags?.some(tag => tag.toLowerCase().includes(query))
        ).slice(0, 6); // Only show 6 results

        setSearchResults(filtered);
    }, [searchQuery, memes]);

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

    // Fetch comments when showing panel
    useEffect(() => {
        if (showComments && memes[currentIndex]) {
            fetchComments(memes[currentIndex].id);
        }
    }, [showComments, currentIndex, memes]);

    const fetchComments = async (memeId) => {
        setLoadingComments(true);
        try {
            const q = query(
                collection(db, "comments"),
                where("memeId", "==", memeId),
                orderBy("createdAt", "desc")
            );
            const snapshot = await getDocs(q);
            const commentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setComments(commentsData);
            console.log('Fetched comments:', commentsData.length);
        } catch (error) {
            console.error("Error fetching comments:", error);
            // If ordering fails, try without ordering
            try {
                const q2 = query(collection(db, "comments"), where("memeId", "==", memeId));
                const snapshot2 = await getDocs(q2);
                const commentsData = snapshot2.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setComments(commentsData);
            } catch (err2) {
                console.error("Error fetching comments (fallback):", err2);
            }
        } finally {
            setLoadingComments(false);
        }
    };

    const handleAddComment = async () => {
        if (!user) return toast.error("Please login to comment!");
        if (!newComment.trim()) return;

        const currentMeme = memes[currentIndex];
        try {
            const commentData = {
                memeId: currentMeme.id,
                userId: user.uid,
                userName: user.displayName || "Anonymous",
                userPhoto: user.photoURL || "",
                text: newComment,
                createdAt: new Date().toISOString(),
                likes: 0,
                replies: []
            };

            if (replyTo) {
                commentData.replyTo = replyTo.id;
                commentData.replyToUser = replyTo.userName;
            }

            const docRef = await addDoc(collection(db, "comments"), commentData);
            console.log('Comment added:', docRef.id);

            // Update comment count on meme
            await updateDoc(doc(db, "memes", currentMeme.id), {
                comments_count: increment(1)
            });

            setNewComment('');
            setReplyTo(null);

            // Add to local state immediately
            setComments(prev => [{ id: docRef.id, ...commentData }, ...prev]);

            toast.success(replyTo ? "Reply added!" : "Comment added!");
        } catch (error) {
            console.error("Error adding comment:", error);
            toast.error("Failed to add comment");
        }
    };

    // Handle Video Click (Single tap Play/Pause, Double tap Like)
    const handleVideoClick = (e, meme) => {
        const now = Date.now();
        const timeSinceLast = now - lastTapRef.current;
        const videoEl = e.target;

        if (timeSinceLast < 300) {
            // DOUBLE TAP
            if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;

            // Only trigger reaction if NOT already reacted (Like only behavior)
            if (!meme.reactedBy?.includes(user?.uid)) {
                handleReaction(e, meme);
            }

            // Spawn Heart at Tap Position
            // Get click coordinates relative to the video container
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const rotation = Math.random() * 40 - 20; // Random rotation -20 to 20 deg

            const newHeart = { id: Date.now(), x, y, rotation };
            setHearts(prev => [...prev, newHeart]);

            // Remove heart after animation (1s)
            setTimeout(() => {
                setHearts(prev => prev.filter(h => h.id !== newHeart.id));
            }, 1000);

            // Also trigger the center pop for extra impact (optional, keeping it for now)
            setPopReaction(meme.id);
            setTimeout(() => setPopReaction(null), 1000);
        } else {
            // SINGLE TAP (Delayed)
            clickTimerRef.current = setTimeout(() => {
                videoEl.paused ? videoEl.play() : videoEl.pause();
                clickTimerRef.current = null;
            }, 300);
        }
        lastTapRef.current = now;
    };

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
            toast.success(isFavorite ? "Removed from favorites" : "Added to favorites ❤️");
        } catch (error) {
            console.error("Error updating favorites:", error);
            setUserFavorites(prev => isFavorite ? [...prev, meme.id] : prev.filter(id => id !== meme.id));
        }
    };

    // Autoplay first video
    useEffect(() => {
        if (memes.length > 0 && videoRefs.current[0]) {
            setTimeout(() => {
                videoRefs.current[0]?.play().catch(e => console.log("Autoplay failed:", e));
            }, 100);
        }
    }, [memes]);

    // Auto play/pause
    useEffect(() => {
        Object.keys(videoRefs.current).forEach((key) => {
            const video = videoRefs.current[key];
            if (video) {
                const videoIndex = parseInt(key);
                if (videoIndex === currentIndex) {
                    if (video.paused) {
                        video.play().catch(e => console.log("Autoplay prevented"));
                    }
                } else {
                    video.pause();
                }
            }
        });
    }, [currentIndex]);

    // Throttled scroll handler
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

    const currentMeme = memes[currentIndex];

    return (
        <div className={`flex h-screen w-screen font-sans overflow-hidden ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* LEFT SIDEBAR - TikTok Style - Responsive Drawer */}
            <div className={`fixed inset-y-0 left-0 z-50 w-[260px] flex-col p-4 transform transition-transform duration-300 md:relative md:translate-x-0 md:w-[240px] md:flex ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} ${isDarkMode ? 'bg-black border-r border-gray-800' : 'bg-white border-r border-gray-200'}`}>
                <div className="flex items-center justify-between mb-6 px-2">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                            <span className="text-xl">😂</span>
                        </div>
                        <h1 className="font-bold text-xl">MemeHub</h1>
                    </Link>
                    {/* Close Button Mobile */}
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-gray-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Search Input - TikTok Style */}
                <div className="mb-4 px-2">
                    <div className="relative">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} pointer-events-none`} size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search"
                            className={`w-full pl-9 pr-3 py-2 rounded-full text-sm focus:outline-none transition ${isDarkMode ? 'bg-gray-900 text-white placeholder-gray-500 focus:bg-gray-800' : 'bg-gray-200 text-black placeholder-gray-500 focus:bg-gray-300'}`}
                        />
                    </div>
                </div>

                {/* Grid/Reel Switcher */}
                <div className="mx-2 mb-6 flex items-center justify-center gap-3 bg-transparent">
                    <Link
                        href="/"
                        className={`p-3 rounded-full transition-all duration-300 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1f1f1f] border border-transparent`}
                        title="Switch to Grid View"
                    >
                        <LayoutGrid size={24} className="stroke-[2px]" />
                    </Link>
                    <Link
                        href="/reels"
                        className={`p-3 rounded-full transition-all duration-300 flex items-center justify-center bg-yellow-400 text-black shadow-xl scale-110 font-bold`}
                        title="Reel View Active"
                    >
                        <Clapperboard size={24} className="stroke-[2.5px] fill-black/10" />
                    </Link>
                </div>

                <nav className="flex flex-col gap-1">
                    <Link href="/reels" className={`flex items-center gap-4 px-4 py-3 rounded-lg font-bold ${isDarkMode ? 'bg-white/10 text-white' : 'bg-black/10 text-black'}`}>
                        <Home size={24} />
                        <span>For You</span>
                    </Link>

                    <Link href="/favorites" className={`flex items-center gap-4 px-4 py-3 rounded-lg transition ${isDarkMode ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-black'}`}>
                        <Bookmark size={24} />
                        <span>Favorites</span>
                    </Link>
                    <Link href="/upload" className={`flex items-center gap-4 px-4 py-3 rounded-lg transition ${isDarkMode ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-black'}`}>
                        <Upload size={24} />
                        <span>Upload</span>
                    </Link>
                    <Link href="/request" className={`flex items-center gap-4 px-4 py-3 rounded-lg transition ${isDarkMode ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-black'}`}>
                        <FileQuestion size={24} />
                        <span>Request Meme</span>
                    </Link>

                    {user ? (
                        <Link href={`/user/${user.uid}`} className={`flex items-center gap-4 px-4 py-3 rounded-lg transition ${isDarkMode ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-black'}`}>
                            <User size={24} />
                            <span>Profile</span>
                        </Link>
                    ) : (
                        <button onClick={() => router.push('/')} className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-[#FE2C55] hover:bg-[#e02649] text-white font-bold rounded-lg transition">
                            <LogIn size={20} />
                            <span>Log in</span>
                        </button>
                    )}

                    {/* Dark/Light Mode Toggle */}
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`flex items-center gap-4 px-4 py-3 rounded-lg transition mt-4 border-t pt-4 ${isDarkMode ? 'hover:bg-white/5 border-gray-800' : 'hover:bg-black/5 border-gray-300'}`}
                    >
                        {isDarkMode ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-blue-600" />}
                        <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                </nav>

                {/* Footer with Social Links */}
                <div className={`mt-auto pt-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-300'}`}>
                    <div className="px-4 mb-4">
                        <p className={`text-xs font-bold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Follow Us</p>
                        <div className="flex gap-2">
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full transition ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'}`}>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                            </a>
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full transition ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'}`}>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                            </a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full transition ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'}`}>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                            </a>
                            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full transition ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/10 hover:bg-black/20'}`}>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
                            </a>
                        </div>
                    </div>
                    <div className={`px-4 py-3 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                        <p>© 2025 MemeHub HQ</p>
                        <p className="mt-1">All rights reserved.</p>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 relative flex flex-col h-full bg-black">
                {/* Mobile Top Header (Title, Search, Switcher) */}
                <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent md:hidden">
                    {/* Title */}
                    <Link href="/" className="font-black text-xl text-white tracking-tighter flex items-center gap-1 shadow-black drop-shadow-md">
                        MemeHub<span className="text-yellow-400">HQ</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        {/* Search Button */}
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className="p-2 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
                        >
                            <Search size={20} />
                        </button>

                        {/* Switcher */}
                        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full p-1">
                            <Link
                                href="/"
                                className="p-1.5 rounded-full text-gray-300 hover:text-white transition-colors"
                            >
                                <LayoutGrid size={18} />
                            </Link>
                            <Link
                                href="/reels"
                                className="p-1.5 rounded-full bg-yellow-400 text-black shadow-lg"
                            >
                                <Clapperboard size={18} />
                            </Link>
                        </div>
                    </div>
                </div>
                {/* Mobile Menu Toggle */}
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="absolute top-4 left-4 z-30 p-2 bg-black/40 backdrop-blur-md rounded-full text-white md:hidden hover:bg-black/60 transition-colors border border-white/10"
                >
                    <Menu size={24} />
                </button>
                {searchQuery ? (
                    <section className="flex-1 overflow-y-auto p-8">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Results for "{searchQuery}"</h2>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-sm text-gray-400 hover:text-white"
                            >
                                Clear Search
                            </button>
                        </div>

                        {searchResults.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
                                <Search size={48} className="mb-4 opacity-50" />
                                <p>No results found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {searchResults.map((meme) => {
                                    const memeIndex = memes.findIndex(m => m.id === meme.id);
                                    return (
                                        <button
                                            key={meme.id}
                                            onClick={() => {
                                                // Construct new feed with clicked meme first, then other results, then randoms
                                                const clickedMeme = meme;
                                                const otherResults = searchResults.filter(m => m.id !== meme.id);
                                                // Get remaining memes that aren't in search results, excluding existing ads
                                                const resultIds = new Set([meme.id, ...otherResults.map(m => m.id)]);
                                                const randomMemes = memes.filter(m => !resultIds.has(m.id) && m.type !== 'ad');

                                                // Combine
                                                let feed = [clickedMeme, ...otherResults, ...randomMemes];

                                                // Insert Ads randomly every 15-30 items
                                                const finalFeed = [];
                                                let itemsSinceAd = 0;
                                                let nextAdGap = Math.floor(Math.random() * 16) + 15; // 15 to 30

                                                feed.forEach((item) => {
                                                    finalFeed.push(item);
                                                    itemsSinceAd++;

                                                    if (itemsSinceAd >= nextAdGap) {
                                                        finalFeed.push({
                                                            id: `ad-${Date.now()}-${finalFeed.length}`,
                                                            type: 'ad'
                                                        });
                                                        itemsSinceAd = 0;
                                                        nextAdGap = Math.floor(Math.random() * 16) + 15;
                                                    }
                                                });

                                                setMemes(finalFeed);
                                                setSearchQuery('');
                                                setCurrentIndex(0);

                                                // Reset scroll immediately
                                                if (containerRef.current) {
                                                    containerRef.current.scrollTop = 0;
                                                }
                                            }}
                                            className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-900 cursor-pointer text-left"
                                        >
                                            <img
                                                src={meme.thumbnail_url || meme.file_url}
                                                alt={meme.title}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
                                            {/* Play Icon / Pop Reaction */}
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                                                {popReaction === meme.id ? (
                                                    <div className="animate-[ping_0.8s_ease-out] fill-mode-forwards">
                                                        <span className="text-9xl drop-shadow-[0_0_25px_rgba(0,0,0,0.5)] filter grayscale-0">😂</span>
                                                    </div>
                                                ) : (
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 p-4 rounded-full backdrop-blur-sm">
                                                        <Play className="w-12 h-12 text-white fill-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                                <p className="font-semibold text-sm line-clamp-1 mb-1">{meme.description || meme.title || 'Untitled'}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-300">
                                                    <div className="flex items-center gap-1">
                                                        <img
                                                            src={meme.uploader_pic || `https://ui-avatars.com/api/?name=${meme.uploader_name || 'U'}`}
                                                            className="w-4 h-4 rounded-full"
                                                            alt=""
                                                        />
                                                        <span className="truncate max-w-[80px]">@{meme.uploader_name}</span>
                                                    </div>
                                                    <span className="flex items-center gap-1">
                                                        <Heart size={10} className="fill-white" /> {meme.reactions?.haha || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                ) : (
                    <div
                        ref={containerRef}
                        className="relative w-full h-full snap-y snap-mandatory overflow-y-scroll scroll-smooth no-scrollbar"
                        onScroll={handleScroll}
                    >
                        {memes.map((meme, index) => {
                            const isActive = index === currentIndex;
                            return (
                                <div key={meme.id} id={`reel-${index}`} className="relative h-full w-full snap-start flex items-center justify-center bg-black">
                                    <div className="relative z-10 h-full w-full max-w-[500px] bg-black shadow-2xl flex flex-col justify-center">

                                        {/* Tap Position Hearts Overlay */}
                                        {hearts.map(heart => (
                                            <div
                                                key={heart.id}
                                                className="absolute pointer-events-none z-50 animate-[ping_0.8s_ease-out] fill-mode-forwards"
                                                style={{
                                                    left: heart.x,
                                                    top: heart.y,
                                                    transform: `translate(-50%, -50%) rotate(${heart.rotation}deg)`
                                                }}
                                            >
                                                <Heart size={100} className="fill-red-500 text-red-500 drop-shadow-2xl" />
                                            </div>
                                        ))}

                                        {/* Play Icon / Pop Reaction */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                                            {popReaction === meme.id ? (
                                                <div className="animate-[ping_0.8s_ease-out] fill-mode-forwards">
                                                    <span className="text-9xl drop-shadow-[0_0_25px_rgba(0,0,0,0.5)] filter grayscale-0">😂</span>
                                                </div>
                                            ) : (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 p-4 rounded-full backdrop-blur-sm">
                                                    <Play className="w-12 h-12 text-white fill-white" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Video Player */}
                                        <video
                                            ref={el => videoRefs.current[index] = el}
                                            src={getOptimizedMediaUrl(meme.file_url, networkSpeed, 'video')}
                                            poster={getOptimizedMediaUrl(meme.thumbnail_url, networkSpeed, 'image')}
                                            preload={index === currentIndex ? "auto" : "metadata"}
                                            className="w-full h-full object-contain"
                                            loop
                                            muted={isMuted}
                                            playsInline
                                            onClick={(e) => handleVideoClick(e, meme)}
                                        />

                                        {/* Mute Button - TOP RIGHT */}
                                        <button
                                            onClick={() => setIsMuted(!isMuted)}
                                            className="absolute top-4 right-4 z-30 p-3 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-all"
                                        >
                                            {isMuted ? (
                                                <VolumeX size={24} className="text-red-400" />
                                            ) : (
                                                <Volume2 size={24} className="text-yellow-400" />
                                            )}
                                        </button>

                                        {/* Bottom Info */}
                                        <div className="absolute bottom-0 left-0 w-full p-4 pb-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-24">
                                            <div className="pr-16">
                                                <Link href={`/user/${meme.uploader_id || meme.userId}`} className="flex items-center gap-2 mb-2 hover:opacity-80 transition cursor-pointer">
                                                    <img
                                                        src={meme.uploader_pic || `https://ui-avatars.com/api/?name=${meme.uploader_name || 'U'}`}
                                                        className="w-8 h-8 rounded-full border-2 border-white"
                                                        alt={meme.uploader_name}
                                                    />
                                                    <h3 className="font-bold text-white">@{meme.uploader_name || 'User'}</h3>
                                                </Link>
                                                <p className="text-sm mb-3 line-clamp-2">{meme.description || meme.title}</p>
                                            </div>
                                        </div>

                                        {/* Action Buttons - RIGHT SIDE (Lowered for thumb reach) */}
                                        <div className="absolute bottom-4 right-2 md:right-[-90px] md:bottom-20 flex flex-col gap-6 items-center z-20">
                                            {/* React */}
                                            <button onClick={(e) => handleReaction(e, meme)} className="flex flex-col items-center gap-1 group/btn">
                                                <div className={`p-2 transition-all duration-300 ${meme.reactedBy?.includes(user?.uid) ? 'scale-125' : 'hover:scale-110 opacity-90 hover:opacity-100'} ${popReaction === meme.id ? 'scale-[1.6] rotate-12 duration-200' : ''}`}>
                                                    <span className={`text-3xl block transition-transform duration-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] ${meme.reactedBy?.includes(user?.uid) ? 'grayscale-0' : 'grayscale group-hover/btn:grayscale-0'}`}>😂</span>
                                                </div>
                                                <span className={`text-xs font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${meme.reactedBy?.includes(user?.uid) ? 'text-yellow-400' : 'text-white'}`}>{meme.reactions?.haha || 0}</span>
                                            </button>

                                            {/* Comments */}
                                            <button onClick={() => setShowComments(!showComments)} className="flex flex-col items-center gap-1 group">
                                                <div className="p-2 transition-transform duration-300 group-hover:scale-110 opacity-95 group-hover:opacity-100">
                                                    <MessageCircle size={32} fill={showComments ? "white" : "white"} className={`drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] ${showComments ? "text-yellow-400 fill-yellow-400" : "text-white"}`} />
                                                </div>
                                                <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{comments.length || 0}</span>
                                            </button>

                                            {/* Favorites */}
                                            <button onClick={(e) => handleFavorite(e, meme)} className="flex flex-col items-center gap-1 group">
                                                <div className="p-2 transition-transform duration-300 group-hover:scale-110 opacity-95 group-hover:opacity-100">
                                                    <Star
                                                        size={32}
                                                        className={`drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] transition-colors ${userFavorites.includes(meme.id) ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Favorite</span>
                                            </button>

                                            {/* Download */}
                                            <button
                                                onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = meme.file_url;
                                                    link.download = `${meme.title || 'meme'}.mp4`;
                                                    link.click();
                                                    toast.success('Downloading...');
                                                }}
                                                className="flex flex-col items-center gap-1 group"
                                            >
                                                <div className="p-2 transition-transform duration-300 group-hover:scale-110 opacity-95 group-hover:opacity-100">
                                                    <Download size={30} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]" />
                                                </div>
                                                <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">DL</span>
                                            </button>

                                            {/* Share */}
                                            <button className="flex flex-col items-center gap-1 group">
                                                <div className="p-2 transition-transform duration-300 group-hover:scale-110 opacity-95 group-hover:opacity-100">
                                                    <Share2 size={30} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]" />
                                                </div>
                                                <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Share</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {/* COMMENTS PANEL - RIGHT SIDE (Responsive Drawer) */}
            {
                showComments && (
                    <>
                        {/* Mobile Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                            onClick={() => setShowComments(false)}
                        />

                        {/* Comments Drawer (Mobile) / Panel (Desktop) */}
                        <div className="fixed inset-x-0 bottom-0 z-50 h-[75vh] w-full rounded-t-3xl border-t border-gray-800 bg-[#0f0f0f] md:bg-black md:static md:h-auto md:w-[400px] md:border-l md:border-t-0 md:rounded-none flex flex-col transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none animate-in slide-in-from-bottom duration-300 md:animate-none">
                            <div className="flex items-center justify-between p-4 border-b border-gray-800 relative">
                                {/* Mobile Drag Handle Visual */}
                                <div className="md:hidden w-12 h-1.5 bg-gray-700 rounded-full absolute left-1/2 -translate-x-1/2 top-3 opacity-50" />

                                <h2 className="font-bold text-lg mt-2 md:mt-0">Comments ({comments.length})</h2>
                                <button onClick={() => setShowComments(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {loadingComments ? (
                                    <div className="text-center py-8">
                                        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    </div>
                                ) : comments.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No comments yet</p>
                                        <p className="text-sm">Be the first to comment!</p>
                                    </div>
                                ) : (
                                    comments.map((comment) => (
                                        <div key={comment.id} className="space-y-2">
                                            <div className="flex gap-3">
                                                <img
                                                    src={comment.userPhoto || `https://ui-avatars.com/api/?name=${comment.userName}`}
                                                    className="w-8 h-8 rounded-full"
                                                    alt={comment.userName}
                                                />
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm">{comment.userName}</p>
                                                    {comment.replyToUser && (
                                                        <p className="text-xs text-gray-500">
                                                            Replying to @{comment.replyToUser}
                                                        </p>
                                                    )}
                                                    <p className="text-sm text-gray-300">{comment.text}</p>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <button
                                                            onClick={() => setReplyTo({ id: comment.id, userName: comment.userName })}
                                                            className="text-xs text-gray-500 hover:text-white"
                                                        >
                                                            Reply
                                                        </button>
                                                        <span className="text-xs text-gray-500">{comment.likes || 0} likes</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Comment Input */}
                            <div className="p-4 border-t border-gray-800">
                                {user ? (
                                    <div className="space-y-2">
                                        {replyTo && (
                                            <div className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg">
                                                <span className="text-xs text-gray-400">
                                                    Replying to <span className="font-bold">@{replyTo.userName}</span>
                                                </span>
                                                <button
                                                    onClick={() => setReplyTo(null)}
                                                    className="text-gray-500 hover:text-white"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                                                placeholder={replyTo ? `Reply to @${replyTo.userName}...` : "Add a comment..."}
                                                className="flex-1 bg-white/10 border border-gray-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-yellow-400"
                                            />
                                            <button
                                                onClick={handleAddComment}
                                                className="p-2 bg-yellow-400 hover:bg-yellow-500 rounded-full transition"
                                            >
                                                <Send size={20} className="text-black" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => router.push('/')} className="w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-full">
                                        Log in to comment
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )
            }
        </div >
    );
}
