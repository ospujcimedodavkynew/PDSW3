import React, { useState, useEffect } from 'react';
import { X, Loader, Calendar, User } from 'lucide-react';
import { Vehicle, VehicleDamage } from '../types';
import { getDamagesForVehicle } from '../services/api';

interface DamageHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: Vehicle | null;
}

const DamageHistoryModal: React.FC<DamageHistoryModalProps> = ({ isOpen, onClose, vehicle }) => {
    const [damages, setDamages] = useState<VehicleDamage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && vehicle) {
            const fetchDamages = async () => {
                setLoading(true);
                try {
                    const data = await getDamagesForVehicle(vehicle.id);
                    setDamages(data);
                } catch (error) {
                    console.error(`Failed to fetch damages for vehicle ${vehicle.id}`, error);
                } finally {
                    setLoading(false);
                }
            };
            fetchDamages();
        }
    }, [isOpen, vehicle]);
    
    if (!isOpen || !vehicle) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 py-10 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-3xl">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">Historie poškození</h2>
                        <p className="text-gray-600">{vehicle.name} ({vehicle.licensePlate})</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>

                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader className="w-8 h-8 animate-spin text-primary" />
                            <span className="ml-3 text-gray-600">Načítání historie...</span>
                        </div>
                    ) : damages.length > 0 ? (
                        damages.map(damage => (
                            <div key={damage.id} className="bg-gray-50 border rounded-lg p-4 flex flex-col md:flex-row gap-4">
                                <a href={damage.imageUrl} target="_blank" rel="noopener noreferrer" className="md:w-1/3 flex-shrink-0">
                                    <img src={damage.imageUrl} alt={damage.description} className="w-full h-40 object-cover rounded-md border" />
                                </a>
                                <div className="flex-grow">
                                    <h3 className="text-lg font-semibold">{damage.description}</h3>
                                    <p className="text-gray-600 mb-2">{damage.location}</p>
                                    <div className="text-sm space-y-1 text-gray-500">
                                        <p className="flex items-center"><Calendar className="w-4 h-4 mr-2" />Nahlášeno: {new Date(damage.reportedAt).toLocaleString('cs-CZ')}</p>
                                        {/* FIX: Corrected property access from `customers` to `customer` to match the Reservation type. */}
                                        {damage.reservation && damage.reservation.customer && (
                                            <p className="flex items-center"><User className="w-4 h-4 mr-2" />Při rezervaci zákazníka: {damage.reservation.customer.firstName} {damage.reservation.customer.lastName}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 bg-gray-50 rounded-lg">
                            <p className="font-semibold text-gray-700">Žádná poškození nebyla nalezena</p>
                            <p className="text-sm text-gray-500 mt-1">Pro toto vozidlo nebyly zaznamenány žádné škody.</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="py-2 px-6 rounded-lg bg-gray-200 hover:bg-gray-300">Zavřít</button>
                </div>
            </div>
        </div>
    );
};

export default DamageHistoryModal;