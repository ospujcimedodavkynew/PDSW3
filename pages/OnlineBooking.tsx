import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Vehicle, Customer } from '../types';
import { CheckCircle, Loader } from 'lucide-react';

const OnlineBooking: React.FC = () => {
    const { data, loading, actions } = useData();
    const { vehicles, reservations } = data;

    const [step, setStep] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [customerData, setCustomerData] = useState<Omit<Customer, 'id' | 'driverLicenseImageUrl'>>({
        firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '', ico: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const availableVehicles = useMemo(() => {
        if (!startDate || !endDate) return [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return [];
        
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

    const handleDateTimeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!startDate || !endDate || new Date(endDate) <= new Date(startDate)) {
            setError('Prosím, zadejte platné období pronájmu.');
            return;
        }
        setStep(2);
    };

    const handleVehicleSelect = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setStep(3);
    };
    
    const handleCustomerDataSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVehicle) {
            setError('Není vybráno žádné vozidlo.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            await actions.createOnlineReservation(selectedVehicle.id, new Date(startDate), new Date(endDate), customerData);
            setStep(4); // Success step
        } catch (err) {
            setError('Při odesílání rezervace došlo k chybě. Zkuste to prosím znovu.');
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };


    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader className="w-8 h-8 animate-spin" /> Načítání rezervačního systému...</div>;

    return (
        <div className="min-h-screen bg-light-bg flex flex-col items-center p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-4xl">
                <h1 className="text-3xl sm:text-4xl font-bold text-primary text-center mb-8">Online rezervace dodávky</h1>

                {step === 1 && (
                    <div className="bg-white p-8 rounded-lg shadow-xl">
                        <h2 className="text-2xl font-semibold mb-6 text-center">1. Zvolte si termín</h2>
                        <form onSubmit={handleDateTimeSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Od (datum a čas)</label>
                                    <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 border rounded-md" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Do (datum a čas)</label>
                                    <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 border rounded-md" required />
                                </div>
                            </div>
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <button type="submit" className="w-full bg-secondary text-dark-text font-bold py-3 rounded-lg hover:bg-secondary-hover transition-colors text-lg">
                                Zobrazit dostupná vozidla
                            </button>
                        </form>
                    </div>
                )}
                
                {step === 2 && (
                    <div className="bg-white p-8 rounded-lg shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                             <h2 className="text-2xl font-semibold">2. Vyberte si vozidlo</h2>
                             <button onClick={() => setStep(1)} className="text-sm text-primary hover:underline">Změnit termín</button>
                        </div>
                        <div className="space-y-4">
                            {availableVehicles.length > 0 ? availableVehicles.map(v => (
                                <div key={v.id} className="border rounded-lg p-4 flex flex-col sm:flex-row items-center gap-4">
                                    <img src={v.imageUrl || 'https://via.placeholder.com/300x200.png?text=Vuz+bez+foto'} alt={v.name} className="w-full sm:w-48 h-32 object-cover rounded-md flex-shrink-0"/>
                                    <div className="flex-grow">
                                        <h3 className="text-xl font-bold">{v.name}</h3>
                                        <p className="text-gray-600 text-sm">{v.licensePlate} &bull; {v.year}</p>
                                        {v.description && <p className="text-gray-700 mt-2 text-sm">{v.description}</p>}
                                        {v.dimensions && <p className="text-gray-700 mt-1 text-sm font-semibold">Rozměry: {v.dimensions}</p>}
                                    </div>
                                    <div className="flex-shrink-0 text-center sm:text-right">
                                        <p className="text-lg font-bold text-primary">{v.dailyRate} Kč / den</p>
                                        <button onClick={() => handleVehicleSelect(v)} className="mt-2 bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-hover transition-colors">
                                            Vybrat
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-gray-600 py-8">Pro zadaný termín bohužel nemáme žádná volná vozidla.</p>
                            )}
                        </div>
                    </div>
                )}
                
                {step === 3 && selectedVehicle && (
                    <div className="bg-white p-8 rounded-lg shadow-xl">
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold">3. Vyplňte vaše údaje</h2>
                            <button onClick={() => setStep(2)} className="text-sm text-primary hover:underline">Změnit vozidlo</button>
                        </div>
                        <form onSubmit={handleCustomerDataSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input type="text" placeholder="Jméno" value={customerData.firstName} onChange={e => setCustomerData(prev => ({...prev, firstName: e.target.value}))} className="w-full p-3 border rounded-md" required />
                                <input type="text" placeholder="Příjmení" value={customerData.lastName} onChange={e => setCustomerData(prev => ({...prev, lastName: e.target.value}))} className="w-full p-3 border rounded-md" required />
                            </div>
                            <input type="email" placeholder="Email" value={customerData.email} onChange={e => setCustomerData(prev => ({...prev, email: e.target.value}))} className="w-full p-3 border rounded-md" required />
                            <input type="text" placeholder="Adresa" value={customerData.address} onChange={e => setCustomerData(prev => ({...prev, address: e.target.value}))} className="w-full p-3 border rounded-md" required />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input type="tel" placeholder="Telefon" value={customerData.phone} onChange={e => setCustomerData(prev => ({...prev, phone: e.target.value}))} className="w-full p-3 border rounded-md" required />
                                <input type="text" placeholder="Číslo ŘP" value={customerData.driverLicenseNumber} onChange={e => setCustomerData(prev => ({...prev, driverLicenseNumber: e.target.value}))} className="w-full p-3 border rounded-md" required />
                            </div>
                            <input type="text" placeholder="IČO (volitelné)" value={customerData.ico || ''} onChange={e => setCustomerData(prev => ({...prev, ico: e.target.value}))} className="w-full p-3 border rounded-md" />

                            <div className="border-t pt-4 mt-4">
                                <h3 className="font-bold text-lg mb-2">Souhrn rezervace</h3>
                                <p><strong>Vozidlo:</strong> {selectedVehicle.name}</p>
                                <p><strong>Od:</strong> {new Date(startDate).toLocaleString('cs-CZ')}</p>
                                <p><strong>Do:</strong> {new Date(endDate).toLocaleString('cs-CZ')}</p>
                                <p className="text-2xl font-bold mt-2">Celková cena: {totalPrice.toLocaleString('cs-CZ')} Kč</p>
                            </div>

                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <button type="submit" className="w-full bg-secondary text-dark-text font-bold py-3 rounded-lg hover:bg-secondary-hover transition-colors text-lg" disabled={isSubmitting}>
                                {isSubmitting ? <Loader className="w-6 h-6 animate-spin mx-auto"/> : 'Odeslat rezervaci'}
                            </button>
                        </form>
                    </div>
                )}
                
                {step === 4 && (
                     <div className="bg-white p-8 sm:p-12 rounded-lg shadow-xl text-center">
                        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
                        <h2 className="text-3xl font-bold text-gray-800">Rezervace odeslána!</h2>
                        <p className="text-lg text-gray-600 mt-4">Děkujeme, Vaše poptávka byla úspěšně odeslána. Brzy se Vám ozveme na zadaný e-mail s potvrzením a dalšími informacemi.</p>
                        <p className="mt-6 text-sm text-gray-500">Nyní můžete zavřít tuto stránku.</p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default OnlineBooking;
