import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Reservation, Vehicle } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ReservationDetailModal from '../components/ReservationDetailModal';

// Helper to get all days in a month for the calendar grid
const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
};

// Helper to chunk array
const chunk = <T,>(arr: T[], size: number): T[][] =>
    Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
    );

interface CalendarReservation extends Reservation {
    span: number;
    startCol: number;
    vehicle: Vehicle;
}

const Calendar: React.FC = () => {
    const { data, loading } = useData();
    const { reservations, vehicles } = data;
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const vehiclesById = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };
    
    const handleOpenDetailModal = (reservation: Reservation) => {
        setSelectedReservation(reservation);
        setIsDetailModalOpen(true);
    };

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        
        const firstDayOfMonth = daysInMonth[0].getDay();
        // Adjust for Sunday as start of week (0) vs Monday (1)
        const startOffset = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);
        
        const calendarDays = Array(startOffset).fill(null).concat(daysInMonth);
        
        return chunk(calendarDays, 7);
    }, [currentDate]);

    // This is a simplified calendar view. We'll show reservations starting on each day.
    const reservationsByDay = useMemo(() => {
        const map = new Map<string, Reservation[]>();
        reservations
            .filter(r => r.status === 'scheduled' || r.status === 'active')
            .forEach(res => {
                const startDate = new Date(res.startDate);
                startDate.setHours(0,0,0,0);
                const key = startDate.toISOString().split('T')[0];
                if (!map.has(key)) {
                    map.set(key, []);
                }
                map.get(key)!.push(res);
            });
        return map;
    }, [reservations]);
    
    if (loading && reservations.length === 0) return <div>Načítání kalendáře...</div>;
    
    const today = new Date();
    today.setHours(0,0,0,0);

    return (
        <div>
            <ReservationDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} reservation={selectedReservation} />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Kalendář rezervací</h1>
                <div className="flex items-center space-x-4">
                     <h2 className="text-xl font-semibold">{currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' })}</h2>
                     <div className="flex items-center">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200"><ChevronLeft /></button>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200"><ChevronRight /></button>
                     </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="grid grid-cols-7 text-center font-bold text-gray-600 border-b">
                    {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map(day => (
                        <div key={day} className="py-3">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 grid-rows-5">
                    {calendarGrid.flat().map((day, index) => {
                         const isToday = day && day.getTime() === today.getTime();
                         const dayKey = day?.toISOString().split('T')[0];
                         const dayReservations = dayKey ? reservationsByDay.get(dayKey) || [] : [];

                         return (
                            <div key={index} className={`border-r border-b p-2 min-h-[120px] ${day ? '' : 'bg-gray-50'}`}>
                                {day && (
                                    <>
                                        <span className={`text-sm font-semibold ${isToday ? 'bg-primary text-white rounded-full h-6 w-6 flex items-center justify-center' : 'text-gray-700'}`}>
                                            {day.getDate()}
                                        </span>
                                        <div className="mt-1 space-y-1">
                                            {dayReservations.map(res => (
                                                <div 
                                                    key={res.id} 
                                                    className="p-1 rounded bg-blue-100 text-blue-800 text-xs cursor-pointer hover:bg-blue-200"
                                                    onClick={() => handleOpenDetailModal(res)}
                                                >
                                                    <p className="font-semibold truncate">{res.vehicle?.name}</p>
                                                    <p className="truncate">{res.customer?.lastName}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                         );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Calendar;
