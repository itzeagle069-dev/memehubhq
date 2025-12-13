"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { UploadCloud, CheckCircle, AlertCircle, Image, Plus, X, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import AdUnit from "@/components/AdUnit";

const CLOUD_NAME = "ds6pks59z";
const UPLOAD_PRESET = "memehub_upload";
const ADMIN_ID = "VZCDwbnsLxcLdEcjabk8wK0pEv33";

export default function UploadPage() {
  const { user, googleLogin } = useAuth();
  const router = useRouter();

  // Single upload states
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("reaction");
  const [language, setLanguage] = useState("english");
  const [credit, setCredit] = useState("");
  const [uploading, setUploading] = useState(false);

  // Bulk upload states (admin only)
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkCategory, setBulkCategory] = useState("reaction");
  const [bulkLanguage, setBulkLanguage] = useState("english");
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const [categories, setCategories] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [newLanguage, setNewLanguage] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingLanguage, setIsAddingLanguage] = useState(false);

  const isAdmin = user?.uid === ADMIN_ID;

  useEffect(() => {
    const fetchData = async () => {
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
        console.error("Error fetching categories/languages:", err);
      }
    };

    fetchData();
  }, []);

  const addCategory = async () => {
    const trimmed = newCategory.trim().toLowerCase();
    if (!trimmed) return toast.error("Category name cannot be empty");
    if (categories.includes(trimmed)) return toast.error("Category already exists");

    setIsAddingCategory(true);
    try {
      const updatedCategories = [...categories, trimmed];
      await setDoc(doc(db, "settings", "categories"), { list: updatedCategories });
      setCategories(updatedCategories);
      setCategory(trimmed);
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
      if (category === categoryToDelete) setCategory(updatedCategories[0] || "");
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
      setLanguage(trimmed);
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
      if (language === languageToDelete) setLanguage(updatedLanguages[0] || "");
      toast.success(`Language "${languageToDelete}" deleted!`);
    } catch (err) {
      toast.error("Failed to delete language");
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleBulkFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length === 0) return;
    setBulkFiles(selected);
    toast.success(`${selected.length} files selected`);
  };

  const removeBulkFile = (index) => {
    setBulkFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleThumbnailChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      toast.error("Thumbnail must be an image file");
      return;
    }
    setThumbnail(selected);
    setThumbnailPreview(URL.createObjectURL(selected));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title) return toast.error("Please fill all fields");

    setUploading(true);
    const toastId = toast.loading("Uploading to Cloudinary...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.secure_url) {
        throw new Error(`Cloudinary error: ${data.error?.message || "Upload failed"}`);
      }

      let thumbnailUrl = null;
      if (thumbnail) {
        toast.loading("Uploading thumbnail...", { id: toastId });
        const thumbFormData = new FormData();
        thumbFormData.append("file", thumbnail);
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

      toast.loading("Saving to database...", { id: toastId });

      let mediaType;
      if (file.type.startsWith("audio/")) {
        mediaType = "audio";
      } else if (file.type.startsWith("video/")) {
        mediaType = "video";
      } else if (file.type.startsWith("image/")) {
        mediaType = "image";
      } else {
        mediaType = data.resource_type === "raw" ? "audio" : data.resource_type;
      }

      await addDoc(collection(db, "memes"), {
        title: title,
        file_url: data.secure_url,
        media_type: mediaType,
        thumbnail_url: thumbnailUrl,
        category: category,
        language: language,
        credit: credit.trim() || null,
        tags: title.toLowerCase().split(" "),
        uploader_id: user.uid,
        uploader_name: user.displayName || "Anonymous",
        uploader_pic: user.photoURL,
        status: "pending",
        createdAt: serverTimestamp(),
        views: 0,
        downloads: 0,
        reactions: { haha: 0 },
        duration: data.duration || 0, // Save duration
        file_size: data.bytes || 0    // Save file size
      });

      toast.success("Submitted for Admin Review!", { id: toastId });

      setFile(null);
      setPreview(null);
      setThumbnail(null);
      setThumbnailPreview(null);
      setTitle("");
      setCredit("");

      setTimeout(() => router.push("/"), 1000);

    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Upload failed", { id: toastId, duration: 8000 });
    } finally {
      setUploading(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (bulkFiles.length === 0) return toast.error("Please select at least one file");

    setUploading(true);
    setUploadProgress({ current: 0, total: bulkFiles.length });
    const toastId = toast.loading(`Uploading 0/${bulkFiles.length} files...`);

    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < bulkFiles.length; i++) {
        const file = bulkFiles[i];
        setUploadProgress({ current: i + 1, total: bulkFiles.length });
        toast.loading(`Uploading ${i + 1}/${bulkFiles.length}: ${file.name}`, { id: toastId });

        try {
          // Upload to Cloudinary
          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", UPLOAD_PRESET);

          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          if (!data.secure_url) {
            throw new Error(`Cloudinary error: ${data.error?.message || "Upload failed"}`);
          }

          // Determine media type
          let mediaType;
          if (file.type.startsWith("audio/")) {
            mediaType = "audio";
          } else if (file.type.startsWith("video/")) {
            mediaType = "video";
          } else if (file.type.startsWith("image/")) {
            mediaType = "image";
          } else {
            mediaType = data.resource_type === "raw" ? "audio" : data.resource_type;
          }

          // Generate auto title from filename
          const autoTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

          // Save to Firestore with auto-generated title
          await addDoc(collection(db, "memes"), {
            title: autoTitle,
            file_url: data.secure_url,
            media_type: mediaType,
            thumbnail_url: null,
            category: bulkCategory,
            language: bulkLanguage,
            credit: null,
            tags: autoTitle.toLowerCase().split(" "),
            uploader_id: user.uid,
            uploader_name: user.displayName || "Anonymous",
            uploader_pic: user.photoURL,
            status: "pending",
            createdAt: serverTimestamp(),
            views: 0,
            downloads: 0,
            reactions: { haha: 0 },
            duration: data.duration || 0, // Save duration
            file_size: data.bytes || 0    // Save file size
          });

          successCount++;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          failCount++;
        }
      }

      // Show final result
      if (failCount === 0) {
        toast.success(`Successfully uploaded ${successCount} files!`, { id: toastId });
      } else {
        toast.success(`Uploaded ${successCount} files. ${failCount} failed.`, { id: toastId });
      }

      // Reset form
      setBulkFiles([]);
      setUploadProgress({ current: 0, total: 0 });

      setTimeout(() => router.push("/admin"), 1500);

    } catch (error) {
      console.error("Bulk upload error:", error);
      toast.error("Bulk upload failed", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 pt-24">
        <div className="bg-white dark:bg-[#1f1f1f] p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 max-w-md">
          <div className="bg-yellow-400/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-yellow-500" />
          </div>
          <h2 className="text-3xl font-black text-black dark:text-white mb-3">Login Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">You need to sign in with your Google account to upload memes to MemeHub HQ.</p>
          <button onClick={googleLogin} className="w-full bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform active:scale-95 shadow-xl flex items-center justify-center gap-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 pb-10">

      {/* Ad Banner */}
      <div className="mb-8 flex justify-center w-full">
        <AdUnit type="banner" />
      </div>

      <div className="bg-white dark:bg-[#1f1f1f] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-8 text-center">
          <UploadCloud className="w-16 h-16 mx-auto mb-4 text-black" />
          <h1 className="text-4xl font-black text-black mb-2">Upload Meme</h1>
          <p className="text-black/80">Share your funniest content with the world</p>
        </div>

        {/* Admin Bulk Upload Toggle */}
        {isAdmin && (
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setBulkMode(false)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${!bulkMode
                  ? "bg-yellow-400 text-black shadow-lg"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
              >
                <Image size={20} />
                Single Upload
              </button>
              <button
                onClick={() => setBulkMode(true)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${bulkMode
                  ? "bg-yellow-400 text-black shadow-lg"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
              >
                <Layers size={20} />
                Bulk Upload (Admin)
              </button>
            </div>
            {bulkMode && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
                💡 Bulk upload allows you to upload multiple files at once. Titles will be auto-generated from filenames.
              </p>
            )}
          </div>
        )}

        {/* Single Upload Form */}
        {!bulkMode && (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Upload File (Image, Video, or Audio)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,video/*,audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-yellow-400 dark:hover:border-yellow-400 transition-colors bg-gray-50 dark:bg-gray-900"
                >
                  {preview ? (
                    <div className="relative w-full h-full p-4">
                      {file?.type.startsWith("image/") ? (
                        <img src={preview} className="w-full h-full object-contain rounded-lg" />
                      ) : file?.type.startsWith("video/") ? (
                        <video src={preview} className="w-full h-full object-contain rounded-lg" controls />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                          <CheckCircle className="w-16 h-16 text-green-500 mb-2" />
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{file?.name}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-12 h-12 text-gray-400 mb-3" />
                      <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Click to upload file</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Images, Videos, or Audio</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your meme a catchy title..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                required
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Admin Category Management */}
              {isAdmin && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <div key={cat} className="flex items-center gap-1 bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-lg text-xs">
                        <span className="text-black dark:text-white">{cat}</span>
                        <button type="button" onClick={() => deleteCategory(cat)} className="text-red-500 hover:text-red-700">
                          <X size={14} />
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
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={addCategory}
                      disabled={isAddingCategory}
                      className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-bold text-sm hover:bg-yellow-500 disabled:opacity-50"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Language *
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                required
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>

              {/* Admin Language Management */}
              {isAdmin && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {languages.map(lang => (
                      <div key={lang} className="flex items-center gap-1 bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-lg text-xs">
                        <span className="text-black dark:text-white">{lang}</span>
                        <button type="button" onClick={() => deleteLanguage(lang)} className="text-red-500 hover:text-red-700">
                          <X size={14} />
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
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={addLanguage}
                      disabled={isAddingLanguage}
                      className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-bold text-sm hover:bg-yellow-500 disabled:opacity-50"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail (for video/audio) */}
            {file && (file.type.startsWith("video/") || file.type.startsWith("audio/")) && (
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Thumbnail (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                />
                {thumbnailPreview && (
                  <img src={thumbnailPreview} className="mt-3 h-32 rounded-lg object-cover" />
                )}
              </div>
            )}

            {/* Credit */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Credit / Source (Optional)
              </label>
              <input
                type="text"
                value={credit}
                onChange={(e) => setCredit(e.target.value)}
                placeholder="Original creator or source..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white focus:ring-2 focus:ring-yellow-400 outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploading || !file || !title}
              className="w-full bg-yellow-400 text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl flex items-center justify-center gap-3"
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud size={24} />
                  Upload Meme
                </>
              )}
            </button>
          </form>
        )}

        {/* Bulk Upload Form */}
        {bulkMode && (
          <form onSubmit={handleBulkSubmit} className="p-8 space-y-6">
            {/* Bulk File Upload */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Select Multiple Files
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,video/*,audio/*"
                  onChange={handleBulkFileChange}
                  className="hidden"
                  id="bulk-file-upload"
                  multiple
                />
                <label
                  htmlFor="bulk-file-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-yellow-400 dark:hover:border-yellow-400 transition-colors bg-gray-50 dark:bg-gray-900"
                >
                  <Layers className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Click to select multiple files</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {bulkFiles.length > 0 ? `${bulkFiles.length} files selected` : "Images, Videos, or Audio"}
                  </p>
                </label>
              </div>
            </div>

            {/* Selected Files List */}
            {bulkFiles.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                {bulkFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-black dark:text-white truncate">{file.name}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBulkFile(index)}
                      className="ml-3 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bulk Category */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Category (for all files) *
              </label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                required
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Bulk Language */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Language (for all files) *
              </label>
              <select
                value={bulkLanguage}
                onChange={(e) => setBulkLanguage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white focus:ring-2 focus:ring-yellow-400 outline-none"
                required
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Upload Progress */}
            {uploading && uploadProgress.total > 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                <div className="flex justify-between text-sm font-bold text-yellow-800 dark:text-yellow-400 mb-2">
                  <span>Uploading...</span>
                  <span>{uploadProgress.current} / {uploadProgress.total}</span>
                </div>
                <div className="w-full bg-yellow-200 dark:bg-yellow-900/40 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploading || bulkFiles.length === 0}
              className="w-full bg-yellow-400 text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl flex items-center justify-center gap-3"
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  Uploading {uploadProgress.current}/{uploadProgress.total}...
                </>
              ) : (
                <>
                  <Layers size={24} />
                  Upload {bulkFiles.length} Files
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}