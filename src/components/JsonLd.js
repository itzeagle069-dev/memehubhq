export default function JsonLdSchema() {
    const websiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'MemeHubHQ',
        alternateName: ['Meme Hub', 'MemeHub HQ'],
        url: 'https://memehubhq.vercel.app/',
        description: 'Discover viral memes, funny footage, and trending clips—all in one place! Free to browse and download, our platform helps content creators quickly find the perfect clips for their videos.',
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://memehubhq.vercel.app/?search={search_term_string}'
            },
            'query-input': 'required name=search_term_string'
        }
    };

    const organizationSchema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'MemeHub HQ',
        url: 'https://memehubhq.vercel.app',
        logo: 'https://memehubhq.vercel.app/logo.png',
        description: 'Discover viral memes, funny footage, and trending clips—all in one place! Free to browse and download, our platform helps content creators quickly find the perfect clips for their videos.',
        sameAs: [
            // Add your social media URLs
            'https://youtube.com/@memehub-hq',
            'https://twitter.com/memehubhq',
            'https://facebook.com/memehubhq',
            'https://instagram.com/memehubhq'
        ]
    };

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://memehubhq.vercel.app'
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
        </>
    );
}
