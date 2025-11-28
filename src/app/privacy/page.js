import React from 'react';
import { Lock, Eye, Database, Cookie } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-black dark:text-white pt-32 pb-20 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black mb-6">Privacy <span className="text-yellow-400">Policy</span></h1>
                    <p className="text-xl text-gray-500 dark:text-gray-400">
                        Your privacy is important to us. Here's how we handle your data.
                    </p>
                </div>

                <div className="space-y-12">
                    <section>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <Database className="text-yellow-400" /> Information We Collect
                        </h2>
                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 leading-relaxed">
                            <p className="mb-4">
                                When you use MemeHub, we collect certain information to provide you with the best experience:
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Account Information:</strong> If you sign in with Google, we collect your email address, name, and profile picture.</li>
                                <li><strong>Usage Data:</strong> We track how you interact with the site (likes, downloads, views) to improve our recommendations.</li>
                                <li><strong>Content:</strong> Any memes, comments, or reports you upload are stored on our servers.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <Eye className="text-yellow-400" /> How We Use Your Information
                        </h2>
                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 leading-relaxed">
                            <p>
                                We use your data to:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li>Authenticate your identity and secure your account.</li>
                                <li>Personalize your feed and suggest memes you'll like.</li>
                                <li>Analyze website traffic and performance.</li>
                                <li>Communicate with you regarding updates or issues.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <Cookie className="text-yellow-400" /> Cookies
                        </h2>
                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 leading-relaxed">
                            <p>
                                We use cookies to maintain your session and remember your preferences (like dark mode).
                                By using MemeHub, you consent to the use of these cookies.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <Lock className="text-yellow-400" /> Data Security
                        </h2>
                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 leading-relaxed">
                            <p>
                                We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure.
                                We do not sell your personal data to third parties.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
