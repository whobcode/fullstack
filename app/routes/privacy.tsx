import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-social-cream-100 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl p-8">
                <div className="mb-8">
                    <Link to="/" className="text-4xl font-bold text-social-green-600">me</Link>
                </div>

                <h1 className="text-3xl font-bold text-social-forest-700 mb-6">Privacy Policy</h1>
                <p className="text-sm text-social-forest-400 mb-8">Last updated: December 10, 2025</p>

                <div className="prose prose-social max-w-none space-y-6 text-social-forest-600">
                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">1. Introduction</h2>
                        <p>
                            Welcome to me ("we," "our," or "us"). We are committed to protecting your privacy and ensuring
                            the security of your personal information. This Privacy Policy explains how we collect, use,
                            disclose, and safeguard your information when you use our platform and services, including the
                            Shade RPG game feature.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">2. Information We Collect</h2>

                        <h3 className="text-lg font-medium text-social-forest-600 mb-2">2.1 Information You Provide</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Account Information:</strong> Email address, username, password, and profile details</li>
                            <li><strong>Profile Content:</strong> Photos, bio, location, and other profile information you choose to share</li>
                            <li><strong>Social Content:</strong> Posts, comments, messages, and group interactions</li>
                            <li><strong>Game Data:</strong> Character information, battle statistics, inventory items, and gameplay progress</li>
                        </ul>

                        <h3 className="text-lg font-medium text-social-forest-600 mb-2 mt-4">2.2 Information from Third-Party Services</h3>
                        <p>
                            When you connect via Facebook Login, we may receive:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Your Facebook user ID and basic profile information</li>
                            <li>Email address (if permitted)</li>
                            <li>Profile picture and cover photo</li>
                            <li>Friends list who also use our service (with permission)</li>
                            <li>Photos (with permission)</li>
                        </ul>

                        <h3 className="text-lg font-medium text-social-forest-600 mb-2 mt-4">2.3 Automatically Collected Information</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Device information and browser type</li>
                            <li>IP address and approximate location</li>
                            <li>Usage patterns and feature interactions</li>
                            <li>Session data and cookies</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">3. How We Use Your Information</h2>
                        <p>We use collected information to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Provide, maintain, and improve our services</li>
                            <li>Create and manage your account</li>
                            <li>Enable social features and friend connections</li>
                            <li>Process game mechanics including battles, XP accrual, and item management</li>
                            <li>Send service-related notifications</li>
                            <li>Ensure platform security and prevent fraud</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">4. Data Sharing and Disclosure</h2>
                        <p>We may share your information with:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Other Users:</strong> Profile information, posts, and game statistics as part of platform features</li>
                            <li><strong>Service Providers:</strong> Third parties who assist in operating our platform (hosting, analytics)</li>
                            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                        </ul>
                        <p className="mt-3">
                            We do not sell your personal information to third parties.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">5. Data Retention</h2>
                        <p>
                            We retain your personal information for as long as your account is active or as needed to provide
                            services. Game data, including items and character progress, may be subject to automatic deletion
                            as described in our Terms of Service. You may request deletion of your account and associated data
                            at any time.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">6. Facebook Data</h2>
                        <p>
                            If you connect your Facebook account, you can disconnect it at any time through your Facebook
                            settings or by contacting us. Upon disconnection or account deletion:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>We will delete your Facebook access tokens</li>
                            <li>Mirrored Facebook data will be removed within 30 days</li>
                            <li>You may also request immediate deletion through our data deletion endpoint</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">7. Your Rights</h2>
                        <p>Depending on your location, you may have the right to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Access your personal data</li>
                            <li>Correct inaccurate data</li>
                            <li>Delete your data</li>
                            <li>Export your data in a portable format</li>
                            <li>Object to or restrict certain processing</li>
                            <li>Withdraw consent where applicable</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">8. Security</h2>
                        <p>
                            We implement industry-standard security measures including encryption, secure session management,
                            and regular security audits. However, no method of transmission over the internet is 100% secure,
                            and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">9. Cookies</h2>
                        <p>
                            We use essential cookies to maintain your session and remember your preferences. We may also
                            use analytics cookies to understand how users interact with our platform. You can control cookies
                            through your browser settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">10. Children's Privacy</h2>
                        <p>
                            Our services are not intended for users under 13 years of age. We do not knowingly collect
                            personal information from children under 13. If we discover we have collected such information,
                            we will delete it promptly.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">11. Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of significant changes
                            by posting the new policy on this page and updating the "Last updated" date. Continued use of
                            our services after changes constitutes acceptance of the updated policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-social-forest-700 mb-3">12. Contact Us</h2>
                        <p>
                            If you have questions about this Privacy Policy or our data practices, please contact us at:
                        </p>
                        <p className="mt-2">
                            <strong>Email:</strong> privacy@hwmnbn.me<br />
                            <strong>Website:</strong> hwmnbn.me
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-6 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm text-social-forest-400">
                        <Link to="/" className="hover:text-social-green-600">Back to Home</Link>
                        <Link to="/terms" className="hover:text-social-green-600">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
