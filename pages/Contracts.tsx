

import React, { useEffect, useState } from 'react';
import { getContracts } from '../services/api';
import type { Contract } from '../types';

const Contracts: React.FC = () => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await getContracts();
                setContracts(data);
            } catch (error) {
                console.error("Failed to fetch contracts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div>Načítání smluv...</div>;
    
    if (selectedContract) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">Detail Smlouvy</h2>
                        <p className="text-gray-500">Číslo: {selectedContract.id}</p>
                    </div>
                    <button onClick={() => setSelectedContract(null)} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                </div>
                
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
                        {contracts.length > 0 ? (
                            contracts.map(contract => (
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
                                    Nebyly nalezeny žádné uložené smlouvy.
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