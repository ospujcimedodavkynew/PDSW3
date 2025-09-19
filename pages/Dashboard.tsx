import React, { useState, useMemo } from 'react';
import { Reservation, Vehicle, Page, VehicleService } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Car, Users, CalendarCheck, AlertTriangle, Link, Clock, ArrowRightLeft, Wrench, ClipboardCheck, Send, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import ReservationDetailModal from '../components/ReservationDetailModal';
import SelfServiceModal from '../components/SelfServiceModal';
import { useData } from '../contexts/DataContext';


const COLORS = { available: '#22C55E', rented: '#F59E0B', maintenance: '#EF4444' };

const Dashboard: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
    const { data, loading, actions } = useData();
    const { vehicles, reservations, services, contracts } = data;

    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isSelfServiceModalOpen, setIsSelfServiceModalOpen] = useState(false);
    const [processingReservationId, setProcessingReservationId] = useState<string | null>(null);

    const reservationsToProcess = useMemo(() => {
        const contractReservationIds = new Set(contracts.map(c => c.reservationId));
        return reservations.filter(r => r.status === 'scheduled' && !contractReservationIds.has(r.id));
    }, [reservations, contracts]);

    const handleGenerateContract = async (reservation: Reservation) => {
        if (!reservation.customer || !reservation.vehicle) {
            alert("Chyba: K této rezervaci chybí údaje o zákazníkovi nebo vozidle.");
            return;
        }
        setProcessingReservationId(reservation.id);
        try {
            const { contractText, customer, vehicle } = await actions.generateAndSendContract(reservation, reservation.customer, reservation.vehicle);
            const bccEmail = "smlouvydodavky@gmail.com";
            const mailtoBody = encodeURIComponent(contractText);
            const mailtoLink = `mailto:${customer.email}?bcc=${bccEmail}&subject=${encodeURIComponent(`Smlouva o pronájmu vozidla ${vehicle.name}`)}&body=${mailtoBody}`;
            window.location.href = mailtoLink;
        } catch (error) {
            console.error("Failed to generate contract:", error);
            alert(`Nepodařilo se vygenerovat smlouvu: ${error instanceof Error ? error.message : "Neznámá chyba"}`);
        } finally {
            setProcessingReservationId(null);
        }
    };

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

    const todaysDepartures = reservations
        .filter(r => r.status === 'scheduled' && new Date(r.startDate) >= today && new Date(r.startDate) < new Date(today.getTime() + 24 * 60 * 60 * 1000))
        .map(r => ({ ...r, type: 'departure' as const, time: new Date(r.startDate) }));

    const todaysArrivals = reservations
        .filter(r => r.status === 'active' && new Date(r.endDate) >= today && new Date(r.endDate) < new Date(today.getTime() + 24 * 60 * 60 * 1000))
        .map(r => ({ ...r, type: 'arrival' as const, time: new Date(r.endDate) }));

    const todaysActivities = [...todaysDepartures, ...todaysArrivals].sort((a, b) => a.time.getTime() - b.time.getTime());
    
    const threeDayOutlook = useMemo(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setHours(23, 59, 59, 999);

        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(todayStart.getDate() + 1);
        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setHours(23, 59, 59, 999);

        const dayAfterStart = new Date(todayStart);
        dayAfterStart.setDate(todayStart.getDate() + 2);
        const dayAfterEnd = new Date(dayAfterStart);
        dayAfterEnd.setHours(23, 59, 59, 999);

        const countActivities = (start: Date, end: Date) => {
            const departures = reservations.filter(r => 
                r.status === 'scheduled' && 
                new Date(r.startDate) >= start && 
                new Date(r.startDate) <= end
            ).length;
            const arrivals = reservations.filter(r => 
                r.status === 'active' && 
                new Date(r.endDate) >= start && 
                new Date(r.endDate) <= end
            ).length;
            return { departures, arrivals };
        };

        return [
            { day: 'Dnes', ...countActivities(todayStart, todayEnd) },
            { day: 'Zítra', ...countActivities(tomorrowStart, tomorrowEnd) },
            { day: 'Pozítří', ...countActivities(dayAfterStart, dayAfterEnd) },
        ];
    }, [reservations]);


    const activeRentals = reservations.filter(r => r.status === 'active');

    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance');

    const handleOpenDetailModal = (reservation: Reservation) => {
        setSelectedReservation(reservation);
        setIsDetailModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsDetailModalOpen(false);
        setSelectedReservation(null);
    };
    
    const onSelfServiceLinkGenerated = () => {
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

            {/* New Reservations to Process */}
            {reservationsToProcess.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-secondary">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center">
                        <ClipboardCheck className="mr-2 text-secondary-hover" /> Nové rezervace ke zpracování
                    </h2>
                    <ul className="space-y-3">
                        {reservationsToProcess.map(res => (
                            <li key={res.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-md bg-yellow-50">
                                <div>
                                    <p className="font-semibold">{res.customer?.firstName} {res.customer?.lastName}</p>
                                    <p className="text-sm text-gray-500">
                                        {res.vehicle?.name} | {new Date(res.startDate).toLocaleDateString('cs-CZ')} - {new Date(res.endDate).toLocaleDateString('cs-CZ')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleGenerateContract(res)}
                                    disabled={processingReservationId === res.id}
                                    className="mt-2 sm:mt-0 bg-secondary text-dark-text px-3 py-2 rounded-lg hover:bg-secondary-hover text-sm font-semibold flex items-center disabled:bg-gray-400 disabled:cursor-wait"
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    {processingReservationId === res.id ? 'Zpracovávám...' : 'Vystavit a odeslat smlouvu'}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}


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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Časová osa dnešních aktivit</h2>
                    {todaysActivities.length > 0 ? (
                        <div className="relative pl-4">
                            <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200" aria-hidden="true"></div>
                            <ul className="space-y-8">
                                {todaysActivities.map((res, index) => (
                                    <li key={`${res.id}-${index}`} className="relative pl-8">
                                        <div className={`absolute -left-1.5 top-1 w-4 h-4 rounded-full border-2 border-white ${res.type === 'departure' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-sm text-gray-800">{res.time.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</p>
                                                <p className="font-semibold">{res.customer?.firstName} {res.customer?.lastName}</p>
                                                <p className="text-sm text-gray-500">{res.vehicle?.name}</p>
                                            </div>
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
                                                    Vydat
                                                </button>
                                            ) : (
                                                <button onClick={() => handleOpenDetailModal(res)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm font-semibold">
                                                    Převzít
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : <p className="text-gray-500 pt-4">Dnes nejsou plánované žádné odjezdy ani příjezdy.</p>}
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
                                        {res.vehicle?.name} | Návrat: {new Date(res.endDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })} v {new Date(res.endDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                 </div>
                                 <button onClick={() => handleOpenDetailModal(res)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm font-semibold">
                                    Detail
                                </button>
                               </li>
                           ))}
                        </ul>
                    ) : <p className="text-gray-500">Aktuálně nejsou žádná vozidla pronajata.</p>}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Přehled na 3 dny</h2>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        {threeDayOutlook.map(d => (
                            <div key={d.day} className="bg-gray-50 p-3 rounded-md">
                                <p className="font-bold text-gray-800">{d.day}</p>
                                <div className="mt-2 space-y-1">
                                    <div className="flex items-center justify-center text-sm text-green-700 font-medium" title={`${d.departures} Odjezdů`}>
                                        <ArrowUpCircle className="w-5 h-5 mr-1 flex-shrink-0" />
                                        <span>{d.departures}</span>
                                    </div>
                                    <div className="flex items-center justify-center text-sm text-yellow-700 font-medium" title={`${d.arrivals} Příjezdů`}>
                                        <ArrowDownCircle className="w-5 h-5 mr-1 flex-shrink-0" />
                                        <span>{d.arrivals}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;