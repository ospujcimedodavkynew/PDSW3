import React, { useState } from 'react';
import type { Vehicle } from '../types';
import { Wrench, ShieldAlert, Plus } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import ServiceHistoryModal from '../components/ServiceHistoryModal';
import DamageHistoryModal from '../components/DamageHistoryModal';

const VehicleCard: React.FC<{
    vehicle: Vehicle;
    onShowServiceHistory: (vehicle: Vehicle) => void;
    onShowDamageHistory: (vehicle: Vehicle) => void;
}> = ({ vehicle, onShowServiceHistory, onShowDamageHistory }) => {
    
    const statusInfo = {
        available: { text: 'K dispozici', color: 'bg-green-500' },
        rented: { text: 'Pronajato', color: 'bg-yellow-500' },
        maintenance: { text: 'V servisu', color: 'bg-red-500' },
    };
    
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
            <img src={vehicle.imageUrl} alt={vehicle.name} className="w-full h-48 object-cover"/>
            <div className="p-4 flex-grow flex flex-col">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-gray-800">{vehicle.name}</h3>
                     <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${statusInfo[vehicle.status].color}`}>
                        {statusInfo[vehicle.status].text}
                    </span>
                </div>
                <p className="text-gray-600">{vehicle.licensePlate} &bull; {vehicle.year}</p>
                <p className="text-sm text-gray-500 mt-1">{vehicle.currentMileage.toLocaleString('cs-CZ')} km</p>
                
                <div className="mt-4 pt-4 border-t flex-grow">
                    <p className="text-sm">4h: <span className="font-bold">{vehicle.rate4h} Kč</span></p>
                    <p className="text-sm">12h: <span className="font-bold">{vehicle.rate12h} Kč</span></p>
                    <p className="text-sm">Den: <span className="font-bold">{vehicle.dailyRate} Kč</span></p>
                </div>
                
                <div className="mt-4 flex space-x-2">
                    <button onClick={() => onShowServiceHistory(vehicle)} className="flex-1 bg-blue-100 text-blue-800 text-sm py-2 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center">
                        <Wrench className="w-4 h-4 mr-2" /> Servis
                    </button>
                    <button onClick={() => onShowDamageHistory(vehicle)} className="flex-1 bg-red-100 text-red-800 text-sm py-2 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center">
                        <ShieldAlert className="w-4 h-4 mr-2" /> Poškození
                    </button>
                </div>
            </div>
        </div>
    );
};


const Vehicles: React.FC = () => {
    const { data, loading } = useData();
    const { vehicles } = data;
    
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

    const handleShowServiceHistory = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setIsServiceModalOpen(true);
    };
    
    const handleShowDamageHistory = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setIsDamageModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsServiceModalOpen(false);
        setIsDamageModalOpen(false);
        setSelectedVehicle(null);
    };

    if (loading && vehicles.length === 0) return <div>Načítání vozového parku...</div>;

    return (
        <div>
            <ServiceHistoryModal isOpen={isServiceModalOpen} onClose={handleCloseModals} vehicle={selectedVehicle} />
            <DamageHistoryModal isOpen={isDamageModalOpen} onClose={handleCloseModals} vehicle={selectedVehicle} />

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Vozový park</h1>
                <button onClick={() => alert('Funkce pro přidání vozidla není implementována.')} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Přidat vozidlo
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {vehicles.map(vehicle => (
                    <VehicleCard 
                        key={vehicle.id} 
                        vehicle={vehicle}
                        onShowServiceHistory={handleShowServiceHistory}
                        onShowDamageHistory={handleShowDamageHistory}
                    />
                ))}
            </div>
        </div>
    );
};

export default Vehicles;
