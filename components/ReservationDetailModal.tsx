import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, Gauge } from 'lucide-react';
import { Reservation } from '../types';
import { activateReservation, completeReservation } from '../services/api';

interface ReservationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: Reservation | null;
}

const ReservationDetailModal: React.FC<ReservationDetailModalProps> = ({ isOpen, onClose, reservation }) => {
    // --- HOOKS ---
    // All hooks must be called at the top level, before any conditional returns, to prevent React errors.
    const [notes, setNotes] = useState('');
    const [startMileage, setStartMileage] = useState<string>('');
    const [endMileage, setEndMileage] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isOpen && reservation) {
            setStartMileage(reservation.status === 'scheduled' ? String(reservation.vehicle?.currentMileage ?? '') : '');
            setEndMileage(reservation.status === 'active' ? String(reservation.vehicle?.currentMileage ?? '') : '');
            setNotes(reservation.notes || '');
        }
    }, [isOpen, reservation]);

    const isArrival = reservation?.status === 'active';

    const calculations = useMemo(() => {
        if (!isArrival || !reservation) {
            return { kmDriven: 0, rentalDays: 0, kmLimit: 0, kmOver: 0, extraCharge: 0 };
        }
        
        const startKm = reservation.startMileage || 0;
        const endKm = Number(endMileage) || 0;
        const kmDriven = endKm > startKm ? endKm - startKm : 0;

        const durationMs = new Date(reservation.endDate).getTime() - new Date(reservation.startDate).getTime();
        const rentalDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
        const kmLimit = rentalDays * 300;
        const kmOver = Math.max(0, kmDriven - kmLimit);
        const extraCharge = kmOver * 3;

        return { kmDriven, rentalDays, kmLimit, kmOver, extraCharge };
    }, [reservation, endMileage, isArrival]);
    
    // --- CONDITIONAL RENDERING ---
    // Now we can safely return early if the component isn't visible or data is not ready.
    if (!isOpen) return null;

    if (!reservation) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white rounded-lg p-8">Načítání detailu rezervace...</div>
            </div>
        );
    }
    
    if (!reservation.customer || !reservation.vehicle) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Chyba dat</h2>
                    <p className="text-gray-700 mb-6">
                        Informace o této rezervaci jsou neúplné (chybí záznam o zákazníkovi nebo vozidle). Zkontrolujte prosím data v databázi pro rezervaci ID: <code className="text-sm bg-red-100 p-1 rounded">{reservation.id}</code>
                    </p>
                    <button onClick={onClose} className="py-2 px-6 rounded-lg bg-gray-300 hover:bg-gray-400">
                        Zavřít
                    </button>
                </div>
            </div>
        );
    }

    // --- REMAINING LOGIC & RENDER ---
    const isDeparture = reservation.status === 'scheduled';

    const handleAction = async () => {
        setIsProcessing(true);
        try {
            if (isDeparture) {
                if (!startMileage || Number(startMileage) < (reservation.vehicle?.currentMileage ?? 0)) {
                    alert('Zadejte platný stav tachometru (nesmí být menší než aktuální stav vozidla).');
                    setIsProcessing(false);
                    return;
                }
                await activateReservation(reservation.id, Number(startMileage));
            } else if (isArrival) {
                 if (!endMileage || Number(endMileage) <= (reservation.startMileage ?? 0)) {
                    alert('Konečný stav tachometru musí být větší než počáteční.');
                    setIsProcessing(false);
                    return;
                }
                const { kmDriven, kmLimit, kmOver, extraCharge } = calculations;
                const mileageReport = `
--- PŘEHLED KILOMETRŮ ---
Počáteční stav: ${reservation.startMileage?.toLocaleString('cs-CZ')} km
Konečný stav: ${Number(endMileage).toLocaleString('cs-CZ')} km
Ujeto celkem: ${kmDriven.toLocaleString('cs-CZ')} km
Limit nájezdu: ${kmLimit.toLocaleString('cs-CZ')} km
Překročeno o: ${kmOver.toLocaleString('cs-CZ')} km
Poplatek za překročení: ${extraCharge.toLocaleString('cs-CZ')} Kč
---------------------------
`;
                const finalNotes = notes ? `${notes}\n\n${mileageReport}` : mileageReport;

                await completeReservation(reservation.id, Number(endMileage), finalNotes);
            }
            onClose();
        } catch (error) {
            console.error("Failed to update reservation status", error);
            alert("Došlo k chybě při aktualizaci rezervace.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">
                        {isDeparture && 'Potvrzení o vydání vozidla'}
                        {isArrival && 'Protokol o vrácení vozidla'}
                        {!isDeparture && !isArrival && 'Detail rezervace'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold text-gray-500">Zákazník</h3>
                        <p className="text-lg">{reservation.customer.firstName} {reservation.customer.lastName}</p>
                         {reservation.customer.driverLicenseImageUrl && (
                             <a href={reservation.customer.driverLicenseImageUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center mt-1">
                                <FileText className="w-4 h-4 mr-1"/> Zobrazit řidičský průkaz
                            </a>
                        )}
                    </div>
                     <div>
                        <h3 className="font-semibold text-gray-500">Vozidlo</h3>
                        <p className="text-lg">{reservation.vehicle.name} ({reservation.vehicle.licensePlate})</p>
                    </div>
                     <div>
                        <h3 className="font-semibold text-gray-500">Období</h3>
                        <p className="text-lg">
                            {new Date(reservation.startDate).toLocaleString('cs-CZ')} - {new Date(reservation.endDate).toLocaleString('cs-CZ')}
                        </p>
                    </div>

                     {isDeparture && (
                         <div>
                            <label htmlFor="startMileage" className="font-semibold text-gray-500 flex items-center"><Gauge className="w-4 h-4 mr-2" />Počáteční stav tachometru</label>
                            <input
                                id="startMileage"
                                type="number"
                                value={startMileage}
                                onChange={(e) => setStartMileage(e.target.value)}
                                className="w-full mt-1 p-2 border rounded-md"
                                placeholder="Zadejte stav km"
                                required
                            />
                        </div>
                    )}
                    
                    {isArrival && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-gray-500">Stav tachometru</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-100 p-2 rounded">
                                        <label className="text-xs text-gray-600">Při odjezdu</label>
                                        <p className="font-bold">{reservation.startMileage?.toLocaleString('cs-CZ') ?? 'N/A'} km</p>
                                    </div>
                                    <div>
                                        <label htmlFor="endMileage" className="text-xs text-gray-600">Při návratu</label>
                                         <input
                                            id="endMileage"
                                            type="number"
                                            value={endMileage}
                                            onChange={(e) => setEndMileage(e.target.value)}
                                            className="w-full p-2 border rounded-md"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {Number(endMileage) > (reservation.startMileage ?? 0) && (
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
                                    <h4 className="font-semibold text-blue-800">Vyúčtování kilometrů</h4>
                                    <p className="flex justify-between"><span>Ujeto celkem:</span> <span className="font-bold">{calculations.kmDriven.toLocaleString('cs-CZ')} km</span></p>
                                    <p className="flex justify-between"><span>Limit nájezdu ({calculations.rentalDays} {calculations.rentalDays > 1 ? 'dny' : 'den'}):</span> <span className="font-bold">{calculations.kmLimit.toLocaleString('cs-CZ')} km</span></p>
                                    {calculations.kmOver > 0 ? (
                                        <>
                                        <p className="flex justify-between text-red-600"><span>Překročeno o:</span> <span className="font-bold">{calculations.kmOver.toLocaleString('cs-CZ')} km</span></p>
                                        <p className="flex justify-between text-red-600"><span>Poplatek (3 Kč/km):</span> <span className="font-bold">{calculations.extraCharge.toLocaleString('cs-CZ')} Kč</span></p>
                                        </>
                                    ) : (
                                        <p className="flex justify-between text-green-600"><span>Limit nepřekročen</span> <span className="font-bold">0 Kč</span></p>
                                    )}
                                </div>
                            )}

                             <div>
                                <label htmlFor="notes" className="font-semibold text-gray-500">Poznámky ke stavu vozidla</label>
                                <textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full mt-1 p-2 border rounded-md h-24"
                                    placeholder="Např. čistota interiéru, stav nádrže, nové poškození..."
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                    {(isDeparture || isArrival) && (
                         <button 
                            onClick={handleAction} 
                            disabled={isProcessing}
                            className={`py-2 px-4 rounded-lg text-white font-semibold ${isDeparture ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'} disabled:bg-gray-400`}
                         >
                            {isProcessing ? 'Zpracovávám...' : (isDeparture ? 'Potvrdit vydání' : 'Potvrdit vrácení')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReservationDetailModal;