import React, { useState, useEffect, FormEvent } from 'react';
// FIX: Replaced non-existent 'Tool' icon with 'Hammer'
import { X, Loader, Calendar, Wrench, Plus, CheckCircle, Hammer } from 'lucide-react';
import { Vehicle, VehicleService } from '../types';
import { getServicesForVehicle } from '../services/api';
import { useData } from '../contexts/DataContext';

interface ServiceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: Vehicle | null;
}

const ServiceHistoryModal: React.FC<ServiceHistoryModalProps> = ({ isOpen, onClose, vehicle }) => {
    const { actions } = useData();
    const [services, setServices] = useState<VehicleService[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [description, setDescription] = useState('');
    const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [cost, setCost] = useState('');
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState<'planned' | 'completed'>('completed');

    const fetchServices = async () => {
        if (vehicle) {
            setLoading(true);
            try {
                // We still fetch per-vehicle details here as it's specific
                const data = await getServicesForVehicle(vehicle.id);
                setServices(data);
            } catch (error) {
                console.error(`Failed to fetch services for vehicle ${vehicle.id}`, error);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        if (isOpen && vehicle) {
            fetchServices();
        }
    }, [isOpen, vehicle]);
    
    const resetForm = () => {
        setDescription('');
        setServiceDate(new Date().toISOString().split('T')[0]);
        setCost('');
        setNotes('');
        setStatus('completed');
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!vehicle) return;
        setIsSaving(true);
        try {
            await actions.addService({
                vehicleId: vehicle.id,
                description,
                serviceDate: new Date(serviceDate),
                cost: cost ? parseFloat(cost) : undefined,
                notes,
                status,
            });
            resetForm();
            await fetchServices(); // Re-fetch specific vehicle services
        } catch (error) {
            alert('Nepodařilo se uložit servisní záznam.');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleMarkAsCompleted = async (service: VehicleService) => {
        const confirmed = window.confirm(`Opravdu chcete označit servisní úkon "${service.description}" jako dokončený?`);
        if (confirmed) {
            try {
                await actions.updateService(service.id, { status: 'completed' });
                await fetchServices(); // Re-fetch specific vehicle services
            } catch (error) {
                alert('Nepodařilo se aktualizovat záznam.');
                console.error(error);
            }
        }
    };

    if (!isOpen || !vehicle) return null;

    const plannedServices = services.filter(s => s.status === 'planned');
    const completedServices = services.filter(s => s.status === 'completed');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 py-10 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-4xl">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">Servisní historie a plánování</h2>
                        <p className="text-gray-600">{vehicle.name} ({vehicle.licensePlate})</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Add Service Form */}
                    <div className="lg:col-span-1">
                        <h3 className="text-lg font-semibold mb-3 border-b pb-2">Nový servisní záznam</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input type="text" placeholder="Popis (např. Výměna oleje)" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded" required />
                            <input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} className="w-full p-2 border rounded" required />
                            <input type="number" placeholder="Cena v Kč (volitelné)" value={cost} onChange={e => setCost(e.target.value)} className="w-full p-2 border rounded" />
                            <textarea placeholder="Poznámky (volitelné)" value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border rounded h-20" />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Stav</label>
                                <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full p-2 border rounded">
                                    <option value="completed">Dokončeno</option>
                                    <option value="planned">Plánováno</option>
                                </select>
                            </div>
                            <button type="submit" disabled={isSaving} className="w-full py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400 flex items-center justify-center">
                                <Plus className="w-5 h-5 mr-2" />
                                {isSaving ? 'Ukládám...' : 'Přidat záznam'}
                            </button>
                        </form>
                    </div>
                    
                    {/* Right Column: Service Lists */}
                    <div className="lg:col-span-2 max-h-[70vh] overflow-y-auto pr-2">
                        {loading ? (
                            <div className="flex justify-center items-center py-10"><Loader className="w-8 h-8 animate-spin text-primary" /></div>
                        ) : (
                            <>
                                {/* Planned Services */}
                                <div>
                                    {/* FIX: Replaced non-existent 'Tool' icon with 'Hammer' */}
                                    <h3 className="text-lg font-semibold mb-3 border-b pb-2 flex items-center"><Hammer className="w-5 h-5 mr-2 text-yellow-600" /> Plánované úkony</h3>
                                    {plannedServices.length > 0 ? (
                                        <div className="space-y-3">
                                            {plannedServices.map(s => (
                                                <div key={s.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-semibold">{s.description}</p>
                                                        <p className="text-sm text-gray-600"><Calendar className="inline w-4 h-4 mr-1"/>Plánováno na: {new Date(s.serviceDate).toLocaleDateString('cs-CZ')}</p>
                                                        {s.notes && <p className="text-xs text-gray-500 mt-1">Poznámka: {s.notes}</p>}
                                                    </div>
                                                    <button onClick={() => handleMarkAsCompleted(s)} className="py-1 px-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center">
                                                        <CheckCircle className="w-4 h-4 mr-1"/> Označit jako hotové
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-gray-500 text-sm">Nejsou naplánovány žádné servisní úkony.</p>}
                                </div>

                                {/* Completed Services History */}
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold mb-3 border-b pb-2 flex items-center"><Wrench className="w-5 h-5 mr-2 text-blue-600" /> Historie (dokončeno)</h3>
                                    {completedServices.length > 0 ? (
                                        <div className="space-y-3">
                                            {completedServices.map(s => (
                                                <div key={s.id} className="bg-gray-50 border rounded-lg p-3">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-semibold">{s.description}</p>
                                                            <p className="text-sm text-gray-600"><Calendar className="inline w-4 h-4 mr-1"/>{new Date(s.serviceDate).toLocaleDateString('cs-CZ')}</p>
                                                        </div>
                                                        {s.cost && <p className="font-bold text-lg text-red-600">-{s.cost.toLocaleString('cs-CZ')} Kč</p>}
                                                    </div>
                                                    {s.notes && <p className="text-xs text-gray-500 mt-2 border-t pt-2">Poznámka: {s.notes}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-gray-500 text-sm">Žádné dokončené servisní úkony.</p>}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={onClose} className="py-2 px-6 rounded-lg bg-gray-200 hover:bg-gray-300">Zavřít</button>
                </div>
            </div>
        </div>
    );
};

export default ServiceHistoryModal;