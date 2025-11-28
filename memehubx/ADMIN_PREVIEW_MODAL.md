# ⚠️ Admin Page - Preview Modal Feature

## Current Issue:
The admin page file (`src/app/admin/page.js`) got corrupted during editing. It needs to be restored or rewritten.

## What Needs to Be Added:

### 1. **Add Preview Modal State** (after line 25):
```javascript
const [previewMeme, setPreviewMeme] = useState(null);
```

### 2. **Add "Preview" Button** to each meme card (in the controls section around line 245):
```javascript
<button
    onClick={() => setPreviewMeme(meme)}
    className="flex items-center justify-center gap-1 bg-purple-100 text-purple-600 hover:bg-purple-200 py-2 rounded-lg font-bold transition-colors text-sm col-span-3"
>
    <Eye className="w-4 h-4" /> Preview Full Screen
</button>
```

### 3. **Add Preview Modal** (before the closing `</div>` of the component, after the Edit Modal):
```javascript
{/* PREVIEW MODAL */}
{previewMeme && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
        <div className="relative w-full max-w-6xl h-full max-h-[90vh] bg-white dark:bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl">
            <button
                onClick={() => setPreviewMeme(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors"
            >
                <X size={24} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 h-full">
                {/* Media Section */}
                <div className="md:col-span-2 bg-black flex items-center justify-center h-full">
                    {previewMeme.media_type === "video" || previewMeme.file_url.endsWith(".mp4") ? (
                        <video src={previewMeme.file_url} controls autoPlay className="max-w-full max-h-full" />
                    ) : previewMeme.media_type === "raw" || previewMeme.media_type === "audio" || previewMeme.file_url.endsWith(".mp3") ? (
                        <div className="text-center p-8">
                            {previewMeme.thumbnail_url && (
                                <img src={previewMeme.thumbnail_url} className="max-w-md max-h-64 mx-auto mb-6 rounded-lg" alt={previewMeme.title} />
                            )}
                            <Music className="w-24 h-24 text-yellow-400 mx-auto mb-6 animate-pulse" />
                            <audio src={previewMeme.file_url} controls className="w-full min-w-[300px]" autoPlay />
                        </div>
                    ) : (
                        <img src={previewMeme.file_url} className="max-w-full max-h-full object-contain" />
                    )}
                </div>

                {/* Info Section */}
                <div className="bg-white dark:bg-[#111] p-6 flex flex-col h-full overflow-y-auto border-l border-gray-800">
                    <h2 className="text-2xl font-black text-black dark:text-white mb-2">{previewMeme.title}</h2>
                    
                    <div className="flex items-center gap-2 mb-6">
                        <img src={previewMeme.uploader_pic || "https://ui-avatars.com/api/?name=User"} className="w-8 h-8 rounded-full" />
                        <div>
                            <p className="text-sm font-bold text-black dark:text-white">{previewMeme.uploader_name}</p>
                            <p className="text-xs text-gray-500">Pending Approval</p>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-8">
                        <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-[#222] text-xs font-bold text-gray-500 uppercase">
                            {previewMeme.category}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-[#222] text-xs font-bold text-gray-500 uppercase">
                            {previewMeme.language}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-yellow-400 text-black text-xs font-bold uppercase">
                            {previewMeme.media_type === "raw" ? "AUDIO" : previewMeme.media_type}
                        </span>
                    </div>

                    {previewMeme.credit && (
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800">
                            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Credit / Source</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{previewMeme.credit}</p>
                        </div>
                    )}

                    <div className="mt-auto space-y-3">
                        <button
                            onClick={() => {
                                approveMeme(previewMeme.id);
                                setPreviewMeme(null);
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-600 transition-colors"
                        >
                            <Check size={20} />
                            Approve
                        </button>

                        <button
                            onClick={() => {
                                openEditModal(previewMeme);
                                setPreviewMeme(null);
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors"
                        >
                            <Edit2 size={20} />
                            Edit
                        </button>

                        <button
                            onClick={() => {
                                deleteMeme(previewMeme.id);
                                setPreviewMeme(null);
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-red-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-600 transition-colors"
                        >
                            <Trash2 size={20} />
                            Reject
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
)}
```

### 4. **Add Music Icon Import**:
```javascript
import { Check, Trash2, ShieldAlert, Loader2, Edit2, X, Image as ImageIcon, Eye, Music } from "lucide-react";
```

## Benefits:
- ✅ Admins can preview memes in full-screen before approving
- ✅ Watch videos/listen to audio properly
- ✅ See all meme details (title, uploader, category, language, credit)
- ✅ Quick actions (Approve, Edit, Reject) from the preview modal
- ✅ Better decision-making with full context

## Current Status:
❌ Admin page file is corrupted and needs to be restored
⚠️ The file is missing proper component structure (lines 16-37 are broken)

## Recommended Action:
1. Restore the admin page from a backup or rewrite it
2. Add the preview modal feature as described above
3. Test the preview functionality

Would you like me to attempt to restore and fix the admin page file?
