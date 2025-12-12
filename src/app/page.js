"use client";

import Link from "next/link";

import { TrendingUp, Smile, Video, Music, Sparkles, Download, Share2, Clock, Eye, X, Play, Trash2, MoreVertical, Edit2, Plus, Check, ShieldAlert, Star, ListPlus, CheckSquare, Square, Clapperboard } from "lucide-react";
import { useEffect, useState, Suspense, useRef, useCallback, Fragment } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, limit, getDocs, updateDoc, doc, increment, arrayUnion, arrayRemove, deleteDoc, setDoc, getDoc, orderBy, startAfter } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useDownloadList } from "@/context/DownloadContext";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import AdUnit from "@/components/AdUnit";
import HeroSection from "@/components/HeroSection";
import MemeGridItem from "@/components/MemeGridItem";


// 🔴 ADMIN UIDS
const ADMIN_IDS = ["VZCDwbnsLxcLdEcjabk8wK0pEv33"];
const CLOUD_NAME = "ds6pks59z";
const UPLOAD_PRESET = "memehub_upload";

// Helper for relative time
function timeAgo(timestamp) {
    if (!timestamp) return "Just now";
    const seconds = Math.floor((new Date() - timestamp.toDate()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

function CategoryBtn({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition-all active:scale-95 border whitespace-nowrap ${active
                ? "bg-black dark:bg-white text-white dark:text-black border-transparent shadow-lg scale-105"
                : "bg-white dark:bg-[#151515] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#202020]"
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

function HomeContent() {
    const { user, googleLogin } = useAuth();
    const router = useRouter();
    const { addToDownloadList, removeFromDownloadList, isInDownloadList, downloadList, clearDownloadList } = useDownloadList();
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('search')?.toLowerCase() || "";

    const [memes, setMemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState("all");
    const [sortBy, setSortBy] = useState("newest"); // newest, oldest, popular, a_z, downloads, reacted
    const [selectedMeme, setSelectedMeme] = useState(null);
    const [userFavorites, setUserFavorites] = useState([]);

    // Fetch User Favorites
    useEffect(() => {
        if (user) {
            const fetchFavorites = async () => {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    setUserFavorites(userDoc.data().favorites || []);
                }
            };
            fetchFavorites();
        } else {
            setUserFavorites([]);
        }
    }, [user]);

    // Auto-open meme from shared link
    useEffect(() => {
        const memeId = searchParams.get('meme');
        if (memeId && memes.length > 0 && !selectedMeme) {
            const meme = memes.find(m => m.id === memeId);
            if (meme) {
                openMeme(meme);
            } else {
                // If meme not in current list, fetch it from Firebase
                const fetchMeme = async () => {
                    try {
                        const memeDoc = await getDoc(doc(db, "memes", memeId));
                        if (memeDoc.exists()) {
                            const memeData = { id: memeDoc.id, ...memeDoc.data() };
                            openMeme(memeData);
                        }
                    } catch (error) {
                        console.error("Error fetching shared meme:", error);
                    }
                };
                fetchMeme();
            }
        }
    }, [searchParams, memes]);

    // Ad & Download Logic State
    const [downloadUnlocked, setDownloadUnlocked] = useState(false);
    const [downloadTimer, setDownloadTimer] = useState(3);
    const [showAdInterstitial, setShowAdInterstitial] = useState(false);
    const [interstitialTimer, setInterstitialTimer] = useState(5); // Default 5 sec for card downloads
    const [pendingDownload, setPendingDownload] = useState(null);
    const [downloadSource, setDownloadSource] = useState(""); // "preview", "card", "downloadAll"

    // Edit & Menu State
    const [openMenuId, setOpenMenuId] = useState(null);
    const [editingMeme, setEditingMeme] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [newThumbnail, setNewThumbnail] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);
    const [saving, setSaving] = useState(false);

    // Category & Language Management
    const [categories, setCategories] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [newCategory, setNewCategory] = useState("");
    const [newLanguage, setNewLanguage] = useState("");
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [isAddingLanguage, setIsAddingLanguage] = useState(false);

    // Admin bulk delete states
    const [selectedMemes, setSelectedMemes] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [editingQueue, setEditingQueue] = useState([]);

    // Pagination states
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Ref for infinite scroll observer
    const loadMoreRef = useRef(null);


    const isAdmin = user?.uid === ADMIN_IDS[0];

    // Check if user can delete
    const canDelete = (meme) => {
        if (!user) return false;
        if (ADMIN_IDS.includes(user.uid)) return true;
        if (meme.uploader_id === user.uid) {
            const oneHour = 60 * 60 * 1000;
            const isRecent = (new Date() - meme.createdAt?.toDate()) < oneHour;
            return isRecent;
        }
        return false;
    };

    // Fetch Categories & Languages
    useEffect(() => {
        const fetchCategoriesAndLanguages = async () => {
            try {
                const catDoc = await getDoc(doc(db, "settings", "categories"));
                if (catDoc.exists()) {
                    setCategories(catDoc.data().list || []);
                } else {
                    setCategories(["reaction", "trending", "animal", "work", "sports", "coding", "crypto", "gaming"]);
                }

                const langDoc = await getDoc(doc(db, "settings", "languages"));
                if (langDoc.exists()) {
                    setLanguages(langDoc.data().list || []);
                } else {
                    setLanguages(["english", "nepali", "hindi"]);
                }
            } catch (err) {
                console.error("Error fetching categories/languages:", err);
            }
        };

        fetchCategoriesAndLanguages();
    }, []);

    const addCategory = async () => {
        const trimmed = newCategory.trim().toLowerCase();
        if (!trimmed) return toast.error("Category name cannot be empty");
        if (categories.includes(trimmed)) return toast.error("Category already exists");

        setIsAddingCategory(true);
        try {
            const updatedCategories = [...categories, trimmed];
            await setDoc(doc(db, "settings", "categories"), { list: updatedCategories });
            setCategories(updatedCategories);
            setNewCategory("");
            toast.success(`Category "${trimmed}" added!`);
        } catch (err) {
            toast.error("Failed to add category");
        } finally {
            setIsAddingCategory(false);
        }
    };

    const deleteCategory = async (categoryToDelete) => {
        if (!confirm(`Delete category "${categoryToDelete}"?`)) return;
        try {
            const updatedCategories = categories.filter(cat => cat !== categoryToDelete);
            await setDoc(doc(db, "settings", "categories"), { list: updatedCategories });
            setCategories(updatedCategories);
            toast.success(`Category "${categoryToDelete}" deleted!`);
        } catch (err) {
            toast.error("Failed to delete category");
        }
    };

    const addLanguage = async () => {
        const trimmed = newLanguage.trim().toLowerCase();
        if (!trimmed) return toast.error("Language name cannot be empty");
        if (languages.includes(trimmed)) return toast.error("Language already exists");

        setIsAddingLanguage(true);
        try {
            const updatedLanguages = [...languages, trimmed];
            await setDoc(doc(db, "settings", "languages"), { list: updatedLanguages });
            setLanguages(updatedLanguages);
            setNewLanguage("");
            toast.success(`Language "${trimmed}" added!`);
        } catch (err) {
            toast.error("Failed to add language");
        } finally {
            setIsAddingLanguage(false);
        }
    };

    const deleteLanguage = async (languageToDelete) => {
        if (!confirm(`Delete language "${languageToDelete}"?`)) return;
        try {
            const updatedLanguages = languages.filter(lang => lang !== languageToDelete);
            await setDoc(doc(db, "settings", "languages"), { list: updatedLanguages });
            setLanguages(updatedLanguages);
            toast.success(`Language "${languageToDelete}" deleted!`);
        } catch (err) {
            toast.error("Failed to delete language");
        }
    };

    const paramCategory = searchParams.get('category');
    const paramLanguage = searchParams.get('language');
    const paramDate = searchParams.get('date');
    const paramType = searchParams.get('type');

    // 🟢 AD & DOWNLOAD LOGIC EFFECTS

    // Unlock download button timer
    useEffect(() => {
        let interval;
        if (selectedMeme && !downloadUnlocked && downloadTimer > 0) {
            interval = setInterval(() => {
                setDownloadTimer((prev) => prev - 1);
            }, 1000);
        } else if (downloadTimer === 0) {
            setDownloadUnlocked(true);
        }
        return () => clearInterval(interval);
    }, [selectedMeme, downloadUnlocked, downloadTimer]);

    // Reset timer when modal opens
    useEffect(() => {
        if (selectedMeme) {
            setDownloadUnlocked(false);
            setDownloadTimer(3);
        }
    }, [selectedMeme]);

    // Interstitial timer
    useEffect(() => {
        let interval;
        if (showAdInterstitial && interstitialTimer > 0) {
            interval = setInterval(() => {
                setInterstitialTimer((prev) => prev - 1);
            }, 1000);
        } else if (interstitialTimer === 0 && showAdInterstitial && pendingDownload) {
            // Timer finished, trigger download
            handleRealDownload({ stopPropagation: () => { } }, pendingDownload.id, pendingDownload.url, pendingDownload.title);
            setShowAdInterstitial(false);
            setPendingDownload(null);
            setInterstitialTimer(15); // Reset for next time
        }
        return () => clearInterval(interval);
    }, [showAdInterstitial, interstitialTimer, pendingDownload]);



    // Sync URL param with activeCategory state
    useEffect(() => {
        if (paramCategory && ["trending", "recent", "most_downloaded", "viral", "image", "video", "audio", "all"].includes(paramCategory)) {
            setActiveCategory(paramCategory);
        }
    }, [paramCategory]);

    // Fetch Memes (Initial Load)
    useEffect(() => {
        const fetchMemes = async () => {
            setLoading(true);
            setMemes([]);
            setHasMore(true);

            try {
                const ITEMS_PER_PAGE = 25;

                // Determine Sort Field and Direction
                let sortField = "createdAt";
                let sortDir = "desc";

                if (sortBy === "oldest") { sortDir = "asc"; }
                else if (sortBy === "popular") { sortField = "views"; sortDir = "desc"; }
                else if (sortBy === "a_z") { sortField = "title"; sortDir = "asc"; }
                else if (sortBy === "downloads") { sortField = "downloads"; sortDir = "desc"; }
                else if (sortBy === "reacted") { sortField = "reactions.haha"; sortDir = "desc"; }

                // STRATEGY: Query by Sort Field ONLY (no composite index needed)
                // We filter for "published" status in the client
                let q = query(
                    collection(db, "memes"),
                    orderBy(sortField, sortDir),
                    limit(ITEMS_PER_PAGE)
                );

                const snapshot = await getDocs(q);
                let allFetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Client-side filter for published memes
                let fetchedMemes = allFetched.filter(m => m.status === "published");

                // Set pagination cursor (based on the raw snapshot, not filtered)
                const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                setLastVisible(lastDoc);
                setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);

                // 1. Search Filtering
                if (searchQuery) {
                    fetchedMemes = fetchedMemes.filter(m =>
                        m.title?.toLowerCase().includes(searchQuery) ||
                        m.tags?.some(tag => tag.toLowerCase().includes(searchQuery))
                    );
                }

                // 2. Navbar Filters (URL Params)
                const isSpecialCategory = ["trending", "recent", "most_downloaded", "viral", "image", "video", "audio", "all"].includes(paramCategory);

                if (paramCategory && !isSpecialCategory) {
                    fetchedMemes = fetchedMemes.filter(m => m.category === paramCategory);
                }
                if (paramLanguage) {
                    fetchedMemes = fetchedMemes.filter(m => m.language === paramLanguage);
                }
                if (paramType && paramType !== "all") {
                    if (paramType === "audio") {
                        fetchedMemes = fetchedMemes.filter(m => m.media_type === "raw" || m.media_type === "audio" || m.file_url.endsWith(".mp3"));
                    } else {
                        fetchedMemes = fetchedMemes.filter(m => m.media_type === paramType);
                    }
                }
                if (paramDate && paramDate !== "all") {
                    const now = new Date();
                    fetchedMemes = fetchedMemes.filter(m => {
                        const createdAt = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
                        const diffSeconds = (now - createdAt) / 1000;

                        if (paramDate === "1h") return diffSeconds < 3600;
                        if (paramDate === "today") return diffSeconds < 86400;
                        if (paramDate === "week") return diffSeconds < 604800;
                        if (paramDate === "month") return diffSeconds < 2592000;
                        if (paramDate === "year") return diffSeconds < 31536000;
                        return true;
                    });
                }

                // 3. Category Tabs Logic (Sorting & Pre-sets)
                // 3. Category Tabs Logic (Filters Only)
                if (activeCategory === "trending") {
                    const twoDaysAgo = new Date();
                    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
                    fetchedMemes = fetchedMemes.filter(m => m.createdAt?.toDate() > twoDaysAgo);
                } else if (activeCategory === "image") {
                    fetchedMemes = fetchedMemes.filter(m => m.media_type === "image");
                } else if (activeCategory === "video") {
                    fetchedMemes = fetchedMemes.filter(m => m.media_type === "video");
                } else if (activeCategory === "audio") {
                    fetchedMemes = fetchedMemes.filter(m => m.media_type === "raw" || m.media_type === "audio" || m.file_url.endsWith(".mp3"));
                }

                // 4. Sorting Logic
                if (sortBy === "newest") {
                    // Default behavior: adhere to category presets
                    if (activeCategory === "trending") {
                        fetchedMemes.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
                    } else if (activeCategory === "most_downloaded") {
                        fetchedMemes.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
                    } else if (activeCategory === "viral") {
                        fetchedMemes.sort((a, b) => (b.reactions?.haha || 0) - (a.reactions?.haha || 0));
                    } else {
                        fetchedMemes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    }
                } else if (sortBy === "a_z") {
                    fetchedMemes.sort((a, b) => (a.title || "").toLowerCase().localeCompare((b.title || "").toLowerCase()));
                }
                // For other sort options (A-Z, Popular, etc.), we rely PURELY on Firestore order
                // to ensure pagination works correctly across the entire database.

                setMemes(fetchedMemes);
            } catch (error) {
                console.error("Error fetching memes:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMemes();
    }, [activeCategory, searchQuery, paramCategory, paramLanguage, paramDate, paramType, sortBy]);

    // Load More Memes (Pagination)
    const loadMoreMemes = useCallback(async () => {
        if (!lastVisible || !hasMore || loadingMore) return;

        setLoadingMore(true);
        try {
            const ITEMS_PER_PAGE = 25;

            // Determine Sort Field and Direction
            let sortField = "createdAt";
            let sortDir = "desc";

            if (sortBy === "oldest") { sortDir = "asc"; }
            else if (sortBy === "popular") { sortField = "views"; sortDir = "desc"; }
            else if (sortBy === "a_z") { sortField = "title"; sortDir = "asc"; }
            else if (sortBy === "downloads") { sortField = "downloads"; sortDir = "desc"; }
            else if (sortBy === "reacted") { sortField = "reactions.haha"; sortDir = "desc"; }

            let q = query(
                collection(db, "memes"),
                orderBy(sortField, sortDir),
                startAfter(lastVisible),
                limit(ITEMS_PER_PAGE)
            );

            const snapshot = await getDocs(q);
            let allFetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Client-side filter
            let fetchedMemes = allFetched.filter(m => m.status === "published");

            // Update pagination cursor
            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            setLastVisible(lastDoc);
            setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);

            // Apply same filters as initial load
            if (searchQuery) {
                fetchedMemes = fetchedMemes.filter(m =>
                    m.title?.toLowerCase().includes(searchQuery) ||
                    m.tags?.some(tag => tag.toLowerCase().includes(searchQuery))
                );
            }

            const isSpecialCategory = ["trending", "recent", "most_downloaded", "viral", "image", "video", "audio", "all"].includes(paramCategory);

            if (paramCategory && !isSpecialCategory) {
                fetchedMemes = fetchedMemes.filter(m => m.category === paramCategory);
            }
            if (paramLanguage) {
                fetchedMemes = fetchedMemes.filter(m => m.language === paramLanguage);
            }
            if (paramType && paramType !== "all") {
                if (paramType === "audio") {
                    fetchedMemes = fetchedMemes.filter(m => m.media_type === "raw" || m.media_type === "audio" || m.file_url.endsWith(".mp3"));
                } else {
                    fetchedMemes = fetchedMemes.filter(m => m.media_type === paramType);
                }
            }
            if (paramDate && paramDate !== "all") {
                const now = new Date();
                fetchedMemes = fetchedMemes.filter(m => {
                    if (!m.createdAt) return false;
                    const createdAt = m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
                    const diffSeconds = (now - createdAt) / 1000;

                    if (paramDate === "1h") return diffSeconds < 3600;
                    if (paramDate === "today") return diffSeconds < 86400;
                    if (paramDate === "week") return diffSeconds < 604800;
                    if (paramDate === "month") return diffSeconds < 2592000;
                    if (paramDate === "year") return diffSeconds < 31536000;
                    return true;
                });
            }

            // Apply category sorting
            // Apply category sorting (Filters Only)
            if (activeCategory === "trending") {
                const twoDaysAgo = new Date();
                twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);
                fetchedMemes = fetchedMemes.filter(m => m.createdAt?.toDate() > twoDaysAgo);
            } else if (activeCategory === "image") {
                fetchedMemes = fetchedMemes.filter(m => m.media_type === "image");
            } else if (activeCategory === "video") {
                fetchedMemes = fetchedMemes.filter(m => m.media_type === "video");
            } else if (activeCategory === "audio") {
                fetchedMemes = fetchedMemes.filter(m => m.media_type === "raw" || m.media_type === "audio" || m.file_url.endsWith(".mp3"));
            }

            // Sorting Logic
            if (sortBy === "newest") {
                // Default behavior: adhere to category presets
                if (activeCategory === "trending") {
                    fetchedMemes.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
                } else if (activeCategory === "most_downloaded") {
                    fetchedMemes.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
                } else if (activeCategory === "viral") {
                    fetchedMemes.sort((a, b) => (b.reactions?.haha || 0) - (a.reactions?.haha || 0));
                } else {
                    fetchedMemes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                }
            }
            // For other sort options, rely on Firestore order

            // Append to existing memes
            setMemes(prev => [...prev, ...fetchedMemes]);
        } catch (error) {
            console.error("Error loading more memes:", error);
        } finally {
            setLoadingMore(false);
        }
    }, [lastVisible, hasMore, loadingMore, sortBy, activeCategory, paramCategory, paramLanguage, paramType, paramDate, searchQuery]);

    // Intersection Observer for automatic infinite scroll
    // Intersection Observer removed for manual load more


    // Handle Reaction
    const handleReaction = async (e, meme) => {
        e.stopPropagation();
        if (!user) return toast.error("Please login to react!");

        const hasReacted = meme.reactedBy?.includes(user.uid);
        const memeRef = doc(db, "memes", meme.id);

        // Optimistic Update
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

        // Update selectedMeme if open
        if (selectedMeme && selectedMeme.id === meme.id) {
            setSelectedMeme(prev => ({
                ...prev,
                reactions: { ...prev.reactions, haha: (prev.reactions?.haha || 0) + (hasReacted ? -1 : 1) },
                reactedBy: hasReacted
                    ? (prev.reactedBy || []).filter(id => id !== user.uid)
                    : [...(prev.reactedBy || []), user.uid]
            }));
        }

        // DB Update
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
    };

    // Handle Favorite
    const handleFavorite = async (e, meme) => {
        e.stopPropagation();
        if (!user) return toast.error("Please login to favorite!");

        const isFavorite = userFavorites.includes(meme.id);
        const userRef = doc(db, "users", user.uid);

        // Optimistic Update
        setUserFavorites(prev => isFavorite ? prev.filter(id => id !== meme.id) : [...prev, meme.id]);

        try {
            await setDoc(userRef, {
                favorites: isFavorite ? arrayRemove(meme.id) : arrayUnion(meme.id)
            }, { merge: true });
            toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
        } catch (error) {
            console.error("Error updating favorites:", error);
            toast.error("Failed to update favorites");
            // Revert optimistic update
            setUserFavorites(prev => isFavorite ? [...prev, meme.id] : prev.filter(id => id !== meme.id));
        }
    };

    // Handle Share
    const handleShare = async (e, meme) => {
        e.stopPropagation();
        const shareData = {
            title: meme.title,
            text: `Check out this meme on MemeHub HQ: ${meme.title}`,
            url: window.location.origin + `/meme/${meme.id}`
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                toast.success("Link copied to clipboard!");
            }
        } catch (err) {
            console.error("Share failed:", err);
        }
    };

    // Wrapper to handle Ad Interstitial
    const handleDownload = (e, memeId, url, filename, source = "card") => {
        e.stopPropagation();

        // If in modal and locked, do nothing
        if (selectedMeme && !downloadUnlocked) {
            toast("Please wait for download to unlock...", { icon: "⏳" });
            return;
        }

        // Preview modal download - NO interstitial, direct download
        if (source === "preview") {
            handleRealDownload(e, memeId, url, filename);
            return;
        }

        // Card download - 5 second interstitial
        setDownloadSource(source);
        setPendingDownload({ id: memeId, url, title: filename });
        setShowAdInterstitial(true);
        setInterstitialTimer(5);
    };

    // Handle Download (Real)
    const handleRealDownload = async (e, memeId, url, filename) => {
        e.stopPropagation();

        try {
            const memeRef = doc(db, "memes", memeId);
            await updateDoc(memeRef, { downloads: increment(1) });
            setMemes(prev => prev.map(m => m.id === memeId ? { ...m, downloads: (m.downloads || 0) + 1 } : m));

            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            // Use the passed filename which might include "(Audio)" or "(Video Only)" hints
            let finalFilename = filename ? `${filename}.${url.split('.').pop()}` : `memehub-${memeId}.${url.split('.').pop()}`;

            // Check if user requested Audio Only
            if (filename && filename.includes("(Audio)")) {
                finalFilename = `${filename}.mp3`;
            }

            link.download = finalFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast.success("Download started!");
        } catch (error) {
            console.error("Download failed:", error);
            window.open(url, '_blank');
        }
    };

    // Handle Delete
    const handleDelete = async (e, meme) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this meme?")) return;
        try {
            await deleteDoc(doc(db, "memes", meme.id));
            setMemes(prev => prev.filter(m => m.id !== meme.id));
            if (selectedMeme?.id === meme.id) setSelectedMeme(null);
            toast.success("Meme deleted");

        } catch (error) {
            toast.error("Failed to delete meme");
        }
    };

    const openMeme = (meme) => {
        router.push(`/meme/${meme.id}`);
    };

    const [newClipFile, setNewClipFile] = useState(null); // State for new clip file

    // Edit Functions
    const openEditModal = (meme) => {
        setEditingMeme(meme);
        setEditForm({
            title: meme.title,
            category: meme.category,
            language: meme.language,
            thumbnail_url: meme.thumbnail_url || "",
            credit: meme.credit || ""
        });
        setNewThumbnail(null);
        setThumbnailPreview(null);
        setNewClipFile(null); // Reset clip file
    };

    const handleClipChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        setNewClipFile(selected);
    };

    const handleThumbnailChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        setNewThumbnail(selected);
        setThumbnailPreview(URL.createObjectURL(selected));
    };

    const saveEdits = async () => {
        if (!editForm.title.trim()) return toast.error("Title cannot be empty");
        setSaving(true);
        const toastId = toast.loading("Saving changes...");
        try {
            let thumbnailUrl = editForm.thumbnail_url;
            if (newThumbnail) {
                const thumbFormData = new FormData();
                thumbFormData.append("file", newThumbnail);
                thumbFormData.append("upload_preset", UPLOAD_PRESET);
                const thumbRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: thumbFormData });
                const thumbData = await thumbRes.json();
                if (thumbData.secure_url) thumbnailUrl = thumbData.secure_url;
            }

            // HANDLE CLIP RE-UPLOAD (ADMIN ONLY)
            let newFileUrl = null;
            let newMediaType = null;
            let newFormat = null;

            if (newClipFile) {
                toast.loading("Uploading new clip...", { id: toastId });
                const clipFormData = new FormData();
                clipFormData.append("file", newClipFile);
                clipFormData.append("upload_preset", UPLOAD_PRESET);

                // Determine resource type
                const isVideo = newClipFile.type.startsWith("video");
                const isAudio = newClipFile.type.startsWith("audio");
                const resourceType = isVideo ? "video" : (isAudio ? "video" : "image"); // Cloudinary treats audio as video usually

                const clipRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, { method: "POST", body: clipFormData });
                const clipData = await clipRes.json();

                if (clipData.secure_url) {
                    newFileUrl = clipData.secure_url;
                    newMediaType = isVideo ? "video" : (isAudio ? "audio" : "image");
                    newFormat = clipData.format;
                }
            }

            const updateData = {
                title: editForm.title,
                category: editForm.category,
                language: editForm.language,
                thumbnail_url: thumbnailUrl,
                credit: editForm.credit || null,
                tags: editForm.title.toLowerCase().split(" ")
            };

            // Only update file details if a new clip was uploaded
            if (newFileUrl) {
                updateData.file_url = newFileUrl;
                updateData.media_type = newMediaType;
                updateData.file_format = newFormat; // Update format just in case
            }

            await updateDoc(doc(db, "memes", editingMeme.id), updateData);
            setMemes(prev => prev.map(m => m.id === editingMeme.id ? { ...m, ...editForm, thumbnail_url: thumbnailUrl, credit: editForm.credit || null } : m));
            toast.success("Changes saved!", { id: toastId });

            // Handle Bulk Edit Queue
            if (editingQueue.length > 0) {
                const nextQueue = editingQueue.slice(1);
                setEditingQueue(nextQueue);

                if (nextQueue.length > 0) {
                    const nextMeme = nextQueue[0];
                    setEditingMeme(nextMeme);
                    setEditForm({
                        title: nextMeme.title,
                        category: nextMeme.category,
                        language: nextMeme.language,
                        thumbnail_url: nextMeme.thumbnail_url || "",
                        credit: nextMeme.credit || ""
                    });
                    setNewThumbnail(null);
                    setThumbnailPreview(null);
                    toast("Opening next meme...", { icon: "➡️" });
                } else {
                    setEditingMeme(null);
                    toast.success("All selected memes edited!");
                    setIsSelectionMode(false);
                    setSelectedMemes([]);
                }
            } else {
                setEditingMeme(null);
            }
        } catch (error) {
            toast.error("Failed to save changes", { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    // Admin Bulk Delete Functions
    const toggleMemeSelection = (memeId) => {
        setSelectedMemes(prev =>
            prev.includes(memeId)
                ? prev.filter(id => id !== memeId)
                : [...prev, memeId]
        );
    };

    const verifyAdminPassword = () => {
        const password = prompt("⚠️ ADMIN ACTION REQUIRED\n\nEnter admin password to continue:");
        return password === "1122";
    };

    const handleBulkDelete = async () => {
        if (selectedMemes.length === 0) {
            return toast.error("No memes selected");
        }

        if (!verifyAdminPassword()) {
            return toast.error("Incorrect password");
        }

        const confirmMsg = `Are you sure you want to DELETE ${selectedMemes.length} selected meme(s)?\n\nThis action cannot be undone.`;
        if (!confirm(confirmMsg)) return;

        const toastId = toast.loading(`Deleting ${selectedMemes.length} memes...`);

        try {
            // Delete from Firestore
            await Promise.all(selectedMemes.map(id => deleteDoc(doc(db, "memes", id))));

            // Update local state
            setMemes(prev => prev.filter(m => !selectedMemes.includes(m.id)));
            setSelectedMemes([]);
            setIsSelectionMode(false);

            toast.success(`Successfully deleted ${selectedMemes.length} meme(s)`, { id: toastId });
        } catch (error) {
            console.error("Bulk delete error:", error);
            toast.error("Failed to delete some memes", { id: toastId });
        }
    };

    const handleDeleteAll = async () => {
        if (memes.length === 0) {
            return toast.error("No memes to delete");
        }

        if (!verifyAdminPassword()) {
            return toast.error("Incorrect password");
        }

        const confirmMsg = `⚠️ EXTREME CAUTION ⚠️\n\nYou are about to DELETE ALL ${memes.length} memes from the website!\n\nThis action CANNOT be undone.\n\nType 'DELETE ALL' to confirm:`;
        const userInput = prompt(confirmMsg);

        if (userInput !== "DELETE ALL") {
            return toast.error("Deletion cancelled");
        }

        const toastId = toast.loading(`Deleting all ${memes.length} memes...`);

        try {
            // Delete all memes from Firestore
            await Promise.all(memes.map(m => deleteDoc(doc(db, "memes", m.id))));

            // Clear local state
            setMemes([]);
            setSelectedMemes([]);
            setIsSelectionMode(false);

            toast.success(`Successfully deleted all ${memes.length} memes`, { id: toastId });
        } catch (error) {
            console.error("Delete all error:", error);
            toast.error("Failed to delete all memes", { id: toastId });
        }
    };

    // Admin Selection Handlers
    const handleSelectAll = () => {
        const allIds = memes.map(m => m.id);
        setSelectedMemes(allIds);
        toast.success(`Selected all ${allIds.length} loaded memes`);
    };

    const handleUnselectAll = () => {
        setSelectedMemes([]);
        toast.success("Selection cleared");
    };

    const handleEditSelected = () => {
        if (selectedMemes.length === 0) return toast.error("No memes selected");
        const queue = memes.filter(m => selectedMemes.includes(m.id));
        setEditingQueue(queue);
        openEditModal(queue[0]);
        toast("Starting bulk edit mode...", { icon: "📝" });
    };

    // Generate display items with ads
    const getDisplayItems = (memes) => {
        const items = [];
        memes.forEach((meme, index) => {
            items.push({ type: "meme", data: meme });
            // Insert ad after every 5th meme
            if ((index + 1) % 5 === 0) {
                items.push({ type: "ad", id: `ad-${index}` });
            }
        });
        return items;
    };

    // Client-side visual sort override for Case Insensitive A-Z
    const getSortedMemes = () => {
        if (sortBy === "a_z") {
            return [...memes].sort((a, b) => (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: 'base' }));
        }
        return memes;
    };

    const displayItems = getDisplayItems(getSortedMemes());

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-black dark:text-white pb-20">
            {/* 1. HERO SECTION */}
            {/* 1. HERO SECTION (Dynamic) */}
            <HeroSection
                user={user}
                googleLogin={googleLogin}
                router={router}
                memes={memes}
                openMeme={openMeme}
            />

            {/* 2. ACTIONS & ADS ROW */}

            <div id="hero-actions" className="w-full max-w-[1600px] mx-auto px-4 py-8 flex items-center justify-center relative z-20 bg-white dark:bg-[#050505]">
                <div className="w-full max-w-[728px]">
                    <div className="w-full scale-100 shadow-xl rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                        <AdUnit type="banner" />
                    </div>
                </div>
            </div>

            <div id="explore" className="max-w-7xl mx-auto px-4">
                {/* 2. CATEGORY TABS */}
                <div className="flex flex-col gap-4 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                            <TrendingUp className="text-yellow-400" /> {activeCategory === 'all' ? 'All Memes' : activeCategory === 'trending' ? 'Trending (Last 48h)' : activeCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h2>

                        {/* SORT DROPDOWN */}
                        <div className="flex items-center gap-2 bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-full px-4 py-2">
                            <span className="text-sm text-gray-500 font-medium">Sort by:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm font-bold text-gray-800 dark:text-white cursor-pointer"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="popular">Most Popular</option>
                                <option value="downloads">Most Downloaded</option>
                                <option value="reacted">Most Reacted</option>
                                <option value="a_z">A-Z</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex overflow-x-auto pb-2 -mx-4 px-4 gap-3 md:flex-wrap md:overflow-visible md:mx-0 md:px-0 scrollbar-hide snap-x">
                        <CategoryBtn icon={<Sparkles size={16} />} label="All" active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} />
                        <CategoryBtn icon={<TrendingUp size={16} />} label="Trending" active={activeCategory === 'trending'} onClick={() => setActiveCategory('trending')} />
                        <CategoryBtn icon={<Clock size={16} />} label="Recent" active={activeCategory === 'recent'} onClick={() => setActiveCategory('recent')} />
                        <CategoryBtn icon={<Download size={16} />} label="Popular" active={activeCategory === 'most_downloaded'} onClick={() => setActiveCategory('most_downloaded')} />
                        <CategoryBtn icon={<Smile size={16} />} label="Images" active={activeCategory === 'image'} onClick={() => setActiveCategory('image')} />
                        <CategoryBtn icon={<Video size={16} />} label="Videos" active={activeCategory === 'video'} onClick={() => setActiveCategory('video')} />
                        <CategoryBtn icon={<Music size={16} />} label="Audio" active={activeCategory === 'audio'} onClick={() => setActiveCategory('audio')} />
                    </div>
                </div>

                {/* 3. MEME GRID WITH ADS */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                            <div key={item} className="aspect-[4/3] bg-gray-100 dark:bg-[#1a1a1a] rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : memes.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-[#222]">
                        <h2 className="text-2xl font-bold text-gray-400">No memes found 😢</h2>
                        <p className="text-gray-500">Be the first to upload one!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {displayItems.map((item, idx) => (
                            item.type === 'ad' ? (
                                <div key={item.id} className="bg-gray-100 dark:bg-[#1a1a1a] rounded-2xl overflow-hidden border border-gray-100 dark:border-[#252525] flex items-center justify-center h-full aspect-[4/5]">
                                    <AdUnit type="native" />
                                </div>
                            ) : (
                                <MemeGridItem
                                    key={item.data.id}
                                    meme={item.data}
                                    user={user}
                                    isAdmin={ADMIN_IDS.includes(user?.uid)}
                                    isSelectionMode={isSelectionMode}
                                    selectedMemes={selectedMemes}
                                    openMeme={openMeme}
                                    toggleMemeSelection={toggleMemeSelection}
                                    handleReaction={handleReaction}
                                    handleDownload={handleDownload}
                                    handleShare={handleShare}
                                    handleFavorite={handleFavorite}
                                    addToDownloadList={addToDownloadList}
                                    removeFromDownloadList={removeFromDownloadList}
                                    isInDownloadList={isInDownloadList}
                                    userFavorites={userFavorites}
                                    canDelete={canDelete}
                                    openMenuId={openMenuId}
                                    setOpenMenuId={setOpenMenuId}
                                    openEditModal={openEditModal}
                                    handleDelete={handleDelete}
                                />
                            )
                        ))}
                    </div>
                )}

                {/* LOAD MORE BUTTON */}
                {!loading && memes.length > 0 && hasMore && (
                    <div ref={loadMoreRef} className="mt-12 flex justify-center">
                        <button
                            onClick={loadMoreMemes}
                            disabled={loadingMore}
                            className="px-8 py-4 bg-yellow-400 text-black rounded-full font-bold text-lg hover:bg-yellow-500 transition-all hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                        >
                            {loadingMore ? (
                                <>
                                    <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin"></div>
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <Download size={20} />
                                    Load More Memes
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* PREVIEW MODAL */}
                {selectedMeme && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
                        <div className="relative w-full max-w-6xl h-[85vh] bg-white dark:bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
                            <button
                                onClick={() => setSelectedMeme(null)}
                                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <div className="flex-1 bg-black flex items-center justify-center">
                                {selectedMeme.media_type === "video" || selectedMeme.file_url.endsWith(".mp4") ? (
                                    <video src={selectedMeme.file_url} controls autoPlay className="max-w-full max-h-full" />
                                ) : selectedMeme.media_type === "raw" || selectedMeme.media_type === "audio" ? (
                                    <div className="text-center p-8">
                                        {selectedMeme.thumbnail_url && <img src={selectedMeme.thumbnail_url} className="max-w-md max-h-64 mx-auto mb-6 rounded-lg" />}
                                        <Music className="w-24 h-24 text-yellow-400 mx-auto mb-6 animate-pulse" />
                                        <audio src={selectedMeme.file_url} controls className="w-full min-w-[300px]" autoPlay />
                                    </div>
                                ) : (
                                    <img src={selectedMeme.file_url} className="max-w-full max-h-full object-contain" />
                                )}
                            </div>

                            <div className="w-full md:w-96 bg-white dark:bg-[#111] p-6 flex flex-col border-l border-gray-800 overflow-y-auto">
                                <h2 className="text-2xl font-black text-black dark:text-white mb-2">{selectedMeme.title}</h2>
                                <Link href={`/user/${selectedMeme.uploader_id}`} className="flex items-center gap-2 mb-6 hover:opacity-70 transition-opacity w-fit">
                                    <img src={selectedMeme.uploader_pic || "https://ui-avatars.com/api/?name=User"} className="w-8 h-8 rounded-full" />
                                    <div>
                                        <p className="text-sm font-bold text-black dark:text-white hover:text-yellow-500 transition-colors">{selectedMeme.uploader_name}</p>
                                        <p className="text-xs text-gray-500">{timeAgo(selectedMeme.createdAt)}</p>
                                    </div>
                                </Link>

                                <div className="flex gap-2 mb-8 flex-wrap">
                                    <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-[#222] text-xs font-bold text-gray-500 uppercase">{selectedMeme.category}</span>
                                    <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-[#222] text-xs font-bold text-gray-500 uppercase">{selectedMeme.language}</span>
                                </div>

                                {selectedMeme.credit && (
                                    <div className="mb-6 p-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800">
                                        <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Credit / Source</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{selectedMeme.credit}</p>
                                    </div>
                                )}

                                {/* Ad in Preview Modal */}
                                {/* Ad in Preview Modal */}


                                {/* Ad in Preview Modal */}
                                <div className="mb-6">
                                    <AdUnit type="native" />
                                </div>

                                <div className="mt-auto space-y-3">
                                    <button
                                        onClick={(e) => handleReaction(e, selectedMeme)}
                                        className={`w-full py-3 rounded-xl font-bold text-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 ${selectedMeme.reactedBy?.includes(user?.uid)
                                            ? "bg-yellow-400 text-black"
                                            : "bg-gray-100 dark:bg-[#222] text-black dark:text-white"
                                            }`}
                                    >
                                        {selectedMeme.reactions?.haha || 0} 😂
                                    </button>

                                    <button
                                        onClick={(e) => handleDownload(e, selectedMeme.id, selectedMeme.file_url, selectedMeme.title, "preview")}
                                        disabled={!downloadUnlocked}
                                        className={`w-full py-3 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg ${!downloadUnlocked ? "bg-gray-200 dark:bg-gray-800 cursor-not-allowed text-gray-500" : "bg-yellow-400 text-black hover:bg-yellow-500"}`}
                                    >
                                        {!downloadUnlocked ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                                                Wait {downloadTimer}s...
                                            </>
                                        ) : (
                                            <>
                                                <Download /> Download
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* EDIT MODAL */}
                {editingMeme && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                        <div className="bg-white dark:bg-[#1f1f1f] w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">

                            {/* LEFT: Media Preview */}
                            <div className="w-full md:w-1/2 bg-black flex items-center justify-center relative p-4">
                                {editingMeme.media_type === "video" || editingMeme.file_url.endsWith(".mp4") ? (
                                    <video src={editingMeme.file_url} controls className="max-w-full max-h-full rounded-lg shadow-2xl" />
                                ) : editingMeme.media_type === "raw" || editingMeme.media_type === "audio" ? (
                                    <div className="text-center">
                                        <Music className="w-24 h-24 text-yellow-400 mx-auto mb-4 animate-pulse" />
                                        <audio src={editingMeme.file_url} controls className="w-full min-w-[300px]" />
                                    </div>
                                ) : (
                                    <img src={editingMeme.file_url} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                                )}
                            </div>

                            {/* RIGHT: Edit Form */}
                            <div className="w-full md:w-1/2 flex flex-col bg-white dark:bg-[#1f1f1f] border-l border-gray-200 dark:border-gray-800">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-[#1f1f1f]">
                                    <h3 className="text-xl font-black">Edit Meme</h3>
                                    <button onClick={() => setEditingMeme(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
                                </div>

                                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                                    {/* Thumbnail Preview (Small) */}
                                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-[#252525] rounded-xl border border-gray-100 dark:border-gray-800">
                                        {thumbnailPreview ? (
                                            <img src={thumbnailPreview} className="w-16 h-16 rounded-lg object-cover border-2 border-yellow-400" />
                                        ) : editForm.thumbnail_url ? (
                                            <img src={editForm.thumbnail_url} className="w-16 h-16 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400"><Smile size={20} /></div>
                                        )}
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Current Thumbnail</p>
                                            <p className="text-xs text-gray-400">Preview of what users will see</p>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Title</label>
                                        <input type="text" value={editForm.title || ""} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full p-3 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] dark:text-white outline-none focus:ring-2 focus:ring-yellow-400" />
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Category</label>
                                        <select value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-full p-3 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] dark:text-white outline-none focus:ring-2 focus:ring-yellow-400 mb-2">
                                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>

                                        {isAdmin && (
                                            <>
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {categories.map(cat => (
                                                        <div key={cat} className="flex items-center gap-1 bg-gray-200 dark:bg-[#333] px-2 py-1 rounded text-xs">
                                                            <span className="text-black dark:text-white">{cat}</span>
                                                            <button type="button" onClick={() => deleteCategory(cat)} className="text-red-500 hover:text-red-700"><X size={12} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input type="text" placeholder="Add new category..." value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())} className="flex-1 p-2 text-sm rounded-lg bg-gray-100 dark:bg-[#2a2a2a] dark:text-white outline-none focus:ring-2 focus:ring-yellow-400" />
                                                    <button type="button" onClick={addCategory} disabled={isAddingCategory} className="px-3 py-2 bg-yellow-400 text-black rounded-lg font-bold text-sm hover:bg-yellow-500 disabled:opacity-50"><Plus size={14} /></button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Language */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Language</label>
                                        <select value={editForm.language || ""} onChange={(e) => setEditForm({ ...editForm, language: e.target.value })} className="w-full p-3 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] dark:text-white outline-none focus:ring-2 focus:ring-yellow-400 mb-2">
                                            {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                        </select>

                                        {isAdmin && (
                                            <>
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {languages.map(lang => (
                                                        <div key={lang} className="flex items-center gap-1 bg-gray-200 dark:bg-[#333] px-2 py-1 rounded text-xs">
                                                            <span className="text-black dark:text-white">{lang}</span>
                                                            <button type="button" onClick={() => deleteLanguage(lang)} className="text-red-500 hover:text-red-700"><X size={12} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input type="text" placeholder="Add new language..." value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())} className="flex-1 p-2 text-sm rounded-lg bg-gray-100 dark:bg-[#2a2a2a] dark:text-white outline-none focus:ring-2 focus:ring-yellow-400" />
                                                    <button type="button" onClick={addLanguage} disabled={isAddingLanguage} className="px-3 py-2 bg-yellow-400 text-black rounded-lg font-bold text-sm hover:bg-yellow-500 disabled:opacity-50"><Plus size={14} /></button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Credit */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Credit / Source (Optional)</label>
                                        <input type="text" value={editForm.credit || ""} onChange={(e) => setEditForm({ ...editForm, credit: e.target.value })} placeholder="Original creator or source..." className="w-full p-3 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] dark:text-white outline-none focus:ring-2 focus:ring-yellow-400" />
                                    </div>

                                    {/* Thumbnail Upload */}
                                    {(editingMeme.media_type === "audio" || editingMeme.media_type === "video" || editingMeme.media_type === "raw") && (
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Change Thumbnail</label>
                                            <input type="file" accept="image/*" onChange={handleThumbnailChange} className="w-full text-sm text-gray-500" />
                                        </div>
                                    )}

                                    {/* Re-Upload Clip (Admin Only) */}
                                    {isAdmin && (
                                        <div className="mt-4 p-4 bg-yellow-400/10 rounded-xl border border-yellow-400/30">
                                            <label className="block text-xs font-bold uppercase text-yellow-600 mb-2 flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                                Re-upload Media File (Admin)
                                            </label>
                                            <input type="file" accept="video/*,image/*,audio/*" onChange={handleClipChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-yellow-400 file:text-black hover:file:bg-yellow-500" />
                                            <p className="text-[10px] text-gray-400 mt-1">Warning: This will overwrite the existing meme file.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-white dark:bg-[#1f1f1f]">
                                    <button onClick={() => setEditingMeme(null)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                                    <button onClick={saveEdits} disabled={saving} className="px-5 py-2.5 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-500 disabled:opacity-50">
                                        {saving ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}



                {/* AD INTERSTITIAL MODAL */}
                {showAdInterstitial && (
                    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4">
                        <div className="w-full max-w-lg bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 text-center border border-gray-200 dark:border-gray-800 shadow-2xl">
                            <div className="mb-6">
                                <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                    <Download size={32} className="text-black" />
                                </div>
                                <h3 className="text-2xl font-black mb-2">Preparing Download...</h3>
                                <p className="text-gray-500">Please wait while we generate your secure download link.</p>
                            </div>

                            {/* Ad Container */}
                            <div className="min-h-[250px] bg-gray-50 dark:bg-black rounded-xl mb-6 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 overflow-hidden">
                                <AdUnit type="native" />
                            </div>

                            <div className="flex flex-col items-center gap-2">
                                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-400 transition-all duration-1000 ease-linear"
                                        style={{ width: (((15 - interstitialTimer) / 15) * 100) + "%" }}
                                    />
                                </div>
                                <p className="text-sm font-bold text-gray-400">
                                    Starting in {interstitialTimer} seconds...
                                </p>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* SWITCH TO REELS FLOATING BUTTON */}
            <Link
                href="/reels"
                className="fixed bottom-24 right-8 z-50 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-bold shadow-2xl hover:scale-105 transition-transform animate-bounce-slow border border-white/20"
            >
                <Clapperboard size={20} className="fill-white/20" />
                <span>Reel Mode</span>
            </Link>
        </div>
    );
}

export default function Home() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div></div>}>
            <HomeContent />
        </Suspense>
    );
}
