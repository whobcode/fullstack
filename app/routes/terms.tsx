import { Link } from 'react-router-dom';

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-social-cream-100 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl p-8">
                <div className="mb-8">
                    <Link to="/" className="text-4xl font-bold text-social-green-600">me</Link>
                </div>

                <h1 className="text-3xl font-bold text-social-forest-700 mb-6">Terms of Service</h1>
                <p className="text-sm text-social-forest-400 mb-8">Last updated: December 10, 2025</p>

                <div className="prose prose-social max-w-none space-y-6 text-social-forest-600">
                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using me ("the Service"), including the social platform and the Shade RPG
                            game feature, you agree to be bound by these Terms of Service ("Terms"). If you do not agree
                            to these Terms, you may not use the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">2. Eligibility</h2>
                        <p>
                            You must be at least 13 years old to use this Service. By using the Service, you represent
                            and warrant that you meet this age requirement and have the legal capacity to enter into
                            these Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">3. Account Registration</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>You may register using email/password or through Facebook Login</li>
                            <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                            <li>You agree to provide accurate and complete information</li>
                            <li>You are responsible for all activities that occur under your account</li>
                            <li>You must notify us immediately of any unauthorized use of your account</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">4. User Conduct</h2>
                        <p>You agree not to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Post content that is illegal, harmful, threatening, abusive, harassing, or defamatory</li>
                            <li>Impersonate any person or entity</li>
                            <li>Use automated systems or bots to access the Service</li>
                            <li>Interfere with or disrupt the Service or servers</li>
                            <li>Attempt to gain unauthorized access to any part of the Service</li>
                            <li>Use the Service to send spam or unsolicited messages</li>
                            <li>Exploit bugs or vulnerabilities for unfair advantage</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">5. User Content</h2>
                        <p>
                            You retain ownership of content you post on the Service. By posting content, you grant us
                            a non-exclusive, worldwide, royalty-free license to use, display, and distribute your
                            content in connection with the Service.
                        </p>
                        <p className="mt-3">
                            We reserve the right to remove any content that violates these Terms or is otherwise
                            objectionable, at our sole discretion.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">6. Shade RPG Game Terms</h2>
                        <p>
                            The Shade RPG game feature is provided as part of the Service. Additional terms apply
                            specifically to gameplay:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Game characters, items, and progress are virtual and have no real-world monetary value</li>
                            <li>We reserve the right to modify game mechanics, balance, and features at any time</li>
                            <li>Trading, selling, or transferring accounts or virtual items for real money is prohibited</li>
                            <li>Game statistics and leaderboards are for entertainment purposes only</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">7. Third-Party Services</h2>
                        <p>
                            The Service may integrate with third-party services such as Facebook. Your use of these
                            services is governed by their respective terms and privacy policies. We are not responsible
                            for the practices of third-party services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">8. Intellectual Property</h2>
                        <p>
                            The Service, including its design, features, and content (excluding user-generated content),
                            is owned by us and protected by copyright, trademark, and other intellectual property laws.
                            You may not copy, modify, distribute, or create derivative works without our express permission.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">9. Disclaimers</h2>
                        <p>
                            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER
                            EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
                            OR SECURE.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">10. Limitation of Liability</h2>
                        <p>
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">11. Termination</h2>
                        <p>
                            We may suspend or terminate your account at any time for any reason, including violation of
                            these Terms. Upon termination, your right to use the Service will cease immediately. You may
                            also delete your account at any time through your account settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">12. Changes to Terms</h2>
                        <p>
                            We may modify these Terms at any time. We will notify users of material changes by posting
                            the updated Terms on the Service. Continued use after changes become effective constitutes
                            acceptance of the modified Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">13. Governing Law</h2>
                        <p>
                            These Terms shall be governed by and construed in accordance with applicable laws, without
                            regard to conflict of law principles.
                        </p>
                    </section>

                    <section className="bg-social-cream-100 rounded-lg p-6 border border-social-cream-400">
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">14. Pricing Model & Virtual Item Policy</h2>
                        <p>
                            The Service is currently provided free of charge. We reserve the right to introduce premium
                            features or subscription options in the future, with appropriate notice to users.
                        </p>

                        <div className="mt-4 p-4 bg-social-forest-700 text-white rounded-lg">
                            <h3 className="text-lg font-semibold mb-2">Important: Daily Engagement Requirement</h3>
                            <p className="text-sm">
                                <strong>By using the Shade RPG game feature, you acknowledge and agree that virtual items
                                (including but not limited to equipment, consumables, resources, and any shared or traded
                                items) are subject to forfeiture if you do not log into the game each day.</strong>
                            </p>
                            <p className="text-sm mt-3">
                                Items shared with you by other players, items in your inventory, and any game assets may be
                                permanently lost and claimed by the game, its creator, and the shadows if you fail to
                                maintain daily activity. This is a core game mechanic designed to encourage active
                                participation and maintain game economy balance.
                            </p>
                            <p className="text-sm mt-3">
                                The shadows are always watching. The shadows are always waiting. What you do not claim,
                                the shadows will take. No appeals, no refunds, no exceptions.
                            </p>
                        </div>

                        <p className="mt-4 text-sm">
                            Virtual items have no real-world value and cannot be exchanged for currency. Loss of virtual
                            items due to inactivity does not entitle you to any compensation.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">15. Contact Information</h2>
                        <p>
                            For questions about these Terms, please contact us at:
                        </p>
                        <p className="mt-2">
                            <strong>Email:</strong> legal@hwmnbn.me<br />
                            <strong>Website:</strong> hwmnbn.me
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-6 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm text-social-forest-400">
                        <Link to="/" className="hover:text-social-green-600">Back to Home</Link>
                        <Link to="/privacy" className="hover:text-social-green-600">Privacy Policy</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
