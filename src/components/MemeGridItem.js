import Link from "next/link";
import { useState, useRef } from "react";
import { Play, Check, Share2, MoreVertical, Edit2, Trash2, Download, Music, Square, Star, ChevronDown, Video, Mic, Volume2, VolumeX } from "lucide-react";
import useOnScreen from "@/hooks/useOnScreen";

export default function MemeGridItem({
    meme,
    user,
    isAdmin,
    isSelectionMode,
    selectedMemes,
    openMeme,
    toggleMemeSelection,
    handleReaction,
    handleDownload,
    handleShare,
    handleFavorite,
    addToDownloadList,
    removeFromDownloadList,
    isInDownloadList,
    userFavorites,
    canDelete,
    openMenuId,
    setOpenMenuId,
    openEditModal,
    handleDelete
}) {
    const ref = useRef(null);
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    // Use a larger rootMargin to pre-load content
    const isVisible = useOnScreen(ref, "400px");

    return (
        <div ref={ref} className="h-full">
            {isVisible ? (
                <div
                    onClick={() => openMeme(meme)}
                    className="group relative rounded-2xl bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#252525] hover:shadow-2xl hover:shadow-yellow-400/10 dark:hover:border-yellow-400/30 transition-all duration-300 flex flex-col cursor-pointer h-full"
                >
                    {/* MEDIA DISPLAY */}
                    <div className="aspect-[4/3] bg-black flex items-center justify-center relative overflow-hidden rounded-t-2xl">
                        {/* 1. BACKGROUND LAYER (Blurred) */}
                        <div className="absolute inset-0 z-0 overflow-hidden">
                            {/* Blur BG: Prioritize Thumb, then Video, then File */}
                            {meme.thumbnail_url ? (
                                <img src={meme.thumbnail_url} className="w-full h-full object-cover blur-xl scale-125 opacity-100" />
                            ) : (meme.media_type === "video" || meme.file_url.endsWith(".mp4")) ? (
                                <video src={meme.file_url} className="w-full h-full object-cover blur-xl scale-125 opacity-100" muted />
                            ) : (meme.media_type !== "raw" && meme.media_type !== "audio") ? (
                                <img src={meme.file_url} className="w-full h-full object-cover blur-xl scale-125 opacity-100" />
                            ) : null}
                        </div>

                        {/* 2. FOREGROUND LAYER (Contained + Brightness) */}
                        <div className="absolute inset-0 z-10 flex items-center justify-center">
                            {meme.thumbnail_url ? (
                                <img src={meme.thumbnail_url} alt={meme.title} className="w-full h-full object-contain brightness-110 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            ) : (meme.media_type === "video" || meme.file_url.endsWith(".mp4")) ? (
                                <video src={meme.file_url} className="w-full h-full object-contain brightness-110" preload="metadata" muted />
                            ) : (meme.media_type === "raw" || meme.media_type === "audio") ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-black text-white p-4">
                                    <Music className="w-16 h-16 mb-4 text-yellow-400" />
                                </div>
                            ) : (
                                <img src={meme.file_url} alt={meme.title} className="w-full h-full object-contain brightness-110 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            )}
                        </div>

                        {/* 3. OVERLAYS (Play Icon) */}
                        {(meme.media_type === "video" || meme.media_type === "raw" || meme.media_type === "audio") && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                                    <Play fill="currentColor" className="ml-1 w-5 h-5" />
                                </div>
                            </div>
                        )}

                        {/* 4. TYPE BADGE */}
                        <div className="absolute top-2 right-2 z-20 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm uppercase">
                            {meme.media_type === "raw" || meme.media_type === "audio" ? "AUDIO" : meme.media_type}
                        </div>

                        {/* Admin Multi-Select Checkbox */}
                        {isAdmin && isSelectionMode && (
                            <div
                                className="absolute top-2 left-2 z-30"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMemeSelection(meme.id);
                                }}
                            >
                                <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${selectedMemes.includes(meme.id)
                                    ? "bg-yellow-400 border-yellow-400"
                                    : "bg-white/20 border-white backdrop-blur-sm hover:bg-white/30"
                                    }`}>
                                    {selectedMemes.includes(meme.id) && (
                                        <Check size={18} className="text-black font-bold" />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CARD FOOTER */}
                    <div className="p-3 flex flex-col gap-2 flex-1">
                        {/* Title - 2 lines max */}
                        <h3 className="font-semibold text-xs leading-tight line-clamp-2 text-black dark:text-white">{meme.title}</h3>

                        {/* Username + Counts */}
                        <div className="flex items-center justify-between gap-2">
                            <Link
                                href={`/user/${meme.uploader_id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 hover:opacity-70 transition-opacity min-w-0 flex-1"
                            >
                                <img src={meme.uploader_pic || "https://ui-avatars.com/api/?name=User"} alt={meme.uploader_name || "User"} className="w-4 h-4 rounded-full flex-shrink-0" />
                                <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate hover:text-yellow-500 transition-colors">{meme.uploader_name}</span>
                            </Link>

                            {/* Counts (Reaction + Download) */}
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium flex-shrink-0">
                                <span className="flex items-center gap-0.5">😂 {meme.reactions?.haha || 0}</span>
                                <span className="flex items-center gap-0.5"><Download size={10} /> {meme.downloads || 0}</span>
                            </div>
                        </div>

                        {/* Bottom Row: Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 gap-2">
                            {/* Reaction Button */}
                            <button
                                onClick={(e) => handleReaction(e, meme)}
                                className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full transition-colors text-[10px] font-bold ${meme.reactedBy?.includes(user?.uid)
                                    ? "bg-yellow-400 text-black"
                                    : "bg-yellow-50 dark:bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-400/20"
                                    }`}
                            >
                                😂
                            </button>

                            <div className="flex items-center gap-1 flex-shrink-0">
                                {/* Download Button */}
                                <button
                                    onClick={(e) => handleDownload(e, meme.id, meme.file_url, meme.title)}
                                    className="px-2 py-1 rounded-lg bg-yellow-400 text-black text-[10px] font-bold hover:bg-yellow-500 transition-colors flex items-center gap-1 active:scale-95"
                                    title="Download"
                                >
                                    Download
                                </button>

                                {/* Add to Downloads (Checkbox) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isInDownloadList(meme.id)) {
                                            removeFromDownloadList(meme.id);
                                        } else {
                                            addToDownloadList(meme);
                                        }
                                    }}
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-blue-500 transition-colors relative"
                                    title={isInDownloadList(meme.id) ? "Added to downloads" : "Add to downloads"}
                                >
                                    {isInDownloadList(meme.id) ? (
                                        <div className="relative">
                                            <Square size={16} className="text-blue-500" />
                                            <Download size={10} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" />
                                        </div>
                                    ) : (
                                        <Square size={16} />
                                    )}
                                </button>

                                {/* Favorite Button */}
                                <button
                                    onClick={(e) => handleFavorite(e, meme)}
                                    className={`p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${userFavorites.includes(meme.id) ? "text-yellow-400" : "text-gray-400 hover:text-yellow-500"}`}
                                    title="Favorite"
                                >
                                    <Star size={14} fill={userFavorites.includes(meme.id) ? "currentColor" : "none"} />
                                </button>

                                {/* Share Button */}
                                <button
                                    onClick={(e) => handleShare(e, meme)}
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    title="Share"
                                >
                                    <Share2 size={14} />
                                </button>

                                {/* Menu */}
                                {(canDelete && (canDelete(meme) || isAdmin)) && (
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === meme.id ? null : meme.id);
                                            }}
                                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                                        >
                                            <MoreVertical size={14} />
                                        </button>
                                        {openMenuId === meme.id && (
                                            <div className="absolute right-0 top-full mt-1 w-24 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(meme);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-left text-xs text-black dark:text-white"
                                                >
                                                    <Edit2 size={12} /> Edit
                                                </button>
                                                {canDelete(meme) && (
                                                    <button
                                                        onClick={(e) => {
                                                            handleDelete(e, meme);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 text-left text-xs"
                                                    >
                                                        <Trash2 size={12} /> Delete
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // PLACEHOLDER (Virtualized)
                <div className="aspect-[4/3] bg-gray-100 dark:bg-[#1a1a1a] rounded-2xl animate-pulse" />
            )}
        </div>
    );
}
