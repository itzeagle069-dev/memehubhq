"use client";

import { createContext, useContext, useState, useEffect } from "react";

const DownloadContext = createContext();

export function DownloadProvider({ children }) {
    const [downloadList, setDownloadList] = useState([]);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("memehub_downloadList");
        if (saved) {
            try {
                setDownloadList(JSON.parse(saved));
            } catch (e) {
                console.error("Error loading download list:", e);
            }
        }
    }, []);

    // Save to localStorage whenever list changes
    useEffect(() => {
        localStorage.setItem("memehub_downloadList", JSON.stringify(downloadList));
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

export const useDownloadList = () => {
    const context = useContext(DownloadContext);
    if (!context) {
        throw new Error("useDownloadList must be used within DownloadProvider");
    }
    return context;
};
