import React, { useState, useMemo } from 'react';
import type { HandoverProtocol } from '../types';
import { useData } from '../contexts/DataContext';
import { Search, ChevronLeft, User, Car, Calendar } from 'lucide-react';

const HandoverProtocols: React.FC = () => {
    const { data, loading } = useData();
    const { handoverProtocols } = data;
    const [selectedProtocol, setSelectedProtocol] = useState<HandoverProtocol | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProtocols = useMemo(() => {
        return handoverProtocols.filter(protocol => {
            const customerName = `${protocol.customer?.firstName || ''} ${protocol.customer?.lastName || ''}`;
            const vehicleName = protocol.vehicle?.name || '';
            const licensePlate = protocol.vehicle?.licensePlate || '';
            const protocolId = protocol.id || '';
            
            return searchTerm === '' ||
                customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                protocolId.toLowerCase().includes(searchTerm.toLowerCase());
        }).sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    }, [handoverProtocols, searchTerm]);

    if (loading && handoverProtocols.length === 0) return <div>Načítání protokolů...</div>;
    
    if (selectedProtocol) {
        return (
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-start mb-6">
                    <div>
                         <button onClick={() => setSelectedProtocol(null)} className="text-sm text-gray-600 hover:text-gray-900 flex items-center mb-2">
                            <ChevronLeft className="w-4 h-4 mr-1" /> Zpět na seznam
                        </button>
                        <h2 className="text-2xl font-bold">Detail předávacího protokolu</h2>
                        <p className="text-gray-500">Číslo: {selectedProtocol.id}</p>
                    </div>
                     <button onClick={() => window.print()} className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-hover">
                        Tisknout
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
                    <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-1">Zákazník</h3>
                        <p className="flex items-center font-semibold"><User className="w-4 h-4 mr-2 text-gray-400" />{selectedProtocol.customer?.firstName} {selectedProtocol.customer?.lastName}</p>
                    </div>
                     <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-1">Vozidlo</h3>
                        <p className="flex items-center font-semibold"><Car className="w-4 h-4 mr-2 text-gray-400" />{selectedProtocol.vehicle?.name} ({selectedProtocol.vehicle?.licensePlate})</p>
                    </div>
                     <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-1">Datum</h3>
                        <p className="flex items-center font-semibold"><Calendar className="w-4 h-4 mr-2 text-gray-400" />{new Date(selectedProtocol.generatedAt).toLocaleString('cs-CZ')}</p>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-lg mb-2">Plné znění protokolu</h3>
                    <pre
                        className="whitespace-pre-wrap bg-gray-100 p-4 rounded-md text-sm font-mono border overflow-auto max-h-[60vh]"
                        dangerouslySetInnerHTML={{ __html: selectedProtocol.protocolText }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Archiv předávacích protokolů</h1>
            
            <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Hledat protokol (podle zákazníka, SPZ, ID...)"
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
                            <th className="px-5 py-3">ID Protokolu</th>
                            <th className="px-5 py-3">Zákazník</th>
                            <th className="px-5 py-3">Vozidlo</th>
                            <th className="px-5 py-3">Datum vystavení</th>
                            <th className="px-5 py-3">Akce</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredProtocols.length > 0 ? (
                            filteredProtocols.map(protocol => (
                                <tr key={protocol.id} className="hover:bg-gray-50">
                                    <td className="px-5 py-4 text-sm text-gray-500 font-mono">{protocol.id.substring(0, 8)}...</td>
                                    <td className="px-5 py-4">{protocol.customer?.firstName} {protocol.customer?.lastName}</td>
                                    <td className="px-5 py-4">{protocol.vehicle?.name}</td>
                                    <td className="px-5 py-4">{new Date(protocol.generatedAt).toLocaleString('cs-CZ')}</td>
                                    <td className="px-5 py-4">
                                        <button onClick={() => setSelectedProtocol(protocol)} className="text-primary hover:text-primary-hover font-semibold">Zobrazit</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">
                                    Nebyly nalezeny žádné protokoly odpovídající hledání.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HandoverProtocols;