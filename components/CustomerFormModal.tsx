import React, { useState, useEffect, FormEvent } from 'react';
import type { Customer } from '../types';
import { X } from 'lucide-react';
import { addCustomer, updateCustomer } from '../services/api';

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    customer: Partial<Customer> | null;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSaveSuccess, customer }) => {
    const getInitialData = (c: Partial<Customer> | null): Partial<Customer> => c || {
        firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: ''
    };

    const [formData, setFormData] = useState<Partial<Customer>>(getInitialData(customer));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialData(customer));
            setError(null);
        }
    }, [customer, isOpen]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        try {
            if (formData.id) {
                await updateCustomer(formData as Customer);
            } else {
                await addCustomer(formData as Omit<Customer, 'id'>);
            }
            onSaveSuccess();
        } catch (err) {
            console.error("Failed to save customer:", err);
            setError(err instanceof Error ? err.message : 'Uložení zákazníka se nezdařilo');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{customer?.id ? 'Upravit zákazníka' : 'Přidat nového zákazníka'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Jméno" value={formData.firstName || ''} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="Příjmení" value={formData.lastName || ''} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full p-2 border rounded" required />
                    </div>
                    <input type="email" placeholder="Email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-2 border rounded" required />
                    <input type="text" placeholder="Adresa" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-2 border rounded" required />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="tel" placeholder="Telefon" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-2 border rounded" required />
                        <input type="text" placeholder="Číslo ŘP" value={formData.driverLicenseNumber || ''} onChange={e => setFormData({ ...formData, driverLicenseNumber: e.target.value })} className="w-full p-2 border rounded" required />
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

export default CustomerFormModal;