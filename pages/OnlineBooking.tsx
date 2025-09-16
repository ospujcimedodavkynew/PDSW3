import React, { useState, useMemo, FormEvent, useEffect, useCallback } from 'react';
import { Customer, Vehicle } from '../types';
import { CheckCircle, Loader, AlertTriangle } from 'lucide-react';
import { getAvailableVehicles, createOnlineReservation } from '../services/api';

// Debounce helper
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function(...args: Parameters<T>) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
}


const OnlineBooking: React.FC = () => {
    const [step, setStep] = useState(1);
    const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [customerData, setCustomerData] = useState<Omit<Customer, 'id' | 'driverLicenseImageUrl'>>({
        firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '', ico: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vehiclesLoading, setVehiclesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAvailableVehicles = useCallback(async (start: string, end: string) => {
        // No more client-side new Date() parsing. We pass strings directly.
        // String comparison works for the YYYY-MM-DDTHH:MM format.
        if (!start || !end || end <= start) {
            setAvailableVehicles([]);
            return;
        }

        setVehiclesLoading(true);
        setError(null);
        try {
            // Pass the raw strings from the input directly to the API
            const vehicles = await getAvailableVehicles(start, end);
            setAvailableVehicles(vehicles);
        } catch (err) {
            console.error(err);
            setError('Nepodařilo se načíst dostupná vozidla. Zkuste to prosím znovu.');
            setAvailableVehicles([]);
        } finally {
            setVehiclesLoading(false);
        }
    }, []);

    const debouncedFetch = useMemo(() => debounce(fetchAvailableVehicles, 500), [fetchAvailableVehicles]);

    useEffect(() => {
        debouncedFetch(startDate, endDate);
    }, [startDate, endDate, debouncedFetch]);

    const handleSelectVehicle = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setStep(2);
        window.scrollTo(0, 0);
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
        
        const pad = (num: number) => num.toString().padStart(2, '0');
        const formattedEnd = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
        
        setEndDate(formattedEnd);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedVehicle || !startDate || !endDate) {
            setError('Nebylo vybráno vozidlo nebo platný termín.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await createOnlineReservation(
                selectedVehicle.id,
                new Date(startDate),
                new Date(endDate),
                customerData
            );
            setStep(3);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Odeslání rezervace se nezdařilo. Zkuste to prosím později.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const calculatedPrice = useMemo(() => {
        if (!startDate || !endDate || !selectedVehicle) return null;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const vehicle = selectedVehicle;

        if (!vehicle || end <= start) return null;

        const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);

        if (durationHours <= 4) return vehicle.rate4h;
        if (durationHours <= 12) return vehicle.rate12h;
        
        const durationDays = Math.ceil(durationHours / 24);
        return durationDays * vehicle.dailyRate;
    }, [startDate, endDate, selectedVehicle]);


    if (step === 3) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 text-center p-4">
                <CheckCircle className="w-20 h-20 text-green-600 mb-6" />
                <h1 className="text-4xl font-bold text-green-800">Rezervace odeslána!</h1>
                <p className="mt-4 text-xl text-gray-700">Děkujeme za Vaši rezervaci vozidla <span className="font-semibold">{selectedVehicle?.name}</span>.</p>
                <p className="mt-2 text-gray-600">Brzy se vám ozveme na e-mail <span className="font-semibold">{customerData.email}</span> s potvrzením a dalšími instrukcemi.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-primary">Online Rezervace</h1>
                    <p className="text-lg text-gray-600 mt-2">Zarezervujte si dodávku snadno a rychle.</p>
                </header>

                {/* --- STEP 1: DATE & VEHICLE SELECTION --- */}
                {step === 1 && (
                    <div className="space-y-8">
                        {/* Date Selection */}
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                             <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Vyberte termín</h2>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 <input type="datetime-local" aria-label="Od (datum a čas)" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 border rounded-md" required />
                                 <input type="datetime-local" aria-label="Do (datum a čas)" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 border rounded-md" required />
                            </div>
                             <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="text-sm text-gray-700 mr-2">Rychlá volba délky:</span>
                                <button type="button" onClick={() => handleSetDuration(4, 'hours')} className="px-3 py-1 text-sm bg-gray-200 rounded-full hover:bg-gray-300">4 hodiny</button>
                                <button type="button" onClick={() => handleSetDuration(12, 'hours')} className="px-3 py-1 text-sm bg-gray-200 rounded-full hover:bg-gray-300">12 hodin</button>
                                <button type="button" onClick={() => handleSetDuration(1, 'days')} className="px-3 py-1 text-sm bg-gray-200 rounded-full hover:bg-gray-300">1 den</button>
                                <select onChange={(e) => { if(e.target.value) handleSetDuration(Number(e.target.value), 'days'); }} className="bg-gray-200 rounded-full text-sm px-3 py-1 hover:bg-gray-300 appearance-none cursor-pointer">
                                    <option value="">další dny...</option>
                                    {Array.from({ length: 29 }, (_, i) => i + 2).map(day => (
                                        <option key={day} value={day}>{day} dnů</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Vehicle Selection */}
                        <div>
                             <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Vyberte vozidlo</h2>
                            {vehiclesLoading && (
                                <div className="flex items-center justify-center p-10 bg-white rounded-xl shadow-lg">
                                    <Loader className="w-8 h-8 animate-spin text-primary" />
                                    <span className="ml-4 text-lg text-gray-700">Hledám dostupná vozidla...</span>
                                </div>
                            )}
                             {!vehiclesLoading && startDate && endDate && endDate > startDate && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {availableVehicles.map(vehicle => (
                                        <div key={vehicle.id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col transition-transform hover:scale-105">
                                            <img src={vehicle.imageUrl || 'https://via.placeholder.com/400x250.png?text=Vuz+bez+foto'} alt={vehicle.name} className="w-full h-56 object-cover"/>
                                            <div className="p-6 flex-grow flex flex-col">
                                                <h3 className="text-2xl font-bold text-gray-800">{vehicle.name}</h3>
                                                <p className="text-gray-600 mt-1">{vehicle.make} {vehicle.model} &bull; {vehicle.year}</p>
                                                <p className="mt-4 text-gray-700 flex-grow">{vehicle.description || 'Prostorná a spolehlivá dodávka pro vaše potřeby.'}</p>
                                                {vehicle.dimensions && <p className="text-sm text-gray-500 mt-2"><strong>Rozměry:</strong> {vehicle.dimensions}</p>}
                                                <div className="mt-4 pt-4 border-t text-center">
                                                    <p className="text-xl font-bold text-primary">{vehicle.dailyRate} Kč / den</p>
                                                </div>
                                                <button onClick={() => handleSelectVehicle(vehicle)} className="w-full mt-4 bg-secondary text-dark-text font-bold py-3 px-4 rounded-lg hover:bg-secondary-hover transition-colors text-lg">
                                                    Vybrat a rezervovat
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {availableVehicles.length === 0 && <p className="md:col-span-2 lg:col-span-3 text-center text-gray-600 bg-yellow-100 p-6 rounded-xl shadow-md">V tomto termínu bohužel nejsou žádná vozidla k dispozici.</p>}
                                </div>
                             )}
                              {error && <p className="text-red-600 bg-red-100 p-4 rounded-xl shadow-md text-center flex items-center justify-center"><AlertTriangle className="w-5 h-5 mr-2"/>{error}</p>}
                        </div>
                    </div>
                )}
                
                 {/* --- STEP 2: CUSTOMER FORM --- */}
                {step === 2 && selectedVehicle && (
                    <div className="bg-white p-8 rounded-xl shadow-lg">
                        <button onClick={() => setStep(1)} className="text-primary hover:underline mb-6">&larr; Zpět na výběr termínu a vozidel</button>
                        <h2 className="text-3xl font-bold text-gray-800">Dokončení rezervace: <span className="text-primary">{selectedVehicle.name}</span></h2>
                        
                        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-4">
                               <h3 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">Vaše údaje</h3>
                               <input type="text" placeholder="Jméno" value={customerData.firstName} onChange={e => setCustomerData({ ...customerData, firstName: e.target.value })} className="w-full p-3 border rounded-md" required />
                               <input type="text" placeholder="Příjmení" value={customerData.lastName} onChange={e => setCustomerData({ ...customerData, lastName: e.target.value })} className="w-full p-3 border rounded-md" required />
                               <input type="email" placeholder="Email" value={customerData.email} onChange={e => setCustomerData({ ...customerData, email: e.target.value })} className="w-full p-3 border rounded-md" required />
                               <input type="tel" placeholder="Telefon" value={customerData.phone} onChange={e => setCustomerData({ ...customerData, phone: e.target.value })} className="w-full p-3 border rounded-md" required />
                               <input type="text" placeholder="Adresa (Ulice, ČP, Město, PSČ)" value={customerData.address} onChange={e => setCustomerData({ ...customerData, address: e.target.value })} className="w-full p-3 border rounded-md" required />
                               <input type="text" placeholder="Číslo řidičského průkazu" value={customerData.driverLicenseNumber} onChange={e => setCustomerData({ ...customerData, driverLicenseNumber: e.target.value })} className="w-full p-3 border rounded-md" required />
                               <input type="text" placeholder="IČO (volitelné)" value={customerData.ico || ''} onChange={e => setCustomerData({ ...customerData, ico: e.target.value })} className="w-full p-3 border rounded-md" />
                            </div>

                            <div className="bg-gray-50 p-6 rounded-lg self-start">
                                <img src={selectedVehicle.imageUrl || 'https://via.placeholder.com/400x250.png?text=Vuz+bez+foto'} alt={selectedVehicle.name} className="w-full h-40 object-cover rounded-lg mb-4"/>
                                <h3 className="text-xl font-bold">{selectedVehicle.name}</h3>
                                <p className="text-gray-600">{selectedVehicle.licensePlate}</p>
                                <div className="mt-4 pt-4 border-t space-y-2">
                                     <p className="flex justify-between"><span>Od:</span> <span className="font-semibold">{new Date(startDate).toLocaleString('cs-CZ')}</span></p>
                                     <p className="flex justify-between"><span>Do:</span> <span className="font-semibold">{new Date(endDate).toLocaleString('cs-CZ')}</span></p>
                                     <p className="flex justify-between text-xl font-bold mt-4 pt-4 border-t"><span>Celková cena:</span> <span className="text-primary">{calculatedPrice?.toLocaleString('cs-CZ')} Kč</span></p>
                                </div>
                            </div>
                            
                            <div className="md:col-span-2 mt-4">
                                {error && <p className="text-red-600 bg-red-100 p-3 rounded-md mb-4 text-center">{error}</p>}
                                <button type="submit" className="w-full bg-secondary text-dark-text font-bold py-4 px-4 rounded-lg hover:bg-secondary-hover transition-colors text-xl" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader className="w-6 h-6 animate-spin mx-auto" /> : 'Odeslat a Závazně Rezervovat'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnlineBooking;