import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Invoice, Contract } from '../types';
import { Plus, Search, ChevronLeft, Printer, User, Car, FileText, Calendar, Hash } from 'lucide-react';
import InvoiceFormModal from '../components/InvoiceFormModal';

const Invoices: React.FC = () => {
    const { data, loading } = useData();
    const { invoices, contracts, financials } = data;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const contractsReadyForInvoicing = useMemo<Contract[]>(() => {
        const invoicedContractIds = new Set(invoices.map(inv => inv.contractId));
        return contracts.filter(contract => 
            !invoicedContractIds.has(contract.id) && 
            contract.reservationId && 
            data.reservations.find(r => r.id === contract.reservationId)?.status === 'completed'
        );
    }, [contracts, invoices, data.reservations]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(invoice => {
            const customerName = `${invoice.customer?.firstName || ''} ${invoice.customer?.lastName || ''}`;
            const invoiceNumber = invoice.invoiceNumber || '';
            
            return searchTerm === '' ||
                customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
        }).sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }, [invoices, searchTerm]);

    if (loading && invoices.length === 0) return <div>Načítání faktur...</div>;

    if (selectedInvoice) {
        return (
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-start mb-6 print:hidden">
                    <div>
                         <button onClick={() => setSelectedInvoice(null)} className="text-sm text-gray-600 hover:text-gray-900 flex items-center mb-2">
                            <ChevronLeft className="w-4 h-4 mr-1" /> Zpět na seznam
                        </button>
                        <h2 className="text-2xl font-bold">Faktura - {selectedInvoice.invoiceNumber}</h2>
                    </div>
                     <button onClick={() => window.print()} className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-hover flex items-center">
                        <Printer className="w-4 h-4 mr-2"/> Tisknout
                    </button>
                </div>

                <div className="border p-8 printable-area">
                    <header className="flex justify-between items-start pb-6 border-b">
                        <div>
                            <h1 className="text-3xl font-bold text-primary">{selectedInvoice.supplierJson.companyName}</h1>
                            <p className="text-sm text-gray-600">{selectedInvoice.supplierJson.address}</p>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-400">FAKTURA</h2>
                    </header>
                    <section className="grid grid-cols-2 gap-8 my-6">
                         <div>
                            <h3 className="font-bold text-gray-500 uppercase tracking-wider text-sm mb-2">Dodavatel</h3>
                            <p>{selectedInvoice.supplierJson.companyName}</p>
                            <p>{selectedInvoice.supplierJson.address}</p>
                            <p>IČO: {selectedInvoice.supplierJson.ico}</p>
                            <p>DIČ: {selectedInvoice.supplierJson.dic}</p>
                        </div>
                         <div>
                            <h3 className="font-bold text-gray-500 uppercase tracking-wider text-sm mb-2">Odběratel</h3>
                            <p>{selectedInvoice.customerJson.firstName} {selectedInvoice.customerJson.lastName}</p>
                            <p>{selectedInvoice.customerJson.address}</p>
                            <p>IČO: {selectedInvoice.customerJson.ico || '---'}</p>
                        </div>
                    </section>
                     <section className="grid grid-cols-4 gap-4 my-6 text-sm">
                        <div className="bg-gray-50 p-3 rounded-md">
                            <h3 className="font-bold text-gray-500 text-xs">Číslo faktury</h3>
                            <p className="font-semibold">{selectedInvoice.invoiceNumber}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                            <h3 className="font-bold text-gray-500 text-xs">Datum vystavení</h3>
                            <p className="font-semibold">{new Date(selectedInvoice.issueDate).toLocaleDateString('cs-CZ')}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                            <h3 className="font-bold text-gray-500 text-xs">Datum splatnosti</h3>
                            <p className="font-semibold">{new Date(selectedInvoice.dueDate).toLocaleDateString('cs-CZ')}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                            <h3 className="font-bold text-gray-500 text-xs">Forma úhrady</h3>
                            <p className="font-semibold capitalize">{selectedInvoice.paymentMethod === 'cash' ? 'Hotově' : 'Převodem'}</p>
                        </div>
                    </section>
                    <section>
                         <table className="min-w-full my-6">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2 text-left">Položka</th>
                                    <th className="px-4 py-2 text-right">Cena</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b">
                                    <td className="px-4 py-3">
                                        <p className="font-semibold">Pronájem vozidla - Smlouva č. {selectedInvoice.contractId.substring(0,8)}</p>
                                        <p className="text-xs text-gray-600">
                                            {selectedInvoice.contract?.vehicle?.name} ({selectedInvoice.contract?.vehicle?.licensePlate})
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">{selectedInvoice.totalAmount.toLocaleString('cs-CZ')} Kč</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                    <section className="flex justify-end mt-6">
                        <div className="w-1/2">
                            <div className="flex justify-between p-3 bg-gray-100 rounded-t-md">
                                <span className="font-semibold">Celkem k úhradě</span>
                                <span className="font-bold text-xl">{selectedInvoice.totalAmount.toLocaleString('cs-CZ')} Kč</span>
                            </div>
                        </div>
                    </section>
                     <footer className="mt-8 pt-6 border-t text-xs text-gray-500">
                         <p>Bankovní spojení: {selectedInvoice.supplierJson.bankAccount}</p>
                         <p>IBAN: {selectedInvoice.supplierJson.iban}, SWIFT: {selectedInvoice.supplierJson.swift}</p>
                         <p className="mt-2">Děkujeme za využití našich služeb.</p>
                    </footer>
                </div>
            </div>
        );
    }


    return (
        <div>
            <InvoiceFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                contracts={contractsReadyForInvoicing}
                financials={financials}
            />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Fakturace</h1>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    disabled={contractsReadyForInvoicing.length === 0}
                    className="bg-secondary text-dark-text font-bold py-2 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center disabled:bg-gray-300 disabled:cursor-not-allowed"
                    title={contractsReadyForInvoicing.length === 0 ? "Nejsou zde žádné dokončené pronájmy k fakturaci" : "Vytvořit novou fakturu"}
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Vytvořit fakturu
                </button>
            </div>
            
            <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Hledat fakturu (podle čísla, zákazníka...)"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border rounded-md"
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                            <th className="px-5 py-3">Číslo faktury</th>
                            <th className="px-5 py-3">Zákazník</th>
                            <th className="px-5 py-3">Částka</th>
                            <th className="px-5 py-3">Datum vystavení</th>
                            <th className="px-5 py-3">Splatnost</th>
                            <th className="px-5 py-3">Akce</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredInvoices.length > 0 ? (
                            filteredInvoices.map(invoice => (
                                <tr key={invoice.id} className="hover:bg-gray-50">
                                    <td className="px-5 py-4 font-semibold text-primary">{invoice.invoiceNumber}</td>
                                    <td className="px-5 py-4">{invoice.customer?.firstName} {invoice.customer?.lastName}</td>
                                    <td className="px-5 py-4 font-semibold">{invoice.totalAmount.toLocaleString('cs-CZ')} Kč</td>
                                    <td className="px-5 py-4">{new Date(invoice.issueDate).toLocaleDateString('cs-CZ')}</td>
                                    <td className="px-5 py-4">{new Date(invoice.dueDate).toLocaleDateString('cs-CZ')}</td>
                                    <td className="px-5 py-4">
                                        <button onClick={() => setSelectedInvoice(invoice)} className="text-primary hover:text-primary-hover font-semibold">Zobrazit</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-gray-500">
                                    {searchTerm ? "Nebyly nalezeny žádné faktury odpovídající hledání." : "Nebyly vystaveny žádné faktury."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Invoices;
