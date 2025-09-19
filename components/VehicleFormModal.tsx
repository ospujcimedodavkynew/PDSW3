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
        stkValidUntil: '', insuranceValidUntil: '',
    };

    const [formData, setFormData] = useState<Partial<Vehicle>>(getInitialData(vehicle));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialData(vehicle));
            setError(null);
        }
    }, [vehicle, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['year', 'rate4h', 'rate12h', 'dailyRate', 'currentMileage'].includes(name) ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        try {
            if (formData.id) {
                await actions.updateVehicle(formData as Vehicle);
            } else {
                await actions.addVehicle(formData as Omit<Vehicle, 'id'>);
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
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{vehicle?.id ? 'Upravit vozidlo' : 'Přidat nové vozidlo'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <hr />
                    <h3 className="font-semibold">Ceny pronájmu</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <input name="rate4h" type="number" placeholder="Cena za 4h" value={formData.rate4h || ''} onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input name="rate12h" type="number" placeholder="Cena za 12h" value={formData.rate12h || ''} onChange={handleChange} className="w-full p-2 border rounded" required />
                        <input name="dailyRate" type="number" placeholder="Cena za den" value={formData.dailyRate || ''} onChange={handleChange} className="w-full p-2 border rounded" required />
                    </div>
                    <hr />
                    <h3 className="font-semibold">Detailní informace (pro zákaznický portál)</h3>
                     <input name="imageUrl" type="text" placeholder="URL obrázku vozidla" value={formData.imageUrl || ''} onChange={handleChange} className="w-full p-2 border rounded" />
                     <textarea name="description" placeholder="Marketingový popisek vozidla" value={formData.description || ''} onChange={handleChange} className="w-full p-2 border rounded h-20" />
                     <input name="dimensions" type="text" placeholder="Rozměry (např. Ložná plocha: 3.2m x 1.8m)" value={formData.dimensions || ''} onChange={handleChange} className="w-full p-2 border rounded" />
                     <hr />
                    <h3 className="font-semibold">Termíny a platnosti</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Platnost STK do:</label>
                            <input name="stkValidUntil" type="date" value={formData.stkValidUntil ? (formData.stkValidUntil.toString().split('T')[0]) : ''} onChange={handleChange} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Pojištění platné do:</label>
                            <input name="insuranceValidUntil" type="date" value={formData.insuranceValidUntil ? (formData.insuranceValidUntil.toString().split('T')[0]) : ''} onChange={handleChange} className="w-full p-2 border rounded" />
                        </div>
                    </div>


                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    
                    <div className="flex justify-end space-x-3 pt-2">
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