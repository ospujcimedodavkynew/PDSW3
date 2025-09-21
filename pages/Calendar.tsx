import React, { useState, useMemo, useCallback } from 'react';
import { Reservation, Vehicle } from '../types';
import { ChevronLeft, ChevronRight, Loader, User, Clock, Info } from 'lucide-react';
import ReservationDetailModal from '../components/ReservationDetailModal';
import { useData } from '../contexts/DataContext';

const statusColors: { [key in Reservation['status']]: { bg: string; border: string; text: string; } } = {
    'pending-customer': { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800' },
    'pending-approval': { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800' },
    'scheduled': { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
    'active': { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
    'completed': { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-800' },
};

const getDayOfWeek = (date: Date) => {
    const day = date.getDay();
    return day === 0 ? 6 : day - 1; // Monday = 0, Sunday = 6
};

const Calendar: React.FC = () => {
    const { data, loading } = useData();
    const { reservations, vehicles } = data;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'week'>('month');
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    
    // --- Date Calculations ---
    const monthDetails = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        return {
            year,
            month,
            monthName: currentDate.toLocaleString('cs-CZ', { month: 'long' }),
            daysInMonth: new Date(year, month + 1, 0).getDate(),
            firstDayOfMonth: new Date(year, month, 1),
        };
    }, [currentDate]);

    const weekDetails = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        const day = getDayOfWeek(startOfWeek);
        startOfWeek.setDate(startOfWeek.getDate() - day);
        startOfWeek.setHours(0,0,0,0);
        
        const weekDates = Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            return date;
        });
        
        return {
            weekDates,
            startOfWeek,
            endOfWeek: new Date(weekDates[6].getTime() + (24*60*60*1000 - 1)),
        };
    }, [currentDate]);


    // --- Handlers ---
    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (view === 'month') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setDate(newDate.getDate() - 7);
        }
        setCurrentDate(newDate);
    };
    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (view === 'month') {
            newDate.setMonth(newDate.getMonth() + 1);
        } else {
            newDate.setDate(newDate.getDate() + 7);
        }
        setCurrentDate(newDate);
    };
    const handleToday = () => setCurrentDate(new Date());

    const handleOpenModal = useCallback((reservation: Reservation) => {
        setSelectedReservation(reservation);
    }, []);
    
    const handleCloseModal = useCallback(() => {
        setSelectedReservation(null);
    }, []);

    const today = new Date();

    if (loading && vehicles.length === 0) {
        return <div className="flex justify-center items-center h-full"><Loader className="w-8 h-8 animate-spin" /> Načítání kalendáře...</div>;
    }
    
    const renderReservationBar = (res: Reservation, viewStart: Date, viewEnd: Date, totalDays: number) => {
        const vehicleIndex = vehicles.findIndex(v => v.id === res.vehicleId);
        if (vehicleIndex === -1) return null;

        const resStart = new Date(res.startDate);
        const resEnd = new Date(res.endDate);

        if (resEnd < viewStart || resStart > viewEnd) return null;

        let startDay, endDay;
        
        if (view === 'month') {
            startDay = resStart < viewStart ? 1 : resStart.getDate();
            endDay = resEnd > viewEnd ? totalDays : resEnd.getDate();
        } else {
            startDay = resStart < viewStart ? 0 : Math.floor((resStart.getTime() - viewStart.getTime()) / (1000*60*60*24));
            endDay = resEnd > viewEnd ? 6 : Math.floor((resEnd.getTime() - viewStart.getTime()) / (1000*60*60*24));
        }

        const duration = endDay - startDay + 1;
        if (duration <= 0) return null;

        const colors = statusColors[res.status] || statusColors.completed;
        const startTime = resStart.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

        return (
             <div 
                key={res.id} 
                className={`group absolute h-10 my-1 p-1.5 rounded-md shadow-sm overflow-hidden cursor-pointer flex items-center border-l-4 ${colors.bg} ${colors.border}`}
                style={{
                    gridRowStart: vehicleIndex + 2,
                    gridColumnStart: startDay + 1,
                    gridColumnEnd: `span ${duration}`,
                    zIndex: 10,
                }}
                onClick={() => handleOpenModal(res)}
            >
                <div className="truncate">
                    <p className={`text-xs font-bold truncate ${colors.text}`}>{startTime} - {res.customer?.firstName} {res.customer?.lastName}</p>
                </div>
                {/* Tooltip */}
                <div className="absolute left-0 bottom-full mb-2 w-max max-w-xs bg-gray-800 text-white text-xs rounded py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none">
                    <p className="font-bold text-base flex items-center"><User className="w-4 h-4 mr-2"/>{res.customer?.firstName} {res.customer?.lastName}</p>
                    <p className="flex items-center mt-1"><Clock className="w-4 h-4 mr-2"/>{new Date(res.startDate).toLocaleString('cs-CZ')} - {new Date(res.endDate).toLocaleString('cs-CZ')}</p>
                    <p className="flex items-center mt-1"><Info className="w-4 h-4 mr-2"/>Stav: {res.status}</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
            {selectedReservation && <ReservationDetailModal isOpen={!!selectedReservation} onClose={handleCloseModal} reservation={selectedReservation}/>}
            
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                <h1 className="text-2xl font-bold text-gray-800">Kalendář rezervací</h1>
                <div className="flex items-center space-x-2">
                    <button onClick={handlePrev} className="p-2 rounded-full hover:bg-gray-200"><ChevronLeft /></button>
                     <span className="text-lg font-semibold w-40 text-center capitalize">
                        {view === 'month' ? `${monthDetails.monthName} ${monthDetails.year}` : `Týden od ${weekDetails.startOfWeek.getDate()}. ${weekDetails.startOfWeek.getMonth()+1}.`}
                    </span>
                    <button onClick={handleNext} className="p-2 rounded-full hover:bg-gray-200"><ChevronRight /></button>
                    <button onClick={handleToday} className="ml-2 py-1 px-3 text-sm font-semibold bg-gray-200 rounded-md hover:bg-gray-300">Dnes</button>
                    <div className="flex items-center space-x-1 border border-gray-300 rounded-md p-0.5 ml-4">
                        <button onClick={() => setView('month')} className={`px-3 py-1 text-sm rounded-md ${view === 'month' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>Měsíc</button>
                        <button onClick={() => setView('week')} className={`px-3 py-1 text-sm rounded-md ${view === 'week' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>Týden</button>
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-auto">
                {view === 'month' && (
                    <div className="grid relative" style={{ gridTemplateColumns: `180px repeat(${monthDetails.daysInMonth}, minmax(60px, 1fr))`, gridTemplateRows: `auto repeat(${vehicles.length}, 50px)` }}>
                        {/* Header: Vehicle Names */}
                        <div className="sticky left-0 bg-white z-20 border-r border-b border-gray-200 p-2 font-semibold text-gray-600">Vozidlo</div>

                        {/* Header: Day Numbers */}
                        {Array.from({ length: monthDetails.daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const date = new Date(monthDetails.year, monthDetails.month, day);
                            const dayOfWeek = date.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const isToday = today.getFullYear() === monthDetails.year && today.getMonth() === monthDetails.month && today.getDate() === day;
                            return (
                                <div key={day} className={`text-center p-2 border-b border-gray-200 font-medium ${isToday ? 'bg-blue-100 text-blue-700 rounded-t-lg' : ''} ${isWeekend ? 'bg-gray-50' : ''}`}>
                                    {day}
                                </div>
                            );
                        })}
                        
                        {/* Vehicle Rows & Grid Background */}
                        {vehicles.map((vehicle) => (
                            <React.Fragment key={vehicle.id}>
                                <div className="sticky left-0 bg-white z-20 border-r border-gray-200 p-2 font-semibold truncate" title={vehicle.name}>{vehicle.name}</div>
                                {Array.from({ length: monthDetails.daysInMonth }, (_, dayIndex) => {
                                    const day = dayIndex + 1;
                                    const date = new Date(monthDetails.year, monthDetails.month, day);
                                    const dayOfWeek = date.getDay();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                    const isToday = today.getFullYear() === monthDetails.year && today.getMonth() === monthDetails.month && today.getDate() === day;
                                    return <div key={dayIndex} className={`border-b border-r border-gray-200 ${isToday ? 'bg-blue-50' : ''} ${isWeekend ? 'bg-gray-50' : ''}`} />;
                                })}
                            </React.Fragment>
                        ))}
                        
                        {/* Reservation Bars */}
                        {reservations.map(res => renderReservationBar(res, monthDetails.firstDayOfMonth, new Date(monthDetails.year, monthDetails.month + 1, 0, 23, 59, 59), monthDetails.daysInMonth))}
                    </div>
                )}
                {view === 'week' && (
                    <div className="grid relative" style={{ gridTemplateColumns: `180px repeat(7, minmax(100px, 1fr))`, gridTemplateRows: `auto repeat(${vehicles.length}, 50px)` }}>
                        {/* Header: Vehicle Names */}
                        <div className="sticky left-0 bg-white z-20 border-r border-b border-gray-200 p-2 font-semibold text-gray-600">Vozidlo</div>

                        {/* Header: Day Names & Dates */}
                        {weekDetails.weekDates.map((date, i) => {
                             const dayOfWeek = date.getDay();
                             const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                             const isToday = date.toDateString() === today.toDateString();
                             return (
                                <div key={i} className={`text-center p-2 border-b border-gray-200 font-medium ${isToday ? 'bg-blue-100 text-blue-700 rounded-t-lg' : ''} ${isWeekend ? 'bg-gray-50' : ''}`}>
                                     <p className="font-bold">{date.getDate()}. {date.getMonth()+1}.</p>
                                     <p className="text-xs text-gray-500">{date.toLocaleDateString('cs-CZ', { weekday: 'short' })}</p>
                                </div>
                             );
                        })}

                        {/* Vehicle Rows & Grid Background */}
                         {vehicles.map((vehicle) => (
                            <React.Fragment key={vehicle.id}>
                                <div className="sticky left-0 bg-white z-20 border-r border-gray-200 p-2 font-semibold truncate" title={vehicle.name}>{vehicle.name}</div>
                                {weekDetails.weekDates.map((date, dayIndex) => {
                                    const dayOfWeek = date.getDay();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                    const isToday = date.toDateString() === today.toDateString();
                                    return <div key={dayIndex} className={`border-b border-r border-gray-200 ${isToday ? 'bg-blue-50' : ''} ${isWeekend ? 'bg-gray-50' : ''}`} />;
                                })}
                            </React.Fragment>
                        ))}
                        
                        {/* Reservation Bars */}
                        {reservations.map(res => renderReservationBar(res, weekDetails.startOfWeek, weekDetails.endOfWeek, 7))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Calendar;
