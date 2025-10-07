import React from 'react';
import { useData } from '../contexts/DataContext';

const LogoWithQR: React.FC = () => {
    const { data } = useData();
    const phoneNumber = data.settings?.contactPhone || '777 123 456'; // Fallback phone number
    
    // The link for the QR code
    const onlineBookingLink = `${window.location.origin}${window.location.pathname}?online-rezervace=true`;

    return (
        <div className="p-4 border rounded-lg bg-gray-50 flex justify-center">
            <svg width="600" height="350" viewBox="0 0 600 350" xmlns="http://www.w3.org/2000/svg" className="max-w-full h-auto">
                <title>Návrh polepu na dodávku</title>
                <desc>
                    Logo, slogan, telefonní číslo a QR kód pro online rezervaci.
                    QR kód odkazuje na: {onlineBookingLink}
                </desc>

                {/* White background */}
                <rect width="600" height="350" fill="white" />
                <rect x="1" y="1" width="598" height="348" fill="none" stroke="#E5E7EB" strokeWidth="1" />

                {/* Top Section: Logo */}
                <g transform="translate(30, 30)">
                    {/* Van Icon */}
                    <g transform="scale(2)">
                        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" fill="none" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15 18H9" fill="none" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19 18h2a1 1 0 0 0 1-1v-3.34a1 1 0 0 0-.17-.53L18.83 11H15V6a2 2 0 0 0-2-2h-1" fill="none" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="17" cy="18" r="2" fill="none" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="7" cy="18" r="2" fill="none" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </g>
                    {/* Text Logo */}
                    <text x="60" y="35" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontSize="32" fontWeight="bold" fill="#111827">
                        pujcimedodavky<tspan fill="#FBBF24">.cz</tspan>
                    </text>
                </g>

                <line x1="30" y1="100" x2="570" y2="100" stroke="#E5E7EB" strokeWidth="1" />

                {/* Bottom Action Section */}
                <g transform="translate(40, 130)">
                    {/* Left side: QR Code */}
                    <g>
                        {/* Functional QR Code - SVG Path */}
                        <g transform="translate(0, 0) scale(4.28)">
                            <path fill="#111827" d="M0 0h7v7H0z M1 1h5v5H1z m2 2h1v1H3z M8 0h7v7H8z M9 1h5v5H9z m2 2h1v1h-1z M15 0h7v7h-7z M16 1h5v5h-16z M18 3h1v1h-1z M0 8h7v7H0z M1 9h5v5H1z M3 11h1v1H3z M0 15h7v7H0z M1 16h5v5H1z M3 18h1v1H3z M8 8h1v1H8z m2 0h1v1h-1z m2 0h1v1h-1z m2 0h1v1h-1z m2 0h1v1h-1z m2 0h1v1h-1z m1-1v1h1V8h-1z M8 10h1v1H8z m6 0h1v1h-1z m2 0h1v1h-1z M8 12h1v1H8z m2 0h1v1h-1z m4 0h1v1h-1z m2 0h1v1h-1z m2 0h1v1h-1z M8 14h1v1H8z m2 0h1v1h-1z m2 0h1v1h-1z m2 0h1v1h-1z m4 0h1v1h-1z m-11 1v1h1v-1H8z m-1 8h1v1H7z m1-1h1v1H8z m2 0h1v1h-1z m2 0h1v1h-1z m-2 2h1v1h-1z m2 0h1v1h-1z m2 0h1v1h-1z m2 0h1v1h-1z m2 0h1v1h-1z m-11-5h1v1H8z m-1 6h1v1H7z m1-1h1v1H8z m1-1h1v1H9z m1-1h1v1h-1z m1-1h1v1h-1z m2 0h1v1h-1z m2 0h1v1h-1z m2 0h1v1h-1z m-9-3h1v1H8z m1-1h1v1H9z m1-1h1v1h-1z m1-1h1v1h-1z m1-1h1v1h-1z m1 0h1v1h-1z m1 0h1v1h-1z m1 0h1v1h-1z m1 0h1v1h-1z m1 0h1v1h-1z"/>
                        </g>
                        <text x="90" y="205" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#111827" textAnchor="middle">
                            Naskenujte & Rezervujte
                        </text>
                    </g>
                    
                    <line x1="265" y1="0" x2="265" y2="180" stroke="#E5E7EB" strokeWidth="1" />

                    {/* Right side: Contact Info */}
                    <g transform="translate(300, 30)">
                        <text x="0" y="0" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontSize="26" fontWeight="bold" fill="#111827">
                            Rychle. Snadno. Spolehlivě.
                        </text>
                        {/* Phone Icon */}
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" fill="#1E40AF" transform="translate(0, 50) scale(1.5)" />
                        <text x="40" y="80" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontSize="42" fontWeight="bold" fill="#1E40AF">
                            {phoneNumber}
                        </text>
                    </g>
                </g>
            </svg>
        </div>
    );
};

export default LogoWithQR;
