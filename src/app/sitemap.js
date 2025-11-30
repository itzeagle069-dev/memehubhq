import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export default async function sitemap() {
    const baseUrl = 'https://memehubhq.vercel.app'; // Update with your actual domain

    try {
        // Fetch published memes for sitemap
        const memesQuery = query(
            collection(db, 'memes'),
            where('status', '==', 'published'),
            orderBy('createdAt', 'desc'),
            limit(1000) // Limit for performance
        );

        const memesSnapshot = await getDocs(memesQuery);

        const memeUrls = memesSnapshot.docs.map((doc) => ({
            url: `${baseUrl}/meme/${doc.id}`,
            lastModified: doc.data().createdAt?.toDate() || new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        }));

        // Static pages
        const staticPages = [
            {
                url: baseUrl,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 1.0,
            },
            {
                url: `${baseUrl}/upload`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.7,
            },
            {
                url: `${baseUrl}/guidelines`,
                lastModified: new Date(),
                changeFrequency: 'monthly',
                priority: 0.5,
            },
            {
                url: `${baseUrl}/privacy`,
                lastModified: new Date(),
                changeFrequency: 'monthly',
                priority: 0.4,
            },
            {
                url: `${baseUrl}/terms`,
                lastModified: new Date(),
                changeFrequency: 'monthly',
                priority: 0.4,
            },
        ];

        return [...staticPages, ...memeUrls];
    } catch (error) {
        console.error('Error generating sitemap:', error);
        // Return static pages only if Firebase fetch fails
        return [
            {
                url: baseUrl,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 1.0,
            },
        ];
    }
}
