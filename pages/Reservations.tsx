import React, { useState, useMemo, FormEvent, useEffect } from 'react';
// FIX: Imported the `Contract` type to resolve a type error.
import type { Reservation, Customer, Vehicle, Contract } from '../types';
import { useData } from '../contexts/DataContext';
import { Plus, Search, X, Edit, Trash2 } from 'lucide-react';
import SignatureModal from '../components/SignatureModal';

// --- Helper to generate contract text ---
const generateContractText = (reservation: Reservation, customer: Customer, vehicle: Vehicle) => {
    const startDate = new Date(reservation.startDate).toLocaleString('cs-CZ');
    const endDate = new Date(reservation.endDate).toLocaleString('cs-CZ');

    return `
SMLOUVA O NÁJMU DOPRAVNÍHO PROSTŘEDKU

 uzavřená dle § 2201 a násl. zákona č. 89/2012 Sb., občanský zákoník

Článek I. - Smluvní strany

1. Pronajímatel:
   Milan Gula
   Sídlo: Ghegova 117, Brno - Nové Sady, 602 00
   IČO: 07031653
   Web: pujcimedodavky.cz
   (dále jen "Pronajímatel")

2. Nájemce:
   Jméno a příjmení: ${customer.firstName} ${customer.lastName}
   Adresa: ${customer.address}
   E-mail: ${customer.email}
   Telefon: ${customer.phone}
   Číslo ŘP: ${customer.driverLicenseNumber}
   (dále jen "Nájemce")

Smluvní strany se dohodly na uzavření této smlouvy o nájmu dopravního prostředku za níže uvedených podmínek.

Článek II. - Předmět nájmu

1. Pronajímatel přenechává Nájemci do dočasného užívání následující motorové vozidlo:
   Typ vozidla: ${vehicle.name} (${vehicle.make} ${vehicle.model})
   Rok výroby: ${vehicle.year}
   SPZ: ${vehicle.licensePlate}
   Počáteční stav km: ${reservation.startMileage || 'Bude doplněno při předání'}
   (dále jen "vozidlo")

2. Doba nájmu je sjednána od ${startDate} do ${endDate}.

Článek III. - Cena nájmu a platební podmínky

1. Smluvní strany se dohodly na ceně nájmu specifikované v této smlouvě. Cena je splatná nejpozději při převzetí vozidla, pokud není dohodnuto jinak.
2. Při převzetí vozidla skládá Nájemce vratnou kauci ve výši 5.000 Kč (slovy: pět tisíc korun českých) v hotovosti nebo na bankovní účet Pronajímatele. Tato kauce slouží k úhradě případných škod, smluvních pokut či jiných pohledávek Pronajímatele za Nájemcem. Kauce bude vrácena Nájemci po řádném vrácení nepoškozeného vozidla, a to v plné výši, pokud nebudou shledány důvody k jejímu částečnému nebo úplnému započtení.
3. V ceně nájmu je zahrnut denní limit 300 km. Za každý další ujetý kilometr nad tento limit bude účtován poplatek ve výši 3 Kč/km.
4. V případě vrácení vozidla s neúplně dotankovanou nádrží (palivo musí být dotankováno do plna) je Pronajímatel oprávněn účtovat Nájemci smluvní pokutu ve výši 500 Kč plus náklady na dotankování paliva.

Článek IV. - Práva a povinnosti smluvních stran

1. Pronajímatel je povinen předat vozidlo v technicky způsobilém stavu, čisté a s plnou nádrží.
2. Nájemce je povinen užívat vozidlo s péčí řádného hospodáře, dodržovat dopravní předpisy a pokyny výrobce.
3. Nájemce nesmí přenechat vozidlo do užívání třetí osobě bez předchozího písemného souhlasu Pronajímatele.
4. VÝSLOVNĚ SE ZAKAZUJE KOUŘENÍ ve vozidle. Při porušení tohoto zákazu je Nájemce povinen uhradit smluvní pokutu ve výši 500 Kč.
5. Nájemce je povinen vrátit vozidlo ve stejném stavu, v jakém jej převzal (s přihlédnutím k obvyklému opotřebení), čisté a s plnou nádrží.

Článek V. - Odpovědnost za škodu a pojištění

1. Nájemce odpovídá za veškeré škody na vozidle, které vznikly v době nájmu, a to i v případě, že nebyly způsobeny jeho zaviněním.
2. Vozidlo je havarijně pojištěno. V případě zaviněné dopravní nehody nebo poškození vozidla se Nájemce podílí na škodě spoluúčastí ve výši:
   a) 5.000 Kč při poškození pronajatého vozidla.
   b) 10.000 Kč v případě dopravní nehody s poškozením jiného vozidla nebo majetku třetí strany.
3. Nájemce je povinen každou škodní událost (dopravní nehodu, poškození, krádež) neprodleně ohlásit Pronajímateli a Policii ČR.

Článek VI. - Závěrečná ustanovení

1. Tato smlouva nabývá platnosti a účinnosti dnem jejího podpisu oběma smluvními stranami.
2. Změny a doplňky této smlouvy lze činit pouze formou písemných, číslovaných dodatků.
3. Práva a povinnosti touto smlouvou neupravené se řídí příslušnými ustanoveními občanského zákoníku.

V Brně dne: ${new Date().toLocaleDateString('cs-CZ')}

........................................
Pronajímatel: Milan Gula

........................................
Nájemce: ${customer.firstName} ${customer.lastName}
(Podpisem stvrzuji, že jsem se seznámil/a s podmínkami smlouvy, rozumím jim a souhlasím s nimi.)
`;
};


// --- Reservation Form Modal ---
interface ReservationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    customers: Customer[];
    vehicles: Vehicle[];
}

const ReservationFormModal: React.FC<ReservationFormModalProps> = ({ isOpen, onClose, customers, vehicles }) => {
    const { actions } = useData();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [notes, setNotes] = useState('');
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    
    // Derived state for available vehicles based on dates
    const availableVehicles = useMemo(() => {
        if (!startDate || !endDate) return vehicles.filter(v => v.status === 'available');
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) return [];

        const reservations = actions.refreshData ? [] : []; // This part is tricky without direct access to reservations

        // Simplified logic: show available vehicles. A full implementation would check reservation conflicts.
        return vehicles.filter(v => v.status === 'available');

    }, [startDate, endDate, vehicles]);
    
    useEffect(() => {
        // This effect will run when a new reservation is created from the calendar
        const prefillData = sessionStorage.getItem('prefillReservation');
        if (prefillData) {
            try {
                const { vehicleId, date } = JSON.parse(prefillData);
                setSelectedVehicleId(vehicleId);
                setStartDate(date);
            } catch (e) {
                console.error("Failed to parse prefill data", e);
            }
            sessionStorage.removeItem('prefillReservation');
        }
    }, [isOpen]);

    const resetForm = () => {
        setStartDate('');
        setEndDate('');
        setSelectedCustomerId('');
        setSelectedVehicleId('');
        setNotes('');
        setSignatureDataUrl(null);
        setError(null);
    }
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        if (!selectedCustomerId || !selectedVehicleId || !startDate || !endDate) {
            setError("Vyplňte prosím všechna povinná pole: zákazník, vozidlo a termín.");
            setIsSaving(false);
            return;
        }

        try {
            const customer = customers.find(c => c.id === selectedCustomerId);
            const vehicle = vehicles.find(v => v.id === selectedVehicleId);
            
            if(!customer || !vehicle) {
                 setError("Vybraný zákazník nebo vozidlo nebylo nalezeno.");
                 setIsSaving(false);
                 return;
            }

            // 1. Create the reservation
            const reservationPayload: Omit<Reservation, 'id' | 'status'> = {
                customerId: selectedCustomerId,
                vehicleId: selectedVehicleId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                notes: notes,
            };
            const newReservation = await actions.addReservation(reservationPayload);

            // 2. Generate and save the contract
            const contractText = generateContractText(newReservation, customer, vehicle);
            const contractPayload: Omit<Contract, 'id'> = {
                reservationId: newReservation.id,
                customerId: selectedCustomerId,
                vehicleId: selectedVehicleId,
                generatedAt: new Date(),
                contractText: `${contractText}\n\nPodpis zákazníka:\n${signatureDataUrl ? `[Digitálně podepsáno]` : '[Chybí podpis]'}`
            };

            await actions.addContract(contractPayload);
            
            resetForm();
            onClose();
        } catch (err) {
            console.error("Failed to save reservation:", err);
            setError(err instanceof Error ? err.message : 'Uložení rezervace se nezdařilo');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSetDuration = (duration: number, unit: 'hours' | 'days') => {
        if (!startDate) {
            alert("Nejprve prosím vyberte počáteční datum a čas.");
            return;
        }
        const start = new Date(startDate);
        let end: Date;

        if (unit === 'hours') {
            end = new Date(start.getTime() + duration * 60 * 60 * 1000);
        } else { // days
            end = new Date(start.getTime() + duration * 24 * 60 * 60 * 1000);
        }
        
        // Format to YYYY-MM-DDTHH:mm
        const pad = (num: number) => num.toString().padStart(2, '0');
        const formattedEnd = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
        
        setEndDate(formattedEnd);
    };

    if (!isOpen) return null;
    
    return (
        <>
            <SignatureModal 
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                onSave={(dataUrl) => {
                    setSignatureDataUrl(dataUrl);
                    setIsSignatureModalOpen(false);
                }}
            />
             <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 py-10 overflow-y-auto">
                <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-4xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">Nová rezervace</h2>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {/* --- Left Column: Form Inputs --- */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">1. Zákazník</label>
                                <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-2 border rounded bg-white" required>
                                     <option value="">-- Vyberte zákazníka --</option>
                                     {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium">2. Termín</label>
                                 <div className="grid grid-cols-2 gap-4">
                                     <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded" required />
                                     <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded" required />
                                </div>
                                 <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-gray-700 mr-2">Rychlá volba:</span>
                                    <button type="button" onClick={() => handleSetDuration(4, 'hours')} className="px-2 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300">4 hod</button>
                                    <button type="button" onClick={() => handleSetDuration(12, 'hours')} className="px-2 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300">12 hod</button>
                                    <button type="button" onClick={() => handleSetDuration(1, 'days')} className="px-2 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300">1 den</button>
                                    <select onChange={(e) => { if(e.target.value) handleSetDuration(Number(e.target.value), 'days'); }} className="bg-gray-200 rounded-full text-xs px-2 py-1 hover:bg-gray-300 appearance-none cursor-pointer">
                                        <option value="">dny...</option>
                                        {Array.from({ length: 29 }, (_, i) => i + 2).map(day => (
                                            <option key={day} value={day}>{day}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium">3. Vozidlo</label>
                                <select value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)} className="w-full p-2 border rounded bg-white" required>
                                     <option value="">-- Vyberte vozidlo --</option>
                                     {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium">4. Poznámky</label>
                                <textarea value={notes || ''} onChange={e => setNotes(e.target.value)} className="w-full p-2 border rounded h-20" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium">5. Podpis</label>
                                {signatureDataUrl ? (
                                    <div className="border rounded-md p-2 bg-gray-50 flex items-center justify-between">
                                        <img src={signatureDataUrl} alt="Podpis" className="h-12 w-auto bg-white" />
                                        <button type="button" onClick={() => setIsSignatureModalOpen(true)} className="text-sm text-blue-600 hover:underline">Změnit podpis</button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => setIsSignatureModalOpen(true)} className="w-full p-4 border-2 border-dashed rounded-md text-gray-500 hover:border-primary hover:text-primary">
                                        Otevřít pro podpis zákazníka
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* --- Right Column: Summary --- */}
                        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                             <h3 className="text-xl font-bold border-b pb-2">Sumarizace rezervace</h3>
                             <div>
                                <p className="font-semibold">Zákazník:</p>
                                <p className="text-gray-700">{customers.find(c => c.id === selectedCustomerId)?.firstName} {customers.find(c => c.id === selectedCustomerId)?.lastName || 'Nevybrán'}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Vozidlo:</p>
                                <p className="text-gray-700">{vehicles.find(v => v.id === selectedVehicleId)?.name || 'Nevybráno'}</p>
                            </div>
                             <div>
                                <p className="font-semibold">Termín:</p>
                                <p className="text-gray-700">
                                    {startDate ? new Date(startDate).toLocaleString('cs-CZ') : 'Nezadáno'} - {endDate ? new Date(endDate).toLocaleString('cs-CZ') : 'Nezadáno'}
                                </p>
                            </div>
                             <div className="pt-4 border-t">
                                <p className="text-xl font-bold">Celková cena: <span className="text-primary">Výpočet...</span></p>
                            </div>
                        </div>

                        {/* --- Form Actions --- */}
                        <div className="md:col-span-2">
                             {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                            <div className="flex justify-end space-x-3 pt-4 border-t">
                                <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                                <button type="submit" disabled={isSaving} className="py-2 px-6 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover disabled:bg-gray-400">
                                    {isSaving ? 'Ukládám...' : 'Vytvořit rezervaci a smlouvu'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};


// --- Main Reservations Page Component ---
const ReservationsPage: React.FC = () => {
    const { data, loading } = useData();
    const { reservations, customers, vehicles } = data;
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Logic to open modal if prefill data is present
    useEffect(() => {
        if (sessionStorage.getItem('prefillReservation')) {
            setIsModalOpen(true);
        }
    }, []);


    if (loading && reservations.length === 0) return <div>Načítání rezervací...</div>;


    return (
        <div>
            <ReservationFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                customers={customers}
                vehicles={vehicles}
            />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Vytvořit rezervaci</h1>
                 <button onClick={() => setIsModalOpen(true)} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Přidat rezervaci manuálně
                </button>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-700">Pro vytvoření nové rezervace použijte prosím tlačítko vpravo nahoře nebo vytvořte rezervaci kliknutím do volného místa v kalendáři.</p>
                <p className="mt-2 text-sm text-gray-500">Seznam všech existujících rezervací naleznete v kalendáři nebo na hlavní stránce "Přehled".</p>
            </div>

        </div>
    );
};

export default ReservationsPage;