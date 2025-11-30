"use client";

import { useEffect, useState } from "react";

export default function AdUnit({ type = "banner", className = "" }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    if (type === "banner") {
        return (
            <div className={`w-full flex justify-center my-6 overflow-hidden ${className}`}>
                <div className="w-[728px] max-w-full h-[90px] bg-gray-100 dark:bg-[#1a1a1a] rounded-lg overflow-hidden flex items-center justify-center">
                    <iframe
                        src="/ads/banner.html"
                        width="728"
                        height="90"
                        scrolling="no"
                        frameBorder="0"
                        className="max-w-full"
                        title="Advertisement"
                    />
                </div>
            </div>
        );
    }

    if (type === "native") {
        return (
            <div className={`w-full flex justify-center my-6 ${className}`}>
                <div className="w-full max-w-md min-h-[250px] bg-gray-100 dark:bg-[#1a1a1a] rounded-lg overflow-hidden flex items-center justify-center">
                    <iframe
                        src="/ads/native.html"
                        width="100%"
                        height="300"
                        scrolling="no"
                        frameBorder="0"
                        title="Advertisement"
                    />
                </div>
            </div>
        );
    }

    return null;
}
