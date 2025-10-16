import React, { useState, useMemo, FormEvent, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Customer, Reservation, Vehicle } from '../types';
import { CheckCircle, Loader, Clock, MapPin, HandCoins, Phone, Mail } from 'lucide-react';
import { getPublicBookingData } from '../services/api';
import { calculateTotalPrice } from '../contexts/DataContext'; // Import centralizované funkce

const PREPARATION_BUFFER_MINUTES = 20;

enum VehicleAvailabilityStatus {
    AVAILABLE_NOW,
    AVAILABLE_LATER,
    UNAVAILABLE,
}

interface DisplayVehicle extends Vehicle {
    availabilityStatus: VehicleAvailabilityStatus;
    availableFrom?: Date;
}

const parseDateTimeLocal = (dateTimeString: string): Date | null => {
    if (!dateTimeString) return null;
    const match = dateTimeString.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return null;
    const [, year, month, day, hours, minutes] = match.map(Number);
    const date = new Date(year, month - 1, day, hours, minutes, 0);
    if (isNaN(date.getTime()) || date.getFullYear() !== year) return null;
    return date;
};


const OnlineBooking: React.FC = () => {
    const { actions } = useData();

    const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
    const [allReservations, setAllReservations] = useState<Reservation[]>([]);
    const [pageLoading, setPageLoading] = useState(true);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [customerData, setCustomerData] = useState<Omit<Customer, 'id'>>({
        firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: '', ico: ''
    });
    const [destination, setDestination] = useState('');
    const [estimatedMileage, setEstimatedMileage] = useState('');

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string>('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submittedData, setSubmittedData] = useState<any>(null);
    const [displayVehicles, setDisplayVehicles] = useState<DisplayVehicle[]>([]);
    const [calculating, setCalculating] = useState(false);

    // Check for 'embedded' parameter to conditionally hide UI elements
    const isEmbedded = useMemo(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('embedded') === 'true';
    }, []);


    useEffect(() => {
        const fetchPublicData = async () => {
            setPageLoading(true);
            try {
                const publicData = await getPublicBookingData();
                setAllVehicles(publicData.vehicles);
                setAllReservations(publicData.reservations);
            } catch (err) {
                setError("Chyba při načítání nabídky vozidel. Zkuste prosím obnovit stránku.");
            } finally {
                setPageLoading(false);
            }
        };
        fetchPublicData();
    }, []);

    const startDateObj = useMemo(() => parseDateTimeLocal(startDate), [startDate]);
    const endDateObj = useMemo(() => parseDateTimeLocal(endDate), [endDate]);

    const dateError = useMemo(() => {
        if (startDate && !startDateObj) return "Neplatný formát počátečního data.";
        if (endDate && !endDateObj) return "Neplatný formát konečného data.";
        if (startDateObj && endDateObj && endDateObj <= startDateObj) return "Datum konce musí být po datu začátku.";
        return null;
    }, [startDate, endDate, startDateObj, endDateObj]);
    
    const isDateValid = useMemo(() => !!(startDateObj && endDateObj && !dateError), [startDateObj, endDateObj, dateError]);

    useEffect(() => {
        if (pageLoading || !isDateValid || !startDateObj) {
            setDisplayVehicles([]);
            return;
        }
    
        setCalculating(true);
        const timer = setTimeout(() => {
            const desiredStart = startDateObj;
    
            const categorizedVehicles = allVehicles.map(vehicle => {
                const displayVehicle: DisplayVehicle = {
                    ...vehicle,
                    availabilityStatus: VehicleAvailabilityStatus.UNAVAILABLE, // Default to unavailable and prove availability
                };
    
                if (vehicle.status === 'maintenance') {
                    return displayVehicle; // Stays unavailable
                }
    
                const vehicleReservations = allReservations.filter(r =>
                    r.vehicleId === vehicle.id &&
                    (r.status === 'scheduled' || r.status === 'active')
                );
    
                // Find if there's a reservation active AT the desired start time
                const conflictingReservation = vehicleReservations.find(r => {
                    // Ensure dates are valid before comparing
                    if (!r.startDate || !r.endDate) return false;
                    const resStart = new Date(r.startDate);
                    const resEnd = new Date(r.endDate);
                    // A conflict exists if the desired start time is within the reservation period
                    return resStart < desiredStart && resEnd > desiredStart;
                });
    
                if (conflictingReservation) {
                    // Vehicle is busy. Find out when it becomes free.
                    const resEndDate = new Date(conflictingReservation.endDate);
                    const availableFrom = new Date(resEndDate.getTime() + PREPARATION_BUFFER_MINUTES * 60000);
    
                    // Check if it becomes available later on the SAME day
                    if (availableFrom.getFullYear() === desiredStart.getFullYear() &&
                        availableFrom.getMonth() === desiredStart.getMonth() &&
                        availableFrom.getDate() === desiredStart.getDate()) {
                        
                        // If the user's desired start is AFTER it becomes available, it's available now for them
                        if (desiredStart >= availableFrom) {
                            displayVehicle.availabilityStatus = VehicleAvailabilityStatus.AVAILABLE_NOW;
                        } else {
                            displayVehicle.availabilityStatus = VehicleAvailabilityStatus.AVAILABLE_LATER;
                            displayVehicle.availableFrom = availableFrom;
                        }
                    } else {
                        // Becomes available on a future day, so it's unavailable for the selected day
                        displayVehicle.availabilityStatus = VehicleAvailabilityStatus.UNAVAILABLE;
                    }
                } else {
                    // No conflict AT the desired start time, so it's available.
                    displayVehicle.availabilityStatus = VehicleAvailabilityStatus.AVAILABLE_NOW;
                }
    
                return displayVehicle;
            });
    
            // Sort to show available vehicles first
            categorizedVehicles.sort((a, b) => a.availabilityStatus - b.availabilityStatus);
    
            setDisplayVehicles(categorizedVehicles);
    
            // Deselect vehicle if it's no longer available for the chosen time
            const selectedIsStillSelectable = categorizedVehicles.find(v => v.id === selectedVehicleId)?.availabilityStatus === VehicleAvailabilityStatus.AVAILABLE_NOW;
            if (selectedVehicleId && !selectedIsStillSelectable) {
                setSelectedVehicleId('');
            }
            
            setCalculating(false);
        }, 300); // 300ms debounce
        return () => clearTimeout(timer);
    }, [isDateValid, startDateObj, allReservations, allVehicles, selectedVehicleId, pageLoading]);


    const selectedVehicle = useMemo(() => allVehicles.find(v => v.id === selectedVehicleId), [allVehicles, selectedVehicleId]);

    const totalPrice = useMemo(() => {
        if (!selectedVehicle || !isDateValid || !startDateObj || !endDateObj) return 0;
        // FIX: Use the central price calculation function for consistency.
        return calculateTotalPrice(selectedVehicle, startDateObj, endDateObj);
    }, [selectedVehicle, isDateValid, startDateObj, endDateObj]);

    const handleSetDuration = (duration: number, unit: 'hours' | 'days') => {
        if (!startDate || !startDateObj) { alert("Nejprve prosím vyberte platné počáteční datum a čas."); return; }
        const start = startDateObj;
        let end: Date;
        if (unit === 'hours') end = new Date(start.getTime() + duration * 60 * 60 * 1000);
        else end = new Date(start.getTime() + duration * 24 * 60 * 60 * 1000);
        const pad = (num: number) => num.toString().padStart(2, '0');
        const formattedEnd = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
        setEndDate(formattedEnd);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (!isDateValid || !startDateObj || !endDateObj) { setError("Zvolený termín je neplatný."); return; }
        if (!selectedVehicleId) { setError('Prosím, vyberte vozidlo.'); return; }
        if (!customerData.firstName || !customerData.lastName || !customerData.email || !customerData.address) { setError('Prosím, vyplňte všechny vaše údaje.'); return; }
        const finalCheck = displayVehicles.find(v => v.id === selectedVehicleId);
        if (finalCheck?.availabilityStatus !== VehicleAvailabilityStatus.AVAILABLE_NOW) {
            setError("Vybrané vozidlo není v tomto termínu dostupné. Zvolte prosím jiné vozidlo nebo termín.");
            return;
        }
        setIsProcessing(true);
        try {
            await actions.createOnlineReservation(selectedVehicleId, startDateObj, endDateObj, customerData, destination, estimatedMileage ? parseInt(estimatedMileage) : undefined);
            setSubmittedData({ customerData, selectedVehicle, startDateObj, endDateObj });
            setIsSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Rezervaci se nepodařilo vytvořit.');
        } finally { setIsProcessing(false); }
    };
    
    if (pageLoading) {
         return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
                <Loader className="w-10 h-10 animate-spin text-primary" /> 
                <p className="mt-4 text-lg text-gray-700 font-semibold">Načítám aktuální nabídku vozidel...</p>
            </div>
        );
    }
    
    if (isSubmitted && submittedData) {
        const handleSendMail = () => {
            const { customerData, selectedVehicle, startDateObj, endDateObj } = submittedData;
            const subject = `Potvrzení o přijetí poptávky na pronájem vozidla`;
            const body = `Dobrý den, ${customerData.firstName},

děkujeme za Váš zájem. Tímto potvrzujeme přijetí Vaší poptávky na pronájem vozidla ${selectedVehicle.name}.

Souhrn:
Vozidlo: ${selectedVehicle.name}
Od: ${startDateObj.toLocaleString('cs-CZ')}
Do: ${endDateObj.toLocaleString('cs-CZ')}

Nyní Vaši rezervaci zpracováváme a brzy se Vám ozveme s finálním potvrzením.

-- DŮLEŽITÉ INFORMACE --

- Adresa pro vyzvednutí: parkoviště Teslova (po pravé straně od vjezdu).
- Vratná kauce: Při převzetí vozidla se skládá vratná kauce 5 000 Kč (v hotovosti nebo přes QR kód).
- Kontakt na nás: 776 333 301

Děkujeme a těšíme se na Vás,
Váš tým pujcimedodavky.cz`;
            
            const mailtoLink = `mailto:${customerData.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoLink;
        };

        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 text-center p-4">
                 <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
                <h1 className="text-3xl font-bold text-green-800">Děkujeme, Vaše poptávka byla přijata!</h1>
                <p className="mt-2 text-lg text-gray-700 max-w-2xl">Vaši poptávku nyní zpracováváme. Brzy se vám ozveme s finálním potvrzením rezervace.</p>
                
                <div className="mt-8 text-left bg-white p-6 rounded-lg shadow-md max-w-lg w-full">
                    <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Důležité informace</h2>
                    <ul className="space-y-3 text-gray-700">
                        <li className="flex items-start"><HandCoins className="w-5 h-5 mr-3 mt-1 text-primary flex-shrink-0" /><span>Při převzetí vozidla se skládá vratná kauce <strong>5 000 Kč</strong> (v hotovosti nebo přes QR kód).</span></li>
                        <li className="flex items-start"><MapPin className="w-5 h-5 mr-3 mt-1 text-primary flex-shrink-0" /><span>Adresa pro vyzvednutí: <strong>parkoviště Teslova (po pravé straně od vjezdu)</strong>.</span></li>
                        <li className="flex items-start"><Phone className="w-5 h-5 mr-3 mt-1 text-primary flex-shrink-0" /><span>V případě dotazů nás kontaktujte na telefonu <strong>776 333 301</strong>.</span></li>
                    </ul>
                    <button onClick={handleSendMail} className="w-full mt-6 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                        <Mail className="w-5 h-5 mr-2" /> Odeslat souhrn na můj e-mail
                    </button>
                </div>

                <a 
                   href="https://www.pujcimedodavky.cz" 
                   target="_top" 
                   className="mt-8 text-sm text-gray-600 hover:text-primary transition-colors"
                >
                    Zpět na hlavní stránku
                </a>
            </div>
        )
    }

    const getCardBorderColor = (status: VehicleAvailabilityStatus, vehicleId: string) => {
        if (selectedVehicleId === vehicleId) {
             return 'border-primary shadow-lg scale-105';
        }
        switch (status) {
            case VehicleAvailabilityStatus.AVAILABLE_NOW:
                return 'border-green-400 hover:border-blue-400';
            case VehicleAvailabilityStatus.AVAILABLE_LATER:
                return 'border-yellow-400';
            case VehicleAvailabilityStatus.UNAVAILABLE:
                return 'border-gray-200';
        }
    }
    
    const durationPresets = [
        {label: '4 hod', duration: 4, unit: 'hours' as const},
        {label: '12 hod', duration: 12, unit: 'hours' as const},
        {label: '1 den', duration: 1, unit: 'days' as const},
        {label: 'Víkend (2 dny)', duration: 2, unit: 'days' as const},
        {label: 'Týden', duration: 7, unit: 'days' as const},
        {label: 'Měsíc (30 dní)', duration: 30, unit: 'days' as const}
    ];

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                {!isEmbedded && (
                    <header className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-primary">Online rezervace</h1>
                        <p className="text-gray-600 mt-2">Zarezervujte si dodávku snadno a rychle.</p>
                    </header>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white rounded-lg shadow-xl p-8 space-y-8">
                            <section>
                                <h2 className="text-2xl font-semibold text-gray-800 border-b pb-3 mb-4 flex items-center"><span className="bg-primary text-white rounded-full w-8 h-8 text-lg flex items-center justify-center mr-3">1</span> Zvolte termín</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium">Od</label><input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-md" required /></div>
                                    <div><label className="block text-sm font-medium">Do</label><input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-md" required /></div>
                                </div>
                                {dateError && <p className="text-red-500 text-sm mt-2">{dateError}</p>}
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700 mr-2">Rychlá volba:</span>
                                    {durationPresets.map(preset => (
                                        <button
                                            type="button"
                                            key={preset.label}
                                            onClick={() => handleSetDuration(preset.duration, preset.unit)}
                                            className="px-3 py-1 text-sm bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold text-gray-800 border-b pb-3 mb-4 flex items-center"><span className="bg-primary text-white rounded-full w-8 h-8 text-lg flex items-center justify-center mr-3">2</span> Vyberte vozidlo</h2>
                                {!isDateValid ? (
                                    <div className="text-center p-6 bg-gray-50 rounded-md border"><p className="text-gray-600 font-medium">Nejprve prosím zvolte platný termín.</p></div>
                                ) : calculating ? (
                                    <div className="col-span-full text-center p-6 flex items-center justify-center"><Loader className="w-6 h-6 animate-spin mr-3 text-primary" /><span className="text-gray-600">Hledám...</span></div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {displayVehicles.map(v => (
                                            <div key={v.id} 
                                                 onClick={() => v.availabilityStatus === VehicleAvailabilityStatus.AVAILABLE_NOW && setSelectedVehicleId(v.id)} 
                                                 className={`border-2 rounded-lg p-3 transition-all ${getCardBorderColor(v.availabilityStatus, v.id)} ${v.availabilityStatus !== VehicleAvailabilityStatus.AVAILABLE_NOW ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                                
                                                <div className={`relative ${v.availabilityStatus === VehicleAvailabilityStatus.UNAVAILABLE ? 'opacity-40' : ''}`}>
                                                    <img src={v.imageUrl || 'https://via.placeholder.com/300x200.png?text=Vuz+bez+foto'} alt={v.name} className="w-full h-32 object-cover rounded-md mb-2"/>
                                                    <h3 className="font-semibold">{v.name}</h3>
                                                    <p className="text-xs text-gray-500 mt-2">{v.rate4h} Kč/4h | {v.rate12h} Kč/12h</p>
                                                    <p className="text-lg text-gray-800 font-bold">{v.dailyRate} Kč/den</p>
                                                </div>

                                                {v.availabilityStatus === VehicleAvailabilityStatus.AVAILABLE_LATER && (
                                                    <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-md text-center">
                                                        <p className="font-semibold flex items-center justify-center"><Clock className="w-4 h-4 mr-2"/>Bude k dispozici dnes od:</p>
                                                        <p className="text-lg font-bold">{v.availableFrom?.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                )}
                                                
                                                {v.availabilityStatus === VehicleAvailabilityStatus.UNAVAILABLE && (
                                                     <div className="mt-2 p-2 bg-gray-200 border border-gray-300 text-gray-600 rounded-md text-center">
                                                        <p className="font-semibold">Dnes již nedostupné</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {displayVehicles.length === 0 && (
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <input type="text" placeholder="Hlavní cíl cesty (např. Brno - Praha)" value={destination} onChange={e => setDestination(e.target.value)} className="w-full p-3 border rounded-md" />
                                    <input type="number" placeholder="Předpokládaný nájezd (km)" value={estimatedMileage} onChange={e => setEstimatedMileage(e.target.value)} className="w-full p-3 border rounded-md" />
                                </div>
                            </section>
                        </div>
                        <div className="lg:col-span-1">
                             <div className="bg-white p-6 rounded-lg shadow-xl sticky top-8">
                                <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">Souhrn</h2>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-gray-500">Vozidlo:</h3>
                                        {selectedVehicle ? (
                                            <div className="flex items-center mt-1">
                                                <img src={selectedVehicle.imageUrl || 'https://via.placeholder.com/300x200.png?text=Vuz+bez+foto'} alt={selectedVehicle.name} className="w-20 h-16 object-cover rounded mr-3"/>
                                                <div><p className="text-gray-800 font-bold">{selectedVehicle.name}</p><p className="text-sm text-gray-500">{selectedVehicle.licensePlate}</p></div>
                                            </div>
                                        ) : <p className="text-gray-700 italic">Nevybráno</p>}
                                    </div>
                                     <div>
                                        <h3 className="font-semibold text-gray-500">Období:</h3>
                                        {isDateValid && startDateObj && endDateObj ? (
                                            <><p className="text-gray-700"><strong>Od:</strong> {startDateObj.toLocaleString('cs-CZ')}</p><p className="text-gray-700"><strong>Do:</strong> {endDateObj.toLocaleString('cs-CZ')}</p></>
                                        ) : <p className="text-gray-700 italic">Nezvoleno</p>}
                                    </div>
                                    <div className="border-t pt-4">
                                        <p className="flex justify-between items-baseline text-xl font-bold">
                                            <span>Celkem:</span><span className="text-3xl text-primary">{totalPrice.toLocaleString('cs-CZ')} Kč</span>
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