"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useDownloadList } from "@/context/DownloadContext";
import { Menu, X, Search, Upload, LogOut, User as UserIcon, Sun, Moon, ChevronDown, ShoppingBag, Trash2, ShieldAlert, Download, Filter, Check, Star, Music } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { toast } from "react-hot-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

const ADMIN_ID = "VZCDwbnsLxcLdEcjabk8wK0pEv33";

export default function Navbar() {
    const { user, googleLogin, logout } = useAuth();
    const { downloadList, removeFromDownloadList, clearDownloadList } = useDownloadList();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [isScrolled, setIsScrolled] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(true);
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
        const handleScroll = () => {
            const y = window.scrollY;
            const heroThreshold = window.innerHeight * 0.9;

            if (pathname === '/') {
                // On Home: Navbar solid after Hero
                setIsScrolled(y > heroThreshold);
                // Mobile Search: Visible at top (<100px) OR after Hero. Hidden in between.
                setShowMobileSearch(y < 100 || y > heroThreshold);
            } else {
                // On other pages: Always solid and visible
                setIsScrolled(true);
                setShowMobileSearch(true);
            }
        };

        // Initial check
        handleScroll();

        window.addEventListener("scroll", handleScroll);
        // Also listen to resize to update innerHeight check
        window.addEventListener("resize", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleScroll);
        };
    }, [pathname]);

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

        if (downloadList.length === 0) return;

        const toastId = toast.loading(`Compressing ${downloadList.length} memes...`);

        try {
            const zip = new JSZip();
            let count = 0;

            // Fetch all files
            const downloadPromises = downloadList.map(async (meme) => {
                try {
                    const response = await fetch(meme.file_url);
                    const blob = await response.blob();
                    const ext = meme.media_type === 'video' ? 'mp4' : meme.media_type === 'audio' ? 'mp3' : 'jpg';
                    const filename = `${meme.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}_${meme.id}.${ext}`;
                    zip.file(filename, blob);
                    count++;
                } catch (e) {
                    console.error(`Failed to download ${meme.id}:`, e);
                }
            });

            await Promise.all(downloadPromises);

            if (count === 0) {
                toast.error("Failed to download files. Check console.", { id: toastId });
                return;
            }

            toast.loading("Generating ZIP file...", { id: toastId });

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `memehub_collection_${new Date().toISOString().slice(0, 10)}.zip`);

            toast.success(`Downloaded ${count} memes as ZIP!`, { id: toastId });
            clearDownloadList();
            setIsDownloadOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Error creating ZIP file", { id: toastId });
        }
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
                            <span className={`text-2xl font-black tracking-tighter transition-colors ${isScrolled ? "text-black dark:text-white" : "text-white"}`}>
                                MemeHub<span className="text-yellow-400">HQ</span>
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-4 lg:gap-8">
                            <div className="relative group" ref={filterRef}>
                                <form onSubmit={handleSearch} className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className={`h-4 w-4 group-focus-within:text-yellow-400 transition-colors ${isScrolled ? "text-gray-400" : "text-white/60"}`} />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search..."
                                        className="bg-gray-100 dark:bg-[#1a1a1a] text-black dark:text-white text-sm rounded-full pl-10 pr-10 py-2 w-40 lg:w-72 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowFilter(!showFilter)}
                                        className={`absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-yellow-400 transition-colors ${showFilter || activeFiltersCount > 0 ? "text-yellow-400" : (isScrolled ? "text-gray-400" : "text-white/60")}`}
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

                            <div className={`flex items-center gap-3 lg:gap-6 text-sm font-medium transition-colors ${isScrolled ? "text-gray-600 dark:text-gray-300" : "text-white/90 hover:text-white"}`}>
                                <Link href="/upload" className="hover:text-yellow-400 transition-colors flex items-center gap-1">
                                    <Upload size={18} />
                                    <span className="hidden lg:inline">Upload</span>
                                </Link>

                                <Link href="/favorites" className="hover:text-yellow-400 transition-colors flex items-center gap-1">
                                    <Star size={18} />
                                    <span className="hidden lg:inline">Favorites</span>
                                </Link>

                                <button onClick={() => setIsDownloadOpen(true)} className="hover:text-yellow-400 transition-colors flex items-center gap-1 relative">
                                    <ShoppingBag size={18} />
                                    <span className="hidden lg:inline">Downloads</span>
                                    {downloadList.length > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                            {downloadList.length}
                                        </span>
                                    )}
                                </button>

                                {user?.uid === ADMIN_ID && (
                                    <Link href="/admin" className="hover:text-yellow-400 transition-colors flex items-center gap-1 relative">
                                        <ShieldAlert size={18} />
                                        <span className="hidden lg:inline">Admin</span>
                                        {pendingCount > 0 && (
                                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                                {pendingCount}
                                            </span>
                                        )}
                                    </Link>
                                )}

                                <Link href="/request" className="bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition-colors border border-yellow-400/20">
                                    <span className="text-lg">✨</span>
                                    <span className="hidden lg:inline">Request</span>
                                </Link>

                            </div>

                            <div className="flex items-center gap-4">
                                <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${isScrolled ? "hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-600 dark:text-gray-300" : "hover:bg-white/10 text-white"}`}>
                                    {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                                </button>

                                {user ? (
                                    <div className={`relative pl-4 border-l ${isScrolled ? "border-gray-200 dark:border-gray-800" : "border-white/20"}`}>
                                        <button onClick={() => setIsProfileOpen(!isProfileOpen)} className={`flex items-center gap-2 p-1 pr-3 rounded-full transition-colors ${isScrolled ? "hover:bg-gray-100 dark:hover:bg-[#1a1a1a]" : "hover:bg-white/10"}`}>
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full ring-2 ring-yellow-400" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold">
                                                    {user.displayName?.[0] || "U"}
                                                </div>
                                            )}
                                            <span className={`text-sm font-medium hidden lg:block ${isScrolled ? "text-black dark:text-white" : "text-white"}`}>
                                                {user.displayName?.split(" ")[0]}
                                            </span>
                                            <ChevronDown size={14} className={isScrolled ? "text-gray-500" : "text-white/70"} />
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
                                                <Link href="/favorites" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252525]" onClick={() => setIsProfileOpen(false)}>
                                                    <Star size={16} />
                                                    My Favorites
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

                        {/* Mobile Actions + Menu Button */}
                        <div className="md:hidden flex items-center gap-2">
                            {/* Download Bag - Mobile */}
                            <button
                                onClick={() => setIsDownloadOpen(true)}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 hover:text-yellow-400 transition-colors relative"
                                aria-label="Download bag"
                            >
                                <ShoppingBag size={22} />
                                {downloadList.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                        {downloadList.length}
                                    </span>
                                )}
                            </button>

                            {/* Hamburger Menu */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className={`p-2 transition-colors ${isScrolled ? "text-black dark:text-white" : "text-white"}`}
                                aria-label="Menu"
                            >
                                {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Search Bar - Scroll visibility logic */}
                    <div className={`md:hidden transition-all duration-500 ease-in-out overflow-hidden ${showMobileSearch ? "max-h-24 opacity-100 pb-4" : "max-h-0 opacity-0 pb-0"}`}>
                        <form onSubmit={handleSearch} className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search memes..."
                                className="bg-gray-100 dark:bg-[#1a1a1a] text-black dark:text-white text-sm rounded-full pl-10 pr-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                        </form>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white dark:bg-[#050505] border-t border-gray-200 dark:border-gray-800 h-screen overflow-y-auto">
                        <div className="px-4 py-6 space-y-4">
                            {/* Search - Mobile */}


                            <div className="space-y-2">
                                <Link
                                    href="/upload"
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-400 text-black font-black hover:bg-yellow-500 transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <Upload size={20} />
                                    Upload Meme
                                </Link>

                                <Link
                                    href="/request"
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] text-black dark:text-white font-bold hover:text-yellow-400 transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <span className="text-xl">✨</span>
                                    Request a Meme
                                </Link>
                            </div>

                            <hr className="border-gray-100 dark:border-[#222]" />

                            <div className="space-y-1">
                                <Link
                                    href="/favorites"
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <Star size={20} />
                                    My Favorites
                                </Link>

                                {/* Admin Link */}
                                {user?.uid === ADMIN_ID && (
                                    <Link
                                        href="/admin"
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-yellow-600 dark:text-yellow-400 font-bold hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <ShieldAlert size={20} />
                                        Admin Dashboard {pendingCount > 0 && `(${pendingCount})`}
                                    </Link>
                                )}
                            </div>

                            <hr className="border-gray-100 dark:border-[#222]" />

                            {/* User Menu */}
                            {user ? (
                                <div className="space-y-1">
                                    <div className="px-4 py-2 mb-2">
                                        <p className="text-sm font-bold text-black dark:text-white">{user.displayName}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>

                                    <Link
                                        href={`/user/${user.uid}`}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <UserIcon size={20} />
                                        My Profile
                                    </Link>

                                    <button
                                        onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                                    >
                                        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                                        {theme === "dark" ? "Light Mode" : "Dark Mode"}
                                    </button>

                                    <button
                                        onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                    >
                                        <LogOut size={20} />
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <button
                                        onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
                                    >
                                        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                                        {theme === "dark" ? "Light Mode" : "Dark Mode"}
                                    </button>

                                    <button
                                        onClick={() => { googleLogin(); setIsMobileMenuOpen(false); }}
                                        className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Sign in with Google
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Advanced Download Modal */}
            {isDownloadOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200" onClick={() => setIsDownloadOpen(false)}>
                    <div className="bg-white dark:bg-[#111] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>

                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#151515]/50 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className="bg-yellow-400 p-2 rounded-xl text-black">
                                    <ShoppingBag size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-black dark:text-white">Download Bag</h3>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{downloadList.length} Items Selected</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDownloadOpen(false)}
                                className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white dark:bg-[#111]">
                            {downloadList.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-center">
                                    <div className="bg-gray-100 dark:bg-[#1a1a1a] p-4 rounded-full mb-4">
                                        <ShoppingBag size={40} className="text-gray-300 dark:text-gray-700" />
                                    </div>
                                    <p className="text-gray-500 font-bold">Your bag is empty.</p>
                                    <p className="text-xs text-gray-400 mt-1">Add memes to download them in bulk!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {downloadList.map((meme) => (
                                        <div key={meme.id} className="group flex items-center gap-4 p-3 bg-gray-50 dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-[#222] rounded-2xl border border-transparent hover:border-yellow-400/30 transition-all">
                                            {/* Thumbnail */}
                                            <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-black">
                                                {meme.media_type === 'video' ? (
                                                    <video src={meme.file_url} className="w-full h-full object-cover opacity-80" />
                                                ) : meme.media_type === 'audio' ? (
                                                    <div className="w-full h-full flex items-center justify-center bg-purple-900"><Music size={20} className="text-white" /></div>
                                                ) : (
                                                    <img src={meme.thumbnail_url || meme.file_url} className="w-full h-full object-cover" />
                                                )}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                                                    <div className="bg-white/20 backdrop-blur-sm p-1 rounded-full">
                                                        <Check size={12} className="text-white" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm text-black dark:text-gray-200 truncate pr-2">{meme.title}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-black uppercase ${meme.media_type === 'video' ? 'bg-blue-200' : meme.media_type === 'audio' ? 'bg-purple-200' : 'bg-green-200'}`}>
                                                        {meme.media_type}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 uppercase font-medium">
                                                        {meme.file_url.split('.').pop().toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action */}
                                            <button
                                                onClick={() => removeFromDownloadList(meme.id)}
                                                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title="Remove"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {downloadList.length > 0 && (
                            <div className="p-6 bg-gray-50 dark:bg-[#151515] border-t border-gray-100 dark:border-gray-800 text-center">
                                <div className="flex gap-3">
                                    <button
                                        onClick={clearDownloadList}
                                        className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-[#222] transition-colors text-sm"
                                    >
                                        Clear Selection
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Implement dropdown or toggle here for options if needed?
                                            // For batch download, user usually just wants everything.
                                            // The user request specifically mentioned "card download button" for "single download".
                                            // I will leave the batch download as ZIP for now unless requested.
                                            handleBatchDownload();
                                        }}
                                        className="flex-[2] py-4 rounded-2xl font-black bg-yellow-400 text-black hover:bg-yellow-500 shadow-lg shadow-yellow-400/20 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                                    >
                                        <Download size={20} />
                                        Download ZIP ({downloadList.length})
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-4 font-medium">
                                    Files will be compressed into a single ZIP archive.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </>
    );
}
