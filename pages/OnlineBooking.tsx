import React, { useState, useMemo, FormEvent } from 'react';
import { useData } from '../contexts/DataContext';
import { Customer, Vehicle } from '../types';
import { CheckCircle, Loader } from 'lucide-react';

const OnlineBooking: React.FC = () => {
    const { data, actions, loading: dataLoading } = useData();
    const { vehicles } = data;

    const [step, setStep] = useState(1); // 1: Select, 2: Form, 3: Success
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [customerData, setCustomerData] = useState<Omit<Customer, 'id'>>({
        firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableVehicles = useMemo(() => {
        // Basic filtering. A more advanced version would check reservation clashes.
        return vehicles.filter(v => v.status === 'available');
    }, [vehicles]);

    const handleSelectVehicle = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setStep(2);
        // Scroll to top
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedVehicle) {
            setError('Nebylo vybráno žádné vozidlo.');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await actions.createOnlineReservation(
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

    if (dataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <Loader className="w-10 h-10 animate-spin text-primary" />
                <span className="ml-4 text-lg text-gray-700">Načítání nabídky vozidel...</span>
            </div>
        );
    }

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
                    <p className="text-lg text-gray-600 mt-2">Vyberte si vozidlo a zarezervujte si jej v několika krocích.</p>
                </header>

                {step === 1 && (
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
                    </div>
                )}
                
                {step === 2 && selectedVehicle && (
                    <div className="bg-white p-8 rounded-xl shadow-lg">
                        <button onClick={() => setStep(1)} className="text-primary hover:underline mb-6">&larr; Zpět na výběr vozidel</button>
                        <h2 className="text-3xl font-bold text-gray-800">Dokončení rezervace: <span className="text-primary">{selectedVehicle.name}</span></h2>
                        
                        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Reservation Details */}
                            <div className="md:col-span-2">
                                <h3 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">Termín pronájmu</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 border rounded-md" required />
                                     <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 border rounded-md" required />
                                </div>
                            </div>
                            
                            {/* Customer Details */}
                            <div className="space-y-4">
                               <h3 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">Vaše údaje</h3>
                               <input type="text" placeholder="Jméno" value={customerData.firstName} onChange={e => setCustomerData({ ...customerData, firstName: e.target.value })} className="w-full p-3 border rounded-md" required />
                               <input type="text" placeholder="Příjmení" value={customerData.lastName} onChange={e => setCustomerData({ ...customerData, lastName: e.target.value })} className="w-full p-3 border rounded-md" required />
                               <input type="email" placeholder="Email" value={customerData.email} onChange={e => setCustomerData({ ...customerData, email: e.target.value })} className="w-full p-3 border rounded-md" required />
                               <input type="tel" placeholder="Telefon" value={customerData.phone} onChange={e => setCustomerData({ ...customerData, phone: e.target.value })} className="w-full p-3 border rounded-md" required />
                               <input type="text" placeholder="Adresa (Ulice, ČP, Město, PSČ)" value={customerData.address} onChange={e => setCustomerData({ ...customerData, address: e.target.value })} className="w-full p-3 border rounded-md" required />
                               <input type="text" placeholder="Číslo řidičského průkazu" value={customerData.driverLicenseNumber} onChange={e => setCustomerData({ ...customerData, driverLicenseNumber: e.target.value })} className="w-full p-3 border rounded-md" required />
                            </div>

                            {/* Summary */}
                            <div className="bg-gray-50 p-6 rounded-lg self-start">
                                <img src={selectedVehicle.imageUrl || 'https://via.placeholder.com/400x250.png?text=Vuz+bez+foto'} alt={selectedVehicle.name} className="w-full h-40 object-cover rounded-lg mb-4"/>
                                <h3 className="text-xl font-bold">{selectedVehicle.name}</h3>
                                <p className="text-gray-600">{selectedVehicle.licensePlate}</p>
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-2xl font-bold text-primary text-center">{selectedVehicle.dailyRate} Kč / den</p>
                                    <p className="text-sm text-gray-500 text-center mt-1">(Celková cena bude vypočtena dle délky pronájmu)</p>
                                </div>
                            </div>
                            
                            {/* Submission */}
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
