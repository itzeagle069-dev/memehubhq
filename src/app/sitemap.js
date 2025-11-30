// Force static generation for reliable sitemap
export const dynamic = 'force-static';

export default function sitemap() {
    const baseUrl = 'https://memehubhq.vercel.app';

    // Static pages sitemap with CORRECT properties
    const staticPages = [
        {
            url: baseUrl,
            lastModified: new Date().toISOString(),
            changefreq: 'daily',  // NOT changeFrequency!
            priority: 1.0,
        },
        {
            url: `${baseUrl}/upload`,
            lastModified: new Date().toISOString(),
            changefreq: 'weekly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/guidelines`,
            lastModified: new Date().toISOString(),
            changefreq: 'monthly',
            priority: 0.5,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date().toISOString(),
            changefreq: 'monthly',
            priority: 0.4,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date().toISOString(),
            changefreq: 'monthly',
            priority: 0.4,
        },
    ];

    return staticPages;
}
