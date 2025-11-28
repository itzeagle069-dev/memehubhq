"use client";

import { useState } from "react";
import { Heart, Share2, Download, MessageCircle, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDownloadList } from "@/context/DownloadContext";
import { toast } from "react-hot-toast";

export default function MemeCard({ meme }) {
    const { user } = useAuth();
    const { addToDownloadList } = useDownloadList();
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [liked, setLiked] = useState(false);

    const handleDownload = () => {
        addToDownloadList(meme);
        toast.success("Added to downloads!");

        // Force download
        const link = document.createElement("a");
        link.href = meme.file_url;
        link.download = meme.title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleShare = () => {
        navigator.clipboard.writeText(`${window.location.origin}/meme/${meme.id}`);
        toast.success("Link copied to clipboard!");
    };

    const toggleLike = () => {
        setLiked(!liked);
        // TODO: Update in Firestore
    };

    return (
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-xl transition-shadow duration-300">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {meme.uploader_pic ? (
                        <img src={meme.uploader_pic} alt={meme.uploader_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-black">
                            {meme.uploader_name?.[0] || "U"}
                        </div>
                    )}
                    <div>
                        <h3 className="font-bold text-black dark:text-white text-sm">{meme.uploader_name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {meme.createdAt?.seconds ? new Date(meme.createdAt.seconds * 1000).toLocaleDateString() : "Just now"}
                        </p>
                    </div>
                </div>
                <button className="text-gray-400 hover:text-black dark:hover:text-white">
                    <Share2 size={20} onClick={handleShare} />
                </button>
            </div>

            {/* Content */}
            <div className="relative bg-black group">
                {meme.media_type === "video" ? (
                    <video
                        src={meme.file_url}
                        className="w-full max-h-[500px] object-contain"
                        controls
                        poster={meme.thumbnail_url}
                    />
                ) : meme.media_type === "audio" ? (
                    <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
                        <audio src={meme.file_url} controls className="w-3/4" />
                    </div>
                ) : (
                    <img
                        src={meme.file_url}
                        alt={meme.title}
                        className="w-full h-auto max-h-[500px] object-contain"
                        loading="lazy"
                    />
                )}
            </div>

            {/* Footer */}
            <div className="p-4">
                <h2 className="text-lg font-bold text-black dark:text-white mb-2 line-clamp-2">{meme.title}</h2>

                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleLike}
                            className={`flex items-center gap-2 transition-colors ${liked ? "text-red-500" : "text-gray-500 dark:text-gray-400 hover:text-red-500"}`}
                        >
                            <Heart size={24} fill={liked ? "currentColor" : "none"} />
                            <span className="text-sm font-medium">{meme.reactions?.haha || 0}</span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors">
                            <MessageCircle size={24} />
                            <span className="text-sm font-medium">0</span>
                        </button>
                    </div>

                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-green-500 transition-colors"
                    >
                        <Download size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
}
