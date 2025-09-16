import React, { useState, useMemo, FormEvent } from 'react';
import { useData } from '../contexts/DataContext';
import { Customer } from '../types';
import { CheckCircle, Loader } from 'lucide-react';

const OnlineBooking: React.FC = () => {
    const { data, actions, loading: dataLoading } = useData();
    const { vehicles, reservations } = data;

    // Form states
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [customerData, setCustomerData] = useState<Omit<Customer, 'id'>>({
        firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '', ico: ''
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string>('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    // --- ROBUST DATE HANDLING & VALIDATION ---
    const isDateValid = useMemo(() => {
        if (!startDate || !endDate) return false;
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Check if dates are valid and end is after start
        return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start;
    }, [startDate, endDate]);
    
    const availableVehicles = useMemo(() => {
        if (!isDateValid) return [];
        const start = new Date(startDate);
        const end = new Date(endDate);

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
    }, [vehicles, reservations, startDate, endDate, isDateValid]);

    const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);

    const totalPrice = useMemo(() => {
        if (!selectedVehicle || !isDateValid) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);

        const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
        
        if (durationHours <= 4) return selectedVehicle.rate4h;
        if (durationHours <= 12) return selectedVehicle.rate12h;
        const days = Math.ceil(durationHours / 24);
        return days * selectedVehicle.dailyRate;
    }, [selectedVehicle, startDate, endDate, isDateValid]);

    const handleSetDuration = (duration: number, unit: 'hours' | 'days') => {
        if (!startDate) {
            alert("Nejprve prosím vyberte počáteční datum a čas.");
            return;
        }
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
            alert("Zadané počáteční datum je neplatné. Zkuste ho prosím vybrat znovu.");
            return;
        }
        let end: Date;

        if (unit === 'hours') {
            end = new Date(start.getTime() + duration * 60 * 60 * 1000);
        } else { // days
            end = new Date(start.getTime() + duration * 24 * 60 * 60 * 1000);
        }
        
        const pad = (num: number) => num.toString().padStart(2, '0');
        const formattedEnd = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
        
        setEndDate(formattedEnd);
        setSelectedVehicleId('');
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (!selectedVehicleId) {
            setError('Prosím, vyberte vozidlo.');
            return;
        }
        if (!customerData.firstName || !customerData.lastName || !customerData.email || !customerData.address) {
            setError('Prosím, vyplňte všechny vaše údaje.');
            return;
        }
        if (!availableVehicles.some(v => v.id === selectedVehicleId)) {
            setError("Vybrané vozidlo není v tomto termínu dostupné. Zvolte prosím jiné vozidlo nebo termín.");
            return;
        }
        
        setIsProcessing(true);
        try {
            await actions.createOnlineReservation(
                selectedVehicleId,
                new Date(startDate),
                new Date(endDate),
                customerData
            );
            setIsSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Rezervaci se nepodařilo vytvořit.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    if (dataLoading) {
         return <div className="min-h-screen flex items-center justify-center bg-gray-100"><Loader className="w-8 h-8 animate-spin" /> Načítání...</div>;
    }
    
    if (isSubmitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 text-center p-4">
                 <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
                <h1 className="text-3xl font-bold text-green-800">Děkujeme za vaši rezervaci!</h1>
                <p className="mt-2 text-lg text-gray-700">Vaše rezervace byla úspěšně odeslána.</p>
                <p className="mt-1 text-gray-600">Brzy se vám ozveme s potvrzením a dalšími instrukcemi.</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary">Online rezervace</h1>
                    <p className="text-gray-600 mt-2">Zarezervujte si dodávku snadno a rychle.</p>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white rounded-lg shadow-xl p-8 space-y-8">
                            <section>
                                <h2 className="text-2xl font-semibold text-gray-800 border-b pb-3 mb-4 flex items-center"><span className="bg-primary text-white rounded-full w-8 h-8 text-lg flex items-center justify-center mr-3">1</span> Zvolte termín</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium">Od (datum a čas)</label>
                                        <input type="datetime-local" value={startDate} onChange={e => { setSelectedVehicleId(''); setStartDate(e.target.value); }} className="w-full p-2 border rounded-md" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium">Do (datum a čas)</label>
                                        <input type="datetime-local" value={endDate} onChange={e => { setSelectedVehicleId(''); setEndDate(e.target.value); }} className="w-full p-2 border rounded-md" required />
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700 mr-2">Rychlá volba délky:</span>
                                    <button type="button" onClick={() => handleSetDuration(4, 'hours')} className="px-3 py-1 text-sm bg-gray-200 rounded-full hover:bg-gray-300">4 hodiny</button>
                                    <button type="button" onClick={() => handleSetDuration(12, 'hours')} className="px-3 py-1 text-sm bg-gray-200 rounded-full hover:bg-gray-300">12 hodin</button>
                                    <button type="button" onClick={() => handleSetDuration(1, 'days')} className="px-3 py-1 text-sm bg-gray-200 rounded-full hover:bg-gray-300">1 den</button>
                                </div>
                            </section>

                            <section className={`transition-opacity duration-500 ${!isDateValid ? 'opacity-40 pointer-events-none' : ''}`}>
                                <h2 className="text-2xl font-semibold text-gray-800 border-b pb-3 mb-4 flex items-center"><span className="bg-primary text-white rounded-full w-8 h-8 text-lg flex items-center justify-center mr-3">2</span> Vyberte vozidlo</h2>
                                {!isDateValid ? (
                                    <div className="text-center p-6 bg-gray-50 rounded-md border">
                                        <p className="text-gray-600 font-medium">Nejprve prosím zvolte platný termín pronájmu.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {availableVehicles.length > 0 ? availableVehicles.map(v => (
                                            <div key={v.id} onClick={() => setSelectedVehicleId(v.id)} className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${selectedVehicleId === v.id ? 'border-primary shadow-lg scale-105' : 'border-gray-200 hover:border-blue-300'}`}>
                                                <img src={v.imageUrl || 'https://via.placeholder.com/300x200.png?text=Vuz+bez+foto'} alt={v.name} className="w-full h-32 object-cover rounded-md mb-2"/>
                                                <h3 className="font-semibold">{v.name}</h3>
                                                <p className="text-xs text-gray-500 mt-2">{v.rate4h} Kč/4h | {v.rate12h} Kč/12h</p>
                                                <p className="text-lg text-gray-800 font-bold">{v.dailyRate} Kč/den</p>
                                            </div>
                                        )) : (
                                            <div className="col-span-full text-center p-6 bg-yellow-50 rounded-md border border-yellow-200">
                                                <p className="text-yellow-800 font-medium">Pro zadaný termín bohužel nejsou dostupná žádná vozidla.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>

                            <section className={`transition-opacity duration-500 ${!selectedVehicleId ? 'opacity-40 pointer-events-none h-0 overflow-hidden' : 'h-auto'}`}>
                                <h2 className="text-2xl font-semibold text-gray-800 border-b pb-3 mb-4 flex items-center"><span className="bg-primary text-white rounded-full w-8 h-8 text-lg flex items-center justify-center mr-3">3</span> Vaše údaje</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" placeholder="Jméno" value={customerData.firstName} onChange={e => setCustomerData({...customerData, firstName: e.target.value})} className="w-full p-3 border rounded-md" required={!!selectedVehicleId} />
                                    <input type="text" placeholder="Příjmení" value={customerData.lastName} onChange={e => setCustomerData({...customerData, lastName: e.target.value})} className="w-full p-3 border rounded-md" required={!!selectedVehicleId} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <input type="email" placeholder="Email" value={customerData.email} onChange={e => setCustomerData({...customerData, email: e.target.value})} className="w-full p-3 border rounded-md" required={!!selectedVehicleId} />
                                    <input type="tel" placeholder="Telefon" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="w-full p-3 border rounded-md" required={!!selectedVehicleId} />
                                </div>
                                <input type="text" placeholder="Adresa (Ulice, ČP, Město, PSČ)" value={customerData.address} onChange={e => setCustomerData({...customerData, address: e.target.value})} className="w-full p-3 border rounded-md mt-4" required={!!selectedVehicleId} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <input type="text" placeholder="Číslo řidičského průkazu" value={customerData.driverLicenseNumber} onChange={e => setCustomerData({...customerData, driverLicenseNumber: e.target.value})} className="w-full p-3 border rounded-md" required={!!selectedVehicleId} />
                                    <input type="text" placeholder="IČO (volitelné)" value={customerData.ico || ''} onChange={e => setCustomerData({...customerData, ico: e.target.value})} className="w-full p-3 border rounded-md" />
                                </div>
                            </section>
                        </div>
                        <div className="lg:col-span-1">
                             <div className="bg-white p-6 rounded-lg shadow-xl sticky top-8">
                                <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">Souhrn rezervace</h2>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-gray-500">Vozidlo:</h3>
                                        {selectedVehicle ? (
                                            <div className="flex items-center mt-1">
                                                <img src={selectedVehicle.imageUrl || 'https://via.placeholder.com/300x200.png?text=Vuz+bez+foto'} alt={selectedVehicle.name} className="w-20 h-16 object-cover rounded mr-3"/>
                                                <div>
                                                    <p className="text-gray-800 font-bold">{selectedVehicle.name}</p>
                                                    <p className="text-sm text-gray-500">{selectedVehicle.licensePlate}</p>
                                                </div>
                                            </div>
                                        ) : <p className="text-gray-700 italic">Nevybráno</p>}
                                    </div>
                                     <div>
                                        <h3 className="font-semibold text-gray-500">Období:</h3>
                                        {isDateValid ? (
                                            <>
                                                <p className="text-gray-700"><strong>Od:</strong> {new Date(startDate).toLocaleString('cs-CZ')}</p>
                                                <p className="text-gray-700"><strong>Do:</strong> {new Date(endDate).toLocaleString('cs-CZ')}</p>
                                            </>
                                        ) : <p className="text-gray-700 italic">Nezvoleno</p>}
                                    </div>
                                    <div className="border-t pt-4">
                                        <p className="flex justify-between items-baseline text-xl font-bold">
                                            <span>Celkem:</span>
                                            <span className="text-3xl text-primary">{totalPrice.toLocaleString('cs-CZ')} Kč</span>
                                        </p>
                                    </div>
                                </div>
                                <button type="submit" className="w-full mt-6 bg-secondary text-dark-text font-bold py-3 rounded-lg hover:bg-secondary-hover transition-colors text-lg disabled:bg-gray-300 disabled:cursor-not-allowed" disabled={isProcessing || !selectedVehicleId}>
                                    {isProcessing ? 'Odesílám...' : 'Odeslat rezervaci'}
                                </button>
                                {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OnlineBooking;
