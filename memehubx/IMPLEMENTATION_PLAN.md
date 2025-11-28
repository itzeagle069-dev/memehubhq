# Implementation Plan: New Features

## Features to Implement:

### 1. ✏️ Three-Dot Menu with Edit on Main Page
### 2. 📥 Multi-Download Feature  
### 3. 🏷️ Credit/Source Field for Memes

---

## Feature 1: Three-Dot Menu with Edit

### Changes Needed in `src/app/page.js`:

#### A. Add Imports:
```javascript
import { MoreVertical, Edit2, Image as ImageIcon } from "lucide-react";
```

#### B. Add State Variables (after line 40):
```javascript
const [openMenuId, setOpenMenuId] = useState(null);
const [editingMeme, setEditingMeme] = useState(null);
const [editForm, setEditForm] = useState({});
const [newThumbnail, setNewThumbnail] = useState(null);
const [thumbnailPreview, setThumbnailPreview] = useState(null);
const [saving, setSaving] = useState(false);
```

#### C. Add Cloudinary Config (after ADMIN_IDS):
```javascript
const CLOUD_NAME = "ds6pks59z";
const UPLOAD_PRESET = "memehub_upload";
```

#### D. Add Edit Functions (copy from admin/page.js):
- `openEditModal(meme)`
- `handleThumbnailChange(e)`
- `saveEdits()`

#### E. Replace Delete Button with Three-Dot Menu
#### F. Add Edit Modal (copy from admin/page.js)

---

## Feature 2: Multi-Download System

### A. Create Download List Context (`src/context/DownloadContext.js`):
```javascript
"use client";
import { createContext, useContext, useState, useEffect } from "react";

const DownloadContext = createContext();

export function DownloadProvider({ children }) {
  const [downloadList, setDownloadList] = useState([]);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("downloadList");
    if (saved) setDownloadList(JSON.parse(saved));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("downloadList", JSON.stringify(downloadList));
  }, [downloadList]);

  const addToDownloadList = (meme) => {
    if (!downloadList.find(m => m.id === meme.id)) {
      setDownloadList([...downloadList, meme]);
    }
  };

  const removeFromDownloadList = (memeId) => {
    setDownloadList(downloadList.filter(m => m.id !== memeId));
  };

  const clearDownloadList = () => {
    setDownloadList([]);
  };

  const isInDownloadList = (memeId) => {
    return downloadList.some(m => m.id === memeId);
  };

  return (
    <DownloadContext.Provider value={{
      downloadList,
      addToDownloadList,
      removeFromDownloadList,
      clearDownloadList,
      isInDownloadList
    }}>
      {children}
    </DownloadContext.Provider>
  );
}

export const useDownloadList = () => useContext(DownloadContext);
```

### B. Wrap App with Provider (`src/app/layout.js`):
```javascript
import { DownloadProvider } from "@/context/DownloadContext";

// Inside RootLayout:
<DownloadProvider>
  {children}
</DownloadProvider>
```

### C. Add Download List Button to Navbar:
```javascript
import { Download } from "lucide-react";
import { useDownloadList } from "@/context/DownloadContext";

// In Navbar component:
const { downloadList } = useDownloadList();

<Link href="/downloads">
  <button className="relative">
    <Download size={20} />
    {downloadList.length > 0 && (
      <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
        {downloadList.length}
      </span>
    )}
  </button>
</Link>
```

### D. Add "Add to Download List" Button to Meme Cards:
```javascript
import { useDownloadList } from "@/context/DownloadList";

const { addToDownloadList, removeFromDownloadList, isInDownloadList } = useDownloadList();

// In meme card:
<button
  onClick={(e) => {
    e.stopPropagation();
    if (isInDownloadList(meme.id)) {
      removeFromDownloadList(meme.id);
    } else {
      addToDownloadList(meme);
    }
  }}
  className={`p-2 rounded-full transition-colors ${
    isInDownloadList(meme.id)
      ? "bg-yellow-400 text-black"
      : "hover:bg-gray-100 dark:hover:bg-gray-800"
  }`}
>
  <Download size={16} />
</button>
```

### E. Create Downloads Page (`src/app/downloads/page.js`):
```javascript
"use client";
import { useDownloadList } from "@/context/DownloadContext";
import { Download, Trash2, X } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default function DownloadsPage() {
  const { downloadList, removeFromDownloadList, clearDownloadList } = useDownloadList();

  const downloadAll = async () => {
    const zip = new JSZip();
    
    for (const meme of downloadList) {
      const response = await fetch(meme.file_url);
      const blob = await response.blob();
      const ext = meme.media_type === "image" ? "jpg" : meme.media_type === "video" ? "mp4" : "mp3";
      zip.file(`${meme.title}.${ext}`, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "memehub-downloads.zip");
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black">Download List</h1>
        <div className="flex gap-3">
          <button onClick={clearDownloadList} className="px-4 py-2 bg-red-500 text-white rounded-lg">
            Clear All
          </button>
          <button onClick={downloadAll} className="px-4 py-2 bg-yellow-400 text-black rounded-lg font-bold">
            Download All ({downloadList.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {downloadList.map(meme => (
          <div key={meme.id} className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden">
            {/* Meme preview */}
            <button onClick={() => removeFromDownloadList(meme.id)}>
              <X size={16} /> Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### F. Install Required Packages:
```bash
npm install jszip file-saver
```

---

## Feature 3: Credit/Source Field

### A. Update Upload Page State:
```javascript
const [credit, setCredit] = useState("");
```

### B. Add Credit Input Field (in upload form):
```javascript
<textarea
  placeholder="Credit/Source (Optional) - e.g., @username, https://..., or description"
  value={credit}
  onChange={(e) => setCredit(e.target.value)}
  className="w-full p-3 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] dark:text-white outline-none focus:ring-2 focus:ring-yellow-400 transition-all resize-none"
  rows={2}
/>
```

### C. Save Credit to Database:
```javascript
const docRef = await addDoc(collection(db, "memes"), {
  // ... existing fields
  credit: credit.trim() || null, // Save credit if provided
});
```

### D. Display Credit in Meme Modal:
```javascript
{selectedMeme.credit && (
  <div className="mb-4 p-3 bg-gray-100 dark:bg-[#222] rounded-lg">
    <p className="text-xs text-gray-500 mb-1">Credit/Source:</p>
    <p className="text-sm">{selectedMeme.credit}</p>
  </div>
)}
```

### E. Add Credit to Edit Modal:
```javascript
<textarea
  value={editForm.credit || ""}
  onChange={(e) => setEditForm({ ...editForm, credit: e.target.value })}
  placeholder="Credit/Source"
  className="w-full p-3 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] dark:text-white"
  rows={2}
/>
```

---

## Implementation Order:

1. **First**: Fix upload page and add credit field (simplest)
2. **Second**: Add multi-download system (medium complexity)
3. **Third**: Add three-dot menu with edit (most complex)

---

## Benefits:

### Credit Field:
- ✅ Give proper attribution to creators
- ✅ Build trust and credibility
- ✅ Encourage sharing with proper credit

### Multi-Download:
- ✅ Save time downloading multiple memes
- ✅ Better user experience
- ✅ Professional feature

### Edit on Main Page:
- ✅ Quick edits without going to admin panel
- ✅ Better workflow
- ✅ More accessible

---

Would you like me to implement these one by one?
