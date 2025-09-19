import React, { useState, useMemo } from 'react';
import { Reservation, Vehicle, Page } from '../types';
import { ChevronLeft, ChevronRight, Loader, Clock, ArrowRightCircle, CheckCircle, XCircle } from 'lucide-react';
import ReservationDetailModal from '../components/ReservationDetailModal';
import { useData } from '../contexts/DataContext';

const statusInfo: { [key in Reservation['status']]: {
    label: string;
    icon: React.ElementType;
    base: string;
    iconColor: string;
}} = {
    'pending-customer': { label: 'Čeká na zákazníka', icon: Clock, base: 'bg-yellow-200 border-yellow-400 text-yellow-800', iconColor: 'text-yellow-600' },
    'scheduled': { label: 'Naplánováno', icon: Clock, base: 'bg-green-200 border-green-400 text-green-800', iconColor: 'text-green-600' },
    'active': { label: 'Probíhá', icon: ArrowRightCircle, base: 'bg-blue-200 border-blue-400 text-blue-800', iconColor: 'text-blue-600' },
    'completed': { label: 'Dokončeno', icon: CheckCircle, base: 'bg-gray-200 border-gray-400 text-gray-700', iconColor: 'text-gray-500' },
    'cancelled': { label: 'Zrušeno', icon: XCircle, base: 'bg-red-200 border-red-400 text-red-700 line-through', iconColor: 'text-red-500' },
};

const FORM_DRAFT_KEY = 'reservationFormDraft';

const Calendar: React.FC<{ setCurrentPage: (page: Page) => void }> = ({ setCurrentPage }) => {
    const { data, loading } = useData();
    const { reservations, vehicles } = data;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

    const { monthName, year, daysInMonth, firstDayOfMonth } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthName = currentDate.toLocaleString('cs-CZ', { month: 'long' });
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1);
        firstDayOfMonth.setHours(0, 0, 0, 0);
        return { monthName, year, daysInMonth, firstDayOfMonth };
    }, [currentDate]);

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const handleToday = () => setCurrentDate(new Date());
    
    const handleOpenModal = (reservation: Reservation) => {
        setSelectedReservation(reservation);
    }
    
    const handleCloseModal = () => {
        setSelectedReservation(null);
    }
    
    const handleCellClick = (vehicleId: string, day: number) => {
        const clickedDate = new Date(year, currentDate.getMonth(), day, 9, 0, 0); // Default to 9:00 AM
        const pad = (num: number) => num.toString().padStart(2, '0');
        const formattedStartDate = `${clickedDate.getFullYear()}-${pad(clickedDate.getMonth() + 1)}-${pad(clickedDate.getDate())}T${pad(clickedDate.getHours())}:${pad(clickedDate.getMinutes())}`;
        
        const prefillData = {
            selectedVehicleId: vehicleId,
            startDate: formattedStartDate,
        };

        sessionStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(prefillData));
        setCurrentPage(Page.RESERVATIONS);
    };

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === currentDate.getMonth();

    if (loading && vehicles.length === 0) {
        return <div className="flex justify-center items-center h-full"><Loader className="w-8 h-8 animate-spin" /> Načítání kalendáře...</div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
            {selectedReservation && <ReservationDetailModal isOpen={!!selectedReservation} onClose={handleCloseModal} reservation={selectedReservation}/>}
            
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Kalendář rezervací</h1>
                <div className="flex items-center space-x-2">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200"><ChevronLeft /></button>
                    <span className="text-lg font-semibold w-36 text-center capitalize">{monthName} {year}</span>
                    <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200"><ChevronRight /></button>
                    <button onClick={handleToday} className="ml-4 py-1 px-3 text-sm font-semibold bg-gray-200 rounded-md hover:bg-gray-300">Dnes</button>
                </div>
            </div>

            <div className="flex-grow overflow-x-auto relative">
                <div className="grid min-w-max" style={{ gridTemplateColumns: `180px repeat(${daysInMonth}, minmax(50px, 1fr))`, gridTemplateRows: `auto repeat(${vehicles.length}, 50px)` }}>
                    {/* Header: Vehicle Names Column */}
                    <div className="sticky left-0 bg-white z-20 border-r border-b border-gray-200 p-2 font-semibold text-gray-600">Vozidlo</div>

                    {/* Header: Day Numbers Row */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                        <div key={day} className={`text-center p-2 border-b border-gray-200 font-medium ${isCurrentMonth && day === today.getDate() ? 'bg-blue-100 text-blue-700 rounded-t-lg' : ''}`}>
                            {day}
                        </div>
                    ))}
                    
                    {/* Vehicle Rows & Grid Background */}
                    {vehicles.map((vehicle) => (
                        <React.Fragment key={vehicle.id}>
                            <div className="sticky left-0 bg-white z-20 border-r border-gray-200 p-2 font-semibold truncate" title={vehicle.name}>{vehicle.name}</div>
                            {Array.from({ length: daysInMonth }, (_, dayIndex) => (
                                <button 
                                    key={dayIndex} 
                                    onClick={() => handleCellClick(vehicle.id, dayIndex + 1)}
                                    className={`border-b border-r border-gray-200 hover:bg-green-100 transition-colors ${isCurrentMonth && (dayIndex + 1) === today.getDate() ? 'bg-blue-50' : ''}`} 
                                    aria-label={`Vytvořit rezervaci pro ${vehicle.name} dne ${dayIndex + 1}. ${monthName}`}
                                />
                            ))}
                        </React.Fragment>
                    ))}

                    {/* Reservation Bars */}
                    <div className="absolute top-10 left-0 w-full h-full" style={{ left: '180px' }}>
                        <div className="relative grid h-full" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(50px, 1fr))`, gridTemplateRows: `repeat(${vehicles.length}, 50px)` }}>
                            {reservations.map(res => {
                                const vehicle = vehicles.find(v => v.id === res.vehicleId);
                                const vehicleIndex = vehicles.findIndex(v => v.id === res.vehicleId);
                                if (vehicleIndex === -1 || !vehicle || res.status === 'cancelled') return null;

                                const resStart = new Date(res.startDate);
                                const resEnd = new Date(res.endDate);
                                
                                const lastDayOfMonth = new Date(year, currentDate.getMonth() + 1, 0);
                                lastDayOfMonth.setHours(23, 59, 59, 999);

                                if (resEnd < firstDayOfMonth || resStart > lastDayOfMonth) return null;

                                const startDay = resStart < firstDayOfMonth ? 1 : resStart.getDate();
                                const endDay = resEnd > lastDayOfMonth ? daysInMonth : resEnd.getDate();
                                const duration = endDay - startDay + 1;
                                if (duration <= 0) return null;

                                const isContinuingFromPreviousMonth = resStart < firstDayOfMonth;
                                const isContinuingToNextMonth = resEnd > lastDayOfMonth;

                                let totalPrice = 0;
                                const durationHours = (resEnd.getTime() - resStart.getTime()) / (1000 * 3600);
                                if (durationHours <= 4) totalPrice = vehicle.rate4h;
                                else if (durationHours <= 12) totalPrice = vehicle.rate12h;
                                else {
                                    const days = Math.ceil(durationHours / 24);
                                    totalPrice = days * vehicle.dailyRate;
                                }

                                const status = statusInfo[res.status] || statusInfo.completed;
                                const Icon = status.icon;

                                const barClasses = [
                                    'absolute h-10 my-1 p-2 rounded-md shadow-sm overflow-hidden cursor-pointer group',
                                    'hover:shadow-lg hover:z-30 transition-all flex items-center gap-2 border',
                                    status.base,
                                    isContinuingFromPreviousMonth ? 'rounded-l-none' : '',
                                    isContinuingToNextMonth ? 'rounded-r-none' : ''
                                ].join(' ');

                                return (
                                    <div 
                                        key={res.id} 
                                        className={barClasses}
                                        style={{
                                            top: `${vehicleIndex * 50}px`,
                                            left: `${((startDay - 1) / daysInMonth) * 100}%`,
                                            width: `${(duration / daysInMonth) * 100}%`,
                                        }}
                                        onClick={() => handleOpenModal(res)}
                                    >
                                        <Icon className={`w-4 h-4 flex-shrink-0 ${status.iconColor}`} />
                                        <p className="text-xs font-bold truncate">{res.customer?.firstName} {res.customer?.lastName}</p>
                                        
                                        {/* Tooltip */}
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-40">
                                            <h4 className="font-bold text-sm mb-1">{vehicle.name}</h4>
                                            <p><strong>Zákazník:</strong> {res.customer?.firstName} {res.customer?.lastName}</p>
                                            <p><strong>Od:</strong> {resStart.toLocaleString('cs-CZ')}</p>
                                            <p><strong>Do:</strong> {resEnd.toLocaleString('cs-CZ')}</p>
                                            <p><strong>Cena:</strong> {totalPrice.toLocaleString('cs-CZ')} Kč</p>
                                            <p><strong>Stav:</strong> {status.label}</p>
                                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-800"></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Calendar;