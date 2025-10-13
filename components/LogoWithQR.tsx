import React from 'react';
import { useData } from '../contexts/DataContext';

const LogoWithQR: React.FC = () => {
    const { data } = useData();
    const { settings } = data;

    // Placeholder path for a generic QR code appearance
    const qrCodePlaceholderPath = "M0 0h7v7H0z M9 0h7v7H9z M18 0h7v7h-7z M0 9h7v7H0z M9 9h7v7H9z M18 9h7v7h-7z M0 18h7v7H0z M9 18h7v7H9z M18 18h7v7h-7z M4 4h-1v1h1z M13 4h-1v1h1z M22 4h-1v1h1z M4 13h-1v1h1z M13 13h-1v1h1z M22 13h-1v1h1z M4 22h-1v1h1z M13 22h-1v1h1z M22 22h-1v1h1z";

    return (
        <svg width="800" height="500" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" fontFamily="sans-serif">
            <rect width="100%" height="100%" fill="white"/>
    
            <g transform="translate(400, 80)">
                <g transform="scale(2.5) translate(-12, -12)">
                    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" stroke="#1E40AF" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 18H9" stroke="#1E40AF" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 18h2a1 1 0 0 0 1-1v-3.34a1 1 0 0 0-.17-.53L18.83 11H15V6a2 2 0 0 0-2-2h-1" stroke="#1E40AF" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="17" cy="18" r="2" stroke="#1E40AF" strokeWidth="1.5" fill="none"/>
                    <circle cx="7" cy="18" r="2" stroke="#1E40AF" strokeWidth="1.5" fill="none"/>
                </g>
                <text x="0" y="45" fontSize="52" fontWeight="bold" fill="#111827" textAnchor="middle">
                    pujcimedodavky<tspan fill="#FBBF24">.cz</tspan>
                </text>
            </g>
    
            <text x="400" y="190" fontSize="28" fontWeight="500" fill="#4B5563" textAnchor="middle" letterSpacing="1">
                Rychle. Snadno. Spolehlivě.
            </text>
    
            <line x1="100" y1="240" x2="700" y2="240" stroke="#E5E7EB" strokeWidth="2"/>
    
            <g transform="translate(0, 270)">
                <g transform="translate(220, 0)">
                    <text x="0" y="165" fontSize="22" fontWeight="bold" fill="#111827" textAnchor="middle">Naskenujte & Rezervujte</text>
                    <g transform="translate(-75, 0) scale(5.5)">
                         <path d={qrCodePlaceholderPath} fillRule="evenodd" clipRule="evenodd" fill="#111827" />
                    </g>
                </g>
                
                <g transform="translate(580, 0)">
                    <text x="0" y="165" fontSize="22" fontWeight="bold" fill="#111827" textAnchor="middle">Zavolejte nám</text>
                    <text x="0" y="75" fontSize="42" fontWeight="bold" fill="#1E40AF" textAnchor="middle" dominantBaseline="middle">
                        {settings?.contactPhone || 'Načítání...'}
                    </text>
                </g>
            </g>
        </svg>
    );
};

export default LogoWithQR;