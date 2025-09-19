import React, { useState, useMemo } from 'react';
import type { Vehicle } from '../types';
import { Wrench, ShieldAlert, Plus, Edit, Search, ShieldCheck } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import ServiceHistoryModal from '../components/ServiceHistoryModal';
import DamageHistoryModal from '../components/DamageHistoryModal';
import VehicleFormModal from '../components/VehicleFormModal';

const getDeadlineStatus = (dateString?: string | Date): { text: string; color: string; } => {
    if (!dateString) return { text: 'Nezadáno', color: 'text-gray-400' };

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { text: 'Chybné datum', color: 'text-red-500 font-bold' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let color = 'text-gray-600';
    if (diffDays < 0) {
        color = 'text-red-600 font-bold';
    } else if (diffDays <= 30) {
        color = 'text-yellow-600 font-semibold';
    }

    return {
        text: date.toLocaleDateString('cs-CZ'),
        color,
    };
};

const VehicleCard: React.FC<{
    vehicle: Vehicle;
    onEdit: (vehicle: Vehicle) => void;
    onShowServiceHistory: (vehicle: Vehicle) => void;
    onShowDamageHistory: (vehicle: Vehicle) => void;
}> = ({ vehicle, onEdit, onShowServiceHistory, onShowDamageHistory }) => {
    
    const statusInfo = {
        available: { text: 'K dispozici', color: 'bg-green-500' },
        rented: { text: 'Pronajato', color: 'bg-yellow-500' },
        maintenance: { text: 'V servisu', color: 'bg-red-500' },
    };

    const stkStatus = getDeadlineStatus(vehicle.stkValidUntil);
    const insuranceStatus = getDeadlineStatus(vehicle.insuranceValidUntil);
    
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
            <img src={vehicle.imageUrl || 'https://via.placeholder.com/300x200.png?text=Vuz+bez+foto'} alt={vehicle.name} className="w-full h-48 object-cover"/>
            <div className="p-4 flex-grow flex flex-col">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-gray-800">{vehicle.name}</h3>
                     <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${statusInfo[vehicle.status].color}`}>
                        {statusInfo[vehicle.status].text}
                    </span>
                </div>
                <p className="text-gray-600">{vehicle.licensePlate} &bull; {vehicle.year}</p>
                <p className="text-sm text-gray-500 mt-1">{vehicle.currentMileage.toLocaleString('cs-CZ')} km</p>
                
                <div className="my-3 pt-3 border-t space-y-2 text-sm">
                    <p className={`flex items-center justify-between ${stkStatus.color}`}>
                        <span className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2" /> STK platná do:</span>
                        <span className="font-medium">{stkStatus.text}</span>
                    </p>
                    <p className={`flex items-center justify-between ${insuranceStatus.color}`}>
                        <span className="flex items-center"><ShieldCheck className="w-4 h-4 mr-2" /> Pojištění do:</span>
                        <span className="font-medium">{insuranceStatus.text}</span>
                    </p>
                </div>
                
                <div className="pt-3 border-t">
                    <p className="text-sm">4h: <span className="font-bold">{vehicle.rate4h} Kč</span></p>
                    <p className="text-sm">12h: <span className="font-bold">{vehicle.rate12h} Kč</span></p>
                    <p className="text-sm">Den: <span className="font-bold">{vehicle.dailyRate} Kč</span></p>
                </div>
                
                 <div className="mt-auto pt-4 border-t flex space-x-2">
                    <button onClick={() => onEdit(vehicle)} className="flex-1 bg-gray-100 text-gray-800 text-sm py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center">
                        <Edit className="w-4 h-4 mr-2" /> Upravit
                    </button>
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
    const [isVehicleFormModalOpen, setIsVehicleFormModalOpen] = useState(false);
    
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | Vehicle['status']>('all');

    const filteredVehicles = useMemo(() => {
        return vehicles.filter(vehicle => {
            const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
            const matchesSearch = searchTerm === '' ||
                vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (vehicle.make && vehicle.make.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (vehicle.model && vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()));
            
            return matchesStatus && matchesSearch;
        });
    }, [vehicles, searchTerm, statusFilter]);

    const handleShowServiceHistory = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setIsServiceModalOpen(true);
    };
    
    const handleShowDamageHistory = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setIsDamageModalOpen(true);
    };

    const handleOpenVehicleForm = (vehicle: Vehicle | null = null) => {
        setSelectedVehicle(vehicle);
        setIsVehicleFormModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsServiceModalOpen(false);
        setIsDamageModalOpen(false);
        setIsVehicleFormModalOpen(false);
        setSelectedVehicle(null);
    };

    if (loading && vehicles.length === 0) return <div>Načítání vozového parku...</div>;

    const filterButtons: { value: 'all' | Vehicle['status']; label: string }[] = [
        { value: 'all', label: 'Všechny' },
        { value: 'available', label: 'K dispozici' },
        { value: 'rented', label: 'Pronajato' },
        { value: 'maintenance', label: 'V servisu' },
    ];

    return (
        <div>
            <ServiceHistoryModal isOpen={isServiceModalOpen} onClose={handleCloseModals} vehicle={selectedVehicle} />
            <DamageHistoryModal isOpen={isDamageModalOpen} onClose={handleCloseModals} vehicle={selectedVehicle} />
            <VehicleFormModal isOpen={isVehicleFormModalOpen} onClose={handleCloseModals} vehicle={selectedVehicle} />

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Vozový park</h1>
                <button onClick={() => handleOpenVehicleForm()} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Přidat vozidlo
                </button>
            </div>

            {/* Search and Filter Controls */}
            <div className="mb-6 p-4 bg-white rounded-lg shadow-md space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Hledat vozidlo (podle názvu, SPZ, značky...)"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border rounded-md"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-600">Filtr stavu:</span>
                    {filterButtons.map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => setStatusFilter(value)}
                            className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
                                statusFilter === value
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredVehicles.map(vehicle => (
                    <VehicleCard 
                        key={vehicle.id} 
                        vehicle={vehicle}
                        onEdit={handleOpenVehicleForm}
                        onShowServiceHistory={handleShowServiceHistory}
                        onShowDamageHistory={handleShowDamageHistory}
                    />
                ))}
            </div>
             {filteredVehicles.length === 0 && (
                <div className="col-span-full text-center py-10 bg-white rounded-lg shadow-md">
                    <p className="font-semibold text-gray-700">Nebylo nalezeno žádné vozidlo</p>
                    <p className="text-sm text-gray-500 mt-1">Zkuste upravit filtry nebo hledaný výraz.</p>
                </div>
            )}
        </div>
    );
};

export default Vehicles;