import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, Gauge, ShieldAlert, Camera, PlusCircle, Trash2, Wind, Droplets, KeyRound, CheckSquare, Signature, Edit } from 'lucide-react';
import { Reservation } from '../types';
import { useData, ProtocolData } from '../contexts/DataContext';
import SignatureModal from './SignatureModal';


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
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Departure state
    const [startMileage, setStartMileage] = useState<string>('');
    const [isDepartureSignatureModalOpen, setIsDepartureSignatureModalOpen] = useState(false);
    const [departureSignatureDataUrl, setDepartureSignatureDataUrl] = useState('');
    
    // Arrival (protocol) state
    const [endMileage, setEndMileage] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [fuelLevel, setFuelLevel] = useState('');
    const [refuelingCost, setRefuelingCost] = useState<string>('');
    const [forfeitDeposit, setForfeitDeposit] = useState(false);
    const [cleanliness, setCleanliness] = useState('');
    const [keysAndDocsOk, setKeysAndDocsOk] = useState(true);
    const [isReturnSignatureModalOpen, setIsReturnSignatureModalOpen] = useState(false);
    const [returnSignatureDataUrl, setReturnSignatureDataUrl] = useState('');

    // Damage reporting state
    const [newDamages, setNewDamages] = useState<NewDamage[]>([]);
    const [damageDescription, setDamageDescription] = useState('');
    const [damageLocation, setDamageLocation] = useState('');
    const [damageImageFile, setDamageImageFile] = useState<File | null>(null);

    useEffect(() => {
        if (isOpen && reservation) {
            // Reset all state on open to avoid stale data
            setStartMileage(reservation.status === 'scheduled' ? String(reservation.vehicle?.currentMileage ?? '') : '');
            setEndMileage(reservation.status === 'active' ? String(reservation.vehicle?.currentMileage ?? '') : '');
            setNotes(reservation.notes || '');
            setFuelLevel('');
            setCleanliness('');
            setKeysAndDocsOk(true);
            setNewDamages([]);
            setDamageDescription('');
            setDamageLocation('');
            setDamageImageFile(null);
            setDepartureSignatureDataUrl('');
            setReturnSignatureDataUrl('');
            setRefuelingCost('');
            setForfeitDeposit(false);
        }
    }, [isOpen, reservation]);

    const isArrival = reservation?.status === 'active';
    const isDeparture = reservation?.status === 'scheduled';

    const calculations = useMemo(() => {
        if (!isArrival || !reservation || !reservation.startMileage) {
            return { kmDriven: 0, rentalDays: 0, kmLimit: 0, kmOver: 0, extraCharge: 0 };
        }
        
        const startKm = reservation.startMileage;
        const endKm = Number(endMileage) || 0;
        const kmDriven = endKm > startKm ? endKm - startKm : 0;

        const durationMs = new Date(reservation.endDate).getTime() - new Date(reservation.startDate).getTime();
        const rentalDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
        const kmLimit = rentalDays * 300;
        const kmOver = Math.max(0, kmDriven - kmLimit);
        const extraCharge = kmOver * 3;

        return { kmDriven, rentalDays, kmLimit, kmOver, extraCharge };
    }, [reservation, endMileage, isArrival]);
    
    if (!isOpen || !reservation) return null;

    if (!reservation.customer || !reservation.vehicle) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Chyba dat</h2>
                    <p className="text-gray-700 mb-6">Informace o této rezervaci jsou neúplné. Zkontrolujte prosím data pro rezervaci ID: <code className="text-sm bg-red-100 p-1 rounded">{reservation.id}</code></p>
                    <button onClick={onClose} className="py-2 px-6 rounded-lg bg-gray-300 hover:bg-gray-400">Zavřít</button>
                </div>
            </div>
        );
    }
    
    const handleSaveDepartureSignature = (dataUrl: string) => {
        setDepartureSignatureDataUrl(dataUrl);
        setIsDepartureSignatureModalOpen(false);
    };
    
    const handleSaveReturnSignature = (dataUrl: string) => {
        setReturnSignatureDataUrl(dataUrl);
        setIsReturnSignatureModalOpen(false);
    };

    const handleAddDamage = () => {
        if (!damageDescription || !damageLocation || !damageImageFile) {
            alert('Vyplňte prosím popis, umístění a vyberte fotografii poškození.');
            return;
        }
        const newDamage: NewDamage = { description: damageDescription, location: damageLocation, imageFile: damageImageFile, previewUrl: URL.createObjectURL(damageImageFile) };
        setNewDamages(prev => [...prev, newDamage]);
        setDamageDescription('');
        setDamageLocation('');
        setDamageImageFile(null);
        const fileInput = document.getElementById('damage-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };
    
    const handleRemoveDamage = (index: number) => {
        URL.revokeObjectURL(newDamages[index].previewUrl);
        setNewDamages(prev => prev.filter((_, i) => i !== index));
    };

    const handleAction = async () => {
        setIsProcessing(true);
        try {
            if (isDeparture) {
                if (!startMileage || Number(startMileage) < (reservation.vehicle?.currentMileage ?? 0)) {
                    alert('Zadejte platný stav tachometru.');
                    setIsProcessing(false);
                    return;
                }
                if (!departureSignatureDataUrl) {
                    alert('Při předání vozidla je vyžadován podpis zákazníka.');
                    setIsProcessing(false);
                    return;
                }
                await actions.activateReservation(reservation.id, Number(startMileage), departureSignatureDataUrl);

            } else if (isArrival) {
                if (!endMileage || Number(endMileage) <= (reservation.startMileage ?? 0)) { alert('Konečný stav tachometru musí být větší než počáteční.'); setIsProcessing(false); return; }
                if (!fuelLevel) { alert('Vyberte prosím stav paliva.'); setIsProcessing(false); return; }
                if (!cleanliness) { alert('Vyberte prosím stav čistoty vozidla.'); setIsProcessing(false); return; }
                if (!returnSignatureDataUrl) { alert('Protokol musí být podepsán zákazníkem.'); setIsProcessing(false); return; }
                
                // 1. Save all reported damages first
                for (const damage of newDamages) {
                    await actions.addDamage({ vehicleId: reservation.vehicle!.id, reservationId: reservation.id, ...damage });
                }

                // 2. Prepare protocol data and complete reservation
                const protocolData: ProtocolData = { notes, fuelLevel, cleanliness, keysAndDocsOk, customerAgreed: true }; // Agreement is now signature
                const cost = refuelingCost ? parseFloat(refuelingCost) : 0;
                await actions.completeReservation(reservation.id, Number(endMileage), protocolData, returnSignatureDataUrl, cost, forfeitDeposit);
            }
            onClose();
        } catch (error) {
            console.error("Failed to process reservation action", error);
            alert(`Došlo k chybě: ${error instanceof Error ? error.message : "Neznámá chyba"}`);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleDeleteReservation = async () => {
        if (!reservation) return;
        if (window.confirm("Opravdu chcete tuto rezervaci zrušit a trvale smazat? Tato akce je nevratná.")) {
            setIsProcessing(true);
            try {
                await actions.rejectReservation(reservation.id);
                onClose();
            } catch (error) {
                console.error("Failed to delete reservation:", error);
                alert(`Došlo k chybě: ${error instanceof Error ? error.message : "Neznámá chyba"}`);
            } finally {
                setIsProcessing(false);
            }
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 py-10 overflow-y-auto">
            <SignatureModal isOpen={isDepartureSignatureModalOpen} onClose={() => setIsDepartureSignatureModalOpen(false)} onSave={handleSaveDepartureSignature} />
            <SignatureModal isOpen={isReturnSignatureModalOpen} onClose={() => setIsReturnSignatureModalOpen(false)} onSave={handleSaveReturnSignature} />
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-3xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">
                        {isDeparture && 'Potvrzení o vydání vozidla'}
                        {isArrival && 'Protokol o vrácení vozidla'}
                        {!isDeparture && !isArrival && 'Detail rezervace'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <div className="space-y-4">
                    {/* --- Basic Info (Shared) --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                        <div>
                            <h3 className="font-semibold text-gray-500">Zákazník</h3>
                            <p className="text-lg">{reservation.customer.firstName} {reservation.customer.lastName}</p>
                            {reservation.customer.driverLicenseImageUrl && (
                                <a href={reservation.customer.driverLicenseImageUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center mt-1"><FileText className="w-4 h-4 mr-1"/> Zobrazit ŘP</a>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-500">Vozidlo</h3>
                            <p className="text-lg">{reservation.vehicle.name} ({reservation.vehicle.licensePlate})</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-500">Období</h3>
                            <p className="text-base">{new Date(reservation.startDate).toLocaleString('cs-CZ')} - {new Date(reservation.endDate).toLocaleString('cs-CZ')}</p>
                        </div>
                    </div>
                    
                    {isDeparture && ( // --- DEPARTURE VIEW ---
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="startMileage" className="font-semibold text-gray-500 flex items-center"><Gauge className="w-4 h-4 mr-2" />Počáteční stav tachometru</label>
                                <input id="startMileage" type="number" value={startMileage} onChange={(e) => setStartMileage(e.target.value)} className="w-full mt-1 p-2 border rounded-md" placeholder="Zadejte stav km" required />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-500 flex items-center mb-2"><Signature className="w-4 h-4 mr-2" />Podpis zákazníka</h3>
                                {departureSignatureDataUrl ? (
                                     <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between bg-green-50">
                                         <p className="font-semibold text-green-700">Podpis uložen</p>
                                         <div className="bg-white p-1 border rounded"><img src={departureSignatureDataUrl} alt="Podpis" className="h-12 w-auto" /></div>
                                         <button type="button" onClick={() => setIsDepartureSignatureModalOpen(true)} className="flex items-center py-2 px-3 rounded-md font-semibold bg-gray-200 hover:bg-gray-300 text-sm"><Edit className="w-4 h-4 mr-2" /> Změnit</button>
                                     </div>
                                ) : (
                                    <button type="button" onClick={() => setIsDepartureSignatureModalOpen(true)} className="w-full py-4 px-6 border-2 border-dashed border-gray-400 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-primary flex items-center justify-center transition-colors">
                                        <Signature className="mr-3 w-6 h-6"/>
                                        <span className="font-bold text-lg">Otevřít pro podpis</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {isArrival && ( // --- ARRIVAL VIEW (PROTOCOL FORM) ---
                        <div className="space-y-6 pt-4 border-t">
                            {/* Tachometer & Mileage */}
                            <div>
                                <h3 className="font-semibold text-gray-500 mb-2">Stav tachometru a vyúčtování</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-100 p-2 rounded"><label className="text-xs text-gray-600">Při odjezdu</label><p className="font-bold">{reservation.startMileage?.toLocaleString('cs-CZ') ?? 'N/A'} km</p></div>
                                    <div><label htmlFor="endMileage" className="text-xs text-gray-600">Při návratu</label><input id="endMileage" type="number" value={endMileage} onChange={(e) => setEndMileage(e.target.value)} className="w-full p-2 border rounded-md" required /></div>
                                </div>
                                {Number(endMileage) > (reservation.startMileage ?? 0) && (
                                    <div className="mt-3 bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm space-y-1">
                                        <p className="flex justify-between"><span>Ujeto celkem:</span> <span className="font-bold">{calculations.kmDriven.toLocaleString('cs-CZ')} km</span></p>
                                        <p className="flex justify-between"><span>Limit nájezdu ({calculations.rentalDays} {calculations.rentalDays > 4 ? 'dní' : 'dny'}):</span> <span className="font-bold">{calculations.kmLimit.toLocaleString('cs-CZ')} km</span></p>
                                        <p className={`flex justify-between font-bold ${calculations.kmOver > 0 ? 'text-red-600' : 'text-green-600'}`}><span>Poplatek za překročení:</span> <span>{calculations.extraCharge.toLocaleString('cs-CZ')} Kč</span></p>
                                    </div>
                                )}
                            </div>

                            {/* Checklist */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-semibold text-gray-500 mb-2">Stav paliva</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {['Plná', '3/4', '1/2', '1/4', 'Prázdná'].map(level => <button key={level} type="button" onClick={() => setFuelLevel(level)} className={`px-3 py-1.5 text-sm font-semibold rounded-full border-2 ${fuelLevel === level ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-gray-100 border-gray-300'}`}>{level}</button>)}
                                    </div>
                                    {fuelLevel && fuelLevel !== 'Plná' && (
                                        <div className="mt-4">
                                            <label htmlFor="refuelingCost" className="block text-sm font-medium text-yellow-800">Náklady na dotankování (Kč)</label>
                                            <input
                                                id="refuelingCost"
                                                type="number"
                                                value={refuelingCost}
                                                onChange={(e) => setRefuelingCost(e.target.value)}
                                                className="w-full mt-1 p-2 border rounded-md border-yellow-300 focus:ring-yellow-500 focus:border-yellow-500"
                                                placeholder="Zadejte částku"
                                            />
                                        </div>
                                    )}
                                </div>
                                 <div>
                                    <h3 className="font-semibold text-gray-500 mb-2">Čistota vozidla</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {['Čisté', 'Běžné znečištění', 'Silně znečištěno'].map(level => <button key={level} type="button" onClick={() => setCleanliness(level)} className={`px-3 py-1.5 text-sm font-semibold rounded-full border-2 ${cleanliness === level ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-gray-100 border-gray-300'}`}>{level}</button>)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center bg-gray-50 p-3 rounded-md">
                                <input id="keysAndDocs" type="checkbox" checked={keysAndDocsOk} onChange={e => setKeysAndDocsOk(e.target.checked)} className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300" />
                                <label htmlFor="keysAndDocs" className="ml-3 font-medium text-gray-700">Klíče a dokumentace od vozidla v pořádku</label>
                            </div>

                            {/* Notes, Damage, Agreement */}
                            <div><label htmlFor="notes" className="font-semibold text-gray-500">Poznámky</label><textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full mt-1 p-2 border rounded-md h-20" placeholder="Např. specifické detaily ke stavu vozidla..."/></div>
                            <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-3">
                                <h3 className="font-semibold text-red-800 flex items-center"><ShieldAlert className="w-5 h-5 mr-2" /> Záznam o novém poškození</h3>
                                {/* Damage Form & List will go here if we expand */}
                                {newDamages.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-red-200">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={forfeitDeposit}
                                                onChange={(e) => setForfeitDeposit(e.target.checked)}
                                                className="h-5 w-5 rounded text-primary focus:ring-primary border-gray-300"
                                            />
                                            <span className="ml-3 font-medium text-gray-700">Započítat kauci (5.000 Kč) na úhradu škody</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                            
                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-gray-500 mb-2 flex items-center"><Signature className="w-5 h-5 mr-2" /> Podpis zákazníka a souhlas</h3>
                                {returnSignatureDataUrl ? (
                                     <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between bg-green-50">
                                         <p className="font-semibold text-green-700">Podpis uložen. Zákazník stvrzuje souhlas s protokolem.</p>
                                         <button type="button" onClick={() => setIsReturnSignatureModalOpen(true)} className="flex items-center py-2 px-3 rounded-md font-semibold bg-gray-200 hover:bg-gray-300 text-sm"><Edit className="w-4 h-4 mr-2" /> Změnit</button>
                                     </div>
                                ) : (
                                    <button type="button" onClick={() => setIsReturnSignatureModalOpen(true)} className="w-full py-4 px-6 border-2 border-dashed border-gray-400 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-primary flex items-center justify-center transition-colors">
                                        <Signature className="mr-3 w-6 h-6"/>
                                        <span className="font-bold text-lg">Otevřít pro podpis (potvrzuje souhlas)</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-between items-center">
                    <div>
                        {isDeparture && (
                            <button 
                                onClick={handleDeleteReservation}
                                disabled={isProcessing}
                                className="py-2 px-4 rounded-lg bg-red-600 text-white font-semibold transition-colors hover:bg-red-700 disabled:bg-gray-400 flex items-center"
                            >
                               <Trash2 className="w-4 h-4 mr-2" /> Zrušit rezervaci
                            </button>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        <button onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zavřít</button>
                        {(isDeparture || isArrival) && (
                            <button
                                onClick={handleAction}
                                disabled={isProcessing || (isArrival && !returnSignatureDataUrl) || (isDeparture && !departureSignatureDataUrl)}
                                className={`py-2 px-6 rounded-lg text-white font-semibold transition-colors ${isDeparture ? 'bg-green-500 hover:bg-green-600' : 'bg-primary hover:bg-primary-hover'} disabled:bg-gray-400 disabled:cursor-not-allowed`}
                            >
                                {isProcessing ? 'Zpracovávám...' : (isDeparture ? 'Potvrdit vydání' : 'Uložit protokol a dokončit')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReservationDetailModal;