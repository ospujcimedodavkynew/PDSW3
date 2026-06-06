import React, { useState, useMemo, useEffect } from 'react';
import { X, Trash2, Calendar, Car, User, AlertTriangle, RefreshCw } from 'lucide-react';
import { Reservation } from '../types';
import { calculateTotalPrice } from '../contexts/DataContext';

interface BulkCleanupModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservations: Reservation[];
    onClean: (ids: string[]) => Promise<void>;
}

const BulkCleanupModal: React.FC<BulkCleanupModalProps> = ({ isOpen, onClose, reservations, onClean }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    // Sync selectedIds with reservations when modal opens or reservations change
    useEffect(() => {
        if (isOpen) {
            setSelectedIds(reservations.map(r => r.id));
        }
    }, [isOpen, reservations]);

    const isAllSelected = useMemo(() => {
        return reservations.length > 0 && selectedIds.length === reservations.length;
    }, [reservations, selectedIds]);

    if (!isOpen) return null;

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(reservations.map(r => r.id));
        }
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleConfirmDelete = async () => {
        if (selectedIds.length === 0) return;
        
        const confirmText = `Opravdu chcete hromadně zrušit a smazat ${selectedIds.length} vybraných rezervací z minulosti?\nTato akce je nevratná a odstraní tyto rezervace z kalendáře a přehledů.`;
        if (window.confirm(confirmText)) {
            setIsDeleting(true);
            try {
                await onClean(selectedIds);
                alert("Vybrané zapomenuté rezervace byly úspěšně smazány.");
                onClose();
            } catch (error) {
                console.error("Failed to bulk delete old reservations:", error);
                alert("Během hromadného mazání došlo k chybě.");
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-65 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-red-50 text-red-950 rounded-t-lg">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-650 flex-shrink-0" />
                        <div>
                            <h2 className="text-xl font-bold">Hromadné vyčištění neuskutečněných rezervací</h2>
                            <p className="text-xs text-red-800">Tyto rezervace měly začít v minulosti, ale stav nebyl nikdy změněn na aktivní nebo dokončený.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-red-100 text-red-950 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-grow select-none">
                    {reservations.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            Nemáte žádné neuskutečněné rezervace v minulosti, které by vyžadovaly vyčištění.
                        </div>
                    ) : (
                        <>
                            {/* Actions / Select All */}
                            <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-lg border">
                                <label className="flex items-center gap-3 font-semibold text-gray-700 cursor-pointer text-sm">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={handleToggleSelectAll}
                                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                    />
                                    <span>Vybrat vše ({reservations.length})</span>
                                </label>
                                <span className="text-xs text-gray-500 font-medium">
                                    Vybráno: <strong className="text-red-600">{selectedIds.length}</strong> / {reservations.length}
                                </span>
                            </div>

                            {/* List */}
                            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                                {reservations.map(res => {
                                    const isSelected = selectedIds.includes(res.id);
                                    return (
                                        <div
                                            key={res.id}
                                            onClick={() => handleToggleSelect(res.id)}
                                            className={`p-4 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-all ${
                                                isSelected 
                                                    ? 'border-red-300 bg-red-50/50 hover:bg-red-50' 
                                                    : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelect(res.id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-bold text-gray-800 text-base">
                                                            {res.customer ? `${res.customer.firstName} ${res.customer.lastName}` : 'Neznámý zákazník'}
                                                        </span>
                                                        <span className="font-mono text-xs px-2 py-0.5 bg-gray-150 text-gray-650 rounded">
                                                            {res.customer?.phone}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                                                        <span className="flex items-center gap-1.5 font-medium">
                                                            <Calendar className="w-4 h-4 text-gray-400" />
                                                            {new Date(res.startDate).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}
                                                            {" — "}
                                                            {new Date(res.endDate).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <Car className="w-4 h-4 text-gray-400" />
                                                            {res.vehicle?.name} (<span className="font-mono text-xs">{res.vehicle?.licensePlate}</span>)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-gray-400 text-xs">Předpokládaná cena</p>
                                                <p className="font-extrabold text-base text-gray-700">
                                                    {res.vehicle && res.startDate && res.endDate ? `${calculateTotalPrice(res.vehicle, new Date(res.startDate), new Date(res.endDate)).toLocaleString('cs-CZ')} Kč` : '0 Kč'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t flex justify-between items-center bg-gray-50 rounded-b-lg">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 border rounded-lg text-gray-700 font-semibold hover:bg-gray-150 disabled:opacity-50 transition-colors"
                    >
                        Zavřít
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={isDeleting || selectedIds.length === 0}
                        className={`flex items-center gap-2 py-2.5 px-5 rounded-lg font-bold shadow transition-all ${
                            selectedIds.length === 0 || isDeleting
                                ? 'bg-gray-350 text-gray-200 cursor-not-allowed shadow-none'
                                : 'bg-red-600 text-white hover:bg-red-750 hover:shadow-md'
                        }`}
                    >
                        {isDeleting ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                Odstraňování...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-5 h-5" />
                                Smazat vybrané ({selectedIds.length})
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkCleanupModal;
