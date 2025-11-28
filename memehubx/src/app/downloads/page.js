"use client";

import { useDownloadList } from "@/context/DownloadContext";
import { Download, Trash2, X, Music, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function DownloadsPage() {
    const { downloadList, removeFromDownloadList, clearDownloadList } = useDownloadList();
    const [downloading, setDownloading] = useState(false);

    const downloadAll = async () => {
        if (downloadList.length === 0) {
            toast.error("No memes in download list");
            return;
        }

        setDownloading(true);
        const toastId = toast.loading(`Downloading ${downloadList.length} memes...`);

        try {
            const zip = new JSZip();

            for (let i = 0; i < downloadList.length; i++) {
                const meme = downloadList[i];
                toast.loading(`Downloading ${i + 1}/${downloadList.length}...`, { id: toastId });

                try {
                    const response = await fetch(meme.file_url);
                    const blob = await response.blob();

                    // Determine file extension
                    let ext = "file";
                    if (meme.media_type === "image") ext = "jpg";
                    else if (meme.media_type === "video") ext = "mp4";
                    else if (meme.media_type === "audio" || meme.media_type === "raw") ext = "mp3";

                    // Sanitize filename
                    const filename = `${meme.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${i + 1}.${ext}`;
                    zip.file(filename, blob);
                } catch (error) {
                    console.error(`Error downloading ${meme.title}:`, error);
                }
            }

            toast.loading("Creating ZIP file...", { id: toastId });
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `memehub_downloads_${Date.now()}.zip`);

            toast.success(`Downloaded ${downloadList.length} memes!`, { id: toastId });
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Failed to download memes", { id: toastId });
        } finally {
            setDownloading(false);
        }
    };

    if (downloadList.length === 0) {
        return (
            <div className="max-w-6xl mx-auto py-20 px-4 text-center">
                <div className="bg-white dark:bg-[#1a1a1a] p-12 rounded-3xl border border-gray-200 dark:border-gray-800">
                    <Download className="w-20 h-20 mx-auto mb-6 text-gray-300" />
                    <h1 className="text-3xl font-black mb-4">Download List is Empty</h1>
                    <p className="text-gray-500 mb-6">
                        Browse memes and click the download icon to add them to your list
                    </p>
                    <a href="/" className="inline-block px-6 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-500 transition-colors">
                        Browse Memes
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-10 px-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black">Download List</h1>
                    <p className="text-gray-500 mt-1">{downloadList.length} meme{downloadList.length !== 1 ? 's' : ''} ready to download</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={clearDownloadList}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    >
                        <Trash2 size={16} /> Clear All
                    </button>
                    <button
                        onClick={downloadAll}
                        disabled={downloading}
                        className="flex items-center gap-2 px-6 py-2 bg-yellow-400 text-black rounded-lg font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        <Download size={16} />
                        {downloading ? "Downloading..." : `Download All (${downloadList.length})`}
                    </button>
                </div>
            </div>

            {/* Meme Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {downloadList.map((meme, index) => (
                    <div key={meme.id} className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow">

                        {/* Media Preview */}
                        <div className="aspect-video bg-black flex items-center justify-center relative">
                            {meme.thumbnail_url ? (
                                <img src={meme.thumbnail_url} alt={meme.title} className="w-full h-full object-cover" />
                            ) : meme.media_type === "image" ? (
                                <img src={meme.file_url} alt={meme.title} className="w-full h-full object-cover" />
                            ) : meme.media_type === "video" ? (
                                <div className="relative w-full h-full">
                                    <video src={meme.file_url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                                            <Play fill="currentColor" className="ml-1 w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-black">
                                    <Music className="w-12 h-12 text-yellow-400" />
                                </div>
                            )}

                            {/* Remove Button */}
                            <button
                                onClick={() => removeFromDownloadList(meme.id)}
                                className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
                                title="Remove from list"
                            >
                                <X size={16} />
                            </button>

                            {/* Media Type Badge */}
                            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm uppercase">
                                {meme.media_type === "raw" || meme.media_type === "audio" ? "AUDIO" : meme.media_type}
                            </div>

                            {/* Index Badge */}
                            <div className="absolute bottom-2 left-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded">
                                #{index + 1}
                            </div>
                        </div>

                        {/* Meme Info */}
                        <div className="p-3">
                            <h3 className="font-bold text-sm truncate">{meme.title}</h3>
                            <p className="text-xs text-gray-500 mt-1">{meme.category} • {meme.language}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
