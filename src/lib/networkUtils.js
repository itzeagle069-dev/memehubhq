// Network speed detection utility
export const detectNetworkSpeed = () => {
    return new Promise((resolve) => {
        if (!navigator.connection) {
            // If Network Information API is not available, assume medium speed
            resolve('medium');
            return;
        }

        const connection = navigator.connection;
        const effectiveType = connection.effectiveType;

        // effectiveType can be: 'slow-2g', '2g', '3g', '4g'
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            resolve('slow');
        } else if (effectiveType === '3g') {
            resolve('medium');
        } else {
            resolve('fast');
        }
    });
};

// Cloudinary URL transformer for optimized videos and images
export const optimizeCloudinaryUrl = (url, options = {}) => {
    if (!url || !url.includes('cloudinary.com')) return url;

    const {
        quality = 'auto:low', // auto:low, auto:good, auto:best
        format = 'auto', // auto will pick best format (webp for images, etc)
        width,
        height,
        type = 'video' // 'video' or 'image'
    } = options;

    // Split the URL to insert transformations
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;

    let transformations = [];

    if (type === 'video') {
        transformations = [
            `q_${quality}`, // Quality
            'f_auto', // Auto format
            'vc_auto', // Auto video codec
        ];
        if (width) transformations.push(`w_${width}`);
        if (height) transformations.push(`h_${height}`);
    } else {
        // Image optimizations
        transformations = [
            `q_${quality}`,
            `f_${format}`,
        ];
        if (width) transformations.push(`w_${width}`);
        if (height) transformations.push(`h_${height}`);
        transformations.push('c_limit'); // Don't upscale
    }

    const transformString = transformations.join(',');
    return `${parts[0]}/upload/${transformString}/${parts[1]}`;
};

// Get optimized URL based on network speed
export const getOptimizedMediaUrl = (url, networkSpeed, mediaType = 'video') => {
    if (!url) return url;

    const qualityMap = {
        slow: 'auto:low',
        medium: 'auto:good',
        fast: 'auto:best'
    };

    const quality = qualityMap[networkSpeed] || 'auto:good';

    if (mediaType === 'video') {
        return optimizeCloudinaryUrl(url, {
            quality,
            type: 'video',
            width: networkSpeed === 'slow' ? 480 : networkSpeed === 'medium' ? 720 : undefined
        });
    } else {
        // For images/thumbnails
        return optimizeCloudinaryUrl(url, {
            quality,
            type: 'image',
            width: networkSpeed === 'slow' ? 320 : networkSpeed === 'medium' ? 480 : 640
        });
    }
};
