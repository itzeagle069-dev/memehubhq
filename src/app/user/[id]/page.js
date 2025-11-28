"use client";

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, increment, arrayUnion, arrayRemove } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Eye, Download, Smile, Music, Play, X, BookmarkPlus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useDownloadList } from "@/context/DownloadContext";
import { toast } from "react-hot-toast";

// Helper for relative time
function timeAgo(timestamp) {
    if (!timestamp) return "Unknown";
    const seconds = Math.floor((new Date() - timestamp.toDate()) / 1000);
    if (seconds < 60) return Math.floor(seconds) + " seconds ago";
    if (seconds < 3600) return Math.floor(seconds / 60) + " minutes ago";
    if (seconds < 86400) return Math.floor(seconds / 3600) + " hours ago";
    return Math.floor(seconds / 86400) + " days ago";
}

export default function UserProfilePage() {
    const params = useParams();
    const userId = params.id;
    const { user } = useAuth();
    const { addToDownloadList, removeFromDownloadList, isInDownloadList } = useDownloadList();

    const [memes, setMemes] = useState([]);
    const [userInfo, setUserInfo] = useState(null);
    const [stats, setStats] = useState({ views: 0, downloads: 0, hahas: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedMeme, setSelectedMeme] = useState(null);

    useEffect(() => {
        const fetchUserMemes = async () => {
            if (!userId) return;

            try {
                const q = query(
                    collection(db, "memes"),
                    where("uploader_id", "==", userId),
                    where("status", "==", "published") // Only show published memes
                );

                const snapshot = await getDocs(q);
                const fetchedMemes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                if (fetchedMemes.length > 0) {
                    const firstMeme = fetchedMemes[0];
                    setUserInfo({
                        name: firstMeme.uploader_name,
                        pic: firstMeme.uploader_pic,
                        id: firstMeme.uploader_id
                    });

                    // Calculate Stats
                    let totalViews = 0;
                    let totalDownloads = 0;
                    let totalHahas = 0;

                    fetchedMemes.forEach(meme => {
                        totalViews += meme.views || 0;
                        totalDownloads += meme.downloads || 0;
                        totalHahas += meme.reactions?.haha || 0;
                    });

                    setStats({ views: totalViews, downloads: totalDownloads, hahas: totalHahas });

                    // Sort by newest
                    fetchedMemes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                }

                setMemes(fetchedMemes);
            } catch (error) {
                console.error("Error fetching user profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserMemes();
    }, [userId]);

    // Open meme modal and increment views
    const openMeme = async (meme) => {
        setSelectedMeme(meme);
        try {
            await updateDoc(doc(db, "memes", meme.id), {
                views: increment(1)
            });
            setMemes(prev => prev.map(m => m.id === meme.id ? { ...m, views: (m.views || 0) + 1 } : m));
        } catch (error) {
            console.error("Error updating views:", error);
        }
    };

    // Handle download
    const handleDownload = async (e, meme) => {
        e.stopPropagation();
        try {
            await updateDoc(doc(db, "memes", meme.id), {
                downloads: increment(1)
            });
            setMemes(prev => prev.map(m => m.id === meme.id ? { ...m, downloads: (m.downloads || 0) + 1 } : m));

            const url = meme.file_url;
            const filename = `${meme.title}.${meme.media_type === 'video' ? 'mp4' : meme.media_type === 'audio' ? 'mp3' : 'jpg'}`;

            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed:", error);
            window.open(meme.file_url, '_blank');
        }
    };

    // Handle reaction
    const handleReaction = async (e, meme) => {
        e.stopPropagation();
        if (!user) {
            toast.error("Please login to react");
            return;
        }

        const hasReacted = meme.reactedBy?.includes(user.uid);
        try {
            await updateDoc(doc(db, "memes", meme.id), {
                "reactions.haha": increment(hasReacted ? -1 : 1),
                reactedBy: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
            });

            setMemes(prev => prev.map(m => {
                if (m.id === meme.id) {
                    return {
                        ...m,
                        reactions: { ...m.reactions, haha: (m.reactions?.haha || 0) + (hasReacted ? -1 : 1) },
                        reactedBy: hasReacted
                            ? (m.reactedBy || []).filter(id => id !== user.uid)
                            : [...(m.reactedBy || []), user.uid]
                    };
                }
                return m;
            }));

            if (selectedMeme && selectedMeme.id === meme.id) {
                setSelectedMeme(prev => ({
                    ...prev,
                    reactions: { ...prev.reactions, haha: (prev.reactions?.haha || 0) + (hasReacted ? -1 : 1) },
                    reactedBy: hasReacted
                        ? (prev.reactedBy || []).filter(id => id !== user.uid)
                        : [...(prev.reactedBy || []), user.uid]
                }));
            }
        } catch (error) {
            console.error("Error updating reaction:", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!userInfo && !loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
                <h1 className="text-3xl font-black mb-4">User Not Found</h1>
                <p className="text-gray-500 mb-8">This user hasn't uploaded any approved memes yet or doesn't exist.</p>
                <Link href="/" className="bg-yellow-400 text-black px-6 py-3 rounded-full font-bold hover:bg-yellow-500 transition-colors">
                    Go Home
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-10">

            {/* PROFILE HEADER */}
            <div className="bg-white dark:bg-[#111] rounded-3xl p-8 mb-10 border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center gap-8 shadow-xl">
                <img
                    src={userInfo?.pic || "https://ui-avatars.com/api/?name=User"}
                    className="w-32 h-32 rounded-full border-4 border-yellow-400 shadow-2xl object-cover"
                />
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-4xl font-black text-black dark:text-white mb-2">{userInfo?.name}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Content Creator</p>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        <StatCard icon={<Eye className="text-blue-500" />} label="Total Reach" value={stats.views} />
                        <StatCard icon={<Download className="text-green-500" />} label="Downloads" value={stats.downloads} />
                        <StatCard icon={<Smile className="text-yellow-500" />} label="Reactions" value={stats.hahas} />
                    </div>
                </div>
            </div>

            {/* UPLOADS GRID */}
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 dark:text-white">
                <span className="bg-yellow-400 w-2 h-8 rounded-full"></span>
                Uploads ({memes.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {memes.map(meme => (
                    <div
                        key={meme.id}
                        onClick={() => openMeme(meme)}
                        className="group relative bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all cursor-pointer"
                    >
                        <div className="aspect-[4/3] bg-black relative flex items-center justify-center">
                            {/* Thumbnail Logic */}
                            {meme.thumbnail_url ? (
                                <img src={meme.thumbnail_url} className="w-full h-full object-cover" />
                            ) : meme.media_type === "video" || meme.file_url.endsWith(".mp4") ? (
                                <video src={meme.file_url} className="w-full h-full object-cover" />
                            ) : meme.media_type === "raw" || meme.media_type === "audio" || meme.file_url.endsWith(".mp3") ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-black">
                                    <Music className="text-yellow-400 w-12 h-12 mb-2" />
                                    <span className="text-white text-xs font-bold uppercase tracking-widest">Audio</span>
                                </div>
                            ) : (
                                <img src={meme.file_url} className="w-full h-full object-cover" />
                            )}

                            {/* Play Overlay */}
                            {(meme.media_type === "video" || meme.media_type === "audio" || meme.media_type === "raw") && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                        <Play fill="currentColor" className="ml-1 w-4 h-4" />
                                    </div>
                                </div>
                            )}

                            {/* Media Type Badge */}
                            <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm uppercase">
                                {meme.media_type === "raw" || meme.media_type === "audio" ? "AUDIO" : meme.media_type}
                            </div>
                        </div>

                        <div className="p-4">
                            <h3 className="font-bold truncate dark:text-white mb-2">{meme.title}</h3>

                            <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                                    <span className="flex items-center gap-1"><Eye size={12} /> {meme.views || 0}</span>
                                    <span className="flex items-center gap-1"><Download size={12} /> {meme.downloads || 0}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Add to Download List */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isInDownloadList(meme.id)) {
                                                removeFromDownloadList(meme.id);
                                            } else {
                                                addToDownloadList(meme);
                                            }
                                        }}
                                        className={`w-6 h-6 flex items-center justify-center rounded-md border-2 transition-all ${isInDownloadList(meme.id)
                                            ? "bg-black border-black text-white dark:bg-white dark:border-white dark:text-black"
                                            : "bg-transparent border-gray-300 dark:border-gray-600 hover:border-black dark:hover:border-white"
                                            }`}
                                        title={isInDownloadList(meme.id) ? "Remove from list" : "Add to list"}
                                    >
                                        {isInDownloadList(meme.id) && <Download size={12} strokeWidth={3} />}
                                    </button>

                                    {/* Reaction Button */}
                                    <button
                                        onClick={(e) => handleReaction(e, meme)}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors text-xs font-bold ${meme.reactedBy?.includes(user?.uid)
                                            ? "bg-yellow-400 text-black"
                                            : "bg-yellow-50 dark:bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-400/20"
                                            }`}
                                        title="React"
                                    >
                                        {meme.reactions?.haha || 0} 😂
                                    </button>

                                    {/* Direct Download Button */}
                                    <button
                                        onClick={(e) => handleDownload(e, meme)}
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
                ))}
            </div>

            {/* MEME MODAL */}
            {selectedMeme && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <div className="relative w-full max-w-6xl h-full max-h-[90vh] bg-white dark:bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl">
                        <button
                            onClick={() => setSelectedMeme(null)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-3 h-full">
                            {/* Media Section */}
                            <div className="md:col-span-2 bg-black flex items-center justify-center h-full">
                                {selectedMeme.media_type === "video" || selectedMeme.file_url.endsWith(".mp4") ? (
                                    <video src={selectedMeme.file_url} controls autoPlay className="max-w-full max-h-full" />
                                ) : selectedMeme.media_type === "raw" || selectedMeme.media_type === "audio" || selectedMeme.file_url.endsWith(".mp3") ? (
                                    <div className="text-center p-8">
                                        {selectedMeme.thumbnail_url && (
                                            <img src={selectedMeme.thumbnail_url} className="max-w-md max-h-64 mx-auto mb-6 rounded-lg" alt={selectedMeme.title} />
                                        )}
                                        <Music className="w-24 h-24 text-yellow-400 mx-auto mb-6 animate-pulse" />
                                        <audio src={selectedMeme.file_url} controls className="w-full min-w-[300px]" autoPlay />
                                    </div>
                                ) : (
                                    <img src={selectedMeme.file_url} className="max-w-full max-h-full object-contain" />
                                )}
                            </div>

                            {/* Info Section */}
                            <div className="bg-white dark:bg-[#111] p-6 flex flex-col h-full overflow-y-auto border-l border-gray-800">
                                <h2 className="text-2xl font-black text-black dark:text-white mb-2">{selectedMeme.title}</h2>

                                <Link
                                    href={`/user/${selectedMeme.uploader_id}`}
                                    className="flex items-center gap-2 mb-6 hover:opacity-70 transition-opacity w-fit"
                                >
                                    <img src={selectedMeme.uploader_pic || "https://ui-avatars.com/api/?name=User"} className="w-8 h-8 rounded-full" />
                                    <div>
                                        <p className="text-sm font-bold text-black dark:text-white hover:text-yellow-500 transition-colors">{selectedMeme.uploader_name}</p>
                                        <p className="text-xs text-gray-500">{timeAgo(selectedMeme.createdAt)}</p>
                                    </div>
                                </Link>

                                <div className="flex gap-2 mb-8">
                                    <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-[#222] text-xs font-bold text-gray-500 uppercase">
                                        {selectedMeme.category}
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-[#222] text-xs font-bold text-gray-500 uppercase">
                                        {selectedMeme.language}
                                    </span>
                                </div>

                                {selectedMeme.credit && (
                                    <div className="mb-6 p-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800">
                                        <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Credit / Source</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{selectedMeme.credit}</p>
                                    </div>
                                )}

                                <div className="mt-auto space-y-3">
                                    <button
                                        onClick={(e) => handleReaction(e, selectedMeme)}
                                        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${selectedMeme.reactedBy?.includes(user?.uid)
                                            ? "bg-yellow-400 text-black"
                                            : "bg-gray-100 dark:bg-[#222] text-black dark:text-white hover:bg-gray-200 dark:hover:bg-[#333]"
                                            }`}
                                    >
                                        {selectedMeme.reactions?.haha || 0} 😂
                                    </button>

                                    <button
                                        onClick={(e) => handleDownload(e, selectedMeme)}
                                        className="w-full flex items-center justify-center gap-2 bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold hover:bg-yellow-500 transition-colors shadow-lg"
                                    >
                                        <Download size={20} />
                                        Download
                                    </button>

                                    <div className="flex gap-2 text-xs text-gray-500 justify-center pt-3">
                                        <span className="flex items-center gap-1"><Eye size={14} /> {selectedMeme.views || 0} views</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1"><Download size={14} /> {selectedMeme.downloads || 0} downloads</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value }) {
    return (
        <div className="bg-gray-50 dark:bg-[#1a1a1a] px-5 py-3 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-3 min-w-[140px]">
            <div className="p-2 bg-white dark:bg-black rounded-full shadow-sm">
                {icon}
            </div>
            <div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{label}</p>
                <p className="text-xl font-black dark:text-white">{value}</p>
            </div>
        </div>
    );
}
