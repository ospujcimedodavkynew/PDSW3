import React, { useEffect, useState, FormEvent } from 'react';
import { getVehicles, addVehicle, updateVehicle } from '../services/api';
import type { Vehicle } from '../types';
import { Car, Wrench, CheckCircle, Plus, X, Gauge } from 'lucide-react';

const VehicleCard: React.FC<{ vehicle: Vehicle; onEdit: (vehicle: Vehicle) => void; }> = ({ vehicle, onEdit }) => {
    const statusInfo = {
        available: { text: 'K dispozici', color: 'text-green-600', icon: <CheckCircle className="w-5 h-5" /> },
        rented: { text: 'Pronajato', color: 'text-yellow-600', icon: <Car className="w-5 h-5" /> },
        maintenance: { text: 'V servisu', color: 'text-red-600', icon: <Wrench className="w-5 h-5" /> },
    };

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 flex flex-col">
            <img src={vehicle.imageUrl} alt={vehicle.name} className="w-full h-48 object-cover" />
            <div className="p-4 flex-grow">
                <h3 className="text-xl font-bold text-gray-800">{vehicle.name}</h3>
                <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
                <p className="text-gray-600 font-semibold mt-2">{vehicle.licensePlate}</p>
                 <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Gauge className="w-4 h-4 mr-2" />
                    <span>Stav km: {vehicle.currentMileage.toLocaleString('cs-CZ')} km</span>
                </div>
                <div className={`flex items-center mt-2 font-medium ${statusInfo[vehicle.status].color}`}>
                    {statusInfo[vehicle.status].icon}
                    <span className="ml-2">{statusInfo[vehicle.status].text}</span>
                </div>
            </div>
            <div className="p-4 bg-gray-50 border-t">
                 <div className="text-sm space-y-1">
                    <p className="flex justify-between"><span>4 hodiny:</span> <span className="font-bold text-primary">{vehicle.rate4h.toLocaleString('cs-CZ')} Kč</span></p>
                    <p className="flex justify-between"><span>12 hodin:</span> <span className="font-bold text-primary">{vehicle.rate12h.toLocaleString('cs-CZ')} Kč</span></p>
                    <p className="flex justify-between"><span>1+ den:</span> <span className="font-bold text-primary">{vehicle.dailyRate.toLocaleString('cs-CZ')} Kč/den</span></p>
                </div>
                <button onClick={() => onEdit(vehicle)} className="w-full mt-3 bg-primary text-white py-2 rounded-lg hover:bg-primary-hover transition-colors">
                    Upravit
                </button>
            </div>
        </div>
    );
};

const VehicleFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    vehicle: Partial<Vehicle> | null;
}> = ({ isOpen, onClose, onSave, vehicle }) => {
    const getInitialData = (v: Partial<Vehicle> | null): Partial<Vehicle> => v || {
        name: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        licensePlate: '',
        status: 'available',
        rate4h: 0,
        rate12h: 0,
        dailyRate: 0,
        features: [],
        currentMileage: 0,
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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);
        
        if (!formData.name || !formData.licensePlate) {
            setError("Název a SPZ jsou povinné.");
            setIsSaving(false);
            return;
        }

        try {
            if (formData.id) {
                await updateVehicle(formData as Vehicle);
            } else {
                await addVehicle(formData as Omit<Vehicle, 'id' | 'imageUrl'>);
            }
            onSave();
        } catch (err) {
            console.error("Failed to save vehicle", err);
            setError(err instanceof Error ? err.message : 'Uložení vozidla se nezdařilo');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{vehicle?.id ? 'Upravit vozidlo' : 'Přidat nové vozidlo'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" placeholder="Název (např. Ford Transit L2H2)" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 border rounded" required />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Značka" value={formData.make || ''} onChange={e => setFormData({ ...formData, make: e.target.value })} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="Model" value={formData.model || ''} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full p-2 border rounded" required />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Rok výroby" value={formData.year || ''} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="SPZ" value={formData.licensePlate || ''} onChange={e => setFormData({ ...formData, licensePlate: e.target.value })} className="w-full p-2 border rounded" required />
                    </div>
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Aktuální stav kilometrů</label>
                        <input type="number" placeholder="Aktuální stav km" value={formData.currentMileage || 0} onChange={e => setFormData({ ...formData, currentMileage: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" required />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Ceny pronájmu</label>
                         <div className="grid grid-cols-3 gap-4">
                            <input type="number" placeholder="Cena / 4 hod" value={formData.rate4h || 0} onChange={e => setFormData({ ...formData, rate4h: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" required />
                            <input type="number" placeholder="Cena / 12 hod" value={formData.rate12h || 0} onChange={e => setFormData({ ...formData, rate12h: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" required />
                            <input type="number" placeholder="Cena / den (24h+)" value={formData.dailyRate || 0} onChange={e => setFormData({ ...formData, dailyRate: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" required />
                        </div>
                    </div>
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Stav vozidla</label>
                         <select value={formData.status || 'available'} onChange={e => setFormData({ ...formData, status: e.target.value as Vehicle['status'] })} className="w-full p-2 border rounded">
                            <option value="available">K dispozici</option>
                            <option value="rented">Pronajato</option>
                            <option value="maintenance">V servisu</option>
                        </select>
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            <strong className="font-bold">Chyba: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                        <button type="submit" disabled={isSaving} className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400">
                            {isSaving ? 'Ukládám...' : 'Uložit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Vehicles: React.FC = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Partial<Vehicle> | null>(null);

    const fetchVehiclesData = async () => {
        setLoading(true);
        try {
            const data = await getVehicles();
            setVehicles(data);
        } catch (error) {
            console.error("Failed to fetch vehicles:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehiclesData();
    }, []);

    const handleOpenModal = (vehicle: Vehicle | null = null) => {
        setSelectedVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedVehicle(null);
    };

    const handleSave = () => {
        handleCloseModal();
        fetchVehiclesData();
    };

    if (loading) return <div>Načítání vozidel...</div>;

    return (
        <div>
            <VehicleFormModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSave} vehicle={selectedVehicle} />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Vozový park</h1>
                <button onClick={() => handleOpenModal()} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Přidat vozidlo
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {vehicles.map(vehicle => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} onEdit={handleOpenModal} />
                ))}
            </div>
        </div>
    );
};

export default Vehicles;