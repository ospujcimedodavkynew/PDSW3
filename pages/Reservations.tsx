import React, { useState, useMemo } from 'react';
import type { Reservation, Vehicle, Customer } from '../types';
import { UserPlus, Car, Calendar as CalendarIcon, Signature, Edit } from 'lucide-react';
import SignatureModal from '../components/SignatureModal';
import { useData } from '../contexts/DataContext';

const Reservations: React.FC = () => {
    const { data, loading, actions } = useData();
    const { vehicles, customers, reservations } = data;
    
    // Form states
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState<Omit<Customer, 'id'>>({ firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '' });
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
    
    // Memoized calculations for performance
    const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);
    const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);
    
    const availableVehicles = useMemo(() => {
        if (!startDate || !endDate) return [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) return [];
        
        const conflictingVehicleIds = new Set<string>();
        for (const r of reservations) {
            if (r.status === 'scheduled' || r.status === 'active') {
                const resStart = new Date(r.startDate);
                const resEnd = new Date(r.endDate);
                if (start < resEnd && end > resStart) {
                    conflictingVehicleIds.add(r.vehicleId);
                }
            }
        }
        return vehicles.filter(v => v.status !== 'maintenance' && !conflictingVehicleIds.has(v.id));
    }, [vehicles, reservations, startDate, endDate]);


    const totalPrice = useMemo(() => {
        if (!selectedVehicle || !startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) return 0;

        const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
        
        if (durationHours <= 4) return selectedVehicle.rate4h;
        if (durationHours <= 12) return selectedVehicle.rate12h;
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
        // FIX: Reset vehicle selection as availability may have changed, preventing crash
        setSelectedVehicleId('');
    };

    const handleSaveSignature = (dataUrl: string) => {
        setSignatureDataUrl(dataUrl);
        setIsSignatureModalOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!isNewCustomer && !selectedCustomerId) { alert("Vyberte prosím zákazníka."); return; }
        if (isNewCustomer && (!newCustomerData.firstName || !newCustomerData.lastName || !newCustomerData.email || !newCustomerData.address)) { alert("Vyplňte prosím údaje o novém zákazníkovi."); return; }
        if (!selectedVehicleId) { alert("Vyberte prosím vozidlo."); return; }
        if (!startDate || !endDate) { alert("Vyberte prosím období pronájmu."); return; }
        if (new Date(endDate) <= new Date(startDate)) { alert("Datum konce musí být po datu začátku."); return; }
        if (!signatureDataUrl) { alert("Zákazník se musí podepsat."); return; }
        if (!availableVehicles.some(v => v.id === selectedVehicleId)) {
            alert("Vybrané vozidlo není v tomto termínu dostupné. Zvolte prosím jiné vozidlo nebo termín.");
            return;
        }

        setIsProcessing(true);
        try {
            let finalCustomerId = selectedCustomerId;
            let customerForContract: Customer | undefined;

            if (isNewCustomer) {
                const newCustomer = await actions.addCustomer(newCustomerData);
                finalCustomerId = newCustomer.id;
                customerForContract = newCustomer;
            } else {
                 customerForContract = customers.find(c => c.id === finalCustomerId);
            }

            if (!customerForContract) throw new Error("Nepodařilo se nalézt data zákazníka.");
            
            const newReservation = await actions.addReservation({
                customerId: finalCustomerId,
                vehicleId: selectedVehicleId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            });
            const contractVehicle = vehicles.find(v => v.id === selectedVehicleId);
            if (!contractVehicle) throw new Error("Vozidlo nebylo nalezeno.");

            // Generate professional contract text
            const contractText = `
SMLOUVA O NÁJMU DOPRAVNÍHO PROSTŘEDKU
=========================================

Článek I. - Smluvní strany
-----------------------------------------
Pronajímatel:
Milan Gula
Ghegova 117, Brno Nové Sady, 60200
Web: pujcimedodavky.cz
IČO: 07031653
(dále jen "pronajímatel")

Nájemce:
Jméno: ${customerForContract.firstName} ${customerForContract.lastName}
Adresa: ${customerForContract.address}
Email: ${customerForContract.email}
Telefon: ${customerForContract.phone}
Číslo ŘP: ${customerForContract.driverLicenseNumber}
(dále jen "nájemce")

Článek II. - Předmět a účel nájmu
-----------------------------------------
1. Pronajímatel tímto přenechává nájemci do dočasného užívání (nájmu) následující motorové vozidlo (dále jen "předmět nájmu" nebo "vozidlo"):
   Vozidlo: ${contractVehicle.name} (${contractVehicle.make} ${contractVehicle.model})
   SPZ: ${contractVehicle.licensePlate}
   Rok výroby: ${contractVehicle.year}
2. Nájemce se zavazuje užívat vozidlo k obvyklému účelu a v souladu s platnými právními předpisy.

Článek III. - Doba nájmu a cena
-----------------------------------------
1. Doba nájmu je sjednána od: ${new Date(startDate).toLocaleString('cs-CZ')} do: ${new Date(endDate).toLocaleString('cs-CZ')}.
2. Celková cena nájmu činí: ${totalPrice.toLocaleString('cs-CZ')} Kč. Cena je splatná při převzetí vozidla, není-li dohodnuto jinak.
3. Nájemce bere na vědomí, že denní limit pro nájezd je 300 km. Za každý kilometr nad tento limit (vypočtený jako 300 km * počet dní pronájmu) bude účtován poplatek 3 Kč/km.
   Počáteční stav kilometrů: ${(contractVehicle.currentMileage ?? 0).toLocaleString('cs-CZ')} km.

Článek IV. - Práva a povinnosti stran
-----------------------------------------
1. Nájemce svým podpisem potvrzuje, že vozidlo převzal v řádném technickém stavu, bez zjevných závad, s kompletní povinnou výbavou a s plnou nádrží pohonných hmot.
2. Nájemce je povinen užívat vozidlo s péčí řádného hospodáře, chránit ho před poškozením, ztrátou či zničením a dodržovat pokyny výrobce pro jeho provoz.
3. V celém vozidle je PŘÍSNĚ ZAKÁZÁNO KOUŘIT. V případě porušení tohoto zákazu je nájemce povinen uhradit smluvní pokutu ve výši 500 Kč.
4. Nájemce je povinen vrátit vozidlo s plnou nádrží pohonných hmot. V případě vrácení vozidla s neúplnou nádrží je nájemce povinen uhradit náklady na dotankování a smluvní pokutu ve výši 500 Kč.
5. Nájemce není oprávněn provádět na vozidle jakékoliv úpravy, přenechat ho do podnájmu třetí osobě, ani ho použít k účasti na závodech, k trestné činnosti či k přepravě nebezpečných nákladů.

Článek V. - Odpovědnost za škodu a spoluúčast
-----------------------------------------
1. V případě poškození předmětu nájmu zaviněného nájemcem, nebo v případě odcizení, se sjednává spoluúčast nájemce na vzniklé škodě.
2. Výše spoluúčasti činí 5.000 Kč při poškození pronajatého vozidla.
3. V případě dopravní nehody, při které dojde k poškození jiných vozidel nebo majetku třetích stran, činí spoluúčast 10.000 Kč.
4. Nájemce je povinen každou dopravní nehodu, poškození vozidla nebo jeho odcizení neprodleně ohlásit pronajímateli a Policii ČR.

Článek VI. - Závěrečná ustanovení
-----------------------------------------
1. Tato smlouva nabývá platnosti a účinnosti dnem jejího podpisu oběma smluvními stranami.
2. Smluvní strany prohlašují, že si smlouvu přečetly, s jejím obsahem souhlasí a na důkaz toho připojují své podpisy.
3. Tato smlouva je vyhotovena elektronicky. Nájemce svým digitálním podpisem stvrzuje, že se seznámil s obsahem smlouvy, souhlasí s ním a vozidlo v uvedeném stavu přebírá.

Digitální podpis nájemce:
(viz přiložený obrazový soubor)
            `;
            
            await actions.addContract({
                reservationId: newReservation.id,
                customerId: finalCustomerId,
                vehicleId: selectedVehicleId,
                generatedAt: new Date(),
                contractText,
            });

            const bccEmail = "smlouvydodavky@gmail.com";
            const mailtoBody = encodeURIComponent(contractText);
            const mailtoLink = `mailto:${customerForContract.email}?bcc=${bccEmail}&subject=${encodeURIComponent(`Smlouva o pronájmu vozidla ${contractVehicle.name}`)}&body=${mailtoBody}`;
            
            window.location.href = mailtoLink;

            alert("Rezervace byla úspěšně vytvořena a smlouva uložena! Nyní budete přesměrováni do emailového klienta pro odeslání smlouvy.");
            
            // Reset form
            setSelectedCustomerId('');
            setIsNewCustomer(false);
            setNewCustomerData({ firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '' });
            setSelectedVehicleId('');
            setStartDate('');
            setEndDate('');
            setSignatureDataUrl('');

        } catch (error) {
            console.error("Failed to create reservation:", error);
            alert(`Chyba při vytváření rezervace: ${error instanceof Error ? error.message : "Neznámá chyba"}`);
        } finally {
            setIsProcessing(false);
        }
    };
    
    if (loading && customers.length === 0) return <div>Načítání...</div>;

    return (
        <>
        <SignatureModal 
            isOpen={isSignatureModalOpen}
            onClose={() => setIsSignatureModalOpen(false)}
            onSave={handleSaveSignature}
        />
        <form onSubmit={handleSubmit} className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">Nová rezervace</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                            {isProcessing ? 'Zpracovávám...' : 'Vytvořit rezervaci a smlouvu'}
                        </button>
                    </div>
                </div>
            </div>
        </form>
        </>
    );
};

export default Reservations;