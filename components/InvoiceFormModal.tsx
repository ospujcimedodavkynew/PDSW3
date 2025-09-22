import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Contract, FinancialTransaction, Invoice } from '../types';
import { X, Loader, Search } from 'lucide-react';

interface InvoiceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    contracts: Contract[];
    financials: FinancialTransaction[];
}

const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({ isOpen, onClose, contracts, financials }) => {
    const { data, actions } = useData();
    const { settings } = data;

    const [selectedContractId, setSelectedContractId] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('transfer');
    const [dueDate, setDueDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const selectedContract = useMemo(() => contracts.find(c => c.id === selectedContractId), [contracts, selectedContractId]);

    const totalAmount = useMemo(() => {
        if (!selectedContract) return 0;
        const relatedTransaction = financials.find(t => t.reservationId === selectedContract.reservationId && t.type === 'income');
        return relatedTransaction?.amount || 0;
    }, [financials, selectedContract]);

    useEffect(() => {
        if (isOpen) {
            // Reset form when modal opens
            setSelectedContractId('');
            setPaymentMethod('transfer');
            const defaultDueDate = new Date();
            defaultDueDate.setDate(defaultDueDate.getDate() + 14);
            setDueDate(defaultDueDate.toISOString().split('T')[0]);
            setSearchTerm('');
        }
    }, [isOpen]);

    const filteredContracts = useMemo(() => {
        if (!searchTerm) return contracts;
        const lowercasedTerm = searchTerm.toLowerCase();
        return contracts.filter(c => 
            `${c.customer?.firstName} ${c.customer?.lastName}`.toLowerCase().includes(lowercasedTerm) ||
            c.vehicle?.name.toLowerCase().includes(lowercasedTerm) ||
            c.vehicle?.licensePlate.toLowerCase().replace(/\s/g, '').includes(lowercasedTerm.replace(/\s/g, '')) ||
            c.id.toLowerCase().includes(lowercasedTerm)
        );
    }, [contracts, searchTerm]);
    
    const getNextInvoiceNumber = () => {
        const currentYear = new Date().getFullYear();
        const yearInvoices = data.invoices.filter(i => i.invoiceNumber.startsWith(String(currentYear)));
        const maxNumber = yearInvoices.reduce((max, i) => {
            const numPart = parseInt(i.invoiceNumber.slice(4), 10);
            return numPart > max ? numPart : max;
        }, 0);
        return `${currentYear}${(maxNumber + 1).toString().padStart(3, '0')}`;
    };

    const handleSubmit = async () => {
        if (!selectedContract || !selectedContract.customer || !settings) {
            alert("Vyberte prosím smlouvu a ujistěte se, že máte vyplněné fakturační údaje v nastavení.");
            return;
        }
        setIsSaving(true);
        try {
            const invoiceData: Omit<Invoice, 'id'> = {
                invoiceNumber: getNextInvoiceNumber(),
                contractId: selectedContract.id,
                customerId: selectedContract.customerId,
                issueDate: new Date(),
                dueDate: new Date(dueDate),
                paymentMethod,
                totalAmount,
                status: 'unpaid',
                supplierJson: settings,
                customerJson: selectedContract.customer,
            };
            await actions.addInvoice(invoiceData);
            onClose();
        } catch (error) {
            console.error("Failed to create invoice:", error);
            alert("Vytvoření faktury se nezdařilo.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-start z-50 pt-10 pb-10 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Vytvořit novou fakturu</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                
                {!settings || !settings.companyName ? (
                     <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
                        <p className="font-bold text-red-800">Chybí fakturační údaje!</p>
                        <p className="text-sm text-red-700 mt-1">Prosím, nejprve vyplňte údaje o vaší společnosti v sekci "Nastavení", abyste mohli vystavovat faktury.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">1. Vyberte smlouvu k fakturaci</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input 
                                    type="text"
                                    placeholder="Hledat smlouvu (zákazník, SPZ...)"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full p-2 pl-10 border rounded-md mb-2"
                                />
                            </div>
                            <select 
                                value={selectedContractId}
                                onChange={e => setSelectedContractId(e.target.value)}
                                className="w-full p-2 border rounded-md bg-white"
                            >
                                <option value="">-- Vyberte smlouvu --</option>
                                {filteredContracts.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.customer?.firstName} {c.customer?.lastName} - {c.vehicle?.name} ({c.vehicle?.licensePlate}) - {new Date(c.generatedAt).toLocaleDateString('cs-CZ')}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {selectedContract && (
                            <div className="p-4 bg-gray-50 border rounded-lg space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Souhrn</h3>
                                    <div className="text-sm space-y-1">
                                        <p><strong>Zákazník:</strong> {selectedContract.customer?.firstName} {selectedContract.customer?.lastName}</p>
                                        <p><strong>Vozidlo:</strong> {selectedContract.vehicle?.name}</p>
                                        <p className="font-bold text-lg"><strong>Částka k fakturaci:</strong> {totalAmount.toLocaleString('cs-CZ')} Kč</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">2. Forma úhrady</label>
                                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full p-2 border rounded-md bg-white">
                                            <option value="transfer">Převodem na účet</option>
                                            <option value="cash">Hotově</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">3. Datum splatnosti</label>
                                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded-md" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 pt-4">
                            <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                            <button 
                                onClick={handleSubmit}
                                disabled={isSaving || !selectedContract || totalAmount <= 0}
                                className="py-2 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover disabled:bg-gray-400 flex items-center"
                            >
                                {isSaving ? <Loader className="w-5 h-5 animate-spin mr-2"/> : null}
                                {isSaving ? 'Vystavuji...' : 'Vystavit fakturu'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvoiceFormModal;
