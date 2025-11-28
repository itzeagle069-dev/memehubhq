"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function RewardedAdModal({ isOpen, onClose, onComplete, duration = 15 }) {
    const [countdown, setCountdown] = useState(duration);
    const [canClose, setCanClose] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setCountdown(duration);
            setCanClose(false);
            return;
        }

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCanClose(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, duration]);

    const handleComplete = () => {
        if (canClose) {
            onComplete();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl mx-4">
                {/* Close button - only enabled after countdown */}
                {canClose && (
                    <button
                        onClick={handleComplete}
                        className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                )}

                {/* Ad Container */}
                <div className="bg-gradient-to-br from-purple-900 via-pink-900 to-yellow-900 rounded-2xl p-8 shadow-2xl">
                    {/* Countdown Timer */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm mb-4">
                            <span className="text-5xl font-black text-white">{countdown}</span>
                        </div>
                        <p className="text-white text-lg font-bold">
                            {canClose ? "Download Ready!" : "Please wait..."}
                        </p>
                        <p className="text-white/70 text-sm mt-2">
                            {canClose ? "Click above to close and download" : "Ad supports creators"}
                        </p>
                    </div>

                    {/* Ad Placeholder - Replace with actual ad */}
                    <div className="bg-black/30 rounded-xl p-8 backdrop-blur-sm border-2 border-white/20">
                        <div className="text-center space-y-4">
                            <div className="text-6xl">🎯</div>
                            <h3 className="text-2xl font-black text-white">Advertisement</h3>
                            <p className="text-white/80">
                                Replace this with Google Ad Manager or AdSense rewarded ad unit
                            </p>
                            <div className="text-sm text-white/60 mt-4">
                                <p>Integration Steps:</p>
                                <ol className="text-left inline-block mt-2 space-y-1">
                                    <li>1. Create rewarded ad unit in Google Ad Manager</li>
                                    <li>2. Get ad unit ID</li>
                                    <li>3. Replace this placeholder with ad unit code</li>
                                    <li>4. Trigger onComplete() when ad finishes</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Continue Button */}
                    <button
                        onClick={handleComplete}
                        disabled={!canClose}
                        className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all ${canClose
                                ? "bg-yellow-400 hover:bg-yellow-500 text-black cursor-pointer shadow-lg hover:shadow-xl"
                                : "bg-gray-600 text-gray-400 cursor-not-allowed"
                            }`}
                    >
                        {canClose ? "Continue to Download" : `Wait ${countdown}s...`}
                    </button>
                </div>
            </div>
        </div>
    );
}
