import React from 'react';
import { FileText, UserCheck, AlertCircle, Scale } from 'lucide-react';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-black dark:text-white pt-32 pb-20 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black mb-6">Terms of <span className="text-yellow-400">Service</span></h1>
                    <p className="text-xl text-gray-500 dark:text-gray-400">
                        Please read these terms carefully before using MemeHub.
                    </p>
                </div>

                <div className="space-y-12">
                    <section>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <UserCheck className="text-yellow-400" /> Acceptance of Terms
                        </h2>
                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 leading-relaxed">
                            <p>
                                By accessing or using MemeHub, you agree to be bound by these Terms of Service and our Privacy Policy.
                                If you do not agree, please do not use our services.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <FileText className="text-yellow-400" /> User Content
                        </h2>
                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 leading-relaxed">
                            <p className="mb-4">
                                You retain ownership of the content you upload. However, by uploading content to MemeHub, you grant us a non-exclusive,
                                worldwide, royalty-free license to use, display, reproduce, and distribute your content on our platform.
                            </p>
                            <p>
                                You are solely responsible for the content you post and must ensure it does not violate any laws or third-party rights.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <AlertCircle className="text-yellow-400" /> Prohibited Conduct
                        </h2>
                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 leading-relaxed">
                            <p>
                                You agree not to engage in any of the following prohibited activities:
                            </p>
                            <ul className="list-disc pl-5 space-y-2 mt-2">
                                <li>Using the service for any illegal purpose.</li>
                                <li>Harassing, threatening, or intimidating other users.</li>
                                <li>Impersonating any person or entity.</li>
                                <li>Interfering with or disrupting the service or servers.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <Scale className="text-yellow-400" /> Termination
                        </h2>
                        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 leading-relaxed">
                            <p>
                                We reserve the right to suspend or terminate your account at our sole discretion, without notice,
                                for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
