import React from 'react';
import { Shield, Heart, AlertTriangle, Copyright } from 'lucide-react';

export default function GuidelinesPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-black dark:text-white pt-32 pb-20 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black mb-6">Community <span className="text-yellow-400">Guidelines</span></h1>
                    <p className="text-xl text-gray-500 dark:text-gray-400">
                        MemeHub is a place for fun, laughter, and creativity. To keep it that way, we ask everyone to follow these simple rules.
                    </p>
                </div>

                <div className="grid gap-8">
                    <section className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-2xl">
                                <Heart size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Be Kind and Respectful</h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                    We have zero tolerance for hate speech, harassment, bullying, or discrimination of any kind.
                                    Memes should bring joy, not harm. Treat others the way you want to be treated.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-2xl">
                                <AlertTriangle size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Keep it Safe</h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                    Do not post explicit violence, gore, or illegal content. NSFW content must be strictly categorized
                                    if allowed (check current policy), but generally, keep it safe for a broad audience.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
                                <Copyright size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Respect Copyright</h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                    Upload content that you have the right to share. Give credit to original creators whenever possible.
                                    We respect intellectual property rights and will remove infringing content.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl">
                                <Shield size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-4">No Spam or Scams</h2>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                    Do not use MemeHub to spam users, promote scams, or distribute malware.
                                    Authentic interaction is what makes this community great.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
