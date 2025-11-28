// AdCard component for displaying ads in the meme grid
import React from "react";

export default function AdCard({ wide = false }) {
    if (wide) {
        // Wide horizontal ad - spans full width
        return (
            <div className="col-span-full bg-gradient-to-r from-purple-50 via-pink-50 to-yellow-50 dark:from-purple-900/10 dark:via-pink-900/10 dark:to-yellow-900/10 rounded-2xl border border-purple-200 dark:border-purple-800 p-6 min-h-[120px] flex items-center justify-center hover:shadow-lg transition-shadow">
                <div className="text-center">
                    <div className="text-4xl mb-2">🎯</div>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Advertisement</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Your ad could be here • 728x90</p>
                </div>
            </div>
        );
    }

    // Regular ad - looks like a meme card to blend in
    return (
        <div className="group relative rounded-2xl bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#252525] overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
            {/* Ad content styled like a meme */}
            <div className="aspect-[4/3] bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-100 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-yellow-900/20 flex items-center justify-center relative overflow-hidden">
                <div className="text-center p-6">
                    <div className="text-5xl mb-3">🎯</div>
                    <p className="text-base font-black text-gray-800 dark:text-gray-200">Ad Space</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Promote your content here</p>
                </div>

                {/* Sponsored badge */}
                <div className="absolute top-2 right-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm uppercase">
                    Sponsored
                </div>
            </div>

            {/* Footer styled like meme card */}
            <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-sm text-gray-500 dark:text-gray-400 mb-2">Advertisement</h3>
                <p className="text-xs text-gray-400">300x250 • Premium Ad Space</p>
            </div>
        </div>
    );
}
