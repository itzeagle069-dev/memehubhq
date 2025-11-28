"use client";

import { useEffect } from "react";

export default function ImageProtection() {
    useEffect(() => {
        const handleContextMenu = (e) => {
            if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
                e.preventDefault();
            }
        };

        document.addEventListener("contextmenu", handleContextMenu);
        return () => document.removeEventListener("contextmenu", handleContextMenu);
    }, []);

    return null;
}
