import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, Gauge, ShieldAlert, Camera, PlusCircle, Trash2 } from 'lucide-react';
import { Reservation } from '../types';
import { useData } from '../contexts/DataContext';

interface NewDamage {
    description: string;
    location: string;
    imageFile: File;
    previewUrl: string;
}

interface ReservationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: Reservation | null;
}

const ReservationDetailModal: React.FC<ReservationDetailModalProps> = ({ isOpen, onClose, reservation }) => {
    const { actions } = useData();

    // --- HOOKS ---
    const [notes, setNotes] = useState('');
    const [startMileage, setStartMileage] = useState<string>('');
    const [endMileage, setEndMileage] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Damage reporting state
    const [newDamages, setNewDamages] = useState<NewDamage[]>([]);
    const [damageDescription, setDamageDescription] = useState('');
    const [damageLocation, setDamageLocation] = useState('');
    const [damageImageFile, setDamageImageFile] = useState<File | null>(null);

    useEffect(() => {
        if (isOpen && reservation) {
            setStartMileage(reservation.status === 'scheduled' ? String(reservation.vehicle?.currentMileage ?? '') : '');
            setEndMileage(reservation.status === 'active' ? String(reservation.vehicle?.currentMileage ?? '') : '');
            setNotes(reservation.notes || '');
            setNewDamages([]); // Reset damage form on open
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

    const isDeparture = reservation.status === 'scheduled';
    
    const handleAddDamage = () => {
        if (!damageDescription || !damageLocation || !damageImageFile) {
            alert('Vyplňte prosím popis, umístění a vyberte fotografii poškození.');
            return;
        }
        const newDamage: NewDamage = {
            description: damageDescription,
            location: damageLocation,
            imageFile: damageImageFile,
            previewUrl: URL.createObjectURL(damageImageFile),
        };
        setNewDamages(prev => [...prev, newDamage]);
        // Reset form
        setDamageDescription('');
        setDamageLocation('');
        setDamageImageFile(null);
        const fileInput = document.getElementById('damage-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };
    
    const handleRemoveDamage = (index: number) => {
        const damageToRemove = newDamages[index];
        URL.revokeObjectURL(damageToRemove.previewUrl);
        setNewDamages(prev => prev.filter((_, i) => i !== index));
    };

    const handleAction = async () => {
        setIsProcessing(true);
        try {
            if (isDeparture) {
                if (!startMileage || Number(startMileage) < (reservation.vehicle?.currentMileage ?? 0)) {
                    alert('Zadejte platný stav tachometru (nesmí být menší než aktuální stav vozidla).');
                    setIsProcessing(false);
                    return;
                }
                await actions.activateReservation(reservation.id, Number(startMileage));
            } else if (isArrival) {
                 if (!endMileage || Number(endMileage) <= (reservation.startMileage ?? 0)) {
                    alert('Konečný stav tachometru musí být větší než počáteční.');
                    setIsProcessing(false);
                    return;
                }
                
                // 1. Save all reported damages
                for (const damage of newDamages) {
                    await actions.addDamage({
                        vehicleId: reservation.vehicle!.id,
                        reservationId: reservation.id,
                        description: damage.description,
                        location: damage.location,
                        imageFile: damage.imageFile,
                    });
                }

                // 2. Prepare notes and complete reservation
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

                await actions.completeReservation(reservation.id, Number(endMileage), finalNotes);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 py-10 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">
                        {isDeparture && 'Potvrzení o vydání vozidla'}
                        {isArrival && 'Protokol o vrácení vozidla'}
                        {!isDeparture && !isArrival && 'Detail rezervace'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <div className="space-y-4">
                    {/* ... Basic Info ... */}
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
                     
                     {isDeparture && ( /* DEPARTURE VIEW */
                         <div>
                            <label htmlFor="startMileage" className="font-semibold text-gray-500 flex items-center"><Gauge className="w-4 h-4 mr-2" />Počáteční stav tachometru</label>
                            <input id="startMileage" type="number" value={startMileage} onChange={(e) => setStartMileage(e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="Zadejte stav km" required />
                        </div>
                    )}
                    
                    {isArrival && ( /* ARRIVAL VIEW */
                        <div className="space-y-6 pt-4 border-t">
                            <div>
                                <h3 className="font-semibold text-gray-500">Stav tachometru</h3>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div className="bg-gray-100 p-2 rounded">
                                        <label className="text-xs text-gray-600">Při odjezdu</label>
                                        <p className="font-bold">{reservation.startMileage?.toLocaleString('cs-CZ') ?? 'N/A'} km</p>
                                    </div>
                                    <div>
                                        <label htmlFor="endMileage" className="text-xs text-gray-600">Při návratu</label>
                                         <input id="endMileage" type="number" value={endMileage} onChange={(e) => setEndMileage(e.target.value)} className="w-full p-2 border rounded-md" required />
                                    </div>
                                </div>
                            </div>
                            {Number(endMileage) > (reservation.startMileage ?? 0) && (
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
                                    <h4 className="font-semibold text-blue-800">Vyúčtování kilometrů</h4>
                                    <p className="flex justify-between"><span>Ujeto celkem:</span> <span className="font-bold">{calculations.kmDriven.toLocaleString('cs-CZ')} km</span></p>
                                    <p className="flex justify-between"><span>Limit nájezdu ({calculations.rentalDays} {calculations.rentalDays > 1 ? 'dny' : 'den'}):</span> <span className="font-bold">{calculations.kmLimit.toLocaleString('cs-CZ')} km</span></p>
                                    {calculations.kmOver > 0 && <p className="flex justify-between text-red-600"><span>Překročeno o:</span> <span className="font-bold">{calculations.kmOver.toLocaleString('cs-CZ')} km</span></p>}
                                    {calculations.kmOver > 0 && <p className="flex justify-between text-red-600"><span>Poplatek (3 Kč/km):</span> <span className="font-bold">{calculations.extraCharge.toLocaleString('cs-CZ')} Kč</span></p>}
                                    {calculations.kmOver <= 0 && <p className="flex justify-between text-green-600"><span>Limit nepřekročen</span> <span className="font-bold">0 Kč</span></p>}
                                </div>
                            )}
                             <div>
                                <label htmlFor="notes" className="font-semibold text-gray-500">Poznámky ke stavu vozidla</label>
                                <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full mt-1 p-2 border rounded-md h-24" placeholder="Např. čistota interiéru, stav nádrže..."/>
                            </div>
                            
                            {/* --- DAMAGE REPORTING SECTION --- */}
                            <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-4">
                                <h3 className="font-semibold text-red-800 flex items-center"><ShieldAlert className="w-5 h-5 mr-2" /> Záznam o poškození</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input type="text" placeholder="Popis (např. Škrábanec)" value={damageDescription} onChange={e => setDamageDescription(e.target.value)} className="w-full p-2 border rounded-md" />
                                    <input type="text" placeholder="Umístění (např. Dveře řidiče)" value={damageLocation} onChange={e => setDamageLocation(e.target.value)} className="w-full p-2 border rounded-md" />
                                </div>
                                <div className="flex items-center space-x-3">
                                    <label htmlFor="damage-file-input" className="flex-grow p-2 border rounded-md bg-white cursor-pointer hover:bg-gray-50 flex items-center text-gray-600">
                                        <Camera className="w-5 h-5 mr-2" />
                                        {damageImageFile ? damageImageFile.name : 'Vybrat fotografii'}
                                    </label>
                                    <input id="damage-file-input" type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setDamageImageFile(e.target.files[0])} />
                                    <button onClick={handleAddDamage} className="py-2 px-3 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"><PlusCircle className="w-5 h-5 mr-1"/> Přidat</button>
                                </div>
                                {newDamages.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-red-200">
                                        <h4 className="text-sm font-semibold text-gray-700">Nahlášená poškození:</h4>
                                        {newDamages.map((damage, index) => (
                                            <div key={index} className="flex items-center justify-between bg-white p-2 rounded-md border">
                                                <div className="flex items-center">
                                                    <img src={damage.previewUrl} alt="náhled" className="w-12 h-12 object-cover rounded-md mr-3" />
                                                    <div>
                                                        <p className="font-semibold">{damage.description}</p>
                                                        <p className="text-sm text-gray-500">{damage.location}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleRemoveDamage(index)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="w-5 h-5"/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
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