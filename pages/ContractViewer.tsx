import React, { useState, useEffect } from 'react';
import { getContractById } from '../services/api';
import { Contract } from '../types';
import { Loader, Printer, User, Car, Calendar } from 'lucide-react';

interface ContractViewerProps {
    contractId: string;
}

const ContractViewer: React.FC<ContractViewerProps> = ({ contractId }) => {
    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchContract = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await getContractById(contractId);
                if (!data) {
                    setError('Smlouva nebyla nalezena nebo je odkaz neplatný.');
                } else {
                    setContract(data);
                }
            } catch (e) {
                setError('Došlo k chybě při načítání smlouvy.');
                console.error(e)
            } finally {
                setLoading(false);
            }
        };
        fetchContract();
    }, [contractId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-primary animate-spin mx-auto" />
                    <p className="mt-4 text-lg font-semibold text-gray-700">Načítání smlouvy...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center p-8 bg-white shadow-lg rounded-lg">
                    <h2 className="text-2xl font-bold text-red-600">Chyba</h2>
                    <p className="mt-2 text-gray-700">{error}</p>
                </div>
            </div>
        );
    }

    if (!contract) return null;

    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl">
                <div className="p-6 md:p-8">
                    <div className="flex justify-between items-start mb-6 print:hidden">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Smlouva o pronájmu vozidla</h1>
                            <p className="text-gray-500">Číslo: {contract.id}</p>
                        </div>
                        <button onClick={() => window.print()} className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-hover flex items-center">
                            <Printer className="w-4 h-4 mr-2"/> Tisknout
                        </button>
                    </div>

                    <div className="border p-4 md:p-8 printable-area">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
                            <div className="bg-gray-50 p-4 rounded-md">
                                <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-1">Zákazník</h3>
                                <p className="flex items-center font-semibold"><User className="w-4 h-4 mr-2 text-gray-400" />{contract.customer?.firstName} {contract.customer?.lastName}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-md">
                                <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-1">Vozidlo</h3>
                                <p className="flex items-center font-semibold"><Car className="w-4 h-4 mr-2 text-gray-400" />{contract.vehicle?.name} ({contract.vehicle?.licensePlate})</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-md">
                                <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-1">Datum</h3>
                                <p className="flex items-center font-semibold"><Calendar className="w-4 h-4 mr-2 text-gray-400" />{new Date(contract.generatedAt).toLocaleString('cs-CZ')}</p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="font-bold text-lg mb-2">Plné znění smlouvy</h3>
                            <pre
                                className="whitespace-pre-wrap bg-gray-100 p-4 rounded-md text-sm font-mono border overflow-auto max-h-[60vh]"
                                dangerouslySetInnerHTML={{ __html: contract.contractText }}
                            />
                        </div>
                    </div>
                </div>
            </div>
             <footer className="text-center text-xs text-gray-500 mt-6 print:hidden">
                Tento dokument byl vygenerován systémem Van Rental Pro.
            </footer>
        </div>
    );
};

export default ContractViewer;
