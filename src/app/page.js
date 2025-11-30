"use client";

import Link from "next/link";

import { TrendingUp, Smile, Video, Music, Sparkles, Download, Share2, Clock, Eye, X, Play, Trash2, MoreVertical, Edit2, Plus, Check, ShieldAlert } from "lucide-react";
import { useEffect, useState, Suspense, useRef, useCallback, Fragment } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, limit, getDocs, updateDoc, doc, increment, arrayUnion, arrayRemove, deleteDoc, setDoc, getDoc, orderBy, startAfter } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useDownloadList } from "@/context/DownloadContext";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import AdUnit from "@/components/AdUnit";

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
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 border ${active
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

    // Ad & Download Logic State
    const [downloadUnlocked, setDownloadUnlocked] = useState(false);
    const [downloadTimer, setDownloadTimer] = useState(3);
    const [showAdInterstitial, setShowAdInterstitial] = useState(false);
    const [interstitialTimer, setInterstitialTimer] = useState(5); // Default 5 sec for card downloads
    const [pendingDownload, setPendingDownload] = useState(null);
    const [downloadSource, setDownloadSource] = useState(""); // "preview", "card", "downloadAll"

    // Pagination states
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

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
                const ITEMS_PER_PAGE = 30;

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
            const ITEMS_PER_PAGE = 30;

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
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
                    loadMoreMemes();
                }
            },
            { threshold: 0.1 }
        );

        const currentRef = loadMoreRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [hasMore, loadingMore, loading, loadMoreMemes]);


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
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename || 'memehubhq-download';
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

    const openMeme = async (meme) => {
        setSelectedMeme(meme);
        try {
            const memeRef = doc(db, "memes", meme.id);
            await updateDoc(memeRef, { views: increment(1) });
            setMemes(prev => prev.map(m => m.id === meme.id ? { ...m, views: (m.views || 0) + 1 } : m));
        } catch (error) {
            console.error("Error updating views:", error);
        }
    };

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
            await updateDoc(doc(db, "memes", editingMeme.id), {
                title: editForm.title,
                category: editForm.category,
                language: editForm.language,
                thumbnail_url: thumbnailUrl,
                credit: editForm.credit || null,
                tags: editForm.title.toLowerCase().split(" ")
            });
            setMemes(prev => prev.map(m => m.id === editingMeme.id ? { ...m, ...editForm, thumbnail_url: thumbnailUrl, credit: editForm.credit || null } : m));
            toast.success("Changes saved!", { id: toastId });
            setEditingMeme(null);
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

    // Generate display items WITHOUT ads (disabled for now)
    const getDisplayItems = (memes) => {
        // Return memes only - NO ADS
        return memes.map(meme => ({ type: "meme", data: meme }));
    };

    const displayItems = getDisplayItems(memes);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-black dark:text-white pb-20">
            {/* 1. HERO SECTION */}
            <section className="relative pt-32 pb-10 px-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/10 to-transparent pointer-events-none" />
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 font-bold text-sm mb-6">
                        <Sparkles size={16} />
                        <span>The #1 Place for Viral Memes</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
                        Discover & Share <br />
                        <span className="text-yellow-400">Viral Laughter</span>
                    </h1>
                    <p className="text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Join millions of users sharing the funniest memes, videos, and sound effects.
                        Upload your own or browse the latest trends.
                    </p>
                    {!user && (
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={async () => {
                                    try {
                                        await googleLogin();
                                        router.push('/upload');
                                    } catch (e) {
                                        console.error(e);
                                    }
                                }}
                                className="bg-yellow-400 text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-500 transition-transform hover:scale-105 shadow-xl"
                            >
                                Upload your meme
                            </button>
                        </div>
                    )}
                </div>
            </section>

            <div id="explore" className="max-w-7xl mx-auto px-4">
                {/* ADMIN CONTROLS */}
                {isAdmin && memes.length > 0 && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800 rounded-xl">
                        <div className="flex flex-wrap gap-3 items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="text-red-500" size={20} />
                                <span className="font-bold text-red-700 dark:text-red-400">Admin Controls</span>
                                {isSelectionMode && (
                                    <span className="text-sm text-red-600 dark:text-red-400">
                                        ({selectedMemes.length} selected)
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => {
                                        setIsSelectionMode(!isSelectionMode);
                                        setSelectedMemes([]);
                                    }}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${isSelectionMode
                                        ? "bg-gray-500 hover:bg-gray-600 text-white"
                                        : "bg-blue-500 hover:bg-blue-600 text-white"
                                        }`}
                                >
                                    {isSelectionMode ? "Cancel Selection" : "Multi-Select Mode"}
                                </button>
                                {isSelectionMode && selectedMemes.length > 0 && (
                                    <button
                                        onClick={handleBulkDelete}
                                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm"
                                    >
                                        Delete Selected ({selectedMemes.length})
                                    </button>
                                )}
                                <button
                                    onClick={handleDeleteAll}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm flex items-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    Delete All Memes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. CATEGORY TABS */}
                <AdUnit type="banner" />
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
                    <div className="flex flex-wrap gap-2 pb-2">
                        <CategoryBtn icon={<Sparkles size={16} />} label="All" active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} />
                        <CategoryBtn icon={<TrendingUp size={16} />} label="Trending" active={activeCategory === 'trending'} onClick={() => setActiveCategory('trending')} />
                        <CategoryBtn icon={<Clock size={16} />} label="Recently Uploaded" active={activeCategory === 'recent'} onClick={() => setActiveCategory('recent')} />
                        <CategoryBtn icon={<Download size={16} />} label="Most Downloaded" active={activeCategory === 'most_downloaded'} onClick={() => setActiveCategory('most_downloaded')} />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {displayItems.map((item, idx) => (
                            <Fragment key={item.data.id}>
                                <div
                                    onClick={() => openMeme(item.data)}
                                    className="group relative rounded-2xl bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#252525] overflow-hidden hover:shadow-2xl hover:shadow-yellow-400/10 dark:hover:border-yellow-400/30 transition-all duration-300 flex flex-col cursor-pointer"
                                >
                                    {/* MEDIA DISPLAY */}
                                    <div className="aspect-[4/3] bg-black flex items-center justify-center relative overflow-hidden">
                                        {item.data.thumbnail_url ? (
                                            <img src={item.data.thumbnail_url} alt={item.data.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : item.data.media_type === "video" || item.data.file_url.endsWith(".mp4") ? (
                                            <video src={item.data.file_url} className="w-full h-full object-cover" />
                                        ) : item.data.media_type === "raw" || item.data.media_type === "audio" ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-black text-white p-4">
                                                <Music className="w-16 h-16 mb-4 text-yellow-400" />
                                            </div>
                                        ) : (
                                            <img src={item.data.file_url} alt={item.data.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        )}

                                        {(item.data.media_type === "video" || item.data.media_type === "raw" || item.data.media_type === "audio") && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                                    <Play fill="currentColor" className="ml-1 w-5 h-5" />
                                                </div>
                                            </div>
                                        )}

                                        <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm uppercase">
                                            {item.data.media_type === "raw" || item.data.media_type === "audio" ? "AUDIO" : item.data.media_type}
                                        </div>

                                        {/* Admin Multi-Select Checkbox */}
                                        {isAdmin && isSelectionMode && (
                                            <div
                                                className="absolute top-2 left-2 z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleMemeSelection(item.data.id);
                                                }}
                                            >
                                                <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${selectedMemes.includes(item.data.id)
                                                    ? "bg-yellow-400 border-yellow-400"
                                                    : "bg-white/20 border-white backdrop-blur-sm hover:bg-white/30"
                                                    }`}>
                                                    {selectedMemes.includes(item.data.id) && (
                                                        <Check size={18} className="text-black font-bold" />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* CARD FOOTER */}
                                    <div className="p-4 flex flex-col flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg truncate text-black dark:text-white flex-1 mr-2">{item.data.title}</h3>
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap mt-1">{timeAgo(item.data.createdAt)}</span>
                                        </div>

                                        <Link
                                            href={`/user/${item.data.uploader_id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-2 mb-4 hover:opacity-70 transition-opacity w-fit"
                                        >
                                            <img src={item.data.uploader_pic || "https://ui-avatars.com/api/?name=User"} alt={item.data.uploader_name || "User"} className="w-5 h-5 rounded-full" />
                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate hover:text-yellow-500 transition-colors">{item.data.uploader_name}</span>
                                        </Link>

                                        <div className="mt-auto flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                                                <span className="flex items-center gap-1"><Eye size={14} /> {item.data.views || 0}</span>
                                                <span className="flex items-center gap-1"><Download size={14} /> {item.data.downloads || 0}</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Add to Download List */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isInDownloadList(item.data.id)) {
                                                            removeFromDownloadList(item.data.id);
                                                        } else {
                                                            addToDownloadList(item.data);
                                                        }
                                                    }}
                                                    className={`w-6 h-6 flex items-center justify-center rounded-md border-2 transition-all ${isInDownloadList(item.data.id)
                                                        ? "bg-black border-black text-white dark:bg-white dark:border-white dark:text-black"
                                                        : "bg-transparent border-gray-300 dark:border-gray-600 hover:border-black dark:hover:border-white"
                                                        }`}
                                                    title={isInDownloadList(item.data.id) ? "Remove from download list" : "Add to download list"}
                                                >
                                                    {isInDownloadList(item.data.id) && <Download size={12} strokeWidth={3} />}
                                                </button>

                                                {/* Menu */}
                                                {(canDelete(item.data) || ADMIN_IDS.includes(user?.uid)) && (
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuId(openMenuId === item.data.id ? null : item.data.id);
                                                            }}
                                                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>
                                                        {openMenuId === item.data.id && (
                                                            <div className="absolute right-0 bottom-full mb-2 w-32 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openEditModal(item.data);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-left text-sm text-black dark:text-white"
                                                                >
                                                                    <Edit2 size={14} /> Edit
                                                                </button>
                                                                {canDelete(item.data) && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            handleDelete(e, item.data);
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 text-left text-sm"
                                                                    >
                                                                        <Trash2 size={14} /> Delete
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Reaction */}
                                                <button
                                                    onClick={(e) => handleReaction(e, item.data)}
                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors text-xs font-bold ${item.data.reactedBy?.includes(user?.uid)
                                                        ? "bg-yellow-400 text-black"
                                                        : "bg-yellow-50 dark:bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-400/20"
                                                        }`}
                                                >
                                                    {item.data.reactions?.haha || 0} 😂
                                                </button>

                                                {/* Download Button */}
                                                <button
                                                    onClick={(e) => handleDownload(e, item.data.id, item.data.file_url, item.data.title)}
                                                    className="px-3 py-1.5 rounded-lg bg-yellow-400 text-black text-xs font-bold hover:bg-yellow-500 transition-colors flex items-center gap-1"
                                                    title="Download now"
                                                >
                                                    <Download size={12} />
                                                    Download
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {(idx + 1) % 5 === 0 && (
                                    <div className="bg-gray-100 dark:bg-[#1a1a1a] rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center min-h-[320px]">
                                        <AdUnit type="native" />
                                    </div>
                                )}
                            </Fragment>
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-white dark:bg-[#1f1f1f] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-[#1f1f1f] z-10">
                                <h3 className="text-xl font-black">Edit Meme</h3>
                                <button onClick={() => setEditingMeme(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Thumbnail Preview */}
                                <div className="flex justify-center">
                                    {thumbnailPreview ? (
                                        <img src={thumbnailPreview} className="h-32 rounded-lg object-cover border-2 border-yellow-400" />
                                    ) : editForm.thumbnail_url ? (
                                        <img src={editForm.thumbnail_url} className="h-32 rounded-lg object-cover" />
                                    ) : (
                                        <div className="h-32 w-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400">No Thumbnail</div>
                                    )}
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
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-[#1f1f1f]">
                                <button onClick={() => setEditingMeme(null)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                                <button onClick={saveEdits} disabled={saving} className="px-5 py-2.5 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-500 disabled:opacity-50">
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
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
            );
}

            export default function Home() {
    return (
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div></div>}>
                <HomeContent />
            </Suspense>
            );
}
