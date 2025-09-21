import React, { useState, useMemo } from 'react';
import { Reservation, Vehicle, Page, VehicleService } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Car, Users, CalendarCheck, AlertTriangle, Link, ArrowRightLeft, Wrench, Phone, ArrowUpCircle, ArrowDownCircle, Bell, CalendarClock, Settings } from 'lucide-react';
import ReservationDetailModal from '../components/ReservationDetailModal';
import SelfServiceModal from '../components/SelfServiceModal';
import ApprovalModal from '../components/ApprovalModal';
import { useData } from '../contexts/DataContext';


const COLORS = { available: '#22C55E', rented: '#F59E0B', maintenance: '#EF4444' };

const Dashboard: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
    const { data, loading, actions } = useData();
    const { vehicles, reservations, services } = data;

    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isSelfServiceModalOpen, setIsSelfServiceModalOpen] = useState(false);
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);


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
    
    const futureRentals = useMemo(() => {
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        return reservations
            .filter(r => r.status === 'scheduled' && new Date(r.startDate) > endOfToday)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [reservations]);
    
    const groupedFutureRentals = useMemo(() => {
        return futureRentals.reduce((acc, rental) => {
            const rentalDate = new Date(rental.startDate);
            const dateKey = rentalDate.toISOString().split('T')[0]; // YYYY-MM-DD
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(rental);
            return acc;
        }, {} as Record<string, Reservation[]>);
    }, [futureRentals]);

    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance');
    
    const pendingApprovalReservations = useMemo(() => 
        reservations.filter(r => r.status === 'pending-approval'),
        [reservations]
    );

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
    
    const getReturnStatus = (endDate: Date | string) => {
        const now = new Date();
        const end = new Date(endDate);
        if (end < now) {
            const lateHours = (now.getTime() - end.getTime()) / (1000 * 60 * 60);
            if (lateHours < 24) {
                 return { text: `Zpožděno o ${Math.round(lateHours)} hod.`, color: 'red' };
            } else {
                 const lateDays = Math.floor(lateHours / 24);
                 return { text: `Zpožděno o ${lateDays} d.`, color: 'red' };
            }
        }
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(todayStart.getDate() + 1);
        const dayAfterTomorrowStart = new Date(tomorrowStart); dayAfterTomorrowStart.setDate(tomorrowStart.getDate() + 1);

        if (end >= todayStart && end < tomorrowStart) {
            const diffHours = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
            return { text: `Vrací se dnes (zbývá ${Math.max(0, Math.round(diffHours))} hodin)`, color: 'yellow' };
        }
        if (end >= tomorrowStart && end < dayAfterTomorrowStart) {
            const time = end.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
            return { text: `Vrací se zítra (v ${time})`, color: 'green' };
        }
        const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const daysText = diffDays === 1 ? 'den' : (diffDays > 1 && diffDays < 5) ? 'dny' : 'dní';
        return { text: `Vrací se za ${diffDays} ${daysText}`, color: 'green' };
    };

    const statusColors: { [key: string]: string } = { red: 'bg-red-100 text-red-800', yellow: 'bg-yellow-100 text-yellow-800', green: 'bg-green-100 text-green-800' };
    
    const formatDateHeader = (dateKey: string) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const rentalDate = new Date(dateKey); rentalDate.setUTCHours(0,0,0,0);
        if (rentalDate.getTime() === tomorrow.getTime()) {
            return `Zítra, ${rentalDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        }
        return rentalDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <div className="space-y-6">
            <ApprovalModal isOpen={isApprovalModalOpen} onClose={() => setIsApprovalModalOpen(false)} reservations={pendingApprovalReservations} />
            <ReservationDetailModal isOpen={isDetailModalOpen} onClose={handleCloseModal} reservation={selectedReservation} />
            <SelfServiceModal isOpen={isSelfServiceModalOpen} onClose={() => setIsSelfServiceModalOpen(false)} availableVehicles={vehicles.filter(v => v.status === 'available')} onLinkGenerated={onSelfServiceLinkGenerated} />

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Přehled</h1>
                <div className="flex space-x-3">
                     <button onClick={() => setIsSelfServiceModalOpen(true)} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center"><Link className="w-5 h-5 mr-2" /> Vytvořit samoobslužnou rezervaci</button>
                    <button onClick={() => setCurrentPage(Page.CUSTOMERS)} className="bg-gray-200 text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors flex items-center"><Users className="w-5 h-5 mr-2" /> Nový zákazník</button>
                    <button onClick={() => setCurrentPage(Page.RESERVATIONS)} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center"><CalendarCheck className="w-5 h-5 mr-2" /> Nová rezervace</button>
                </div>
            </div>

            {pendingApprovalReservations.length > 0 && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg shadow-md flex justify-between items-center">
                    <div className="flex items-center"><Bell className="w-6 h-6 mr-3" /><p><span className="font-bold">Máte {pendingApprovalReservations.length} nových online rezervací</span>, které čekají na vaše schválení.</p></div>
                    <button onClick={() => setIsApprovalModalOpen(true)} className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors whitespace-nowrap">Zobrazit a zpracovat</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Stav flotily</h2>
                     <div className="grid grid-cols-2 gap-4 items-center">
                        <div>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={vehicleStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                                        {vehicleStatusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[entry.name === 'K dispozici' ? 'available' : entry.name === 'Pronajato' ? 'rented' : 'maintenance']} />))}
                                    </Pie>
                                    <Tooltip /><Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="text-center"><p className="text-gray-500 font-medium">Vytíženost flotily</p><p className="text-6xl font-bold text-primary">{fleetUtilization}%</p></div>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center"><AlertTriangle className="mr-2 text-red-500"/>Upozornění</h2>
                    {hasAlerts ? (<ul className="space-y-3">{maintenanceVehicles.map(v => (<li key={v.id} className="text-gray-600 flex items-start"><Car className="w-4 h-4 mr-2 mt-1 text-red-500 flex-shrink-0"/><span><span className="font-semibold">{v.name}</span> je v servisu.</span></li>))}{serviceAlerts.map(s => (<li key={s.id} className="text-gray-600 flex items-start"><Wrench className="w-4 h-4 mr-2 mt-1 text-yellow-600 flex-shrink-0"/><span><span className="font-semibold">{s.vehicle?.name}:</span> Plánovaný servis ({s.description}) dne {new Date(s.serviceDate).toLocaleDateString('cs-CZ')}.</span></li>))}</ul>) : <p className="text-gray-500">Žádná důležitá upozornění.</p>}
                </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                     <h2 className="text-xl font-bold text-gray-700 mb-4">Dnešní aktivity</h2>
                     {todaysActivities.length > 0 ? (<div className="flow-root"><ul role="list" className="-mb-8">{todaysActivities.map((res, index) => (<li key={res.id}><div className="relative pb-8">{index !== todaysActivities.length - 1 ? (<span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />) : null}<div className="relative flex space-x-4"><div><span className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white ${res.type === 'departure' ? 'bg-green-500' : 'bg-yellow-500'}`}>{res.type === 'departure' ? <ArrowUpCircle className="h-6 w-6 text-white" /> : <ArrowDownCircle className="h-6 w-6 text-white" />}</span></div><div className="min-w-0 flex-1 pt-1.5"><div className="flex justify-between items-start"><div><p className="text-lg font-bold text-gray-800">{res.time.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</p><p className="font-semibold mt-1">{res.customer?.firstName} {res.customer?.lastName}</p><div className="mt-2 space-y-1 text-sm text-gray-600"><p className="flex items-center"><Car className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />{res.vehicle?.name} (<span className="font-mono text-xs">{res.vehicle?.licensePlate}</span>)</p><a href={`tel:${res.customer?.phone}`} className="flex items-center text-blue-600 hover:underline"><Phone className="w-4 h-4 mr-2 flex-shrink-0" />{res.customer?.phone}</a></div></div><div className="flex-shrink-0 ml-4 mt-1">{res.type === 'departure' ? (<button onClick={() => handleOpenDetailModal(res)} disabled={res.vehicle?.status !== 'available'} className={`px-3 py-1 rounded text-sm font-semibold text-white transition-colors ${res.vehicle?.status === 'available' ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}`} title={res.vehicle?.status !== 'available' ? 'Vozidlo není k dispozici (je pronajaté nebo v servisu)' : 'Vydat vozidlo'}>{res.vehicle?.status === 'available' ? 'Vydat' : 'Blokováno'}</button>) : (<button onClick={() => handleOpenDetailModal(res)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm font-semibold">Převzít</button>)}</div></div></div></div></div></li>))}</ul></div>) : <p className="text-gray-500">Dnes nejsou plánované žádné odjezdy ani příjezdy.</p>}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center"><ArrowRightLeft className="mr-2 text-blue-600" /> Právě probíhající pronájmy</h2>
                     {activeRentals.length > 0 ? (<ul className="space-y-4">{activeRentals.map(res => { const status = getReturnStatus(res.endDate); return (<li key={res.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-3"><div className="flex justify-between items-start"><div><p className="font-bold text-lg text-gray-800">{res.customer?.firstName} {res.customer?.lastName}</p><a href={`tel:${res.customer?.phone}`} className="flex items-center text-blue-600 hover:underline text-sm mt-1"><Phone className="w-4 h-4 mr-2" />{res.customer?.phone}</a><p className="text-sm text-gray-600 mt-2 flex items-center"><Car className="w-4 h-4 mr-2 text-gray-400" />{res.vehicle?.name} <span className="font-mono text-xs ml-2 bg-gray-200 px-1 rounded">{res.vehicle?.licensePlate}</span></p></div><button onClick={() => handleOpenDetailModal(res)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm font-semibold whitespace-nowrap">Převzít vozidlo</button></div><div className={`text-sm font-semibold p-2 rounded-md text-center ${statusColors[status.color]}`}>{status.text}</div></li>)})}</ul>) : <p className="text-gray-500">Aktuálně nejsou žádná vozidla pronajata.</p>}
                </div>
            </div>
            
             {/* Future Rentals Section */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center">
                    <CalendarClock className="mr-2 text-indigo-600" /> Budoucí pronájmy
                </h2>
                {Object.keys(groupedFutureRentals).length > 0 ? (
                    <div className="space-y-6">
                        {Object.entries(groupedFutureRentals).map(([dateKey, rentalsForDate]) => (
                            <div key={dateKey}>
                                <h3 className="font-bold text-gray-800 bg-gray-100 p-2 rounded-md">{formatDateHeader(dateKey)}</h3>
                                <ul className="mt-2 space-y-3 divide-y divide-gray-100">
                                    {rentalsForDate.map(res => (
                                        <li key={res.id} className="pt-3">
                                            <div className="flex items-center justify-between space-x-4">
                                                <div className="flex items-center space-x-4 flex-grow">
                                                    <div className="font-bold text-lg w-20 text-center flex-shrink-0">
                                                        {new Date(res.startDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="font-semibold">{res.customer?.firstName} {res.customer?.lastName}</p>
                                                        <div className="flex items-center text-sm text-gray-600 mt-1">
                                                            <Car className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                                            {res.vehicle?.name} (<span className="font-mono text-xs">{res.vehicle?.licensePlate}</span>)
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-4 flex-shrink-0">
                                                    <a href={`tel:${res.customer?.phone}`} className="flex items-center text-blue-600 hover:underline text-sm">
                                                        <Phone className="w-4 h-4 mr-2" />
                                                        {res.customer?.phone}
                                                    </a>
                                                    <button
                                                        onClick={() => handleOpenDetailModal(res)}
                                                        className="bg-gray-200 text-dark-text font-semibold py-1 px-3 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center"
                                                    >
                                                        <Settings className="w-4 h-4 mr-2" /> Spravovat
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">Nejsou naplánovány žádné budoucí pronájmy.</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;