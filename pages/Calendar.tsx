import React, { useState, useMemo } from 'react';
import { Reservation, Vehicle } from '../types';
import { ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import ReservationDetailModal from '../components/ReservationDetailModal';
import { useData } from '../contexts/DataContext';

const statusColors: { [key in Reservation['status']]: string } = {
    'pending-customer': 'bg-yellow-400 border-yellow-500 text-yellow-800',
    'pending-approval': 'bg-orange-400 border-orange-500 text-orange-800',
    'scheduled': 'bg-green-400 border-green-500 text-green-800',
    'active': 'bg-blue-400 border-blue-500 text-blue-800',
    'completed': 'bg-gray-400 border-gray-500 text-gray-800',
};

const Calendar: React.FC = () => {
    const { data, loading, actions } = useData();
    const { reservations, vehicles } = data;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

    const { monthName, year, daysInMonth, firstDayOfMonth } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthName = currentDate.toLocaleString('cs-CZ', { month: 'long' });
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1);
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
        // Data context will handle refresh if needed
    }

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

            <div className="flex-grow overflow-x-auto">
                <div className="grid min-w-max" style={{ gridTemplateColumns: `180px repeat(${daysInMonth}, minmax(50px, 1fr))`, gridTemplateRows: `auto repeat(${vehicles.length}, 50px)` }}>
                    {/* Header: Vehicle Names Column */}
                    <div className="sticky left-0 bg-white z-10 border-r border-b border-gray-200 p-2 font-semibold text-gray-600">Vozidlo</div>

                    {/* Header: Day Numbers Row */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                        <div key={day} className={`text-center p-2 border-b border-gray-200 font-medium ${isCurrentMonth && day === today.getDate() ? 'bg-blue-100 text-blue-700 rounded-t-lg' : ''}`}>
                            {day}
                        </div>
                    ))}
                    
                    {/* Vehicle Rows & Grid Background */}
                    {vehicles.map((vehicle, vehicleIndex) => (
                        <React.Fragment key={vehicle.id}>
                            <div className="sticky left-0 bg-white z-10 border-r border-gray-200 p-2 font-semibold truncate" title={vehicle.name}>{vehicle.name}</div>
                            {Array.from({ length: daysInMonth }, (_, dayIndex) => (
                                <div key={dayIndex} className={`border-b border-r border-gray-200 ${isCurrentMonth && (dayIndex + 1) === today.getDate() ? 'bg-blue-50' : ''}`} />
                            ))}
                        </React.Fragment>
                    ))}

                    {/* Reservation Bars */}
                    {reservations.map(res => {
                        const vehicleIndex = vehicles.findIndex(v => v.id === res.vehicleId);
                        if (vehicleIndex === -1) return null; // Don't render if vehicle not found

                        const resStart = new Date(res.startDate);
                        const resEnd = new Date(res.endDate);

                        // Skip if reservation is completely outside the current month view
                        if (resEnd < firstDayOfMonth || resStart > new Date(year, currentDate.getMonth() + 1, 0)) {
                            return null;
                        }

                        const startDay = resStart < firstDayOfMonth ? 1 : resStart.getDate();
                        const endDay = resEnd > new Date(year, currentDate.getMonth() + 1, 0) ? daysInMonth : resEnd.getDate();
                        
                        // Only render if reservation is in the current month
                        if(resStart.getMonth() !== currentDate.getMonth() && resEnd.getMonth() !== currentDate.getMonth() && !(resStart < firstDayOfMonth && resEnd > new Date(year, currentDate.getMonth() + 1, 0))) {
                             return null;
                        }

                        const duration = endDay - startDay + 1;
                        if (duration <= 0) return null;

                        return (
                             <div 
                                key={res.id} 
                                className={`absolute h-10 my-1 p-1 rounded-md shadow-sm overflow-hidden cursor-pointer hover:opacity-80 transition-opacity ${statusColors[res.status]}`}
                                style={{
                                    gridRowStart: vehicleIndex + 2,
                                    gridColumnStart: startDay + 1,
                                    gridColumnEnd: `span ${duration}`,
                                }}
                                onClick={() => handleOpenModal(res)}
                                title={`${res.vehicle?.name} - ${res.customer?.firstName} ${res.customer?.lastName}`}
                            >
                                <p className="text-xs font-bold truncate">{res.customer?.firstName} {res.customer?.lastName}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Calendar;