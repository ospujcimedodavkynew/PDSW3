import React, { useState, useMemo } from 'react';
import type { FinancialTransaction, Vehicle, VehicleService, Reservation } from '../types';
import { DollarSign, TrendingUp, TrendingDown, Download, Loader, Car, Gauge } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useData } from '../contexts/DataContext';

type VehicleProfitability = {
    vehicleId: string;
    name: string;
    licensePlate: string;
    income: number;
    serviceCost: number;
    profit: number;
};

type VehiclePerformance = {
    vehicleId: string;
    name: string;
    licensePlate: string;
    totalKm: number;
    incomePerKm: number;
    costPerKm: number;
    netProfitPerKm: number;
    totalProfit: number;
};


const Reports: React.FC = () => {
    const { data, loading } = useData();
    const { financials: transactions, vehicles, services, reservations } = data;

    // Filter states
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);


    // Memoized calculations based on filters
    const filteredTransactions = useMemo(() => {
        if (!startDate || !endDate) return transactions;
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });
    }, [transactions, startDate, endDate]);

    const filteredServices = useMemo(() => {
        if (!startDate || !endDate) return services;
        const start = new Date(startDate);
         start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
         end.setHours(23, 59, 59, 999);
        return services.filter(s => {
            const sDate = new Date(s.serviceDate);
            return s.status === 'completed' && sDate >= start && sDate <= end;
        });
    }, [services, startDate, endDate]);

    const filteredCompletedReservations = useMemo(() => {
        if (!startDate || !endDate) return [];
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return reservations.filter(r => {
            if (r.status !== 'completed' || !r.endDate) return false;
            const rDate = new Date(r.endDate);
            return rDate >= start && rDate <= end;
        });
    }, [reservations, startDate, endDate]);
    
    const { totalIncome, totalExpense, netProfit } = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { totalIncome: income, totalExpense: expense, netProfit: income - expense };
    }, [filteredTransactions]);

    const chartData = useMemo(() => {
        const monthly = filteredTransactions.reduce((acc, curr) => {
            const month = new Date(curr.date).toLocaleString('cs-CZ', { month: 'short', year: 'numeric' });
            if (!acc[month]) acc[month] = { income: 0, expense: 0 };
            if (curr.type === 'income') acc[month].income += curr.amount;
            else acc[month].expense += curr.amount;
            return acc;
        }, {} as Record<string, { income: number; expense: number }>);
        return Object.keys(monthly).map(name => ({ name, Příjmy: monthly[name].income, Výdaje: monthly[name].expense })).reverse();
    }, [filteredTransactions]);

    const vehicleProfitabilityData = useMemo<VehicleProfitability[]>(() => {
        const profitabilityMap: Record<string, VehicleProfitability> = {};

        vehicles.forEach(v => {
            profitabilityMap[v.id] = { vehicleId: v.id, name: v.name, licensePlate: v.licensePlate, income: 0, serviceCost: 0, profit: 0 };
        });

        filteredTransactions.forEach(t => {
            if (t.type === 'income' && t.reservation?.vehicleId && profitabilityMap[t.reservation.vehicleId]) {
                profitabilityMap[t.reservation.vehicleId].income += t.amount;
            }
        });

        filteredServices.forEach(s => {
            if (s.vehicleId && s.cost && profitabilityMap[s.vehicleId]) {
                profitabilityMap[s.vehicleId].serviceCost += s.cost;
            }
        });
        
        return Object.values(profitabilityMap).map(p => ({ ...p, profit: p.income - p.serviceCost })).sort((a,b) => b.profit - a.profit);
    }, [vehicles, filteredTransactions, filteredServices]);

    const vehiclePerformanceData = useMemo<VehiclePerformance[]>(() => {
        const performanceMap: Record<string, {
            vehicleId: string; name: string; licensePlate: string;
            totalKm: number; totalIncome: number; totalServiceCost: number;
        }> = {};

        vehicles.forEach(v => {
            performanceMap[v.id] = { vehicleId: v.id, name: v.name, licensePlate: v.licensePlate, totalKm: 0, totalIncome: 0, totalServiceCost: 0 };
        });

        filteredCompletedReservations.forEach(r => {
            if (r.vehicleId && r.startMileage && r.endMileage && performanceMap[r.vehicleId]) {
                const kmDriven = r.endMileage - r.startMileage;
                if (kmDriven > 0) performanceMap[r.vehicleId].totalKm += kmDriven;
            }
        });

        filteredTransactions.forEach(t => {
            if (t.type === 'income' && t.reservation?.vehicleId && performanceMap[t.reservation.vehicleId]) {
                performanceMap[t.reservation.vehicleId].totalIncome += t.amount;
            }
        });

        filteredServices.forEach(s => {
            if (s.vehicleId && s.cost && performanceMap[s.vehicleId]) {
                performanceMap[s.vehicleId].totalServiceCost += s.cost;
            }
        });

        return Object.values(performanceMap).map(p => {
            const incomePerKm = p.totalKm > 0 ? p.totalIncome / p.totalKm : 0;
            const costPerKm = p.totalKm > 0 ? p.totalServiceCost / p.totalKm : 0;
            return {
                vehicleId: p.vehicleId, name: p.name, licensePlate: p.licensePlate, totalKm: p.totalKm,
                incomePerKm, costPerKm,
                netProfitPerKm: incomePerKm - costPerKm,
                totalProfit: p.totalIncome - p.totalServiceCost,
            };
        });
    }, [vehicles, filteredCompletedReservations, filteredTransactions, filteredServices]);

    const [performanceSortConfig, setPerformanceSortConfig] = useState<{ key: keyof VehiclePerformance, direction: 'asc' | 'desc' }>({ key: 'netProfitPerKm', direction: 'desc' });

    const sortedPerformanceData = useMemo(() => {
        let sortableItems = [...vehiclePerformanceData];
        sortableItems.sort((a, b) => {
            if (a[performanceSortConfig.key] < b[performanceSortConfig.key]) {
                return performanceSortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[performanceSortConfig.key] > b[performanceSortConfig.key]) {
                return performanceSortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        return sortableItems;
    }, [vehiclePerformanceData, performanceSortConfig]);

    const requestPerformanceSort = (key: keyof VehiclePerformance) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (performanceSortConfig.key === key && performanceSortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setPerformanceSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof VehiclePerformance) => {
        if (performanceSortConfig.key !== key) return null;
        return performanceSortConfig.direction === 'asc' ? '▲' : '▼';
    };
    
    const handleExportCSV = () => {
        const headers = ["Datum", "Popis", "Typ", "Částka (Kč)"];
        const rows = filteredTransactions.map(t => [
            new Date(t.date).toLocaleDateString('cs-CZ'),
            `"${t.description.replace(/"/g, '""')}"`, // Handle quotes in description
            t.type === 'income' ? 'Příjem' : 'Výdaj',
            t.type === 'income' ? t.amount.toString() : (-t.amount).toString()
        ].join(','));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `financni_report_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    if (loading && vehicles.length === 0) return <div className="flex justify-center items-center h-full"><Loader className="w-8 h-8 animate-spin" /> Načítání reportů...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h1 className="text-3xl font-bold text-gray-800">Reporty a Analýzy</h1>
            </div>
            
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div>
                        <label htmlFor="start-date" className="text-sm font-medium mr-2">Od:</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-md"/>
                    </div>
                     <div>
                        <label htmlFor="end-date" className="text-sm font-medium mr-2">Do:</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-md"/>
                    </div>
                </div>
                <button onClick={handleExportCSV} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center">
                    <Download className="w-5 h-5 mr-2" /> Exportovat do CSV
                </button>
            </div>

            {/* Key Metrics for selected period */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 rounded-full bg-green-100"><TrendingUp className="w-8 h-8 text-green-700"/></div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500 font-medium">Příjmy (vybrané období)</p>
                        <p className="text-3xl font-bold text-gray-800">{totalIncome.toLocaleString('cs-CZ')} Kč</p>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 rounded-full bg-red-100"><TrendingDown className="w-8 h-8 text-red-700"/></div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500 font-medium">Výdaje (vybrané období)</p>
                        <p className="text-3xl font-bold text-gray-800">{totalExpense.toLocaleString('cs-CZ')} Kč</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 rounded-full bg-blue-100"><DollarSign className="w-8 h-8 text-blue-700"/></div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500 font-medium">Čistý zisk (vybrané období)</p>
                        <p className="text-3xl font-bold text-gray-800">{netProfit.toLocaleString('cs-CZ')} Kč</p>
                    </div>
                </div>
            </div>

            {/* Vehicle Profitability */}
            <div className="bg-white rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-700 p-6 flex items-center"><Car className="mr-3 text-primary"/>Ziskovost vozidel</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                                <th className="px-6 py-3">Vozidlo</th>
                                <th className="px-6 py-3 text-right">Příjmy z pronájmů</th>
                                <th className="px-6 py-3 text-right">Náklady na servis</th>
                                <th className="px-6 py-3 text-right">Čistý zisk</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vehicleProfitabilityData.map(v => (
                                <tr key={v.vehicleId} className="hover:bg-gray-50 border-t">
                                    <td className="px-6 py-4 whitespace-nowrap font-semibold">{v.name} <span className="text-gray-500 font-normal">({v.licensePlate})</span></td>
                                    <td className="px-6 py-4 text-right text-green-600 font-medium">{v.income.toLocaleString('cs-CZ')} Kč</td>
                                    <td className="px-6 py-4 text-right text-red-600 font-medium">{v.serviceCost.toLocaleString('cs-CZ')} Kč</td>
                                    <td className={`px-6 py-4 text-right font-bold ${v.profit >= 0 ? 'text-gray-800' : 'text-red-700'}`}>{v.profit.toLocaleString('cs-CZ')} Kč</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* NEW: Vehicle Performance */}
            <div className="bg-white rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-700 p-6 flex items-center"><Gauge className="mr-3 text-indigo-600"/>Efektivita a výkonnost vozidel</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                                <th className="px-6 py-3">Vozidlo</th>
                                <th onClick={() => requestPerformanceSort('totalKm')} className="px-6 py-3 text-right cursor-pointer">Ujeto {getSortIndicator('totalKm')}</th>
                                <th onClick={() => requestPerformanceSort('incomePerKm')} className="px-6 py-3 text-right cursor-pointer">Příjmy/km {getSortIndicator('incomePerKm')}</th>
                                <th onClick={() => requestPerformanceSort('costPerKm')} className="px-6 py-3 text-right cursor-pointer">Náklady/km {getSortIndicator('costPerKm')}</th>
                                <th onClick={() => requestPerformanceSort('netProfitPerKm')} className="px-6 py-3 text-right cursor-pointer">Čistý zisk/km {getSortIndicator('netProfitPerKm')}</th>
                                <th onClick={() => requestPerformanceSort('totalProfit')} className="px-6 py-3 text-right cursor-pointer">Celkový zisk {getSortIndicator('totalProfit')}</th>
                            </tr>
                        </thead>
                         <tbody>
                            {sortedPerformanceData.map(p => (
                                <tr key={p.vehicleId} className="hover:bg-gray-50 border-t">
                                    <td className="px-6 py-4 whitespace-nowrap font-semibold">{p.name} <span className="text-gray-500 font-normal">({p.licensePlate})</span></td>
                                    <td className="px-6 py-4 text-right">{p.totalKm.toLocaleString('cs-CZ')} km</td>
                                    <td className="px-6 py-4 text-right text-green-700">{p.incomePerKm.toFixed(2)} Kč</td>
                                    <td className="px-6 py-4 text-right text-red-700">{p.costPerKm.toFixed(2)} Kč</td>
                                    <td className={`px-6 py-4 text-right font-bold ${p.netProfitPerKm >= 0 ? 'text-green-800' : 'text-red-800'}`}>{p.netProfitPerKm.toFixed(2)} Kč</td>
                                    <td className={`px-6 py-4 text-right font-bold ${p.totalProfit >= 0 ? 'text-gray-800' : 'text-red-700'}`}>{p.totalProfit.toLocaleString('cs-CZ')} Kč</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

             {/* Monthly Chart for selected period */}
             <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-gray-700">Měsíční přehled (vybrané období)</h2>
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `${value.toLocaleString('cs-CZ')} Kč`}/>
                        <Legend />
                        <Bar dataKey="Příjmy" fill="#1E40AF" />
                        <Bar dataKey="Výdaje" fill="#DC2626" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default Reports;