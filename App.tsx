import React from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import Calendar from './pages/Calendar';
import Vehicles from './pages/Vehicles';
import Customers from './pages/Customers';
import Contracts from './pages/Contracts';
import HandoverProtocols from './pages/HandoverProtocols';
import Financials from './pages/Financials';
import Reports from './pages/Reports';
import Invoices from './pages/Invoices';
import Settings from './pages/Settings';
import Login from './pages/Login';
import CustomerPortal from './pages/CustomerPortal';
import OnlineBooking from './pages/OnlineBooking';
import { Page } from './types';
import { Loader } from 'lucide-react';

const AppContent: React.FC = () => {
    const { session, loading, currentPage } = useData();
    
    const urlParams = new URLSearchParams(window.location.search);
    const portalToken = urlParams.get('portal');
    const isOnlineBooking = urlParams.get('online-rezervace') === 'true';

    if (isOnlineBooking) {
        return <OnlineBooking />;
    }
    
    if (portalToken) {
        return <CustomerPortal token={portalToken} />;
    }

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Loader className="w-8 h-8 animate-spin" /></div>;
    }

    if (!session) {
        return <Login />;
    }
    
    const renderPage = () => {
        switch (currentPage) {
            case Page.DASHBOARD: return <Dashboard />;
            case Page.RESERVATIONS: return <Reservations />;
            case Page.CALENDAR: return <Calendar />;
            case Page.VEHICLES: return <Vehicles />;
            case Page.CUSTOMERS: return <Customers />;
            case Page.CONTRACTS: return <Contracts />;
            case Page.HANDOVER_PROTOCOLS: return <HandoverProtocols />;
            case Page.FINANCIALS: return <Financials />;
            case Page.REPORTS: return <Reports />;
            case Page.INVOICES: return <Invoices />;
            case Page.SETTINGS: return <Settings />;
            default: return <Dashboard />;
        }
    };

    return (
        <div className="flex h-screen bg-light-bg">
            <Sidebar />
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
