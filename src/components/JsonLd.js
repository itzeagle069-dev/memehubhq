export default function JsonLdSchema() {
    const websiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'MemeHubHQ',
        alternateName: 'Meme Hub HQ',
        url: 'https://memehubhq.vercel.app',
        description: 'Discover and share the internet\'s funniest memes, viral videos, and sound effects.',
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
        name: 'MemeHubHQ',
        url: 'https://memehubhq.vercel.app',
        logo: 'https://memehubhq.vercel.app/logo.png',
        description: 'The world\'s fastest growing meme community',
        sameAs: [
            // Add your social media URLs
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
