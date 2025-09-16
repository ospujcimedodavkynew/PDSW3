import React, { useState, useMemo, FormEvent, useEffect } from 'react';
import type { Reservation, Customer, Vehicle } from '../types';
import { useData } from '../contexts/DataContext';
import { Plus, Search, X, Edit, Trash2 } from 'lucide-react';

// --- Reservation Form Modal ---
interface ReservationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: Partial<Reservation> | null;
    customers: Customer[];
    vehicles: Vehicle[];
}

const ReservationFormModal: React.FC<ReservationFormModalProps> = ({ isOpen, onClose, reservation, customers, vehicles }) => {
    const { actions } = useData();

    const getInitialData = (r: Partial<Reservation> | null): Partial<Reservation> => r || {
        customerId: '', vehicleId: '', startDate: '', endDate: '', notes: ''
    };

    const [formData, setFormData] = useState<Partial<Reservation>>(getInitialData(reservation));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialData(reservation));
            setError(null);
        }
    }, [reservation, isOpen]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        if (!formData.customerId || !formData.vehicleId || !formData.startDate || !formData.endDate) {
            setError("Všechna pole jsou povinná.");
            setIsSaving(false);
            return;
        }

        try {
            const payload: Omit<Reservation, 'id' | 'status'> = {
                customerId: formData.customerId,
                vehicleId: formData.vehicleId,
                startDate: new Date(formData.startDate as string),
                endDate: new Date(formData.endDate as string),
                notes: formData.notes,
            };

            // This is a simplified form; it doesn't handle updates for now
            // as the main flow is via Dashboard actions. This form adds new 'scheduled' reservations.
            await actions.addReservation(payload);
            onClose();
        } catch (err) {
            console.error("Failed to save reservation:", err);
            setError(err instanceof Error ? err.message : 'Uložení rezervace se nezdařilo');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;
    
    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{reservation?.id ? 'Upravit rezervaci' : 'Nová rezervace'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Zákazník</label>
                        <select value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} className="w-full p-2 border rounded bg-white" required>
                             <option value="">-- Vyberte zákazníka --</option>
                             {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">Vozidlo</label>
                        <select value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})} className="w-full p-2 border rounded bg-white" required>
                             <option value="">-- Vyberte vozidlo --</option>
                             {vehicles.map(v => <option key={v.id} value={v.id} disabled={v.status !== 'available'}>{v.name} ({v.licensePlate}) {v.status !== 'available' ? `(${v.status})` : ''}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium">Začátek</label>
                            <input type="datetime-local" value={formData.startDate as string} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full p-2 border rounded" required />
                         </div>
                         <div>
                            <label className="block text-sm font-medium">Konec</label>
                            <input type="datetime-local" value={formData.endDate as string} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full p-2 border rounded" required />
                         </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">Poznámky</label>
                        <textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2 border rounded h-20" />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                        <button type="submit" disabled={isSaving} className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400">
                            {isSaving ? 'Ukládám...' : 'Uložit rezervaci'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main Reservations Page Component ---
const Reservations: React.FC = () => {
    const { data, loading } = useData();
    const { reservations, customers, vehicles } = data;
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | Reservation['status']>('all');

    const filteredReservations = useMemo(() => {
        return reservations
            .filter(r => statusFilter === 'all' || r.status === statusFilter)
            .filter(r => {
                const customerName = `${r.customer?.firstName || ''} ${r.customer?.lastName || ''}`.toLowerCase();
                const vehicleName = `${r.vehicle?.name || ''} ${r.vehicle?.licensePlate || ''}`.toLowerCase();
                const search = searchTerm.toLowerCase();
                return search === '' || customerName.includes(search) || vehicleName.includes(search);
            })
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [reservations, searchTerm, statusFilter]);

    const handleOpenModal = (reservation: Reservation | null = null) => {
        setSelectedReservation(reservation);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedReservation(null);
    };

    if (loading && reservations.length === 0) return <div>Načítání rezervací...</div>;

    const statusInfo: Record<Reservation['status'], { text: string; color: string }> = {
        'pending-customer': { text: 'Čeká na zákazníka', color: 'bg-gray-200 text-gray-800' },
        'scheduled': { text: 'Naplánováno', color: 'bg-blue-200 text-blue-800' },
        'active': { text: 'Probíhá', color: 'bg-yellow-200 text-yellow-800' },
        'completed': { text: 'Dokončeno', color: 'bg-green-200 text-green-800' },
    };

     const filterButtons: { value: 'all' | Reservation['status']; label: string }[] = [
        { value: 'all', label: 'Všechny' },
        { value: 'active', label: 'Probíhající' },
        { value: 'scheduled', label: 'Naplánované' },
        { value: 'completed', label: 'Dokončené' },
        { value: 'pending-customer', label: 'Čekající' },
    ];


    return (
        <div>
            <ReservationFormModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                reservation={selectedReservation}
                customers={customers}
                vehicles={vehicles}
            />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Rezervace</h1>
                <button onClick={() => handleOpenModal()} className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Přidat rezervaci
                </button>
            </div>
            
            <div className="mb-6 p-4 bg-white rounded-lg shadow-md space-y-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Hledat rezervaci (zákazník, vozidlo...)"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border rounded-md"
                    />
                </div>
                 <div className="flex items-center space-x-2 flex-wrap gap-2">
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

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                         <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                            <th className="px-5 py-3">Zákazník</th>
                            <th className="px-5 py-3">Vozidlo</th>
                            <th className="px-5 py-3">Termín</th>
                            <th className="px-5 py-3">Stav</th>
                            <th className="px-5 py-3">Akce</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                       {filteredReservations.map(r => (
                           <tr key={r.id} className="hover:bg-gray-50">
                               <td className="px-5 py-4 font-medium">{r.customer?.firstName} {r.customer?.lastName}</td>
                               <td className="px-5 py-4">{r.vehicle?.name}</td>
                               <td className="px-5 py-4 text-sm">
                                   {new Date(r.startDate).toLocaleString('cs-CZ')} - {new Date(r.endDate).toLocaleString('cs-CZ')}
                               </td>
                               <td className="px-5 py-4">
                                   <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo[r.status]?.color}`}>
                                       {statusInfo[r.status]?.text}
                                   </span>
                               </td>
                               <td className="px-5 py-4">
                                   {/* Edit is complex due to status changes, so we'll omit it for now */}
                                   {/* <button onClick={() => handleOpenModal(r)} className="text-blue-600 hover:text-blue-800"><Edit className="w-4 h-4" /></button> */}
                               </td>
                           </tr>
                       ))}
                       {filteredReservations.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">
                                    Nebyly nalezeny žádné rezervace.
                                </td>
                            </tr>
                       )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Reservations;
