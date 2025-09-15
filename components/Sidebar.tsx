

import React from 'react';
import { Page } from '../types';
import { LayoutDashboard, Car, Users, Calendar, FileText, DollarSign, LogOut } from 'lucide-react';
import { signOut } from '../services/api';

interface SidebarProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
    const navItems = [
        { page: Page.DASHBOARD, label: 'Přehled', icon: LayoutDashboard },
        { page: Page.RESERVATIONS, label: 'Rezervace a Kalendář', icon: Calendar },
        { page: Page.VEHICLES, label: 'Vozový park', icon: Car },
        { page: Page.CUSTOMERS, label: 'Zákazníci', icon: Users },
        { page: Page.CONTRACTS, label: 'Smlouvy', icon: FileText },
        { page: Page.FINANCIALS, label: 'Finance', icon: DollarSign },
    ];
    
    const handleSignOut = async () => {
        try {
            await signOut();
            // The onAuthStateChange listener in App.tsx will handle the redirect.
        } catch (error) {
            console.error("Failed to sign out:", error);
            alert("Odhlášení se nezdařilo.");
        }
    };

    return (
        <div className="w-64 bg-primary text-light-text flex flex-col h-screen">
            <div className="p-6 text-2xl font-bold border-b border-blue-800 flex-shrink-0">
                Van Rental Pro
            </div>
            <nav className="flex-1 px-4 py-6 overflow-y-auto">
                {navItems.map(({ page, label, icon: Icon }) => (
                    <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-full flex items-center px-4 py-3 my-1 rounded-lg transition-colors duration-200 ${
                            currentPage === page
                                ? 'bg-blue-700 text-white'
                                : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                        }`}
                    >
                        <Icon className="w-5 h-5 mr-3" />
                        <span className="font-medium">{label}</span>
                    </button>
                ))}
            </nav>

            {/* Logout Button */}
            <div className="px-4 py-4 border-t border-blue-800 flex-shrink-0">
                 <button
                    onClick={handleSignOut}
                    className="w-full flex items-center px-4 py-3 rounded-lg text-blue-200 hover:bg-blue-800 hover:text-white transition-colors duration-200"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    <span className="font-medium">Odhlásit se</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;