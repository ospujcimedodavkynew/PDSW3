import React, { useState, useMemo } from 'react';
import { Reservation, Vehicle, Page, VehicleService } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Car, Users, CalendarCheck, AlertTriangle, Link, Clock, ArrowRightLeft, Wrench, ClipboardCheck, Send, ArrowUpCircle, ArrowDownCircle, Phone, Check, XCircle, Loader } from 'lucide-react';
import ReservationDetailModal from '../components/ReservationDetailModal';
import SelfServiceModal from '../components/SelfServiceModal';
import { useData } from '../contexts/DataContext';


const COLORS = { available: '#22C55E', rented: '#F59E0B', maintenance: '#EF4444' };

// Helper component for KPI cards
const KpiCard: React.FC<{ icon: React.ElementType; title: string; value: string | number; color: string; onClick?: () => void }> = ({ icon: Icon, title, value, color, onClick }) => (
    <div className={`bg-white p-5 rounded-lg shadow-md flex items-center ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`} onClick={onClick}>
        <div className={`p-3 rounded-full ${color}`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="ml-4">
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
    const { data, loading, actions } = useData();
    const { vehicles, reservations, services, contracts } = data;

    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isSelfServiceModalOpen, setIsSelfServiceModalOpen] = useState(false);
    const [processingReservationId, setProcessingReservationId] = useState<string | null>(null);
    const [cancellingReservationId, setCancellingReservationId] = useState<string | null>(null);

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
    
    const handleCancelReservation = async (reservation: Reservation) => {
        if (window.confirm(`Opravdu si přejete zamítnout rezervaci pro zákazníka ${reservation.customer?.firstName} ${reservation.customer?.lastName}?`)) {
            setCancellingReservationId(reservation.id);
            try {
                await actions.cancelReservation(reservation.id);
            } catch (error) {
                console.error("Failed to cancel reservation:", error);
                alert(`Nepodařilo se zamítnout rezervaci: ${error instanceof Error ? error.message : "Neznámá chyba"}`);
            } finally {
                setCancellingReservationId(null);
            }
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
    
    return (
        <div className="space-y-6">
            <ReservationDetailModal isOpen={isDetailModalOpen} onClose={() => { setIsDetailModalOpen(false); setSelectedReservation(null); }} reservation={selectedReservation} />
            <SelfServiceModal 
                isOpen={isSelfServiceModalOpen} 
                onClose={() => setIsSelfServiceModalOpen(false)}
                availableVehicles={vehicles}
                onLinkGenerated={() => { /* Consider adding a success toast/notification */ }} 
            />

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Přehled</h1>
                <button
                    onClick={() => setIsSelfServiceModalOpen(true)}
                    className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center"
                >
                    <Link className="w-5 h-5 mr-2" />
                    Samoobslužný odkaz pro zákazníka
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard icon={Car} title="Vozidel k dispozici" value={vehicleStatusData[0].value} color="bg-green-500" onClick={() => setCurrentPage(Page.VEHICLES)} />
                <KpiCard icon={ArrowRightLeft} title="Aktivních pronájmů" value={vehicleStatusData[1].value} color="bg-yellow-500" onClick={() => setCurrentPage(Page.RESERVATIONS)} />
                <KpiCard icon={ArrowUpCircle} title="Dnešní odjezdy" value={todaysDepartures.length} color="bg-blue-500" />
                <KpiCard icon={ArrowDownCircle} title="Dnešní příjezdy" value={todaysArrivals.length} color="bg-indigo-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Reservations to process */}
                    {reservationsToProcess.length > 0 && (
                        <div className="bg-white p-5 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><ClipboardCheck className="mr-2 text-blue-600" /> Rezervace ke zpracování</h2>
                            <div className="space-y-3">
                                {reservationsToProcess.map(res => (
                                    <div key={res.id} className="p-3 bg-blue-50 rounded-md border border-blue-200 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">{res.customer?.firstName} {res.customer?.lastName} - <a href={`tel:${res.customer?.phone}`} className="text-blue-600 hover:underline">{res.customer?.phone}</a></p>
                                            <p className="text-sm text-gray-600">{res.vehicle?.name} ({new Date(res.startDate).toLocaleDateString('cs-CZ')} - {new Date(res.endDate).toLocaleDateString('cs-CZ')})</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button 
                                                onClick={() => handleCancelReservation(res)} 
                                                disabled={cancellingReservationId === res.id}
                                                className="p-2 text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50"
                                                title="Zamítnout"
                                            >
                                                {cancellingReservationId === res.id ? <Loader className="w-5 h-5 animate-spin"/> : <XCircle className="w-5 h-5"/>}
                                            </button>
                                            <button 
                                                onClick={() => handleGenerateContract(res)} 
                                                disabled={processingReservationId === res.id}
                                                className="py-2 px-3 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 flex items-center"
                                            >
                                                {processingReservationId === res.id ? <Loader className="w-4 h-4 mr-2 animate-spin"/> : <Check className="w-4 h-4 mr-2"/>} Schválit
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Today's Activities */}
                    <div className="bg-white p-5 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><Clock className="mr-2 text-gray-600" /> Dnešní aktivita</h2>
                        {todaysActivities.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {todaysActivities.map(activity => (
                                    <li key={`${activity.id}-${activity.type}`} className="py-3 flex items-center justify-between">
                                        <div className="flex items-center">
                                            <span className={`mr-4 p-2 rounded-full ${activity.type === 'departure' ? 'bg-blue-100' : 'bg-indigo-100'}`}>
                                                {activity.type === 'departure' ? <ArrowUpCircle className="w-5 h-5 text-blue-600" /> : <ArrowDownCircle className="w-5 h-5 text-indigo-600" />}
                                            </span>
                                            <div>
                                                <p className="font-semibold">{activity.time.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })} - {activity.customer?.firstName} {activity.customer?.lastName}</p>
                                                <p className="text-sm text-gray-600">{activity.vehicle?.name}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => { setSelectedReservation(activity); setIsDetailModalOpen(true); }} className="text-sm text-primary hover:underline">Zobrazit</button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 text-center py-4">Dnes nejsou naplánovány žádné příjezdy ani odjezdy.</p>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    {/* Vehicle Status */}
                    <div className="bg-white p-5 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Stav vozového parku</h2>
                        <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={vehicleStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                        {vehicleStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase().replace(/ /g, '') as keyof typeof COLORS]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-center mt-4 text-lg">Vytížení flotily: <span className="font-bold">{fleetUtilization}%</span></p>
                    </div>

                    {/* Alerts */}
                    {(serviceAlerts.length > 0) && (
                        <div className="bg-white p-5 rounded-lg shadow-md">
                             <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><AlertTriangle className="mr-2 text-yellow-600" /> Upozornění</h2>
                            <div className="space-y-4">
                                {serviceAlerts.map(service => (
                                     <div key={service.id} className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                                         <p className="font-semibold flex items-center"><Wrench className="w-4 h-4 mr-2" /> Blíží se servis</p>
                                         <p className="text-sm text-gray-700">{service.vehicle?.name}: {service.description} ({new Date(service.serviceDate).toLocaleDateString('cs-CZ')})</p>
                                     </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;