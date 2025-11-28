"use client";

import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Download, Smile, Trash2, Music } from "lucide-react";

export default function ProfilePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [myMemes, setMyMemes] = useState([]);
    const [stats, setStats] = useState({ views: 0, downloads: 0, hahas: 0 });
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    useEffect(() => {
        const fetchMyMemes = async () => {
            if (!user) return;

            try {
                const q = query(
                    collection(db, "memes"),
                    where("uploader_id", "==", user.uid)
                );

                const snapshot = await getDocs(q);
                const memes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                let totalViews = 0;
                let totalDownloads = 0;
                let totalHahas = 0;

                memes.forEach(meme => {
                    totalViews += meme.views || 0;
                    totalDownloads += meme.downloads || 0;
                    totalHahas += meme.reactions?.haha || 0;
                });

                setStats({ views: totalViews, downloads: totalDownloads, hahas: totalHahas });
                memes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setMyMemes(memes);
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setFetching(false);
            }
        };

        fetchMyMemes();
    }, [user]);

    const handleDelete = async (memeId) => {
        if (!confirm("Permanently delete this meme?")) return;
        try {
            await deleteDoc(doc(db, "memes", memeId));
            setMyMemes(prev => prev.filter(m => m.id !== memeId));
        } catch (error) {
            alert("Error deleting meme");
        }
    };

    if (loading || fetching) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="bg-white dark:bg-[#111] rounded-3xl p-8 mb-10 border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center gap-8 shadow-xl">
                <img
                    src={user?.photoURL}
                    alt={user?.displayName || "Profile"}
                    className="w-32 h-32 rounded-full border-4 border-yellow-400 shadow-2xl"
                />
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-4xl font-black text-black dark:text-white mb-2">{user?.displayName}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">{user?.email}</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        <StatCard icon={<Eye className="text-blue-500" />} label="Total Reach" value={stats.views} />
                        <StatCard icon={<Download className="text-green-500" />} label="Downloads" value={stats.downloads} />
                        <StatCard icon={<Smile className="text-yellow-500" />} label="Reactions" value={stats.hahas} />
                    </div>
                </div>
            </div>

            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 dark:text-white">
                <span className="bg-yellow-400 w-2 h-8 rounded-full"></span>
                My Uploads ({myMemes.length})
            </h2>

            {myMemes.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-[#111] rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-gray-500 mb-4">You haven't uploaded any memes yet.</p>
                    <button onClick={() => router.push('/upload')} className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-full font-bold">
                        Upload First Meme
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {myMemes.map((meme) => (
                        <div key={meme.id} className="group relative bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-all">
                            <div className="aspect-square bg-black relative flex items-center justify-center">
                                {meme.media_type === "video" || meme.file_url.endsWith(".mp4") ? (
                                    <video src={meme.file_url} className="w-full h-full object-cover" />
                                ) : meme.media_type === "raw" || meme.file_url.endsWith(".mp3") ? (
                                    <Music className="text-yellow-400 w-12 h-12" />
                                ) : (
                                    <img src={meme.file_url} alt={meme.title || "Meme"} className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => handleDelete(meme.id)}
                                        className="p-3 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"
                                        title="Delete Meme"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold truncate dark:text-white mb-2">{meme.title}</h3>
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span className="flex items-center gap-1"><Eye size={12} /> {meme.views || 0}</span>
                                    <span className="flex items-center gap-1"><Download size={12} /> {meme.downloads || 0}</span>
                                    <span className="flex items-center gap-1"><Smile size={12} /> {meme.reactions?.haha || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))}
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
