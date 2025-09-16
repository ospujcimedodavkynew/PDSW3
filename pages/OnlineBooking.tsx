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

    // Robust local datetime parsing to fix mobile browser inconsistencies.
    const parseLocalDateTime = (dtStr: string): Date | null => {
        if (!dtStr) return null;
        // The input format is "YYYY-MM-DDTHH:mm"
        const parts = dtStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        if (!parts) return null;
        const [, year, month, day, hours, minutes] = parts.map(Number);
        // new Date(year, monthIndex, day, hours, minutes) constructs a date in the local timezone.
        return new Date(year, month - 1, day, hours, minutes);
    };

    const availableVehicles = useMemo(() => {
        if (!startDate || !endDate) return [];
        
        const start = parseLocalDateTime(startDate);
        const end = parseLocalDateTime(endDate);
        
        if (!start || !end || end <= start) return [];

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

    const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);

    const totalPrice = useMemo(() => {
        if (!selectedVehicle || !startDate || !endDate) return 0;
        const start = parseLocalDateTime(startDate);
        const end = parseLocalDateTime(endDate);
        if (!start || !end || end <= start) return 0;

        const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
        
        if (durationHours <= 4) return selectedVehicle.rate4h;
        if (durationHours <= 12) return selectedVehicle.rate12h;
        const days = Math.ceil(durationHours / 24);
        return days * selectedVehicle.dailyRate;
    }, [selectedVehicle, startDate, endDate]);

    const handleSetDuration = (duration: number, unit: 'hours' | 'days') => {
        if (!startDate) {
            alert("Nejprve prosím vyberte počáteční datum a čas.");
            return;
        }
        const start = parseLocalDateTime(startDate);
        if (!start) return; // Should not happen if startDate is valid
        
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
        setSelectedVehicleId(''); // Reset vehicle selection as availability might change
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
        
        const start = parseLocalDateTime(startDate);
        const end = parseLocalDateTime(endDate);

        if (!start || !end) {
            setError("Neplatný formát data.");
            return;
        }

        setIsProcessing(true);
        try {
            await actions.createOnlineReservation(
                selectedVehicleId,
                start,
                end,
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
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary">Online rezervace</h1>
                    <p className="text-gray-600 mt-2">Zarezervujte si dodávku snadno a rychle.</p>
                </header>

                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl p-8 space-y-8">
                    
                    <section>
                        <h2 className="text-2xl font-semibold text-gray-800 border-b pb-3 mb-4">1. Zvolte termín</h2>
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
                            <select onChange={(e) => { if(e.target.value) handleSetDuration(Number(e.target.value), 'days'); }} className="bg-gray-200 rounded-full text-sm px-3 py-1 hover:bg-gray-300 appearance-none cursor-pointer">
                                <option value="">Další dny...</option>
                                {Array.from({ length: 29 }, (_, i) => i + 2).map(day => (
                                    <option key={day} value={day}>{day} dny</option>
                                ))}
                            </select>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-gray-800 border-b pb-3 mb-4">2. Vyberte vozidlo</h2>
                        {!startDate || !endDate ? (
                            <div className="text-center p-6 bg-gray-50 rounded-md border">
                                <p className="text-gray-600 font-medium">Nejprve prosím vyberte dobu pronájmu pro zobrazení dostupných vozidel.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {availableVehicles.length > 0 ? availableVehicles.map(v => (
                                    <div key={v.id} onClick={() => setSelectedVehicleId(v.id)} className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${selectedVehicleId === v.id ? 'border-primary shadow-lg scale-105' : 'border-gray-200 hover:border-blue-300'}`}>
                                        <img src={v.imageUrl || 'https://via.placeholder.com/300x200.png?text=Vuz+bez+foto'} alt={v.name} className="w-full h-32 object-cover rounded-md mb-2"/>
                                        <h3 className="font-semibold">{v.name}</h3>
                                        <p className="text-sm text-gray-700">{v.description}</p>
                                        <p className="text-xs text-gray-500 mt-2">{v.rate4h} Kč/4h | {v.rate12h} Kč/12h</p>
                                        <p className="text-lg text-gray-800 font-bold">{v.dailyRate} Kč/den</p>
                                    </div>
                                )) : (
                                    <div className="col-span-full text-center p-6 bg-yellow-50 rounded-md border border-yellow-200">
                                        <p className="text-yellow-800 font-medium">Pro zadaný termín nejsou dostupná žádná vozidla.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {selectedVehicleId && (
                        <section>
                            <h2 className="text-2xl font-semibold text-gray-800 border-b pb-3 mb-4">3. Vaše údaje</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="Jméno" value={customerData.firstName} onChange={e => setCustomerData({...customerData, firstName: e.target.value})} className="w-full p-3 border rounded-md" required />
                                <input type="text" placeholder="Příjmení" value={customerData.lastName} onChange={e => setCustomerData({...customerData, lastName: e.target.value})} className="w-full p-3 border rounded-md" required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <input type="email" placeholder="Email" value={customerData.email} onChange={e => setCustomerData({...customerData, email: e.target.value})} className="w-full p-3 border rounded-md" required />
                                <input type="tel" placeholder="Telefon" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="w-full p-3 border rounded-md" required />
                            </div>
                            <input type="text" placeholder="Adresa (Ulice, ČP, Město, PSČ)" value={customerData.address} onChange={e => setCustomerData({...customerData, address: e.target.value})} className="w-full p-3 border rounded-md mt-4" required />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <input type="text" placeholder="Číslo řidičského průkazu" value={customerData.driverLicenseNumber} onChange={e => setCustomerData({...customerData, driverLicenseNumber: e.target.value})} className="w-full p-3 border rounded-md" required />
                                <input type="text" placeholder="IČO (volitelné)" value={customerData.ico || ''} onChange={e => setCustomerData({...customerData, ico: e.target.value})} className="w-full p-3 border rounded-md" />
                            </div>
                        </section>
                    )}
                    
                    <section className="border-t pt-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center">
                            <div className="mb-4 sm:mb-0">
                                <p className="text-xl font-bold">Celková cena:</p>
                                <p className="text-3xl font-extrabold text-primary">{totalPrice.toLocaleString('cs-CZ')} Kč</p>
                            </div>
                            <button type="submit" className="w-full sm:w-auto bg-secondary text-dark-text font-bold py-3 px-8 rounded-lg hover:bg-secondary-hover transition-colors text-lg" disabled={isProcessing || !selectedVehicleId}>
                                {isProcessing ? 'Odesílám...' : 'Odeslat rezervaci'}
                            </button>
                        </div>
                         {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
                    </section>

                </form>
            </div>
        </div>
    );
};

export default OnlineBooking;