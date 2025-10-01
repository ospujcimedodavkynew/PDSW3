import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Reservation, Vehicle, Customer, Contract } from '../types';
import { UserPlus, Car, Calendar as CalendarIcon, Signature, Edit, Search, X, Copy, CheckCircle, Mail, Link as LinkIcon } from 'lucide-react';
import SignatureModal from '../components/SignatureModal';
import { useData } from '../contexts/DataContext';
import ConfirmationModal from '../components/ConfirmationModal';
import { generateContractText, calculateTotalPrice } from '../contexts/DataContext'; // Import centralizovaných funkcí

interface ReservationFormData {
    selectedCustomerId: string;
    isNewCustomer: boolean;
    newCustomerData: Omit<Customer, 'id'>;
    selectedVehicleId: string;
    startDate: string;
    endDate: string;
}

const DRAFT_KEY = 'reservationFormDraft';

const initialFormData: ReservationFormData = {
    selectedCustomerId: '',
    isNewCustomer: false,
    newCustomerData: { firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '', ico: '' },
    selectedVehicleId: '',
    startDate: '',
    endDate: '',
};

const loadDraft = (): ReservationFormData => {
    try {
        const draft = sessionStorage.getItem(DRAFT_KEY);
        if (draft) {
            const parsedDraft = JSON.parse(draft);
            return { ...initialFormData, ...parsedDraft, newCustomerData: { ...initialFormData.newCustomerData, ...parsedDraft.newCustomerData }};
        }
    } catch (error) {
        console.error("Failed to parse reservation draft:", error);
    }
    return initialFormData;
};


const Reservations: React.FC = () => {
    const { data, loading, actions, reservationToEdit, reservationDefaults } = useData();
    const { vehicles, customers, reservations } = data;
    
    const [formData, setFormData] = useState<ReservationFormData>(loadDraft);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { selectedCustomerId, isNewCustomer, newCustomerData, selectedVehicleId, startDate, endDate } = formData;
    
    // Function to format date object to "YYYY-MM-DDTHH:mm" string
    const formatForInput = (date: Date | string) => new Date(date).toISOString().slice(0, 16);

    useEffect(() => {
        if (reservationToEdit) {
            setFormData({
                selectedCustomerId: reservationToEdit.customerId,
                isNewCustomer: false,
                newCustomerData: initialFormData.newCustomerData,
                selectedVehicleId: reservationToEdit.vehicleId,
                startDate: formatForInput(reservationToEdit.startDate),
                endDate: formatForInput(reservationToEdit.endDate),
            });
            setIsEditing(true);
            setEditingId(reservationToEdit.id);
            actions.setReservationToEdit(null); // Consume the edit request
        }
    }, [reservationToEdit, actions]);

    useEffect(() => {
        if (reservationDefaults) {
            setFormData(prev => ({
                ...prev,
                selectedVehicleId: reservationDefaults.vehicleId || prev.selectedVehicleId,
                startDate: reservationDefaults.startDate ? formatForInput(reservationDefaults.startDate) : prev.startDate,
            }));
            window.scrollTo(0, 0); // Scroll to top
            actions.setReservationDefaults(null); // Consume the defaults
        }
    }, [reservationDefaults, actions]);
    
    useEffect(() => {
        if (!isEditing) {
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
        }
    }, [formData, isEditing]);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [generatedContractInfo, setGeneratedContractInfo] = useState<{contractId: string, customerEmail: string, vehicleName: string} | null>(null);

    const filteredCustomers = useMemo(() => {
        if (!customerSearchTerm) return customers;
        const lowercasedTerm = customerSearchTerm.toLowerCase();
        return customers.filter(c =>
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(lowercasedTerm) ||
            c.email.toLowerCase().includes(lowercasedTerm)
        );
    }, [customers, customerSearchTerm]);

    const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);
    const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);
    
    const availableVehicles = useMemo(() => {
        if (!startDate || !endDate) return [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) return [];
        
        const conflictingVehicleIds = new Set<string>();
        for (const r of reservations) {
            // When editing, exclude the reservation being edited from conflict checks
            if (isEditing && r.id === editingId) continue;

            if (r.status === 'scheduled' || r.status === 'active') {
                const resStart = new Date(r.startDate);
                const resEnd = new Date(r.endDate);
                if (start < resEnd && end > resStart) {
                    conflictingVehicleIds.add(r.vehicleId);
                }
            }
        }
        return vehicles.filter(v => v.status !== 'maintenance' && !conflictingVehicleIds.has(v.id));
    }, [vehicles, reservations, startDate, endDate, isEditing, editingId]);

    useEffect(() => {
        if (selectedVehicleId && !availableVehicles.some(v => v.id === selectedVehicleId)) {
             // If the currently selected vehicle becomes unavailable, deselect it,
             // unless we are in edit mode and it's the original vehicle for the reservation.
            const originalReservationVehicle = isEditing ? reservations.find(r => r.id === editingId)?.vehicleId : null;
            if (selectedVehicleId !== originalReservationVehicle) {
                 setFormData(prev => ({ ...prev, selectedVehicleId: '' }));
            }
        }
    }, [availableVehicles, selectedVehicleId, isEditing, editingId, reservations]);

    const totalPrice = useMemo(() => {
        if (!selectedVehicle || !startDate || !endDate) return 0;
        return calculateTotalPrice(selectedVehicle, new Date(startDate), new Date(endDate));
    }, [selectedVehicle, startDate, endDate]);

    const handleSetDuration = (hours: number) => {
        if (!startDate) {
            alert("Nejprve prosím vyberte počáteční datum a čas.");
            return;
        }
        const start = new Date(startDate);
        const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
        
        const pad = (num: number) => num.toString().padStart(2, '0');
        const formattedEnd = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
        setFormData(prev => ({ ...prev, endDate: formattedEnd }));
    };

    const handleSaveSignature = (dataUrl: string) => {
        setSignatureDataUrl(dataUrl);
        setIsSignatureModalOpen(false);
    };

    const resetForm = useCallback(() => {
        setFormData(initialFormData);
        setSignatureDataUrl('');
        setCustomerSearchTerm('');
        setIsEditing(false);
        setEditingId(null);
        sessionStorage.removeItem(DRAFT_KEY);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isNewCustomer && !selectedCustomerId) { alert("Vyberte prosím zákazníka."); return; }
        if (isNewCustomer && (!newCustomerData.firstName || !newCustomerData.lastName || !newCustomerData.email || !newCustomerData.address)) { alert("Vyplňte prosím údaje o novém zákazníkovi."); return; }
        if (!selectedVehicleId) { alert("Vyberte prosím vozidlo."); return; }
        if (!startDate || !endDate) { alert("Vyberte prosím období pronájmu."); return; }
        if (new Date(endDate) <= new Date(startDate)) { alert("Datum konce musí být po datu začátku."); return; }
        
        const isVehicleAvailable = availableVehicles.some(v => v.id === selectedVehicleId);
        const originalVehicle = isEditing ? reservations.find(r => r.id === editingId)?.vehicleId : null;
        if (!isVehicleAvailable && selectedVehicleId !== originalVehicle) {
            alert("Vybrané vozidlo není v tomto termínu dostupné. Zvolte prosím jiné vozidlo nebo termín.");
            return;
        }

        setIsProcessing(true);
        try {
            let finalCustomerId = selectedCustomerId;
            if (isNewCustomer) {
                const newCustomer = await actions.addCustomer(newCustomerData);
                finalCustomerId = newCustomer.id;
            }

            if (isEditing && editingId) {
                await actions.updateReservation(editingId, {
                    customerId: finalCustomerId,
                    vehicleId: selectedVehicleId,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    status: 'scheduled', // Update status from 'pending-approval'
                });
                alert('Rezervace byla úspěšně upravena a schválena.');
                resetForm();

            } else { // Creating a new reservation
                if (!signatureDataUrl) { alert("Zákazník se musí podepsat."); setIsProcessing(false); return; }

                const customerForContract = isNewCustomer 
                    ? { id: finalCustomerId, ...newCustomerData } as Customer
                    : customers.find(c => c.id === finalCustomerId);

                if (!customerForContract) throw new Error("Nepodařilo se nalézt data zákazníka.");
                
                const newReservation = await actions.addReservation({
                    customerId: finalCustomerId,
                    vehicleId: selectedVehicleId,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                });
                const contractVehicle = vehicles.find(v => v.id === selectedVehicleId);
                if (!contractVehicle) throw new Error("Vozidlo nebylo nalezeno.");

                const contractText = generateContractText({
                    customer: customerForContract,
                    vehicle: contractVehicle,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    totalPrice: totalPrice,
                }, 'image_placeholder');
                
                const newContract = await actions.addContract({
                    reservationId: newReservation.id,
                    customerId: finalCustomerId,
                    vehicleId: selectedVehicleId,
                    generatedAt: new Date(),
                    contractText,
                }, signatureDataUrl);

                setGeneratedContractInfo({ 
                    contractId: newContract.id, 
                    customerEmail: customerForContract.email, 
                    vehicleName: contractVehicle.name 
                });
                setIsConfirmationModalOpen(true);
                resetForm();
            }

        } catch (error) {
            console.error("Failed to process reservation:", error);
            alert(`Chyba při zpracování rezervace: ${error instanceof Error ? error.message : "Neznámá chyba"}`);
        } finally {
            setIsProcessing(false);
        }
    };
    
    if (loading && customers.length === 0) return <div>Načítání...</div>;

    const handleNewCustomerDataChange = (field: keyof Omit<Customer, 'id'>, value: string) => {
        setFormData(prev => ({...prev, newCustomerData: {...prev.newCustomerData, [field]: value}}));
    };
    
    const handleToggleNewCustomer = () => {
        const willBeNew = !formData.isNewCustomer;
        setFormData(prev => ({...prev, isNewCustomer: willBeNew, selectedCustomerId: ''}));
        if (willBeNew) {
            setCustomerSearchTerm('');
        }
    };
    
    const handleSelectCustomer = (customerId: string) => {
        setFormData(prev => ({ ...prev, selectedCustomerId: customerId, isNewCustomer: false }));
    };
    
    return (
        <>
        <SignatureModal 
            isOpen={isSignatureModalOpen}
            onClose={() => setIsSignatureModalOpen(false)}
            onSave={handleSaveSignature}
        />
        <ConfirmationModal 
            isOpen={isConfirmationModalOpen}
            onClose={() => setIsConfirmationModalOpen(false)}
            contractInfo={generatedContractInfo}
        />

        <form onSubmit={handleSubmit} className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">{isEditing ? 'Upravit rezervaci' : 'Nová rezervace'}</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6 bg-white p-6 rounded-lg shadow-md">
                    {/* Customer Section */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4"><UserPlus className="mr-2"/>1. Zákazník</h2>
                        <div className="flex items-center space-x-4">
                            <div className="flex-grow space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Hledat stávajícího zákazníka..."
                                        value={customerSearchTerm}
                                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                        className="w-full p-2 pl-10 border rounded-md"
                                        disabled={isNewCustomer}
                                    />
                                </div>
                                <select
                                    value={selectedCustomerId}
                                    onChange={(e) => handleSelectCustomer(e.target.value)}
                                    className="w-full p-2 border rounded-md"
                                    disabled={isNewCustomer}
                                >
                                    <option value="">{filteredCustomers.length > 0 ? 'Vyberte stávajícího zákazníka' : 'Žádný zákazník neodpovídá hledání'}</option>
                                    {filteredCustomers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>)}
                                </select>
                            </div>
                            <span className="text-gray-500">nebo</span>
                             <button type="button" onClick={handleToggleNewCustomer} className={`py-2 px-4 rounded-md font-semibold whitespace-nowrap ${isNewCustomer ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                                Nový zákazník
                            </button>
                        </div>
                        {isNewCustomer && (
                            <div className="mt-4 space-y-2 p-4 border-t">
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="Jméno" value={newCustomerData.firstName} onChange={e => handleNewCustomerDataChange('firstName', e.target.value)} className="w-full p-2 border rounded" required />
                                    <input type="text" placeholder="Příjmení" value={newCustomerData.lastName} onChange={e => handleNewCustomerDataChange('lastName', e.target.value)} className="w-full p-2 border rounded" required />
                                </div>
                                <input type="email" placeholder="Email" value={newCustomerData.email} onChange={e => handleNewCustomerDataChange('email', e.target.value)} className="w-full p-2 border rounded" required />
                                <input type="text" placeholder="Adresa" value={newCustomerData.address} onChange={e => handleNewCustomerDataChange('address', e.target.value)} className="w-full p-2 border rounded" required />
                                <div className="grid grid-cols-2 gap-4">
                                     <input type="tel" placeholder="Telefon" value={newCustomerData.phone} onChange={e => handleNewCustomerDataChange('phone', e.target.value)} className="w-full p-2 border rounded" required />
                                    <input type="text" placeholder="Číslo ŘP" value={newCustomerData.driverLicenseNumber} onChange={e => handleNewCustomerDataChange('driverLicenseNumber', e.target.value)} className="w-full p-2 border rounded" required />
                                </div>
                                <input type="text" placeholder="IČO (volitelné)" value={newCustomerData.ico || ''} onChange={e => handleNewCustomerDataChange('ico', e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                        )}
                    </section>
                    
                    {/* Date & Time Section */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4"><CalendarIcon className="mr-2"/>2. Doba pronájmu</h2>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="block text-sm font-medium">Od (datum a čas)</label>
                                <input type="datetime-local" value={startDate} onChange={e => setFormData(prev => ({...prev, startDate: e.target.value}))} className="w-full p-2 border rounded" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Do (datum a čas)</label>
                                <input type="datetime-local" value={endDate} onChange={e => setFormData(prev => ({...prev, endDate: e.target.value}))} className="w-full p-2 border rounded" required />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                             <span className="self-center mr-2 text-sm font-medium">Rychlá volba:</span>
                            {[
                                {label: '4 hod', hours: 4}, {label: '12 hod', hours: 12}, {label: '1 den', hours: 24},
                                {label: 'Víkend (2 dny)', hours: 48}, {label: 'Týden', hours: 168}, {label: 'Měsíc (30 dní)', hours: 720}
                            ].map(preset => (
                                <button type="button" key={preset.hours} onClick={() => handleSetDuration(preset.hours)} className="px-3 py-1 text-sm bg-gray-200 rounded-full hover:bg-gray-300">{preset.label}</button>
                            ))}
                        </div>
                    </section>
                    
                    {/* Vehicle Section */}
                     <section>
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4"><Car className="mr-2"/>3. Vozidlo</h2>
                        {!startDate || !endDate ? (
                            <div className="text-center p-6 bg-gray-50 rounded-md border">
                                <p className="text-gray-600 font-medium">Nejprve prosím vyberte dobu pronájmu pro zobrazení dostupných vozidel.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {availableVehicles.length > 0 ? availableVehicles.map(v => (
                                    <div key={v.id} onClick={() => setFormData(prev => ({...prev, selectedVehicleId: v.id}))} className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${selectedVehicleId === v.id ? 'border-primary shadow-lg scale-105' : 'border-gray-200 hover:border-blue-300'}`}>
                                        <img src={v.imageUrl} alt={v.name} className="w-full h-24 object-cover rounded-md mb-2"/>
                                        <h3 className="font-semibold">{v.name}</h3>
                                        <p className="text-xs text-gray-500">{v.rate4h.toLocaleString('cs-CZ')} Kč/4h | {v.rate12h.toLocaleString('cs-CZ')} Kč/12h</p>
                                        <p className="text-sm text-gray-700 font-bold">{v.dailyRate.toLocaleString('cs-CZ')} Kč/den</p>
                                    </div>
                                )) : (
                                    <div className="col-span-full text-center p-6 bg-yellow-50 rounded-md border border-yellow-200">
                                        <p className="text-yellow-800 font-medium">Pro zadaný termín nejsou dostupná žádná vozidla.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Signature Section - Hidden when editing */}
                    {!isEditing && (
                        <section>
                             <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4"><Signature className="mr-2"/>4. Podpis zákazníka</h2>
                             {signatureDataUrl ? (
                                 <div className="border border-gray-300 rounded-lg p-4 flex items-center justify-between">
                                     <div className="bg-gray-100 p-2 rounded">
                                        <img src={signatureDataUrl} alt="Podpis zákazníka" className="h-16 w-auto" />
                                     </div>
                                     <p className="font-semibold text-green-600">Podpis uložen</p>
                                     <button
                                         type="button"
                                         onClick={() => setIsSignatureModalOpen(true)}
                                         className="flex items-center py-2 px-4 rounded-md font-semibold bg-gray-200 hover:bg-gray-300"
                                     >
                                        <Edit className="w-4 h-4 mr-2" /> Změnit podpis
                                     </button>
                                 </div>
                             ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsSignatureModalOpen(true)}
                                    className="w-full py-4 px-6 border-2 border-dashed border-gray-400 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-primary flex items-center justify-center transition-colors"
                                >
                                    <Signature className="mr-3 w-6 h-6"/>
                                    <span className="font-bold text-lg">Otevřít pro podpis zákazníka</span>
                                </button>
                             )}
                        </section>
                    )}

                </div>

                {/* Right Column: Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-md sticky top-6">
                        <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">Souhrn rezervace</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold">Zákazník:</h3>
                                <p className="text-gray-700">{isNewCustomer ? `${newCustomerData.firstName} ${newCustomerData.lastName}` : (selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`: 'Nevybrán')}</p>
                            </div>
                             <div>
                                <h3 className="font-semibold">Vozidlo:</h3>
                                {selectedVehicle ? (
                                    <div className="flex items-center mt-1">
                                        <img src={selectedVehicle.imageUrl} alt={selectedVehicle.name} className="w-16 h-12 object-cover rounded mr-3"/>
                                        <div>
                                            <p className="text-gray-700 font-medium">{selectedVehicle.name}</p>
                                            <p className="text-sm text-gray-500">{selectedVehicle.licensePlate}</p>
                                        </div>
                                    </div>
                                ) : <p className="text-gray-700">Nevybráno</p>}
                            </div>
                            <div>
                                <h3 className="font-semibold">Období:</h3>
                                <p className="text-gray-700">{startDate ? new Date(startDate).toLocaleString('cs-CZ') : 'N/A'}</p>

                                <p className="text-gray-700">{endDate ? new Date(endDate).toLocaleString('cs-CZ') : 'N/A'}</p>
                            </div>
                             <div className="border-t pt-4">
                                <p className="flex justify-between items-baseline text-2xl font-bold">
                                    <span>Celkem:</span>
                                    <span>{totalPrice.toLocaleString('cs-CZ')} Kč</span>
                                </p>
                            </div>
                        </div>
                         <button type="submit" className="w-full mt-6 bg-secondary text-dark-text font-bold py-3 rounded-lg hover:bg-secondary-hover transition-colors text-lg" disabled={isProcessing}>
                            {isProcessing ? 'Zpracovávám...' : (isEditing ? 'Uložit změny' : 'Vytvořit rezervaci a smlouvu')}
                        </button>
                    </div>
                </div>
            </div>
        </form>
        </>
    );
};

export default Reservations;