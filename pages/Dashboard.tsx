import React, { useState, useMemo } from 'react';
import { Reservation, Vehicle, Page, VehicleService } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Car, Users, CalendarCheck, AlertTriangle, Link, ArrowRightLeft, Wrench, Phone, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import ReservationDetailModal from '../components/ReservationDetailModal';
import SelfServiceModal from '../components/SelfServiceModal';
import { useData } from '../contexts/DataContext';


const COLORS = { available: '#22C55E', rented: '#F59E0B', maintenance: '#EF4444' };

const Dashboard: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
    const { data, loading, actions } = useData();
    const { vehicles, reservations, services } = data;

    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isSelfServiceModalOpen, setIsSelfServiceModalOpen] = useState(false);


    const serviceAlerts = useMemo(() => {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        return services.filter(s => 
            s.status === 'planned' &&
            new Date(s.serviceDate) > today &&
            new Date(s.serviceDate) <= thirtyDaysFromNow
        );
    }, [services]);

    const vehicleStatusData = [
        { name: 'K dispozici', value: vehicles.filter(v => v.status === 'available').length },
        { name: 'Pronajato', value: vehicles.filter(v => v.status === 'rented').length },
        { name: 'V servisu', value: vehicles.filter(v => v.status === 'maintenance').length },
    ];
    
    const fleetUtilization = vehicles.length > 0 ? Math.round((vehicles.filter(v => v.status === 'rented').length / vehicles.length) * 100) : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaysDepartures = reservations
        .filter(r => r.status === 'scheduled' && new Date(r.startDate) >= today && new Date(r.startDate) < tomorrow)
        .map(r => ({ ...r, type: 'departure' as const, time: new Date(r.startDate) }));

    const todaysArrivals = reservations
        .filter(r => r.status === 'active' && new Date(r.endDate) >= today && new Date(r.endDate) < tomorrow)
        .map(r => ({ ...r, type: 'arrival' as const, time: new Date(r.endDate) }));

    const todaysActivities = [...todaysDepartures, ...todaysArrivals].sort((a, b) => a.time.getTime() - b.time.getTime());

    const activeRentals = reservations.filter(r => r.status === 'active');

    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance');

    const handleOpenDetailModal = (reservation: Reservation) => {
        setSelectedReservation(reservation);
        setIsDetailModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsDetailModalOpen(false);
        setSelectedReservation(null);
        // Data will be refreshed by the context if an action was taken
    };
    
    const onSelfServiceLinkGenerated = () => {
        // We might need a more targeted refresh here in the future,
        // but for now, the context handles broader updates.
        actions.refreshData();
    }

    if (loading && vehicles.length === 0) return <div>Načítání přehledu...</div>;
    
    const hasAlerts = maintenanceVehicles.length > 0 || serviceAlerts.length > 0;

    return (
        <div className="space-y-6">
            <ReservationDetailModal isOpen={isDetailModalOpen} onClose={handleCloseModal} reservation={selectedReservation} />
            <SelfServiceModal isOpen={isSelfServiceModalOpen} onClose={() => setIsSelfServiceModalOpen(false)} availableVehicles={vehicles.filter(v => v.status === 'available')} onLinkGenerated={onSelfServiceLinkGenerated} />

            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Přehled</h1>
                <div className="flex space-x-3">
                     <button onClick={() => setIsSelfServiceModalOpen(true)} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                        <Link className="w-5 h-5 mr-2" /> Vytvořit samoobslužnou rezervaci
                    </button>
                    <button onClick={() => setCurrentPage(Page.CUSTOMERS)} className="bg-gray-200 text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors flex items-center">
                        <Users className="w-5 h-5 mr-2" /> Nový zákazník
                    </button>
                    <button onClick={() => setCurrentPage(Page.RESERVATIONS)} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center">
                        <CalendarCheck className="w-5 h-5 mr-2" /> Nová rezervace
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Stav flotily</h2>
                     <div className="grid grid-cols-2 gap-4 items-center">
                        <div>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={vehicleStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                                        {vehicleStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[entry.name === 'K dispozici' ? 'available' : entry.name === 'Pronajato' ? 'rented' : 'maintenance']} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="text-center">
                            <p className="text-gray-500 font-medium">Vytíženost flotily</p>
                            <p className="text-6xl font-bold text-primary">{fleetUtilization}%</p>
                        </div>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center"><AlertTriangle className="mr-2 text-red-500"/>Upozornění</h2>
                    {hasAlerts ? (
                        <ul className="space-y-3">
                           {maintenanceVehicles.map(v => (
                             <li key={v.id} className="text-gray-600 flex items-start">
                                <Car className="w-4 h-4 mr-2 mt-1 text-red-500 flex-shrink-0"/>
                                <span><span className="font-semibold">{v.name}</span> je v servisu.</span>
                             </li>
                           ))}
                           {serviceAlerts.map(s => (
                               <li key={s.id} className="text-gray-600 flex items-start">
                                   <Wrench className="w-4 h-4 mr-2 mt-1 text-yellow-600 flex-shrink-0"/>
                                   <span>
                                    <span className="font-semibold">{s.vehicle?.name}:</span> Plánovaný servis ({s.description}) dne {new Date(s.serviceDate).toLocaleDateString('cs-CZ')}.
                                   </span>
                               </li>
                           ))}
                        </ul>
                    ) : <p className="text-gray-500">Žádná důležitá upozornění.</p>}
                </div>
            </div>
            
            {/* Action Center */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                     <h2 className="text-xl font-bold text-gray-700 mb-4">Dnešní aktivity</h2>
                     {todaysActivities.length > 0 ? (
                        <div className="flow-root">
                            <ul role="list" className="-mb-8">
                                {todaysActivities.map((res, index) => (
                                    <li key={res.id}>
                                        <div className="relative pb-8">
                                            {index !== todaysActivities.length - 1 ? (
                                                <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                            ) : null}
                                            <div className="relative flex space-x-4">
                                                <div>
                                                    <span className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white ${res.type === 'departure' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                                                        {res.type === 'departure' ? 
                                                            <ArrowUpCircle className="h-6 w-6 text-white" /> : 
                                                            <ArrowDownCircle className="h-6 w-6 text-white" />}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1 pt-1.5">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-lg font-bold text-gray-800">
                                                                {res.time.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                            <p className="font-semibold mt-1">{res.customer?.firstName} {res.customer?.lastName}</p>
                                                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                                                                <p className="flex items-center">
                                                                    <Car className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                                                                    {res.vehicle?.name} (<span className="font-mono text-xs">{res.vehicle?.licensePlate}</span>)
                                                                </p>
                                                                <a href={`tel:${res.customer?.phone}`} className="flex items-center text-blue-600 hover:underline">
                                                                    <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                                                                    {res.customer?.phone}
                                                                </a>
                                                            </div>
                                                        </div>
                                                        <div className="flex-shrink-0 ml-4 mt-1">
                                                            {res.type === 'departure' ? (
                                                                <button
                                                                    onClick={() => handleOpenDetailModal(res)}
                                                                    disabled={res.vehicle?.status !== 'available'}
                                                                    className={`px-3 py-1 rounded text-sm font-semibold text-white transition-colors ${
                                                                        res.vehicle?.status === 'available'
                                                                        ? 'bg-green-500 hover:bg-green-600'
                                                                        : 'bg-gray-400 cursor-not-allowed'
                                                                    }`}
                                                                    title={res.vehicle?.status !== 'available' ? 'Vozidlo není k dispozici (je pronajaté nebo v servisu)' : 'Vydat vozidlo'}
                                                                >
                                                                    {res.vehicle?.status === 'available' ? 'Vydat' : 'Blokováno'}
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => handleOpenDetailModal(res)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm font-semibold">
                                                                    Převzít
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                     ) : <p className="text-gray-500">Dnes nejsou plánované žádné odjezdy ani příjezdy.</p>}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center">
                        <ArrowRightLeft className="mr-2 text-blue-600" /> Právě probíhající pronájmy
                    </h2>
                     {activeRentals.length > 0 ? (
                        <ul className="space-y-3">
                           {activeRentals.map(res => (
                               <li key={res.id} className="flex justify-between items-center p-3 rounded-md bg-blue-50">
                                 <div>
                                    <p className="font-semibold">{res.customer?.firstName} {res.customer?.lastName}</p>
                                    <p className="text-sm text-gray-500">
                                        {res.vehicle?.name} | Plánovaný návrat: {new Date(res.endDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })} v {new Date(res.endDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                 </div>
                                 <button onClick={() => handleOpenDetailModal(res)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm font-semibold">
                                    Převzít vozidlo
                                </button>
                               </li>
                           ))}
                        </ul>
                    ) : <p className="text-gray-500">Aktuálně nejsou žádná vozidla pronajata.</p>}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
