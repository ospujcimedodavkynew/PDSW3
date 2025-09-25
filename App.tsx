import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
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
import VehicleFormModal from './components/VehicleFormModal';
import { Page } from './types';
import { Loader } from 'lucide-react';


// --- Error Boundary Component ---
const ConfigurationError: React.FC = () => (
    <div className="font-sans p-8 text-center bg-yellow-50 border border-yellow-300 rounded-lg m-8">
        <h1 className="text-2xl font-bold text-yellow-800">Chyba v konfiguraci</h1>
        <p className="mt-4 text-yellow-900">
            Nebyly nalezeny platné klíče pro připojení k databázi Supabase.
        </p>
        <p className="mt-2 text-yellow-900">
            Prosím, otevřete soubor <code className="bg-yellow-200 p-1 rounded font-mono text-sm">services/supabaseClient.ts</code> a nastavte správné hodnoty pro 
            proměnné <code>supabaseUrl</code> a <code>supabaseAnonKey</code>.
        </p>
    </div>
);

const GenericError: React.FC = () => (
     <div className="font-sans p-8 text-center bg-red-50 border border-red-300 rounded-lg m-8">
        <h1 className="text-2xl font-bold text-red-800">Omlouváme se, něco se pokazilo</h1>
        <p className="mt-4 text-red-900">
            V aplikaci nastala neočekávaná chyba. Zkuste prosím obnovit stránku.
        </p>
    </div>
);

interface EBProps { children?: ReactNode; }
interface EBState { hasError: boolean; error?: Error; }

class ErrorBoundary extends Component<EBProps, EBState> {
  public state: EBState = { hasError: false };

  public static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Chyba aplikace:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.state.error?.message.includes("Supabase URL and Anon Key are required")) {
          return <ConfigurationError />;
      }
      return <GenericError />;
    }
    return this.props.children;
  }
}
// --- End of Error Boundary ---

// This component is for the main, authenticated application experience.
// It assumes it's rendered within a DataProvider.
const AuthenticatedApp: React.FC = () => {
    const { session, loading, isVehicleFormModalOpen, vehicleBeingEdited, actions } = useData();
    const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Loader className="w-8 h-8 animate-spin" /></div>;
    }

    if (!session) {
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
            case Page.HANDOVER_PROTOCOLS: return <HandoverProtocols />;
            case Page.FINANCIALS: return <Financials />;
            case Page.REPORTS: return <Reports />;
            case Page.INVOICES: return <Invoices />;
            case Page.SETTINGS: return <Settings />;
            default: return <Dashboard setCurrentPage={setCurrentPage} />;
        }
    };

    return (
        <div className="flex h-screen bg-light-bg">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <main className="flex-1 p-6 overflow-y-auto">
                {renderPage()}
            </main>
            {/* Render modal globally to persist its state across page navigations */}
            <VehicleFormModal
                isOpen={isVehicleFormModalOpen}
                onClose={actions.closeVehicleFormModal}
                vehicle={vehicleBeingEdited}
            />
        </div>
    );
};

// This is the new main router component. It decides which "app" to show.
const AppRouter: React.FC = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const portalToken = urlParams.get('portal');
    const isOnlineBooking = urlParams.get('online-rezervace') === 'true';

    if (isOnlineBooking) {
        return <OnlineBooking />;
    }
    
    if (portalToken) {
        return <CustomerPortal token={portalToken} />;
    }
    
    // The default is the main application, which needs the data provider.
    return (
        <DataProvider>
            <AuthenticatedApp />
        </DataProvider>
    );
};

// The top-level App component just wraps everything in an ErrorBoundary.
const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <AppRouter />
        </ErrorBoundary>
    );
};

export default App;