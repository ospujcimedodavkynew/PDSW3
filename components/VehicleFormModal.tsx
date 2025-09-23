import React, { useState, useEffect, FormEvent } from 'react';
import type { Vehicle } from '../types';
import { X } from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface VehicleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: Partial<Vehicle> | null;
}

const VehicleFormModal: React.FC<VehicleFormModalProps> = ({ isOpen, onClose, vehicle }) => {
    const { actions } = useData();
    
    const getInitialData = (v: Partial<Vehicle> | null): Partial<Vehicle> => v || {
        name: '', licensePlate: '', year: new Date().getFullYear(), status: 'available',
        rate4h: 0, rate12h: 0, dailyRate: 0, currentMileage: 0,
        make: '', model: '', imageUrl: '', description: '', dimensions: '',
        insuranceProviderPov: '', insurancePolicyNumberPov: '', insuranceCostPov: undefined, insuranceIntervalPov: 'yearly', insuranceDueDatePov: '',
        insuranceProviderHav: '', insurancePolicyNumberHav: '', insuranceCostHav: undefined, insuranceIntervalHav: 'yearly', insuranceDueDateHav: '',
        vignetteExpiry: '', stkExpiry: '',
    };

    // FIX: A helper function to ensure date values from the 'Vehicle' type are always 
    // converted to 'YYYY-MM-DD' strings, which is required by the <input type="date"> element.
    const formatDataForForm = (data: Partial<Vehicle>) => {
        const formatDate = (date: any): string => date ? new Date(date).toISOString().split('T')[0] : '';
        return {
            ...data,
            insuranceDueDatePov: formatDate(data.insuranceDueDatePov),
            insuranceDueDateHav: formatDate(data.insuranceDueDateHav),
            vignetteExpiry: formatDate(data.vignetteExpiry),
            stkExpiry: formatDate(data.stkExpiry),
        };
    };

    // FIX: The form state is now initialized with date strings from the start, preventing a type mismatch on the initial render.
    const [formData, setFormData] = useState(formatDataForForm(getInitialData(vehicle)));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // FIX: Re-initialize and format the form data when the modal opens or the vehicle data changes.
            setFormData(formatDataForForm(getInitialData(vehicle)));
            setError(null);
        }
    }, [vehicle, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const numericFields = ['year', 'rate4h', 'rate12h', 'dailyRate', 'currentMileage', 'insuranceCostPov', 'insuranceCostHav'];
        
        setFormData(prev => ({
            ...prev,
            [name]: numericFields.includes(name) ? (value === '' ? undefined : Number(value)) : value
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        try {
            // Ensure empty date strings are converted to null for the database
            const payload = {
                ...formData,
                insuranceDueDatePov: formData.insuranceDueDatePov || null,
                insuranceDueDateHav: formData.insuranceDueDateHav || null,
                vignetteExpiry: formData.vignetteExpiry || null,
                stkExpiry: formData.stkExpiry || null,
            };

            if (payload.id) {
                await actions.updateVehicle(payload as Vehicle);
            } else {
                await actions.addVehicle(payload as Omit<Vehicle, 'id'>);
            }
            onClose();
        } catch (err) {
            console.error("Failed to save vehicle:", err);
            setError(err instanceof Error ? err.message : 'Uložení vozidla se nezdařilo');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 py-10 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-3xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{vehicle?.id ? 'Upravit vozidlo' : 'Přidat nové vozidlo'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Základní údaje</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <input name="name" type="text" placeholder="Název (např. Ford Transit)" value={formData.name || ''} onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input name="licensePlate" type="text" placeholder="SPZ" value={formData.licensePlate || ''} onChange={handleChange} className="w-full p-2 border rounded" required />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <input name="make" type="text" placeholder="Značka (např. Ford)" value={formData.make || ''} onChange={handleChange} className="w-full p-2 border rounded" />
                        <input name="model" type="text" placeholder="Model (např. Transit)" value={formData.model || ''} onChange={handleChange} className="w-full p-2 border rounded" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input name="year" type="number" placeholder="Rok výroby" value={formData.year || ''} onChange={handleChange} className="w-full p-2 border rounded" required />
                        <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded bg-white" required>
                            <option value="available">K dispozici</option>
                            <option value="rented">Pronajato</option>
                            <option value="maintenance">V servisu</option>
                        </select>
                    </div>
                    <input name="currentMileage" type="number" placeholder="Aktuální stav km" value={formData.currentMileage || ''} onChange={handleChange} className="w-full p-2 border rounded" required />
                    
                    <h3 className="font-semibold text-lg border-b pb-2 pt-4">Ceny pronájmu</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <input name="rate4h" type="number" placeholder="Cena za 4h" value={formData.rate4h || ''} onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input name="rate12h" type="number" placeholder="Cena za 12h" value={formData.rate12h || ''} onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input name="dailyRate" type="number" placeholder="Cena za den" value={formData.dailyRate || ''} onChange={handleChange} className="w-full p-2 border rounded" required />
                    </div>
                    
                    <h3 className="font-semibold text-lg border-b pb-2 pt-4">Pojištění a Důležité Termíny</h3>
                    {/* Povinné ručení */}
                    <div className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-medium mb-2">Povinné ručení</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <input name="insuranceProviderPov" type="text" placeholder="Pojišťovna" value={formData.insuranceProviderPov || ''} onChange={handleChange} className="w-full p-2 border rounded" />
                            <input name="insurancePolicyNumberPov" type="text" placeholder="Číslo smlouvy" value={formData.insurancePolicyNumberPov || ''} onChange={handleChange} className="w-full p-2 border rounded" />
                            <input name="insuranceCostPov" type="number" placeholder="Částka pojistného (Kč)" value={formData.insuranceCostPov || ''} onChange={handleChange} className="w-full p-2 border rounded" />
                            <select name="insuranceIntervalPov" value={formData.insuranceIntervalPov} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                                <option value="yearly">Ročně</option>
                                <option value="half-yearly">Pololetně</option>
                            </select>
                            <div className="col-span-2"><label className="text-sm">Splatnost pojistného</label><input name="insuranceDueDatePov" type="date" value={formData.insuranceDueDatePov || ''} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                        </div>
                    </div>
                     {/* Havarijní pojištění */}
                    <div className="p-4 border rounded-lg bg-gray-50">
                        <h4 className="font-medium mb-2">Havarijní pojištění (volitelné)</h4>
                         <div className="grid grid-cols-2 gap-4">
                            <input name="insuranceProviderHav" type="text" placeholder="Pojišťovna" value={formData.insuranceProviderHav || ''} onChange={handleChange} className="w-full p-2 border rounded" />
                            <input name="insurancePolicyNumberHav" type="text" placeholder="Číslo smlouvy" value={formData.insurancePolicyNumberHav || ''} onChange={handleChange} className="w-full p-2 border rounded" />
                            <input name="insuranceCostHav" type="number" placeholder="Částka pojistného (Kč)" value={formData.insuranceCostHav || ''} onChange={handleChange} className="w-full p-2 border rounded" />
                            <select name="insuranceIntervalHav" value={formData.insuranceIntervalHav} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                                <option value="yearly">Ročně</option>
                                <option value="half-yearly">Pololetně</option>
                            </select>
                            <div className="col-span-2"><label className="text-sm">Splatnost pojistného</label><input name="insuranceDueDateHav" type="date" value={formData.insuranceDueDateHav || ''} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                        </div>
                    </div>
                     {/* STK and Vignette */}
                    <div className="grid grid-cols-2 gap-4">
                         <div><label className="text-sm">Platnost STK do</label><input name="stkExpiry" type="date" value={formData.stkExpiry || ''} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                         <div><label className="text-sm">Platnost dálniční známky do</label><input name="vignetteExpiry" type="date" value={formData.vignetteExpiry || ''} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                    </div>
                    
                    <h3 className="font-semibold text-lg border-b pb-2 pt-4">Detailní informace (pro zákaznický portál)</h3>
                     <input name="imageUrl" type="text" placeholder="URL obrázku vozidla" value={formData.imageUrl || ''} onChange={handleChange} className="w-full p-2 border rounded" />
                     <textarea name="description" placeholder="Marketingový popisek vozidla" value={formData.description || ''} onChange={handleChange} className="w-full p-2 border rounded h-20" />
                     <input name="dimensions" type="text" placeholder="Rozměry (např. Ložná plocha: 3.2m x 1.8m)" value={formData.dimensions || ''} onChange={handleChange} className="w-full p-2 border rounded" />


                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                        <button type="submit" disabled={isSaving} className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400">
                            {isSaving ? 'Ukládám...' : 'Uložit vozidlo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VehicleFormModal;
