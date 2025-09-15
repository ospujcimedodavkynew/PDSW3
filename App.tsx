import React, { useState, useEffect } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import Calendar from './pages/Calendar';
import Vehicles from './pages/Vehicles';
import Customers from './pages/Customers';
import Contracts from './pages/Contracts';
import Financials from './pages/Financials';
import Reports from './pages/Reports';
import Login from './pages/Login';
import CustomerPortal from './pages/CustomerPortal';
import { Page } from './types';
import { Loader } from 'lucide-react';

const AppContent: React.FC = () => {
    const { loading: dataLoading } = useData();
    const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
    const [user, setUser] = useState<object | null>(JSON.parse(localStorage.getItem('user') || 'null'));
    const [authLoading, setAuthLoading] = useState(true);

    const portalToken = new URLSearchParams(window.location.search).get('portal');

    useEffect(() => {
        const handleAuthChange = () => {
            setUser(JSON.parse(localStorage.getItem('user') || 'null'));
            setAuthLoading(false);
        };
        
        window.addEventListener('storage', handleAuthChange);
        
        handleAuthChange();

        return () => window.removeEventListener('storage', handleAuthChange);
    }, []);

    if (portalToken) {
        return <CustomerPortal token={portalToken} />;
    }

    if (authLoading) {
        return <div className="flex items-center justify-center min-h-screen"><Loader className="w-8 h-8 animate-spin" /></div>;
    }

    if (!user) {
        return <Login />;
    }
    
    const renderPage = () => {
        switch (currentPage) {
            case Page.DASHBOARD: return <Dashboard setCurrentPage={setCurrentPage} />;
            case Page.RESERVATIONS: return <Reservations />;
            case Page.CALENDAR: return <Calendar />;
            case Page.VEHICLES: return <Vehicles />;
            case Page.CUSTOMERS: return <Customers />;
            case Page.CONTRACTS: return <Contracts />;
            case Page.FINANCIALS: return <Financials />;
            case Page.REPORTS: return <Reports />;
            default: return <Dashboard setCurrentPage={setCurrentPage} />;
        }
    };

    return (
        <div className="flex h-screen bg-light-bg">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <main className="flex-1 p-6 overflow-y-auto">
                {dataLoading ? <div className="flex justify-center items-center h-full"><Loader className="w-8 h-8 animate-spin" /> Načítání dat...</div> : renderPage()}
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
