"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useDownloadList } from "@/context/DownloadContext";
import { Menu, X, Search, Upload, LogOut, User as UserIcon, Sun, Moon, ChevronDown, ShoppingBag, Trash2, ShieldAlert, Download, Filter, Check } from "lucide-react";

import { toast } from "react-hot-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

const ADMIN_ID = "VZCDwbnsLxcLdEcjabk8wK0pEv33";

export default function Navbar() {
    const { user, googleLogin, logout } = useAuth();
    const { downloadList, removeFromDownloadList, clearDownloadList } = useDownloadList();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isDownloadOpen, setIsDownloadOpen] = useState(false);
    const [theme, setTheme] = useState("dark");
    const [searchQuery, setSearchQuery] = useState("");
    const [pendingCount, setPendingCount] = useState(0);


    // Filter States
    const [showFilter, setShowFilter] = useState(false);
    const [categories, setCategories] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedLanguage, setSelectedLanguage] = useState("");
    const [selectedDate, setSelectedDate] = useState("all"); // all, 1h, today, week, month, year
    const [selectedType, setSelectedType] = useState("all"); // all, image, video, audio

    const filterRef = useRef(null);

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Load theme
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") || "dark";
        setTheme(savedTheme);
        document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }, []);

    // Fetch filters data
    useEffect(() => {
        const fetchFilters = async () => {
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
                console.error("Error fetching filters:", err);
            }
        };
        fetchFilters();
    }, []);

    // Fetch pending meme count for admin
    useEffect(() => {
        if (user?.uid === ADMIN_ID) {
            const fetchPendingCount = async () => {
                try {
                    const q = query(collection(db, "memes"), where("status", "==", "pending"));
                    const snapshot = await getDocs(q);
                    setPendingCount(snapshot.size);
                } catch (err) {
                    console.error("Error fetching pending count:", err);
                }
            };
            fetchPendingCount();
        } else {
            setPendingCount(0);
        }
    }, [user]);

    // Close filter when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilter(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.classList.toggle("dark");
    };

    // Update URL when search or filters change
    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams();
            if (searchQuery.trim()) params.set("search", searchQuery.trim());
            if (selectedCategory) params.set("category", selectedCategory);
            if (selectedLanguage) params.set("language", selectedLanguage);
            if (selectedDate !== "all") params.set("date", selectedDate);
            if (selectedType !== "all") params.set("type", selectedType);

            const queryString = params.toString();
            if (queryString) {
                router.push(`/?${queryString}`);
            } else if (window.location.search) {
                router.push('/');
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategory, selectedLanguage, selectedDate, selectedType, router]);

    const handleSearch = (e) => {
        e.preventDefault();
    };

    const handleBatchDownload = async () => {
        if (!user) {
            toast.error("Please login to download multiple files!");
            googleLogin();
            return;
        }

        const toastId = toast.loading(`Preparing ${downloadList.length} memes...`);
        let count = 0;
        for (const meme of downloadList) {
            try {
                const response = await fetch(meme.file_url);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = meme.title + "." + (meme.media_type === 'video' ? 'mp4' : meme.media_type === 'audio' ? 'mp3' : 'jpg');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                count++;
            } catch (e) {
                console.error(e);
            }
            await new Promise(r => setTimeout(r, 500));
        }
        toast.success(`Downloaded ${count} memes!`, { id: toastId });
        clearDownloadList();
        setIsDownloadOpen(false);
    };

    const clearFilters = () => {
        setSelectedCategory("");
        setSelectedLanguage("");
        setSelectedDate("all");
        setSelectedType("all");
        setSearchQuery("");
    };

    const activeFiltersCount = [selectedCategory, selectedLanguage, selectedDate !== "all", selectedType !== "all"].filter(Boolean).length;

    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800" : "bg-transparent border-transparent"}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="bg-yellow-400 p-1.5 rounded-lg rotate-3 group-hover:rotate-12 transition-transform duration-300">
                                <span className="text-xl">😂</span>
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-black dark:text-white">
                                MemeHub<span className="text-yellow-400">HQ</span>
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            <div className="relative group" ref={filterRef}>
                                <form onSubmit={handleSearch} className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-gray-400 group-focus-within:text-yellow-400 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search memes..."
                                        className="bg-gray-100 dark:bg-[#1a1a1a] text-black dark:text-white text-sm rounded-full pl-10 pr-10 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowFilter(!showFilter)}
                                        className={`absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-yellow-400 transition-colors ${showFilter || activeFiltersCount > 0 ? "text-yellow-400" : "text-gray-400"}`}
                                    >
                                        <Filter className="h-4 w-4" />
                                        {activeFiltersCount > 0 && (
                                            <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                                        )}
                                    </button>
                                </form>

                                {/* Filter Dropdown */}
                                {showFilter && (
                                    <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 p-4 z-50">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-black dark:text-white">Filters</h3>
                                            {activeFiltersCount > 0 && (
                                                <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 font-medium">
                                                    Clear All
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                            {/* Type */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Type</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {["all", "image", "video", "audio"].map(type => (
                                                        <button
                                                            key={type}
                                                            onClick={() => setSelectedType(type)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${selectedType === type
                                                                ? "bg-yellow-400 border-yellow-400 text-black"
                                                                : "bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-yellow-400"
                                                                }`}
                                                        >
                                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Date */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Date Uploaded</h4>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { id: "all", label: "Any Time" },
                                                        { id: "1h", label: "Last Hour" },
                                                        { id: "today", label: "Today" },
                                                        { id: "week", label: "This Week" },
                                                        { id: "month", label: "This Month" },
                                                        { id: "year", label: "This Year" }
                                                    ].map(date => (
                                                        <button
                                                            key={date.id}
                                                            onClick={() => setSelectedDate(date.id)}
                                                            className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors border ${selectedDate === date.id
                                                                ? "bg-yellow-400 border-yellow-400 text-black"
                                                                : "bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-yellow-400"
                                                                }`}
                                                        >
                                                            {date.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Category */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Category</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => setSelectedCategory("")}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${selectedCategory === ""
                                                            ? "bg-yellow-400 border-yellow-400 text-black"
                                                            : "bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-yellow-400"
                                                            }`}
                                                    >
                                                        All
                                                    </button>
                                                    {categories.map(cat => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${selectedCategory === cat
                                                                ? "bg-yellow-400 border-yellow-400 text-black"
                                                                : "bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-yellow-400"
                                                                }`}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Language */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Language</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => setSelectedLanguage("")}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${selectedLanguage === ""
                                                            ? "bg-yellow-400 border-yellow-400 text-black"
                                                            : "bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-yellow-400"
                                                            }`}
                                                    >
                                                        All
                                                    </button>
                                                    {languages.map(lang => (
                                                        <button
                                                            key={lang}
                                                            onClick={() => setSelectedLanguage(selectedLanguage === lang ? "" : lang)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${selectedLanguage === lang
                                                                ? "bg-yellow-400 border-yellow-400 text-black"
                                                                : "bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-yellow-400"
                                                                }`}
                                                        >
                                                            {lang}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
                                <Link href="/upload" className="hover:text-yellow-400 transition-colors flex items-center gap-1">
                                    <Upload size={16} />
                                    Upload
                                </Link>

                                <button onClick={() => setIsDownloadOpen(true)} className="hover:text-yellow-400 transition-colors flex items-center gap-1 relative">
                                    <ShoppingBag size={16} />
                                    Downloads
                                    {downloadList.length > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                            {downloadList.length}
                                        </span>
                                    )}
                                </button>

                                {user?.uid === ADMIN_ID && (
                                    <Link href="/admin" className="hover:text-yellow-400 transition-colors flex items-center gap-1 relative">
                                        <ShieldAlert size={16} />
                                        Admin
                                        {pendingCount > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                                {pendingCount}
                                            </span>
                                        )}
                                    </Link>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 transition-colors">
                                    {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                                </button>

                                {user ? (
                                    <div className="relative pl-4 border-l border-gray-200 dark:border-gray-800">
                                        <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] p-1 pr-3 rounded-full transition-colors">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full ring-2 ring-yellow-400" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold">
                                                    {user.displayName?.[0] || "U"}
                                                </div>
                                            )}
                                            <span className="text-sm font-medium text-black dark:text-white hidden lg:block">
                                                {user.displayName?.split(" ")[0]}
                                            </span>
                                            <ChevronDown size={14} className="text-gray-500" />
                                        </button>

                                        {isProfileOpen && (
                                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-2">
                                                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 mb-2">
                                                    <p className="text-sm font-bold text-black dark:text-white truncate">{user.displayName}</p>
                                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                </div>
                                                <Link href={`/user/${user.uid}`} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252525]" onClick={() => setIsProfileOpen(false)}>
                                                    <UserIcon size={16} />
                                                    My Profile
                                                </Link>
                                                {user.uid === ADMIN_ID && (
                                                    <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 font-bold" onClick={() => setIsProfileOpen(false)}>
                                                        <ShieldAlert size={16} />
                                                        Admin Dashboard
                                                    </Link>
                                                )}
                                                <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-left">
                                                    <LogOut size={16} />
                                                    Logout
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button onClick={googleLogin} className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-6 rounded-full text-sm transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-yellow-400/20">
                                        Login
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center gap-4">
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-black dark:text-white p-2">
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white dark:bg-[#050505] border-t border-gray-200 dark:border-gray-800">
                        <div className="px-4 py-4 space-y-3">
                            <Link href="/upload" className="block py-2 text-gray-600 dark:text-gray-300 hover:text-yellow-400">Upload</Link>
                            <button onClick={() => setIsDownloadOpen(true)} className="block w-full text-left py-2 text-gray-600 dark:text-gray-300 hover:text-yellow-400">
                                Downloads ({downloadList.length})
                            </button>
                            {user?.uid === ADMIN_ID && (
                                <Link href="/admin" className="block py-2 text-yellow-600 dark:text-yellow-400 font-bold">
                                    Admin {pendingCount > 0 && `(${pendingCount})`}
                                </Link>
                            )}
                            {user ? (
                                <>
                                    <Link href={`/user/${user.uid}`} className="block py-2 text-gray-600 dark:text-gray-300">My Profile</Link>
                                    <button onClick={logout} className="block w-full text-left py-2 text-red-600">Logout</button>
                                </>
                            ) : (
                                <button onClick={googleLogin} className="block w-full bg-yellow-400 text-black font-bold py-2 px-4 rounded-lg">Login</button>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Download Modal */}
            {isDownloadOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsDownloadOpen(false)}>
                    <div className="bg-white dark:bg-[#1f1f1f] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-black">Download Bag</h3>
                            <button onClick={() => setIsDownloadOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 max-h-96 overflow-y-auto">
                            {downloadList.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No memes in download bag</p>
                            ) : (
                                <div className="space-y-3">
                                    {downloadList.map((meme) => (
                                        <div key={meme.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#252525] rounded-lg">
                                            <img src={meme.thumbnail_url || meme.file_url} className="w-12 h-12 rounded object-cover" alt={meme.title} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold truncate">{meme.title}</p>
                                                <p className="text-xs text-gray-500">{meme.media_type}</p>
                                            </div>
                                            <button onClick={() => removeFromDownloadList(meme.id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full text-red-600">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {downloadList.length > 0 && (
                            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                                <button onClick={clearDownloadList} className="flex-1 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                                    Clear All
                                </button>
                                <button onClick={handleBatchDownload} className="flex-1 py-2.5 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-500 flex items-center justify-center gap-2">
                                    <Download size={16} />
                                    Download All
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </>
    );
}
