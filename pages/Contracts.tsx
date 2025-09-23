import React, { useState, useMemo, useEffect } from 'react';
import type { Contract } from '../types';
import { useData } from '../contexts/DataContext';
import { Search, CheckCircle, Copy, Mail } from 'lucide-react';

const Contracts: React.FC = () => {
    const { data, loading, viewingId, actions } = useData();
    const { contracts } = data;
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuccessBanner, setShowSuccessBanner] = useState(false);

    useEffect(() => {
        if (viewingId) {
            const contractToView = contracts.find(c => c.id === viewingId);
            if (contractToView) {
                setSelectedContract(contractToView);
                setShowSuccessBanner(true);
            }
            actions.clearViewingId();
        }
    }, [viewingId, contracts, actions]);

    const filteredContracts = useMemo(() => {
        return contracts.filter(contract => {
            const customerName = `${contract.customer?.firstName || ''} ${contract.customer?.lastName || ''}`;
            const vehicleName = contract.vehicle?.name || '';
            const licensePlate = contract.vehicle?.licensePlate || '';
            const contractId = contract.id || '';
            
            return searchTerm === '' ||
                customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contractId.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [contracts, searchTerm]);

    const handleBackToList = () => {
        setSelectedContract(null);
        setShowSuccessBanner(false);
    };
    
    const handleCopy = (text: string, setStatus: React.Dispatch<React.SetStateAction<string>>, successMessage: string, originalMessage: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setStatus(successMessage);
            setTimeout(() => setStatus(originalMessage), 2000);
        }).catch(err => {
            alert('Nepodařilo se zkopírovat text.');
            console.error(err);
        });
    };

    if (loading && contracts.length === 0) return <div>Načítání smluv...</div>;
    
    if (selectedContract) {
        const [copyTextStatus, setCopyTextStatus] = useState('Kopírovat text smlouvy');
        const [copyEmailStatus, setCopyEmailStatus] = useState('Kopírovat e-mail zákazníka');

        return (
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">Detail Smlouvy</h2>
                        <p className="text-gray-500">Číslo: {selectedContract.id}</p>
                    </div>
                    <button onClick={handleBackToList} className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                        Zpět na seznam
                    </button>
                </div>

                {showSuccessBanner && (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg mb-6 flex flex-col sm:flex-row items-center gap-4">
                        <CheckCircle className="w-10 h-10 text-green-500 flex-shrink-0" />
                        <div className="flex-grow text-center sm:text-left">
                            <h3 className="font-bold">Smlouva byla úspěšně vytvořena!</h3>
                            <p className="text-sm">Nyní ji můžete snadno odeslat zákazníkovi.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                             <button
                                onClick={() => handleCopy(selectedContract.contractText, setCopyTextStatus, 'Zkopírováno!', 'Kopírovat text smlouvy')}
                                className={`w-full flex items-center justify-center py-2 px-3 rounded-lg font-semibold transition-colors text-sm ${copyTextStatus.includes('!') ? 'bg-green-600 text-white' : 'bg-green-200 hover:bg-green-300'}`}
                            >
                                <Copy className="w-4 h-4 mr-2" /> {copyTextStatus}
                            </button>
                            {selectedContract.customer?.email && (
                                <button
                                    onClick={() => handleCopy(selectedContract.customer!.email, setCopyEmailStatus, 'Zkopírováno!', 'Kopírovat e-mail')}
                                    className={`w-full flex items-center justify-center py-2 px-3 rounded-lg font-semibold transition-colors text-sm ${copyEmailStatus.includes('!') ? 'bg-green-600 text-white' : 'bg-green-200 hover:bg-green-300'}`}
                                >
                                    <Mail className="w-4 h-4 mr-2" /> {copyEmailStatus}
                                </button>
                            )}
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {selectedContract.customer && (
                        <div className="bg-gray-50 p-4 rounded-md">
                            <h3 className="font-bold text-lg mb-2">Nájemce</h3>
                            <p>{selectedContract.customer.firstName} {selectedContract.customer.lastName}</p>
                            <p>{selectedContract.customer.email}</p>
                            <p>{selectedContract.customer.phone}</p>
                        </div>
                    )}
                    {selectedContract.vehicle && (
                        <div className="bg-gray-50 p-4 rounded-md">
                            <h3 className="font-bold text-lg mb-2">Vozidlo</h3>
                            <p>{selectedContract.vehicle.name}</p>
                            <p>SPZ: {selectedContract.vehicle.licensePlate}</p>
                            <p>Rok: {selectedContract.vehicle.year}</p>
                        </div>
                    )}
                </div>

                <div className="mt-4">
                    <h3 className="font-bold text-lg mb-2">Plné znění smlouvy</h3>
                    <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded-md text-sm font-mono border overflow-auto max-h-96">
                        {selectedContract.contractText}
                    </pre>
                </div>

                <div className="mt-8 text-right">
                     <button onClick={() => window.print()} className="bg-primary text-white py-2 px-6 rounded-lg hover:bg-primary-hover">
                        Tisknout
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Archiv smluv</h1>
            
            {/* Search Control */}
            <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Hledat smlouvu (podle zákazníka, SPZ, ID...)"
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
                            <th className="px-5 py-3">ID Smlouvy</th>
                            <th className="px-5 py-3">Zákazník</th>
                            <th className="px-5 py-3">Vozidlo</th>
                            <th className="px-5 py-3">Datum vystavení</th>
                            <th className="px-5 py-3">Akce</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredContracts.length > 0 ? (
                            filteredContracts.map(contract => (
                                <tr key={contract.id} className="hover:bg-gray-50">
                                    <td className="px-5 py-4 text-sm text-gray-500 font-mono">{contract.id.substring(0, 8)}...</td>
                                    <td className="px-5 py-4">{contract.customer?.firstName} {contract.customer?.lastName}</td>
                                    <td className="px-5 py-4">{contract.vehicle?.name}</td>
                                    <td className="px-5 py-4">{new Date(contract.generatedAt).toLocaleDateString('cs-CZ')}</td>
                                    <td className="px-5 py-4">
                                        <button onClick={() => setSelectedContract(contract)} className="text-primary hover:text-primary-hover font-semibold">Zobrazit</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">
                                    Nebyly nalezeny žádné smlouvy odpovídající hledání.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Contracts;
