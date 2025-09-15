import React, { useEffect, useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { getVehicles, getCustomers, getReservations, addCustomer, addReservation, addContract } from '../services/api';
import type { Reservation, Vehicle, Customer } from '../types';
import { UserPlus, Car, Calendar as CalendarIcon, Clock, Signature } from 'lucide-react';

// Signature Pad Component
interface SignaturePadHandles {
    getSignature: () => string;
    clear: () => void;
    isEmpty: () => boolean;
}

const SignaturePad = forwardRef<SignaturePadHandles>((props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    const getContext = () => canvasRef.current?.getContext('2d');

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = getContext();
            if (ctx) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
            }
        }
    }, []);
    
    const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number, y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e.nativeEvent) {
             return { x: e.nativeEvent.touches[0].clientX - rect.left, y: e.nativeEvent.touches[0].clientY - rect.top };
        }
        return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    }

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const ctx = getContext();
        if (ctx) {
            const { x, y } = getCoords(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
            setIsDrawing(true);
            setIsEmpty(false);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const ctx = getContext();
        if (ctx) {
            const { x, y } = getCoords(e);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        const ctx = getContext();
        if (ctx) {
            ctx.closePath();
            setIsDrawing(false);
        }
    };

    const clear = () => {
        const ctx = getContext();
        const canvas = canvasRef.current;
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setIsEmpty(true);
        }
    };

    useImperativeHandle(ref, () => ({
        getSignature: () => {
            if (isEmpty || !canvasRef.current) return '';
            return canvasRef.current.toDataURL('image/png');
        },
        clear,
        isEmpty: () => isEmpty,
    }));

    return (
        <div>
            <canvas
                ref={canvasRef}
                width="400"
                height="150"
                className="border border-gray-400 rounded-md bg-white cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />
            <button type="button" onClick={clear} className="text-sm mt-2 text-blue-600 hover:underline">
                Vymazat podpis
            </button>
        </div>
    );
});


const Reservations: React.FC = () => {
    // Data states
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState<Omit<Customer, 'id'>>({ firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '' });
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const signaturePadRef = useRef<SignaturePadHandles>(null);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [vehData, custData, resData] = await Promise.all([getVehicles(), getCustomers(), getReservations()]);
                setVehicles(vehData);
                setCustomers(custData);
                setReservations(resData);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Memoized calculations for performance
    const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);
    const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);
    
    const availableVehicles = useMemo(() => {
        if (!startDate || !endDate) {
            return []; // Don't show any vehicles until a date range is selected
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            return []; // Invalid date range
        }
        const conflictingVehicleIds = new Set<string>();
        for (const r of reservations) {
            // Check only against reservations that will be active or are scheduled
            if (r.status === 'scheduled' || r.status === 'active') {
                const resStart = new Date(r.startDate);
                const resEnd = new Date(r.endDate);
                if (start < resEnd && end > resStart) {
                    conflictingVehicleIds.add(r.vehicleId);
                }
            }
        }
        // A vehicle is available if it's not in maintenance and doesn't have a conflicting reservation
        return vehicles.filter(v => v.status !== 'maintenance' && !conflictingVehicleIds.has(v.id));
    }, [vehicles, reservations, startDate, endDate]);


    const totalPrice = useMemo(() => {
        if (!selectedVehicle || !startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) return 0;

        const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
        
        if (durationHours <= 4) {
            return selectedVehicle.rate4h;
        }
        if (durationHours <= 12) {
            return selectedVehicle.rate12h;
        }
        // For 12+ hours, calculate based on days
        const days = Math.ceil(durationHours / 24);
        return days * selectedVehicle.dailyRate;
    }, [selectedVehicle, startDate, endDate]);

    // Handlers
    const handleSetDuration = (hours: number) => {
        if (!startDate) {
            alert("Nejprve prosím vyberte počáteční datum a čas.");
            return;
        }
        const start = new Date(startDate);
        const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
        
        const pad = (num: number) => num.toString().padStart(2, '0');
        const formattedEnd = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
        setEndDate(formattedEnd);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let customerForContract: Customer | undefined = selectedCustomer;
        
        // Validation
        if (!isNewCustomer && !selectedCustomerId) { alert("Vyberte prosím zákazníka."); return; }
        if (isNewCustomer && (!newCustomerData.firstName || !newCustomerData.lastName || !newCustomerData.email || !newCustomerData.address)) { alert("Vyplňte prosím údaje o novém zákazníkovi."); return; }
        if (!selectedVehicleId) { alert("Vyberte prosím vozidlo."); return; }
        if (!startDate || !endDate) { alert("Vyberte prosím období pronájmu."); return; }
        if (new Date(endDate) <= new Date(startDate)) { alert("Datum konce musí být po datu začátku."); return; }
        if (signaturePadRef.current?.isEmpty()) { alert("Zákazník se musí podepsat."); return; }
        if (!availableVehicles.some(v => v.id === selectedVehicleId)) {
            alert("Vybrané vozidlo není v tomto termínu dostupné. Zvolte prosím jiné vozidlo nebo termín.");
            return;
        }

        try {
            setLoading(true);
            let finalCustomerId = selectedCustomerId;

            if (isNewCustomer) {
                const newCustomer = await addCustomer(newCustomerData);
                finalCustomerId = newCustomer.id;
                customerForContract = newCustomer;
            } else {
                 customerForContract = customers.find(c => c.id === finalCustomerId);
            }

            if (!customerForContract) {
                throw new Error("Nepodařilo se nalézt data zákazníka.");
            }

            const newReservation = await addReservation({
                customerId: finalCustomerId,
                vehicleId: selectedVehicleId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            });

            // Generate contract text
            const contractText = `
SMLOUVA O NÁJMU DOPRAVNÍHO PROSTŘEDKU
=========================================

Článek I. - Smluvní strany
-----------------------------------------
Pronajímatel:
Milan Gula
Ghegova 17, Brno, 60200
Web: Pujcimedodavky.cz
IČO: 07031653
(dále jen "pronajímatel")

Nájemce:
Jméno: ${customerForContract.firstName} ${customerForContract.lastName}
Email: ${customerForContract.email}
Telefon: ${customerForContract.phone}
Číslo ŘP: ${customerForContract.driverLicenseNumber}
(dále jen "nájemce")

Článek II. - Předmět nájmu
-----------------------------------------
Pronajímatel tímto přenechává nájemci do dočasného užívání následující motorové vozidlo:
Vozidlo: ${selectedVehicle?.name}
SPZ: ${selectedVehicle?.licensePlate}
Rok výroby: ${selectedVehicle?.year}

Článek III. - Doba nájmu a cena
-----------------------------------------
Doba nájmu: od ${new Date(startDate).toLocaleString('cs-CZ')} do ${new Date(endDate).toLocaleString('cs-CZ')}
Celková cena nájmu: ${totalPrice.toLocaleString('cs-CZ')} Kč

Článek IV. - Práva a povinnosti
-----------------------------------------
1. Nájemce potvrzuje, že vozidlo převzal v řádném technickém stavu, bez zjevných závad a s kompletní povinnou výbavou.
2. Nájemce je povinen užívat vozidlo s péčí řádného hospodáře a chránit ho před poškozením, ztrátou či zničením.
3. Nájemce není oprávněn přenechat vozidlo do užívání třetí osobě bez předchozího písemného souhlasu pronajímatele.

Článek V. - Spoluúčast a poškození vozidla
-----------------------------------------
V případě poškození vozidla zaviněného nájemcem se sjednává spoluúčast ve výši 5.000 Kč až 10.000 Kč dle rozsahu poškození. Tato spoluúčast bude hrazena nájemcem.

Článek VI. - Stav kilometrů a limit
-----------------------------------------
Počáteční stav kilometrů: ${(selectedVehicle?.currentMileage ?? 0).toLocaleString('cs-CZ')} km
Denní limit pro nájezd je 300 km. Za každý kilometr nad tento limit (vypočítaný jako 300 km * počet dní pronájmu) bude účtován poplatek 3 Kč/km.

Článek VII. - Závěrečná ustanovení
-----------------------------------------
Tato smlouva je vyhotovena elektronicky. Nájemce svým digitálním podpisem stvrzuje, že se seznámil s obsahem smlouvy, souhlasí s ním a vozidlo v uvedeném stavu přebírá.
            `;
            
            // Save contract to database
            await addContract({
                reservationId: newReservation.id,
                customerId: finalCustomerId,
                vehicleId: selectedVehicleId,
                generatedAt: new Date(),
                contractText: contractText
            });

            // Generate and open mailto link with BCC
            const bccEmail = "smlouvydodavky@gmail.com";
            const mailtoBody = encodeURIComponent(contractText);
            const mailtoLink = `mailto:${customerForContract.email}?bcc=${bccEmail}&subject=${encodeURIComponent(`Smlouva o pronájmu vozidla ${selectedVehicle?.name}`)}&body=${mailtoBody}`;
            
            window.location.href = mailtoLink;

            alert("Rezervace byla úspěšně vytvořena a smlouva uložena! Nyní budete přesměrováni do emailového klienta pro odeslání smlouvy.");
            
            // Reset form
            setSelectedCustomerId('');
            setIsNewCustomer(false);
            setNewCustomerData({ firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '' });
            setSelectedVehicleId('');
            setStartDate('');
            setEndDate('');
            signaturePadRef.current?.clear();

        } catch (error) {
            console.error("Failed to create reservation:", error);
            alert(`Chyba při vytváření rezervace: ${error instanceof Error ? error.message : "Neznámá chyba"}`);
        } finally {
            setLoading(false);
        }
    };
    
    if (loading && customers.length === 0) return <div>Načítání...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">Nová rezervace</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form Fields */}
                <div className="lg:col-span-2 space-y-6 bg-white p-6 rounded-lg shadow-md">
                    {/* Customer Section */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4"><UserPlus className="mr-2"/>1. Zákazník</h2>
                        <div className="flex items-center space-x-4">
                            <select
                                value={selectedCustomerId}
                                onChange={(e) => { setSelectedCustomerId(e.target.value); setIsNewCustomer(false); }}
                                className="w-full p-2 border rounded-md"
                                disabled={isNewCustomer}
                            >
                                <option value="">Vyberte stávajícího zákazníka</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>)}
                            </select>
                            <span className="text-gray-500">nebo</span>
                             <button type="button" onClick={() => { setIsNewCustomer(!isNewCustomer); setSelectedCustomerId(''); }} className={`py-2 px-4 rounded-md font-semibold whitespace-nowrap ${isNewCustomer ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                                Nový zákazník
                            </button>
                        </div>
                        {isNewCustomer && (
                            <div className="mt-4 space-y-2 p-4 border-t">
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="Jméno" value={newCustomerData.firstName} onChange={e => setNewCustomerData({...newCustomerData, firstName: e.target.value})} className="w-full p-2 border rounded" required />
                                    <input type="text" placeholder="Příjmení" value={newCustomerData.lastName} onChange={e => setNewCustomerData({...newCustomerData, lastName: e.target.value})} className="w-full p-2 border rounded" required />
                                </div>
                                <input type="email" placeholder="Email" value={newCustomerData.email} onChange={e => setNewCustomerData({...newCustomerData, email: e.target.value})} className="w-full p-2 border rounded" required />
                                <input type="text" placeholder="Adresa" value={newCustomerData.address} onChange={e => setNewCustomerData({...newCustomerData, address: e.target.value})} className="w-full p-2 border rounded" required />
                                <div className="grid grid-cols-2 gap-4">
                                     <input type="tel" placeholder="Telefon" value={newCustomerData.phone} onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})} className="w-full p-2 border rounded" required />
                                    <input type="text" placeholder="Číslo ŘP" value={newCustomerData.driverLicenseNumber} onChange={e => setNewCustomerData({...newCustomerData, driverLicenseNumber: e.target.value})} className="w-full p-2 border rounded" required />
                                </div>
                            </div>
                        )}
                    </section>
                    
                    {/* Date & Time Section */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4"><CalendarIcon className="mr-2"/>2. Doba pronájmu</h2>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="block text-sm font-medium">Od (datum a čas)</label>
                                <input type="datetime-local" value={startDate} onChange={e => { setSelectedVehicleId(''); setStartDate(e.target.value); }} className="w-full p-2 border rounded" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Do (datum a čas)</label>
                                <input type="datetime-local" value={endDate} onChange={e => { setSelectedVehicleId(''); setEndDate(e.target.value); }} className="w-full p-2 border rounded" required />
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
                                    <div key={v.id} onClick={() => setSelectedVehicleId(v.id)} className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${selectedVehicleId === v.id ? 'border-primary shadow-lg scale-105' : 'border-gray-200 hover:border-blue-300'}`}>
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

                    {/* Signature Section */}
                    <section>
                         <h2 className="text-xl font-semibold text-gray-700 flex items-center mb-4"><Signature className="mr-2"/>4. Podpis zákazníka</h2>
                         <SignaturePad ref={signaturePadRef} />
                    </section>

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
                         <button type="submit" className="w-full mt-6 bg-secondary text-dark-text font-bold py-3 rounded-lg hover:bg-secondary-hover transition-colors text-lg" disabled={loading}>
                            {loading ? 'Zpracovávám...' : 'Vytvořit rezervaci a smlouvu'}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default Reservations;