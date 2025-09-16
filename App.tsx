import React, { useState, useEffect } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import { Page } from './types';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import Calendar from './pages/Calendar';
import Vehicles from './pages/Vehicles';
import Customers from './pages/Customers';
import Contracts from './pages/Contracts';
import Financials from './pages/Financials';
import Reports from './pages/Reports';
import CustomerPortal from './pages/CustomerPortal';
import OnlineBooking from './pages/OnlineBooking';
import { Loader } from 'lucide-react';

const AppContent: React.FC = () => {
    const { session, loading } = useData();
    const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
    const [portalToken, setPortalToken] = useState<string | null>(null);
    const [isOnlineBooking, setIsOnlineBooking] = useState<boolean>(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('portal');
        const booking = urlParams.get('booking');

        if (token) {
            setPortalToken(token);
        } else if (booking !== null) { // Check for presence of 'booking' param
            setIsOnlineBooking(true);
        }
    }, []);

    if (portalToken) {
        return <CustomerPortal token={portalToken} />;
    }
    
    if (isOnlineBooking) {
        return <OnlineBooking />;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-light-bg">
                <Loader className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        return <Login />;
    }

    const renderPage = () => {
        switch (currentPage) {
            case Page.DASHBOARD:
                return <Dashboard setCurrentPage={setCurrentPage} />;
            case Page.RESERVATIONS:
                return <Reservations />;
            case Page.CALENDAR:
                return <Calendar />;
            case Page.VEHICLES:
                return <Vehicles />;
            case Page.CUSTOMERS:
                return <Customers />;
            case Page.CONTRACTS:
                return <Contracts />;
            case Page.FINANCIALS:
                return <Financials />;
            case Page.REPORTS:
                return <Reports />;
            default:
                return <Dashboard setCurrentPage={setCurrentPage} />;
        }
    };

    return (
        <div className="flex h-screen bg-light-bg">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <main className="flex-1 p-6 overflow-y-auto">
                {renderPage()}
            </main>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <DataProvider>
            <AppContent />
        </DataProvider>
    );
};

export default App;
