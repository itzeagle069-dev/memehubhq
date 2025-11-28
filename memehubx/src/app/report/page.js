"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { UploadCloud, CheckCircle, AlertCircle, FileText, Mail, Send } from "lucide-react";
import { toast } from "react-hot-toast";

const CLOUD_NAME = "ds6pks59z";
const UPLOAD_PRESET = "memehub_upload";

export default function ReportPage() {
    const { user } = useAuth();
    const [type, setType] = useState("bug");
    const [description, setDescription] = useState("");
    const [email, setEmail] = useState(user?.email || "");
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!description.trim()) return toast.error("Please describe the issue");

        setSubmitting(true);
        const toastId = toast.loading("Submitting report...");

        try {
            let mediaUrl = null;
            let mediaType = null;

            if (file) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("upload_preset", UPLOAD_PRESET);

                const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();
                if (data.secure_url) {
                    mediaUrl = data.secure_url;
                    mediaType = data.resource_type;
                }
            }

            await addDoc(collection(db, "reports"), {
                type,
                description,
                contact_email: email || "Anonymous",
                media_url: mediaUrl,
                media_type: mediaType,
                user_id: user?.uid || null,
                status: "open",
                createdAt: serverTimestamp(),
            });

            toast.success("Report submitted successfully!", { id: toastId });
            setSubmitted(true);
            setDescription("");
            setFile(null);
            setPreview(null);
        } catch (error) {
            console.error("Error submitting report:", error);
            toast.error("Failed to submit report", { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#050505] px-4">
                <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-gray-100 dark:border-gray-800">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-black mb-2 text-black dark:text-white">Thank You!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                        Your report has been submitted. We appreciate your feedback and will look into it shortly.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setSubmitted(false)}
                            className="flex-1 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-500 transition-colors"
                        >
                            Submit Another
                        </button>
                        <Link href="/" className="flex-1 py-3 bg-gray-100 dark:bg-[#2a2a2a] text-black dark:text-white font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-[#333] transition-colors flex items-center justify-center">
                            Go Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] pt-32 pb-20 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-black mb-4 text-black dark:text-white">
                        Report an Issue or <span className="text-yellow-400">Suggestion</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Found a bug? Have a feature request? Let us know!
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 space-y-6">

                    <div>
                        <label className="block text-sm font-bold uppercase text-gray-500 mb-2">Issue Type</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {["bug", "suggestion", "content_report", "other"].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={`py-2 px-4 rounded-xl text-sm font-bold capitalize transition-all ${type === t
                                        ? "bg-yellow-400 text-black ring-2 ring-yellow-400 ring-offset-2 dark:ring-offset-[#1a1a1a]"
                                        : "bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333]"
                                        }`}
                                >
                                    {t.replace("_", " ")}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold uppercase text-gray-500 mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Please describe the issue or suggestion in detail..."
                            className="w-full p-4 rounded-xl bg-gray-50 dark:bg-[#050505] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-yellow-400 outline-none min-h-[150px] resize-none text-black dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold uppercase text-gray-500 mb-2">Contact Email (Optional)</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-[#050505] border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-yellow-400 outline-none text-black dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold uppercase text-gray-500 mb-2">Attachment (Optional)</label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center hover:border-yellow-400 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept="image/*,video/*,audio/*"
                            />
                            {preview ? (
                                <div className="relative inline-block">
                                    {file?.type.startsWith('image/') ? (
                                        <img src={preview} alt="Preview" className="h-32 rounded-lg object-cover" />
                                    ) : (
                                        <div className="h-32 w-32 bg-gray-100 dark:bg-[#2a2a2a] rounded-lg flex items-center justify-center mx-auto">
                                            <FileText size={40} className="text-gray-400" />
                                        </div>
                                    )}
                                    <p className="mt-2 text-sm font-bold text-gray-500">{file.name}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <UploadCloud size={32} />
                                    <p className="font-bold">Click to upload screenshot or media</p>
                                    <p className="text-xs">Supports Image, Video, Audio</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 bg-black dark:bg-white text-white dark:text-black font-black text-lg rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            "Submitting..."
                        ) : (
                            <>
                                <Send size={20} /> Submit Report
                            </>
                        )}
                    </button>

                </form>

                <div className="mt-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                        Or contact us directly at <a href="mailto:pokhrelsantosh069@gmail.com" className="text-yellow-500 font-bold hover:underline">pokhrelsantosh069@gmail.com</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
