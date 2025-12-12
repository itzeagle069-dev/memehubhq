import Link from "next/link";
import { Facebook, Instagram, Heart, Youtube } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-white dark:bg-[#050505] border-t border-gray-200 dark:border-gray-800 mt-20">
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="bg-yellow-400 p-1 rounded-lg rotate-3">
                                <span className="text-xl">😂</span>
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-black dark:text-white">
                                MemeHub <span className="text-yellow-400">HQ</span>
                            </span>
                        </Link>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
                            The world's fastest growing community for viral memes, funny videos, and sound effects.
                        </p>
                    </div>


                    {/* Links */}
                    <div>
                        <h3 className="font-bold text-black dark:text-white mb-4">Discover</h3>
                        <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                            <li><Link href="/?category=trending#explore" className="hover:text-yellow-400 transition-colors">Trending Now</Link></li>
                            <li><Link href="/?category=recent#explore" className="hover:text-yellow-400 transition-colors">New Uploads</Link></li>
                            <li><Link href="/?category=most_downloaded#explore" className="hover:text-yellow-400 transition-colors">Most Downloaded</Link></li>
                            <li><Link href="/?category=viral#explore" className="hover:text-yellow-400 transition-colors">Viral Videos</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-black dark:text-white mb-4">Community</h3>
                        <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                            <li><Link href="/upload" className="hover:text-yellow-400 transition-colors">Upload Meme</Link></li>
                            <li><Link href="/guidelines" className="hover:text-yellow-400 transition-colors">Guidelines</Link></li>
                            <li><Link href="/privacy" className="hover:text-yellow-400 transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-yellow-400 transition-colors">Terms of Service</Link></li>
                            <li><Link href="/report" className="hover:text-yellow-400 transition-colors">Contact / Report Issue</Link></li>
                        </ul>
                    </div>

                    {/* Socials */}
                    <div>
                        <h3 className="font-bold text-black dark:text-white mb-4">Follow Us</h3>
                        <div className="flex gap-3">
                            <SocialIcon href="https://facebook.com/PokhrelSantosh069" icon={<Facebook size={20} />} label="Facebook" />
                            <SocialIcon href="https://www.instagram.com/ramrashik008/" icon={<Instagram size={20} />} label="Instagram" />
                            <SocialIcon href="https://www.tiktok.com/@memehubhq7?is_from_webapp=1&sender_device=pc" icon={<TikTokIcon />} label="TikTok" />
                            <SocialIcon href="https://t.me/PokhrelSantosh069" icon={<TelegramIcon />} label="Telegram" />
                            <SocialIcon href="https://youtube.com/@memehub-hq" icon={<Youtube size={20} />} label="YouTube" />
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-400">
                        © {new Date().getFullYear()} MemeHub HQ. All rights reserved.
                    </p>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                        Made with <Heart size={14} className="text-red-500 fill-red-500" /> by <span className="text-black dark:text-white font-bold">MemeHub HQ Team</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function SocialIcon({ icon, href, label }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-yellow-400 hover:text-black transition-all transform hover:scale-110"
        >
            {icon}
        </a>
    );
}

function TikTokIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
        </svg>
    );
}

function TelegramIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-8.609 3.33c-2.068.8-4.133 1.598-5.724 2.21a405.15 405.15 0 0 1-2.863 1.13l-4.203 1.625c-.259.08-.271.085-.3.1l-.1.066c-.035.03-.095.07-.123.15-.055.16-.01.405.116.634.09.16.27.31.57.433.207.085.9.362 2.062.834 1.162.47 2.085.845 2.124.86l.04.015 3.32 10.93c.063.208.2.392.387.48a.59.59 0 0 0 .543-.016c.15-.078.266-.217.31-.383l1.838-6.702c2.023 1.488 4.295 3.197 4.965 3.655.22.15.532.366.953.336.566-.04.755-.54.852-1.218 0-.005.65-4.48 1.34-9.336.345-2.428.667-4.698.796-5.834.02-.206.035-.387.046-.534.008-.103.012-.22-.008-.34a.656.656 0 0 0-.348-.352 1.39 1.39 0 0 0-.566-.056z" fill="currentColor" stroke="none" />
        </svg>
    );
}
