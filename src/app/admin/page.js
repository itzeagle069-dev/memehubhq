"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, setDoc, getDoc, orderBy, writeBatch } from "firebase/firestore";
import { Check, Trash2, ShieldAlert, Loader2, Edit2, X, Music, Eye, Plus, MessageSquare, Mail, CheckCheck, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

const ADMIN_IDS = ["VZCDwbnsLxcLdEcjabk8wK0pEv33"];
const CLOUD_NAME = "ds6pks59z";
const UPLOAD_PRESET = "memehub_upload";

export default function AdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [pendingMemes, setPendingMemes] = useState([]);
    const [reports, setReports] = useState([]);
    const [activeTab, setActiveTab] = useState("memes");
    const [fetching, setFetching] = useState(true);
    const [editingMeme, setEditingMeme] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [newThumbnail, setNewThumbnail] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);
    const [saving, setSaving] = useState(false);
    const [previewMeme, setPreviewMeme] = useState(null);
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState("");
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [languages, setLanguages] = useState([]);
    const [newLanguage, setNewLanguage] = useState("");
    const [isAddingLanguage, setIsAddingLanguage] = useState(false);
    const [filterType, setFilterType] = useState("all");
    const [sortOrder, setSortOrder] = useState("recent");

    // Multi-select mode for published memes
    const [publishedMemes, setPublishedMemes] = useState([]);
    const [selectedMemes, setSelectedMemes] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [editingQueue, setEditingQueue] = useState([]);

    // Helper function for time ago
    const timeAgo = (timestamp) => {
        if (!timestamp) return "Just now";
        const now = new Date();
        const createdAt = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const seconds = Math.floor((now - createdAt) / 1000);

        if (seconds < 60) return "Just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks}w ago`;
        const months = Math.floor(days / 30);
        return `${months}mo ago`;
    };

    useEffect(() => {
        if (loading) return;
        if (!user || !ADMIN_IDS.includes(user.uid)) {
            router.push("/");
            return;
        }

        const fetchData = async () => {
            try {
                const catDoc = await getDoc(doc(db, "settings", "categories"));
                if (catDoc.exists()) {
                    setCategories(catDoc.data().list || []);
                } else {
                    const defaultCats = ["reaction", "trending", "animal", "work", "sports", "coding", "crypto", "gaming"];
                    await setDoc(doc(db, "settings", "categories"), { list: defaultCats });
                    setCategories(defaultCats);
                }

                const langDoc = await getDoc(doc(db, "settings", "languages"));
                if (langDoc.exists()) {
                    setLanguages(langDoc.data().list || []);
                } else {
                    const defaultLangs = ["english", "nepali", "hindi"];
                    await setDoc(doc(db, "settings", "languages"), { list: defaultLangs });
                    setLanguages(defaultLangs);
                }

                const q = query(collection(db, "memes"), where("status", "==", "pending"));
                const snapshot = await getDocs(q);
                const memes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPendingMemes(memes);

                // Fetch published memes for management
                const publishedQ = query(collection(db, "memes"), orderBy("createdAt", "desc"));
                const publishedSnapshot = await getDocs(publishedQ);
                const allMemes = publishedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPublishedMemes(allMemes.filter(m => m.status === "published"));

                const reportsQ = query(collection(db, "reports"), orderBy("createdAt", "desc"));
                const reportsSnapshot = await getDocs(reportsQ);
                setReports(reportsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error("Error fetching data:", err);
                toast.error("Failed to load data");
            } finally {
                setFetching(false);
            }
        };

        fetchData();
    }, [user, loading, router]);

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

    const approveMeme = async (memeId) => {
        try {
            await updateDoc(doc(db, "memes", memeId), {
                status: "published",
                publishedAt: new Date().toISOString()
            });
            setPendingMemes(prev => prev.filter(m => m.id !== memeId));
            toast.success("Meme Published!");
            setPreviewMeme(null);
        } catch (err) {
            toast.error("Error approving");
        }
    };

    const deleteMeme = async (memeId) => {
        if (!confirm("Delete this permanently?")) return;
        try {
            await deleteDoc(doc(db, "memes", memeId));
            setPendingMemes(prev => prev.filter(m => m.id !== memeId));
            toast.error("Meme Deleted");
            setPreviewMeme(null);
        } catch (err) {
            toast.error("Error deleting");
        }
    };

    const approveAll = async () => {
        if (pendingMemes.length === 0) return toast.error("No pending memes to approve");

        const confirmMsg = `Are you sure you want to approve ALL ${pendingMemes.length} pending memes?\n\nThis action cannot be undone.`;
        if (!confirm(confirmMsg)) return;

        const toastId = toast.loading(`Approving ${pendingMemes.length} memes...`);

        try {
            const batch = writeBatch(db);
            const publishedAt = new Date().toISOString();

            pendingMemes.forEach(meme => {
                const memeRef = doc(db, "memes", meme.id);
                batch.update(memeRef, {
                    status: "published",
                    publishedAt: publishedAt
                });
            });

            await batch.commit();
            setPendingMemes([]);
            toast.success(`Successfully approved ${pendingMemes.length} memes!`, { id: toastId });
        } catch (err) {
            console.error("Error approving all:", err);
            toast.error("Failed to approve all memes", { id: toastId });
        }
    };

    const rejectAll = async () => {
        if (pendingMemes.length === 0) return toast.error("No pending memes to reject");

        const confirmMsg = `⚠️ WARNING: You are about to PERMANENTLY DELETE ALL ${pendingMemes.length} pending memes!\n\nThis action CANNOT be undone.\n\nType 'DELETE ALL' to confirm.`;
        const userInput = prompt(confirmMsg);

        if (userInput !== "DELETE ALL") {
            toast.error("Rejection cancelled");
            return;
        }

        const toastId = toast.loading(`Deleting ${pendingMemes.length} memes...`);

        try {
            const batch = writeBatch(db);

            pendingMemes.forEach(meme => {
                const memeRef = doc(db, "memes", meme.id);
                batch.delete(memeRef);
            });

            await batch.commit();
            setPendingMemes([]);
            toast.success(`Successfully deleted ${pendingMemes.length} memes`, { id: toastId });
        } catch (err) {
            console.error("Error rejecting all:", err);
            toast.error("Failed to delete all memes", { id: toastId });
        }
    };

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
        setPreviewMeme(null);
    };

    const handleThumbnailChange = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        if (!selected.type.startsWith("image/")) {
            toast.error("Thumbnail must be an image file");
            return;
        }
        setNewThumbnail(selected);
        setThumbnailPreview(URL.createObjectURL(selected));
    };

    const saveEdits = async () => {
        if (!editForm.title.trim()) {
            toast.error("Title cannot be empty");
            return;
        }

        setSaving(true);
        const toastId = toast.loading("Saving changes...");

        try {
            let thumbnailUrl = editForm.thumbnail_url;

            if (newThumbnail) {
                toast.loading("Uploading new thumbnail...", { id: toastId });
                const thumbFormData = new FormData();
                thumbFormData.append("file", newThumbnail);
                thumbFormData.append("upload_preset", UPLOAD_PRESET);

                const thumbRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                    method: "POST",
                    body: thumbFormData,
                });

                const thumbData = await thumbRes.json();
                if (thumbData.secure_url) {
                    thumbnailUrl = thumbData.secure_url;
                }
            }

            await updateDoc(doc(db, "memes", editingMeme.id), {
                title: editForm.title,
                category: editForm.category,
                language: editForm.language,
                thumbnail_url: thumbnailUrl,
                credit: editForm.credit || null,
                tags: editForm.title.toLowerCase().split(" ")
            });

            setPendingMemes(prev => prev.map(m =>
                m.id === editingMeme.id
                    ? { ...m, ...editForm, thumbnail_url: thumbnailUrl, credit: editForm.credit || null }
                    : m
            ));

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
            console.error("Error saving edits:", error);
            toast.error("Failed to save changes", { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const deleteReport = async (reportId) => {
        if (!confirm("Delete this report?")) return;
        try {
            await deleteDoc(doc(db, "reports", reportId));
            setReports(prev => prev.filter(r => r.id !== reportId));
            toast.success("Report deleted");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete report");
        }
    };

    const deleteAllReports = async () => {
        if (reports.length === 0) return;
        if (!confirm("WARNING: Are you sure you want to DELETE ALL reports? This cannot be undone.")) return;

        setFetching(true);
        try {
            const batch = writeBatch(db);
            reports.forEach(report => {
                const ref = doc(db, "reports", report.id);
                batch.delete(ref);
            });
            await batch.commit();
            setReports([]);
            toast.success("All reports deleted");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete all reports");
        } finally {
            setFetching(false);
        }
    };
    // Multi-select helper functions
    const handleSelectAll = () => {
        const allIds = publishedMemes.map(m => m.id);
        setSelectedMemes(allIds);
        toast.success(`Selected all ${allIds.length} memes`);
    };

    const handleUnselectAll = () => {
        setSelectedMemes([]);
        toast.success("Selection cleared");
    };

    const toggleMemeSelection = (memeId) => {
        setSelectedMemes(prev =>
            prev.includes(memeId)
                ? prev.filter(id => id !== memeId)
                : [...prev, memeId]
        );
    };

    const handleEditSelected = () => {
        if (selectedMemes.length === 0) return toast.error("No memes selected");
        const queue = publishedMemes.filter(m => selectedMemes.includes(m.id));
        setEditingQueue(queue);
        openEditModal(queue[0]);
        toast("Starting bulk edit mode...", { icon: "📝" });
    };

    const handleBulkDelete = async () => {
        if (selectedMemes.length === 0) return toast.error("No memes selected");

        const password = prompt("⚠️ ADMIN ACTION REQUIRED\n\nEnter admin password to continue:");
        if (password !== "1122") return toast.error("Incorrect password");

        const confirmMsg = `Are you sure you want to DELETE ${selectedMemes.length} selected meme(s)?\n\nThis action cannot be undone.`;
        if (!confirm(confirmMsg)) return;

        const toastId = toast.loading(`Deleting ${selectedMemes.length} memes...`);

        try {
            await Promise.all(selectedMemes.map(id => deleteDoc(doc(db, "memes", id))));
            setPublishedMemes(prev => prev.filter(m => !selectedMemes.includes(m.id)));
            setSelectedMemes([]);
            setIsSelectionMode(false);
            toast.success(`Successfully deleted ${selectedMemes.length} meme(s)`, { id: toastId });
        } catch (error) {
            console.error("Bulk delete error:", error);
            toast.error("Failed to delete some memes", { id: toastId });
        }
    };


    if (loading || fetching) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-yellow-400 w-10 h-10" /></div>;
    }

    // Filter and sort memes
    let filteredMemes = pendingMemes;
    if (filterType !== "all") {
        filteredMemes = filteredMemes.filter(meme => meme.media_type === filterType);
    }
    filteredMemes = [...filteredMemes].sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return sortOrder === "recent" ? bTime - aTime : aTime - bTime;
    });

    return (
        <div className="max-w-7xl mx-auto pt-28 pb-10 px-4 min-h-screen">
            <div className="flex items-center gap-3 mb-8">
                <ShieldAlert className="w-10 h-10 text-red-500" />
                <h1 className="text-3xl font-black text-black dark:text-white">Admin <span className="text-yellow-400">Dashboard</span></h1>
            </div>

            <div className="flex gap-6 mb-8 border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => setActiveTab("memes")}
                    className={`pb-4 text-lg font-bold transition-colors relative ${activeTab === "memes" ? "text-yellow-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                >
                    Pending Memes
                    <span className="ml-2 bg-gray-100 dark:bg-[#222] px-2 py-0.5 rounded-full text-xs">{pendingMemes.length}</span>
                    {activeTab === "memes" && <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab("reports")}
                    className={`pb-4 text-lg font-bold transition-colors relative ${activeTab === "reports" ? "text-yellow-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                >
                    Inbox / Reports
                    <span className="ml-2 bg-gray-100 dark:bg-[#222] px-2 py-0.5 rounded-full text-xs">{reports.length}</span>
                    {activeTab === "reports" && <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab("manage")}
                    className={`pb-4 text-lg font-bold transition-colors relative ${activeTab === "manage" ? "text-yellow-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                >
                    Manage Memes
                    <span className="ml-2 bg-gray-100 dark:bg-[#222] px-2 py-0.5 rounded-full text-xs">{publishedMemes.length}</span>
                    {activeTab === "manage" && <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400 rounded-t-full" />}
                </button>

            </div>

            {activeTab === "memes" && (
                <>
                    {pendingMemes.length > 0 && (
                        <>
                            {/* Bulk Actions */}
                            <div className="mb-6 flex flex-wrap gap-3 items-center justify-between bg-gradient-to-r from-green-50 to-red-50 dark:from-green-900/10 dark:to-red-900/10 p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                        Bulk Actions: {pendingMemes.length} meme{pendingMemes.length !== 1 ? 's' : ''} pending
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={approveAll}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                                    >
                                        <CheckCheck size={18} />
                                        Approve All ({pendingMemes.length})
                                    </button>
                                    <button
                                        onClick={rejectAll}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                                    >
                                        <XCircle size={18} />
                                        Reject All ({pendingMemes.length})
                                    </button>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="mb-6 flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-sm font-bold text-gray-500 mr-2">Type:</span>
                                    {["all", "image", "video", "audio"].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setFilterType(type)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterType === type
                                                ? "bg-yellow-400 text-black"
                                                : "bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333]"
                                                }`}
                                        >
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-sm font-bold text-gray-500 mr-2">Sort:</span>
                                    <button
                                        onClick={() => setSortOrder("recent")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sortOrder === "recent"
                                            ? "bg-yellow-400 text-black"
                                            : "bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333]"
                                            }`}
                                    >
                                        Recent
                                    </button>
                                    <button
                                        onClick={() => setSortOrder("oldest")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sortOrder === "oldest"
                                            ? "bg-yellow-400 text-black"
                                            : "bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333]"
                                            }`}
                                    >
                                        Oldest
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {filteredMemes.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-[#222]">
                            <h2 className="text-2xl font-bold text-gray-400">{pendingMemes.length === 0 ? "All caught up! 🎉" : `No ${filterType} memes found`}</h2>
                            <p className="text-gray-500">{pendingMemes.length === 0 ? "No memes waiting for review." : "Try changing the filter."}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredMemes.map((meme) => (
                                <div key={meme.id} className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-xl flex flex-col">
                                    <div className="aspect-video bg-black flex items-center justify-center relative cursor-pointer group" onClick={() => setPreviewMeme(meme)}>
                                        {meme.thumbnail_url ? (
                                            <img src={meme.thumbnail_url} alt={meme.title} className="w-full h-full object-cover" />
                                        ) : meme.media_type === "video" || meme.file_url.endsWith(".mp4") ? (
                                            <video src={meme.file_url} className="w-full h-full object-cover" />
                                        ) : meme.media_type === "raw" || meme.media_type === "audio" ? (
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Music className="w-12 h-12 text-yellow-400" />
                                                <span className="text-xs text-gray-400 uppercase font-bold">Audio</span>
                                            </div>
                                        ) : (
                                            <img src={meme.file_url} className="w-full h-full object-cover" />
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Eye className="w-8 h-8 text-white" />
                                        </div>
                                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-bold uppercase">
                                            {meme.media_type}
                                        </div>
                                    </div>

                                    <div className="p-4 flex flex-col gap-3 flex-1">
                                        <h3 className="font-bold text-lg text-black dark:text-white line-clamp-2">{meme.title}</h3>
                                        <div className="flex gap-2 flex-wrap">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-[#222] text-xs font-bold rounded">{meme.category}</span>
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-[#222] text-xs font-bold rounded">{meme.language}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">{timeAgo(meme.createdAt)}</p>

                                        <div className="mt-auto flex gap-2">
                                            <button
                                                onClick={() => approveMeme(meme.id)}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-sm transition-colors"
                                            >
                                                <Check size={16} />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => openEditModal(meme)}
                                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-sm transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => deleteMeme(meme.id)}
                                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-sm transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {activeTab === "reports" && (
                <>
                    {reports.length > 0 && (
                        <div className="mb-6 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-black dark:text-white">User Reports & Feedback</h2>
                            <button
                                onClick={deleteAllReports}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-sm transition-colors"
                            >
                                <Trash2 size={16} />
                                Delete All
                            </button>
                        </div>
                    )}

                    {reports.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-[#222]">
                            <h2 className="text-2xl font-bold text-gray-400">No reports 📭</h2>
                            <p className="text-gray-500">All clear!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reports.map(report => (
                                <div key={report.id} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            {report.type === "feedback" ? (
                                                <MessageSquare className="w-6 h-6 text-blue-500" />
                                            ) : (
                                                <Mail className="w-6 h-6 text-red-500" />
                                            )}
                                            <div>
                                                <h3 className="font-bold text-black dark:text-white">{report.type === "feedback" ? "Feedback" : "Report"}</h3>
                                                <p className="text-xs text-gray-500">{timeAgo(report.createdAt)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteReport(report.id)}
                                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {report.email && (
                                            <div>
                                                <span className="text-xs font-bold text-gray-500 uppercase">Email:</span>
                                                <p className="text-sm text-black dark:text-white">{report.email}</p>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-xs font-bold text-gray-500 uppercase">Message:</span>
                                            <p className="text-sm text-black dark:text-white whitespace-pre-wrap">{report.message}</p>
                                        </div>
                                        {report.mediaUrls && report.mediaUrls.length > 0 && (
                                            <div>
                                                <span className="text-xs font-bold text-gray-500 uppercase mb-2 block">Attachments:</span>
                                                <div className="flex gap-2 flex-wrap">
                                                    {report.mediaUrls.map((url, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-yellow-400 transition-colors"
                                                        >
                                                            {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                                <img src={url} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <video src={url} className="w-full h-full object-cover" />
                                                            )}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {activeTab === "manage" && (
                <>
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
                        <div className="flex flex-wrap gap-3 items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="text-blue-500" size={20} />
                                <span className="font-bold text-blue-700 dark:text-blue-400">Manage Published Memes</span>
                                {isSelectionMode && (<span className="text-sm text-blue-600 dark:text-blue-400">({selectedMemes.length} selected)</span>)}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedMemes([]); setEditingQueue([]); }}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${isSelectionMode ? "bg-gray-500 hover:bg-gray-600 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}>
                                    {isSelectionMode ? "Exit Selection Mode" : "Multi-Select Mode"}
                                </button>
                                {isSelectionMode && (<><button onClick={handleSelectAll} className="px-3 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg text-sm font-bold">Select All</button>
                                    <button onClick={handleUnselectAll} className="px-3 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg text-sm font-bold">Unselect All</button></>)}
                                {isSelectionMode && selectedMemes.length > 0 && (<><button onClick={handleEditSelected} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center gap-2">
                                    <Edit2 size={16} />Edit Selected ({selectedMemes.length})</button>
                                    <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-sm flex items-center gap-2">
                                        <Trash2 size={16} />Delete Selected ({selectedMemes.length})</button></>)}
                            </div>
                        </div>
                    </div>
                    {publishedMemes.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-[#222]">
                            <h2 className="text-2xl font-bold text-gray-400">No published memes yet</h2>
                            <p className="text-gray-50">Approve some pending memes to see them here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {publishedMemes.map(meme => (
                                <div key={meme.id} className="group relative rounded-2xl bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#252525] hover:shadow-2xl transition-all flex flex-col">
                                    <div className="aspect-[4/3] bg-black flex items-center justify-center relative overflow-hidden rounded-t-2xl">
                                        {meme.thumbnail_url ? (<img src={meme.thumbnail_url} alt={meme.title} className="w-full h-full object-cover" />
                                        ) : meme.media_type === "video" ? (<video src={meme.file_url} className="w-full h-full object-cover" />
                                        ) : meme.media_type === "audio" || meme.media_type === "raw" ? (<div className="flex flex-col items-center justify-center"><Music className="w-12 h-12 text-yellow-400" /></div>
                                        ) : (<img src={meme.file_url} className="w-full h-full object-cover" />)}
                                        {isSelectionMode && (<div className="absolute top-2 left-2 z-10" onClick={(e) => { e.stopPropagation(); toggleMemeSelection(meme.id); }}>
                                            <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${selectedMemes.includes(meme.id) ? "bg-yellow-400 border-yellow-400" : "bg-white/20 border-white backdrop-blur-sm hover:bg-white/30"}`}>
                                                {selectedMemes.includes(meme.id) && (<Check size={18} className="text-black font-bold" />)}
                                            </div>
                                        </div>)}
                                    </div>
                                    <div className="p-3 flex flex-col gap-2">
                                        <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-black dark:text-white">{meme.title}</h3>
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-[#222] text-xs font-bold rounded">{meme.category}</span>
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-[#222] text-xs font-bold rounded">{meme.language}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}


            {/* Preview Modal */}
            {previewMeme && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
                    <div className="relative w-full max-w-4xl bg-white dark:bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl">
                        <button
                            onClick={() => setPreviewMeme(null)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="flex flex-col md:flex-row">
                            <div className="flex-1 bg-black flex items-center justify-center p-8">
                                {previewMeme.media_type === "video" || previewMeme.file_url.endsWith(".mp4") ? (
                                    <video src={previewMeme.file_url} controls autoPlay className="max-w-full max-h-[70vh]" />
                                ) : previewMeme.media_type === "raw" || previewMeme.media_type === "audio" ? (
                                    <div className="text-center">
                                        {previewMeme.thumbnail_url && <img src={previewMeme.thumbnail_url} className="max-w-md max-h-64 mx-auto mb-6 rounded-lg" />}
                                        <Music className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
                                        <audio src={previewMeme.file_url} controls className="w-full" autoPlay />
                                    </div>
                                ) : (
                                    <img src={previewMeme.file_url} className="max-w-full max-h-[70vh] object-contain" />
                                )}
                            </div>

                            <div className="w-full md:w-80 p-6 space-y-4">
                                <h2 className="text-2xl font-black text-black dark:text-white">{previewMeme.title}</h2>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-gray-100 dark:bg-[#222] text-xs font-bold rounded">{previewMeme.category}</span>
                                    <span className="px-3 py-1 bg-gray-100 dark:bg-[#222] text-xs font-bold rounded">{previewMeme.language}</span>
                                </div>
                                {previewMeme.credit && (
                                    <div className="p-3 bg-gray-50 dark:bg-[#222] rounded-lg">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Credit:</p>
                                        <p className="text-sm text-black dark:text-white">{previewMeme.credit}</p>
                                    </div>
                                )}
                                <div className="flex gap-2 pt-4">
                                    <button
                                        onClick={() => approveMeme(previewMeme.id)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors"
                                    >
                                        <Check size={18} />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => openEditModal(previewMeme)}
                                        className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => deleteMeme(previewMeme.id)}
                                        className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingMeme && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1f1f1f] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-[#1f1f1f] z-10">
                            <h3 className="text-xl font-black">Edit Meme</h3>
                            <button onClick={() => setEditingMeme(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X size={20} />
                            </button>
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
                                <input
                                    type="text"
                                    value={editForm.title || ""}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full p-3 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] dark:text-white outline-none focus:ring-2 focus:ring-yellow-400"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Category</label>
                                <select
                                    value={editForm.category || ""}
                                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                    className="w-full p-3 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] dark:text-white outline-none focus:ring-2 focus:ring-yellow-400 mb-2"
                                >
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>

                                {/* Category Management */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {categories.map(cat => (
                                        <div key={cat} className="flex items-center gap-1 bg-gray-200 dark:bg-[#333] px-2 py-1 rounded text-xs">
                                            <span className="text-black dark:text-white">{cat}</span>
                                            <button type="button" onClick={() => deleteCategory(cat)} className="text-red-500 hover:text-red-700">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add new category..."
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                                        className="flex-1 p-2 text-sm rounded-lg bg-gray-100 dark:bg-[#2a2a2a] dark:text-white outline-none focus:ring-2 focus:ring-yellow-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={addCategory}
                                        disabled={isAddingCategory}
                                        className="px-3 py-2 bg-yellow-400 text-black rounded-lg font-bold text-sm hover:bg-yellow-500 disabled:opacity-50"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Language */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Language</label>
                                <select
                                    value={editForm.language || ""}
                                    onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                                    className="w-full p-3 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] dark:text-white outline-none focus:ring-2 focus:ring-yellow-400 mb-2"
                                >
                                    {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                </select>

                                {/* Language Management */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {languages.map(lang => (
                                        <div key={lang} className="flex items-center gap-1 bg-gray-200 dark:bg-[#333] px-2 py-1 rounded text-xs">
                                            <span className="text-black dark:text-white">{lang}</span>
                                            <button type="button" onClick={() => deleteLanguage(lang)} className="text-red-500 hover:text-red-700">
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add new language..."
                                        value={newLanguage}
                                        onChange={(e) => setNewLanguage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                                        className="flex-1 p-2 text-sm rounded-lg bg-gray-100 dark:bg-[#2a2a2a] dark:text-white outline-none focus:ring-2 focus:ring-yellow-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={addLanguage}
                                        disabled={isAddingLanguage}
                                        className="px-3 py-2 bg-yellow-400 text-black rounded-lg font-bold text-sm hover:bg-yellow-500 disabled:opacity-50"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Credit */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Credit / Source (Optional)</label>
                                <input
                                    type="text"
                                    value={editForm.credit || ""}
                                    onChange={(e) => setEditForm({ ...editForm, credit: e.target.value })}
                                    placeholder="Original creator or source..."
                                    className="w-full p-3 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] dark:text-white outline-none focus:ring-2 focus:ring-yellow-400"
                                />
                            </div>

                            {/* Thumbnail Upload */}
                            {(editingMeme.media_type === "audio" || editingMeme.media_type === "video" || editingMeme.media_type === "raw") && (
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Change Thumbnail</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleThumbnailChange}
                                        className="w-full text-sm text-gray-500"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-[#1f1f1f]">
                            <button
                                onClick={() => setEditingMeme(null)}
                                className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEdits}
                                disabled={saving}
                                className="px-5 py-2.5 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-500 disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}