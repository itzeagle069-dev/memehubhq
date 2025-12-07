"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Loader2, Link as LinkIcon, Image as ImageIcon, Video, Type, Send, Wand2 } from "lucide-react";
import Link from "next/link";

const CLOUD_NAME = "ds6pks59z";
const UPLOAD_PRESET = "memehub_upload";

export default function RequestMemePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [mediaType, setMediaType] = useState("text"); // text, link, image, video
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [mediaLink, setMediaLink] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-yellow-400 w-10 h-10" /></div>;
    }

    if (!user) {
        return (
            <div className="flex flex-col h-screen items-center justify-center p-4 text-center">
                <h1 className="text-3xl font-black mb-4 dark:text-white">Login Required</h1>
                <p className="text-gray-500 mb-8">You need to be logged in to request a meme.</p>
                <Link href="/" className="bg-yellow-400 text-black px-6 py-3 rounded-full font-bold hover:bg-yellow-500 transition-colors">
                    Go Home
                </Link>
            </div>
        );
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));

        if (file.type.startsWith("image/")) {
            setMediaType("image");
        } else if (file.type.startsWith("video/")) {
            setMediaType("video");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim()) {
            toast.error("Please enter a title");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Submitting request...");

        try {
            let finalMediaUrl = mediaLink;

            // Upload file if present
            if (mediaFile) {
                toast.loading("Uploading media...", { id: toastId });
                const formData = new FormData();
                formData.append("file", mediaFile);
                formData.append("upload_preset", UPLOAD_PRESET);

                // Determine resource type for Cloudinary
                const resourceType = mediaType === "video" ? "video" : "image";

                const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
                    method: "POST",
                    body: formData,
                });

                const data = await res.json();
                if (data.secure_url) {
                    finalMediaUrl = data.secure_url;
                } else {
                    throw new Error("Upload failed");
                }
            }

            await addDoc(collection(db, "meme_requests"), {
                userId: user.uid,
                username: user.displayName || "Anonymous",
                userAvatar: user.photoURL || null,
                title: title.trim(),
                description: description.trim(),
                mediaType,
                mediaUrl: finalMediaUrl || null,
                status: "pending", // pending, reviewed, completed, rejected
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            toast.success("Request submitted successfully!", { id: toastId });
            router.push(`/user/${user.uid}`);

        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Failed to submit request", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto pt-24 pb-12 px-4">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center p-3 bg-yellow-100 dark:bg-yellow-400/20 rounded-2xl mb-4">
                    <Wand2 className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h1 className="text-4xl font-black text-black dark:text-white mb-3">
                    Request a <span className="text-yellow-400">Meme</span>
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                    Have a brilliant idea? Let our creators bring it to life!
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 dark:border-gray-800">

                {/* Title */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Title / Concept <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Cat studying for exam..."
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all dark:text-white font-medium"
                    />
                </div>

                {/* Description */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Details & Context
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Explain your idea in detail..."
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none transition-all dark:text-white resize-none"
                    />
                </div>

                {/* Media Type Selector */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                        Reference Material (Optional)
                    </label>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <button
                            type="button"
                            onClick={() => { setMediaType("text"); setMediaFile(null); setMediaPreview(null); setMediaLink(""); }}
                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${mediaType === "text" ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-400" : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111] text-gray-500 hover:bg-gray-100 dark:hover:bg-[#222]"}`}
                        >
                            <Type size={24} />
                            <span className="text-sm font-bold">Just Text</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setMediaType("link"); setMediaFile(null); setMediaPreview(null); }}
                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${mediaType === "link" ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-400" : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111] text-gray-500 hover:bg-gray-100 dark:hover:bg-[#222]"}`}
                        >
                            <LinkIcon size={24} />
                            <span className="text-sm font-bold">Link</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setMediaType("upload"); setMediaLink(""); }}
                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${['image', 'video', 'upload'].includes(mediaType) ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-400" : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111] text-gray-500 hover:bg-gray-100 dark:hover:bg-[#222]"}`}
                        >
                            <ImageIcon size={24} />
                            <span className="text-sm font-bold">Upload File</span>
                        </button>
                    </div>

                    {/* Dynamic Media Input */}
                    {mediaType === "link" && (
                        <input
                            type="url"
                            value={mediaLink}
                            onChange={(e) => setMediaLink(e.target.value)}
                            placeholder="Paste YouTube, TikTok, or Instagram link..."
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 focus:border-yellow-400 outline-none dark:text-white"
                        />
                    )}

                    {['image', 'video', 'upload'].includes(mediaType) && (
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center transition-colors hover:border-yellow-400 dark:hover:border-yellow-400 bg-gray-50 dark:bg-[#111]">
                            {mediaPreview ? (
                                <div className="relative inline-block">
                                    {mediaType === "video" || (mediaFile && mediaFile.type.startsWith("video/")) ? (
                                        <video src={mediaPreview} controls className="max-h-64 rounded-lg" />
                                    ) : (
                                        <img src={mediaPreview} className="max-h-64 rounded-lg" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaType("upload"); }}
                                        className="absolute -top-3 -right-3 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600"
                                    >
                                        <Loader2 className="w-4 h-4 rotate-45" /> {/* X icon hack */}
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer block">
                                    <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Upload size={32} />
                                    </div>
                                    <p className="font-bold text-gray-700 dark:text-gray-300">Click to upload media</p>
                                    <p className="text-sm text-gray-500 mt-1">Images or Low-quality clips</p>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept="image/*,video/*"
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-yellow-400 text-black font-black text-lg rounded-xl hover:bg-yellow-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <Send size={20} />
                            Submit Request
                        </>
                    )}
                </button>

            </form>
        </div>
    );
}

function Upload({ size = 24, className = "" }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    )
}
