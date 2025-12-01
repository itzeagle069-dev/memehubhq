# Enhanced Meme Preview Modal - Implementation Plan

## Overview
Transform the simple preview modal into a full-featured meme viewer with social features.

## Features to Implement

### 1. **Comments System**
- Firebase structure: `comments/{memeId}/comments/{commentId}`
- Comment data: userId, userName, userPic, text, timestamp, likes
- Sort options: Newest, Oldest,

 Most Liked
- Reply to comments (nested)
- Like/unlike comments
- Delete own comments

### 2. **Follow System**
- Firebase structure: `users/{userId}/following`, `users/{userId}/followers`
- Follow/Unfollow button next to uploader name
- Show follower count

### 3. **Related Memes**
- Show 5-8 related memes on the right side (desktop) or bottom (mobile)
- Filter by same category or uploader
- Click to switch to that meme

### 4. **Enhanced Info Display**
- Description field (add to meme upload)
- Tags display (clickable to filter)
- Views, downloads, reactions stats
- Share and favorite buttons

### 5. **Download with Timer**
- Existing timer logic already works
- Keep the unlock timer functionality

## Implementation Steps

### Step 1: Add Comment State & Functions
```javascript
const [comments, setComments] = useState([]);
const [newComment, setNewComment] = useState("");
const [commentSort, setCommentSort] = useState("newest");

const fetchComments = async (memeId) => {
  // Fetch from Firebase
};

const handleAddComment = async () => {
  // Add comment to Firebase
};

const handleDeleteComment = async (commentId) => {
  // Delete comment
};
```

### Step 2: Add Follow System
```javascript
const [isFollowing, setIsFollowing] = useState(false);
const [followerCount, setFollowerCount] = useState(0);

const handleFollow = async (uploaderId) => {
  // Update Firebase followers/following
};
```

### Step 3: Get Related Memes
```javascript
const [relatedMemes, setRelatedMemes] = useState([]);

const fetchRelatedMemes = async (currentMeme) => {
  // Query memes with same category, exclude current
};
```

### Step 4: Update Modal Layout
- Left: Media player (60%)
- Right: Info + Comments + Related (40%)
- Make it scrollable
- Responsive for mobile

## Firebase Schema Updates

### Comments Collection
```
comments/
  {memeId}/
    comments/
      {commentId}/
        userId: string
        userName: string
        userPic: string
        text: string
        timestamp: timestamp
        likes: number
        likedBy: array of UIDs
```

### Users Collection Update
```
users/
  {userId}/
    following: array of UIDs
    followers: array of UIDs
    favorites: array of meme IDs (already exists)
```

### Memes Collection Update (for description/tags)
```
memes/
  {memeId}/
    description: string (optional)
    tags: array of strings (optional)
```

## Next Steps
1. Start with comments system
2. Add follow functionality
3. Implement related memes
4. Enhance modal UI
5. Test all features
