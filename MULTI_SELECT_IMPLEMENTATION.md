# Multi-Select Mode Implementation Plan

## Summary
Move the multi-select functionality from the main page to the admin dashboard, creating a dedicated "Manage Memes" tab where admins can bulk edit and delete published memes.

## Changes Required

### 1. Admin Dashboard (`src/app/admin/page.js`)

#### A. Fetch Published Memes (Line ~84-101)
Add this query after fetching pending memes:
```javascript
// Fetch published memes for management
const publishedQ = query(
    collection(db, "memes"), 
    where("status", "==", "published"), 
    orderBy("createdAt", "desc")
);
const publishedSnapshot = await getDocs(publishedQ);
setPublishedMemes(publishedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
```

#### B. Add Third Tab (Line ~385-402)
Add a "Manage Memes" tab after the "Inbox / Reports" tab:
```javascript
<button
    onClick={() => setActiveTab("manage")}
    className={`pb-4 text-lg font-bold transition-colors relative ${activeTab === "manage" ? "text-yellow-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
>
    Manage Memes
    <span className="ml-2 bg-gray-100 dark:bg-[#222] px-2 py-0.5 rounded-full text-xs">{publishedMemes.length}</span>
    {activeTab === "manage" && <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400 rounded-t-full" />}
</button>
```

#### C. Add Selection Helper Functions (After line ~361)
```javascript
const handleSelectAll = () => {
    const allIds = publishedMemes.map(m => m.id);
    setSelectedMemes(allIds);
    toast.success(`Selected all ${allIds.length} memes`);
};

const handleUnselectAll = () => {
    setSelectedMemes([]);
    toast.success("Selection cleared");
};

const toggleMemeSelection = (memeId) => {
    setSelectedMemes(prev =>
        prev.includes(memeId)
            ? prev.filter(id => id !== memeId)
            : [...prev, memeId]
    );
};

const handleEditSelected = () => {
    if (selectedMemes.length === 0) return toast.error("No memes selected");
    const queue = publishedMemes.filter(m => selectedMemes.includes(m.id));
    setEditingQueue(queue);
    openEditModal(queue[0]);
    toast("Starting bulk edit mode...", { icon: "📝" });
};

const handleBulkDelete = async () => {
    if (selectedMemes.length === 0) return toast.error("No memes selected");
    
    const password = prompt("⚠️ ADMIN ACTION REQUIRED\\n\\nEnter admin password to continue:");
    if (password !== "1122") return toast.error("Incorrect password");
    
    const confirmMsg = `Are you sure you want to DELETE ${selectedMemes.length} selected meme(s)?\\n\\nThis action cannot be undone.`;
    if (!confirm(confirmMsg)) return;

    const toastId = toast.loading(`Deleting ${selectedMemes.length} memes...`);
    
    try {
        await Promise.all(selectedMemes.map(id => deleteDoc(doc(db, "memes", id))));
        setPublishedMemes(prev => prev.filter(m => !selectedMemes.includes(m.id)));
        setSelectedMemes([]);
        setIsSelectionMode(false);
        toast.success(`Successfully deleted ${selectedMemes.length} meme(s)`, { id: toastId });
    } catch (error) {
        console.error("Bulk delete error:", error);
        toast.error("Failed to delete some memes", { id: toastId });
    }
};
```

#### D. Update saveEdits Function (Line ~275-327)
Replace the final `setEditingMeme(null);` with:
```javascript
// Handle Bulk Edit Queue
if (editingQueue.length > 0) {
    const nextQueue = editingQueue.slice(1);
    setEditingQueue(nextQueue);

    if (nextQueue.length > 0) {
        const nextMeme = nextQueue[0];
        setEditingMeme(nextMeme);
        setEditForm({
            title: nextMeme.title,
            category: nextMeme.category,
            language: nextMeme.language,
            thumbnail_url: nextMeme.thumbnail_url || "",
            credit: nextMeme.credit || ""
        });
        setNewThumbnail(null);
        setThumbnailPreview(null);
        toast("Opening next meme...", { icon: "➡️" });
    } else {
        setEditingMeme(null);
        toast.success("All selected memes edited!");
        setIsSelectionMode(false);
        setSelectedMemes([]);
    }
} else {
    setEditingMeme(null);
}
```

#### E. Add "Manage Memes" Tab Content (After line ~625, before the closing braces)
```javascript
{activeTab === "manage" && (
    <>
        {/* Multi-Select Controls */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="text-blue-500" size={20} />
                    <span className="font-bold text-blue-700 dark:text-blue-400">Manage Published Memes</span>
                    {isSelectionMode && (
                        <span className="text-sm text-blue-600 dark:text-blue-400">
                            ({selectedMemes.length} selected)
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => {
                            setIsSelectionMode(!isSelectionMode);
                            setSelectedMemes([]);
                            setEditingQueue([]);
                        }}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${isSelectionMode
                            ? "bg-gray-500 hover:bg-gray-600 text-white"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                            }`}
                    >
                        {isSelectionMode ? "Exit Selection Mode" : "Multi-Select Mode"}
                    </button>

                    {isSelectionMode && (
                        <>
                            <button onClick={handleSelectAll} className="px-3 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg text-sm font-bold">
                                Select All
                            </button>
                            <button onClick={handleUnselectAll} className="px-3 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg text-sm font-bold">
                                Unselect All
                            </button>
                        </>
                    )}

                    {isSelection Mode && selectedMemes.length > 0 && (
                        <>
                            <button
                                onClick={handleEditSelected}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center gap-2"
                            >
                                <Edit2 size={16} />
                                Edit Selected ({selectedMemes.length})
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-sm flex items-center gap-2"
                            >
                                <Trash2 size={16} />
                                Delete Selected ({selectedMemes.length})
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* Published Memes Grid */}
        {publishedMemes.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 dark:bg-[#111] rounded-3xl border border-gray-100 dark:border-[#222]">
                <h2 className="text-2xl font-bold text-gray-400">No published memes yet</h2>
                <p className="text-gray-500">Approve some pending memes to see them here.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {publishedMemes.map(meme => (
                    <div key={meme.id} className="group relative rounded-2xl bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#252525] hover:shadow-2xl transition-all flex flex-col">
                        {/* Media Display */}
                        <div className="aspect-[4/3] bg-black flex items-center justify-center relative overflow-hidden rounded-t-2xl">
                            {meme.thumbnail_url ? (
                                <img src={meme.thumbnail_url} alt={meme.title} className="w-full h-full object-cover" />
                            ) : meme.media_type === "video" ? (
                                <video src={meme.file_url} className="w-full h-full object-cover" />
                            ) : meme.media_type === "audio" ? (
                                <div className="flex flex-col items-center justify-center"><Music className="w-12 h-12 text-yellow-400" /></div>
                            ) : (
                                <img src={meme.file_url} className="w-full h-full object-cover" />
                            )}

                            {/* Multi-Select Checkbox */}
                            {isSelectionMode && (
                                <div
                                    className="absolute top-2 left-2 z-10"
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

                        {/* Card Footer */}
                        <div className="p-3 flex flex-col gap-2">
                            <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-black dark:text-white">{meme.title}</h3>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 bg-gray-100 dark:bg-[#222] text-xs font-bold rounded">{meme.category}</span>
                                <span className="px-2 py-1 bg-gray-100 dark:bg-[#222] text-xs font-bold rounded">{meme.language}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </>
)}
```

### 2. Remove Multi-Select from Main Page (`src/app/page.js`)

Remove the admin controls section (lines ~880-936) that contains:
- Multi-Select Mode button
- Select All/Unselect All buttons
- Edit Selected button
- Delete Selected button

Keep only the checkboxes on the meme cards (they can stay for potential future use).

## Implementation Order
1. ✅ Add state variables
2. Fetch published memes in useEffect
3. Add helper functions for selection
4. Update saveEdits for bulk edit queue
5. Add third tab UI
6. Add "Manage Memes" tab content
7. Remove controls from main page
8. Test all functionality

## Testing Checklist
- [ ] Published memes load in admin dashboard
- [ ] Multi-select mode toggles correctly
- [ ] Select All/Unselect All work
- [ ] Individual selection checkboxes work
- [ ] Edit Selected opens bulk edit flow
- [ ] Next meme loads after saving
- [ ] Delete Selected prompts and deletes
- [ ] Main page no longer has admin controls
