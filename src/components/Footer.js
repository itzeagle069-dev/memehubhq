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
                            <SocialIcon href="https://youtube.com/@memehub-hq" icon={<Youtube size={20} />} label="YouTube" />
                            <SocialIcon href="https://facebook.com/PokhrelSantosh069" icon={<Facebook size={20} />} label="Facebook" />
                            <SocialIcon href="https://instagram.com" icon={<Instagram size={20} />} label="Instagram" />
                            <SocialIcon href="https://tiktok.com" icon={<TikTokIcon />} label="TikTok" />
                            <SocialIcon href="https://discord.com" icon={<DiscordIcon />} label="Discord" />
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

function DiscordIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M7.25 18.25V18.25C7.25 18.25 8.66998 19.5 10.5 19.5C12.33 19.5 13.75 18.25 13.75 18.25V18.25M15.5 15.5C15.5 15.5 17 14 17 11.5C17 9 15.5 7.5 15.5 7.5H5.5C5.5 7.5 4 9 4 11.5C4 14 5.5 15.5 5.5 15.5M15.5 15.5H5.5M7.5 10.5H7.51M13.5 10.5H13.51" />
        </svg>
    );
}
