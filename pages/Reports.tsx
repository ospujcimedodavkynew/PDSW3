import React, { useState, useMemo } from 'react';
import type { FinancialTransaction, Vehicle, VehicleService, Reservation } from '../types';
import { DollarSign, TrendingUp, TrendingDown, Download, Loader, Car, Gauge, Percent, Award, AlertCircle, Sparkles, Building, Calendar, ShieldAlert, AlertTriangle, ArrowUpRight, CheckCircle2 } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'financials' | 'fleet' | 'clients'>('financials');

    // Filtered Invoices & Metrics
    const invoicesMetrics = useMemo(() => {
        const allInvoices = data.invoices || [];
        const unpaidInvoices = allInvoices.filter(i => i.status === 'unpaid' || i.status === 'overdue');
        const totalUnpaidAmount = unpaidInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
        
        const overdueInvoices = allInvoices.filter(i => i.status === 'overdue');
        const totalOverdueAmount = overdueInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
        
        return {
            totalUnpaidAmount,
            totalOverdueAmount,
            unpaidCount: unpaidInvoices.length,
            overdueCount: overdueInvoices.length,
            unpaidList: unpaidInvoices.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        };
    }, [data.invoices]);

    // Vehicle Fleet Utilization Rates
    const vehicleUtilizationData = useMemo(() => {
        if (!startDate || !endDate || vehicles.length === 0) return [];
        
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        const daysInPeriod = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        
        // Setup array of dates in period
        const datesInPeriod: Date[] = [];
        const current = new Date(start);
        while (current <= end) {
            datesInPeriod.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        
        return vehicles.map(v => {
            const occupiedDaysCount = datesInPeriod.filter(day => {
                const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
                
                return reservations.some(r => {
                    if (r.vehicleId !== v.id) return false;
                    if (r.status !== 'completed' && r.status !== 'active' && r.status !== 'scheduled') return false;
                    
                    const rStart = new Date(r.startDate);
                    const rEnd = new Date(r.endDate);
                    
                    return rStart <= dayEnd && rEnd >= dayStart;
                });
            }).length;
            
            const rate = (occupiedDaysCount / daysInPeriod) * 100;
            return {
                vehicleId: v.id,
                name: v.name,
                licensePlate: v.licensePlate,
                occupiedDays: occupiedDaysCount,
                totalDays: daysInPeriod,
                rate: Math.min(100, Math.max(0, rate))
            };
        }).sort((a, b) => b.rate - a.rate);
    }, [vehicles, reservations, startDate, endDate]);

    const averageFleetUtilization = useMemo(() => {
        if (vehicleUtilizationData.length === 0) return 0;
        const sum = vehicleUtilizationData.reduce((acc, curr) => acc + curr.rate, 0);
        return sum / vehicleUtilizationData.length;
    }, [vehicleUtilizationData]);

    // Top Customers by revenue and rentals
    const topCustomersData = useMemo(() => {
        const stats: Record<string, {
            id: string;
            name: string;
            email: string;
            phone: string;
            rentalsCount: number;
            totalSpent: number;
        }> = {};
        
        reservations.forEach(r => {
            if (!r.customerId || !r.customer) return;
            if (r.status !== 'completed' && r.status !== 'active' && r.status !== 'scheduled') return;
            
            const cId = r.customerId;
            if (!stats[cId]) {
                stats[cId] = {
                    id: cId,
                    name: `${r.customer.firstName} ${r.customer.lastName}`,
                    email: r.customer.email,
                    phone: r.customer.phone,
                    rentalsCount: 0,
                    totalSpent: 0
                };
            }
            
            stats[cId].rentalsCount += 1;
            
            // Sum income transactions linked to this reservation
            const rentalIncome = transactions.filter(t => t.reservationId === r.id && t.type === 'income');
            stats[cId].totalSpent += rentalIncome.reduce((sum, t) => sum + t.amount, 0);
        });
        
        return Object.values(stats)
            .sort((a, b) => b.totalSpent - a.totalSpent || b.rentalsCount - a.rentalsCount)
            .slice(0, 10);
    }, [reservations, transactions]);


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
            <div className="bg-white p-4 rounded-lg shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <label htmlFor="start-date" className="text-sm font-medium mr-2 text-gray-650">Od:</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-md shadow-sm focus:ring-1 focus:ring-blue-500"/>
                    </div>
                     <div>
                        <label htmlFor="end-date" className="text-sm font-medium mr-2 text-gray-650">Do:</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-md shadow-sm focus:ring-1 focus:ring-blue-500"/>
                    </div>
                </div>
                <button onClick={handleExportCSV} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center shadow-sm">
                    <Download className="w-5 h-5 mr-2" /> Exportovat do CSV
                </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap border-b border-gray-200 gap-1">
                <button
                    onClick={() => setActiveTab('financials')}
                    className={`py-3 px-6 font-bold text-sm border-b-2 transition-all flex items-center ${activeTab === 'financials' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Přehled financí & Cashflow
                </button>
                <button
                    onClick={() => setActiveTab('fleet')}
                    className={`py-3 px-6 font-bold text-sm border-b-2 transition-all flex items-center ${activeTab === 'fleet' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    <Car className="w-4 h-4 mr-2" />
                    Vytížení & Efektivita autoparku
                </button>
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`py-3 px-6 font-bold text-sm border-b-2 transition-all flex items-center ${activeTab === 'clients' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    <Award className="w-4 h-4 mr-2" />
                    Aktivita zákazníků (V.I.P.)
                </button>
            </div>

            {/* TAB CONTENT: FINANCIALS */}
            {activeTab === 'financials' && (
                <div className="space-y-6">
                    {/* Key Metrics for selected period */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                            <div className="p-4 rounded-full bg-green-100"><TrendingUp className="w-8 h-8 text-green-700"/></div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-500 font-medium">Příjmy (vybrané období)</p>
                                <p className="text-2xl font-bold text-gray-800">{totalIncome.toLocaleString('cs-CZ')} Kč</p>
                            </div>
                        </div>
                         <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                            <div className="p-4 rounded-full bg-red-100"><TrendingDown className="w-8 h-8 text-red-700"/></div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-500 font-medium">Výdaje (vybrané období)</p>
                                <p className="text-2xl font-bold text-gray-800">{totalExpense.toLocaleString('cs-CZ')} Kč</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                            <div className="p-4 rounded-full bg-blue-105"><DollarSign className="w-8 h-8 text-blue-700"/></div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-500 font-medium">Čistý zisk (vybrané období)</p>
                                <p className="text-2xl font-bold text-gray-800">{netProfit.toLocaleString('cs-CZ')} Kč</p>
                            </div>
                        </div>
                    </div>

                    {/* Receivables Overview */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Summary Cards */}
                        <div className="space-y-6 lg:col-span-1">
                            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-lg shadow-md border border-amber-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-amber-805 font-semibold uppercase tracking-wider">Neuhrazené pohledávky</p>
                                        <p className="text-2xl font-extrabold text-amber-900 mt-2">{invoicesMetrics.totalUnpaidAmount.toLocaleString('cs-CZ')} Kč</p>
                                        <p className="text-xs text-amber-700 mt-1">Celkem {invoicesMetrics.unpaidCount} neuhrazených faktur</p>
                                    </div>
                                    <span className="p-2 bg-amber-200 text-amber-955 rounded-full"><AlertTriangle className="w-5 h-5" /></span>
                                </div>
                            </div>
                            
                            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg shadow-md border border-red-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-red-805 font-semibold uppercase tracking-wider">Faktury po splatnosti 🚨</p>
                                        <p className="text-2xl font-extrabold text-red-900 mt-2">{invoicesMetrics.totalOverdueAmount.toLocaleString('cs-CZ')} Kč</p>
                                        <p className="text-xs text-red-700 mt-1">{invoicesMetrics.overdueCount} kritických případů</p>
                                    </div>
                                    <span className="p-2 bg-red-200 text-red-950 rounded-full"><ShieldAlert className="w-5 h-5" /></span>
                                </div>
                            </div>
                        </div>

                        {/* Receivables detailing table */}
                        <div className="bg-white rounded-lg shadow-md lg:col-span-2 flex flex-col">
                            <h2 className="text-lg font-bold text-gray-700 p-5 border-b flex items-center"><AlertCircle className="w-5 h-5 mr-2 text-amber-600" /> Neuhrazené faktury k dořešení</h2>
                            <div className="overflow-x-auto flex-1">
                                {invoicesMetrics.unpaidList.length > 0 ? (
                                    <table className="min-w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                            <tr>
                                                <th className="px-6 py-3">Číslo</th>
                                                <th className="px-6 py-3">Zákazník</th>
                                                <th className="px-6 py-3">Splatnost</th>
                                                <th className="px-6 py-3 text-right">Částka</th>
                                                <th className="px-6 py-3 text-center">Stav</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoicesMetrics.unpaidList.map(invoice => (
                                                <tr key={invoice.id} className="border-t hover:bg-gray-50">
                                                    <td className="px-6 py-3 font-semibold">{invoice.invoiceNumber}</td>
                                                    <td className="px-6 py-3">{invoice.customer?.firstName} {invoice.customer?.lastName}</td>
                                                    <td className="px-6 py-3">{new Date(invoice.dueDate).toLocaleDateString('cs-CZ')}</td>
                                                    <td className="px-6 py-3 text-right font-medium">{invoice.totalAmount.toLocaleString('cs-CZ')} Kč</td>
                                                    <td className="px-6 py-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${invoice.status === 'overdue' ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-amber-100 text-amber-700'}`}>
                                                            {invoice.status === 'overdue' ? 'PO SPLATNOSTI' : 'NEUHRAPE_NO'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
                                        <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
                                        <p className="font-semibold">Všechny faktury jsou kompletně uhrazeny!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                     {/* Monthly Chart for selected period */}
                     <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4 text-gray-700">Měsíční cashflow (vybrané období)</h2>
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
            )}

            {/* TAB CONTENT: FLEET & UTILIZATION */}
            {activeTab === 'fleet' && (
                <div className="space-y-6">
                    {/* Overall utilization rate gauge */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="space-y-2">
                                <h2 className="text-xl font-extrabold text-gray-800 flex items-center">
                                    <Sparkles className="w-5 h-5 mr-2 text-yellow-500" />
                                    Celkové vytížení autoparku
                                </h2>
                                <p className="text-sm text-gray-500 max-w-xl">
                                    Míra vytížení měří procento dní ve zvoleném období, kdy byly vaše vozy v nájmu nebo připraveny pro plánované rezervace.
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="text-right">
                                    <span className="text-4xl font-extrabold text-blue-600">{averageFleetUtilization.toFixed(1)} %</span>
                                    <p className="text-xs text-gray-400 font-bold uppercase mt-1">Průměr za autopark</p>
                                </div>
                                <div className="w-24 bg-gray-100 rounded-full h-4 overflow-hidden relative border">
                                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000" style={{ width: `${averageFleetUtilization}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grid of separate progress bars for each Vehicle's utilization */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center"><Percent className="mr-2 text-indigo-500" /> Využití jednotlivých vozů</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {vehicleUtilizationData.map(v => (
                                <div key={v.vehicleId} className="p-4 bg-gray-50 rounded-lg border border-gray-150 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-gray-800 text-sm">{v.name}</h3>
                                            <span className="text-xs font-mono text-gray-500">{v.licensePlate}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Rentu: <span className="font-bold text-gray-700">{v.occupiedDays}</span> ze <span className="font-bold text-gray-700">{v.totalDays} dnů</span></p>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                                            <span>Míra vytížení</span>
                                            <span className={`${v.rate > 55 ? 'text-green-600' : 'text-amber-600'}`}>{v.rate.toFixed(1)} %</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className={`h-2 rounded-full transition-all ${v.rate > 70 ? 'bg-emerald-500' : v.rate > 40 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                style={{ width: `${v.rate}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Vehicle Profitability */}
                    <div className="bg-white rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-700 p-6 flex items-center"><Car className="mr-3 text-primary"/>Ziskovost vozidel</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100 text-left text-gray-600 uppercase text-xs">
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

                    {/* Vehicle Performance */}
                    <div className="bg-white rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-700 p-6 flex items-center"><Gauge className="mr-3 text-indigo-600"/>Efektivita a výkonnost vozidel</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100 text-left text-gray-600 uppercase text-xs">
                                        <th className="px-6 py-3">Vozidlo</th>
                                        <th onClick={() => requestPerformanceSort('totalKm')} className="px-6 py-3 text-right cursor-pointer select-none">Ujeto {getSortIndicator('totalKm')}</th>
                                        <th onClick={() => requestPerformanceSort('incomePerKm')} className="px-6 py-3 text-right cursor-pointer select-none">Příjmy/km {getSortIndicator('incomePerKm')}</th>
                                        <th onClick={() => requestPerformanceSort('costPerKm')} className="px-6 py-3 text-right cursor-pointer select-none">Náklady/km {getSortIndicator('costPerKm')}</th>
                                        <th onClick={() => requestPerformanceSort('netProfitPerKm')} className="px-6 py-3 text-right cursor-pointer select-none">Čistý zisk/km {getSortIndicator('netProfitPerKm')}</th>
                                        <th onClick={() => requestPerformanceSort('totalProfit')} className="px-6 py-3 text-right cursor-pointer select-none font-bold">Celkový zisk {getSortIndicator('totalProfit')}</th>
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
                </div>
            )}

            {/* TAB CONTENT: CLIENT ACTIVITY */}
            {activeTab === 'clients' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-md">
                        <div className="p-6 border-b border-gray-150 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                                    <Award className="w-6 h-6 mr-2 text-yellow-500" />
                                    Žebříček V.I.P. zákazníků (Top 10)
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Stálí klienti jsou klíčem k vašemu podnikání. Zde vidíte zákazníky s největší celkovou útrapou a počtem výpůjček.
                                </p>
                            </div>
                            <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold uppercase tracking-wider flex items-center">
                                <Sparkles className="w-3.5 h-3.5 mr-1" /> VĚRNOST
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            {topCustomersData.length > 0 ? (
                                <table className="min-w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3 text-center w-16">Pořadí</th>
                                            <th className="px-6 py-3">Zákazník</th>
                                            <th className="px-6 py-3">Kontakt</th>
                                            <th className="px-6 py-3 text-center">Počet výpůjček</th>
                                            <th className="px-6 py-3 text-right font-bold">Celkově odebráno</th>
                                            <th className="px-6 py-3 text-center">Věrnostní status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topCustomersData.map((cust, idx) => {
                                            const rank = idx + 1;
                                            let badgeColor = "bg-gray-100 text-gray-700";
                                            let badgeText = "Bronzový";
                                            
                                            if (rank === 1) {
                                                badgeColor = "bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold";
                                                badgeText = "Diamantový 💎";
                                            } else if (rank <= 3) {
                                                badgeColor = "bg-yellow-100 text-yellow-700 border border-yellow-200 font-bold";
                                                badgeText = "Zlatý 🥇";
                                            } else if (rank <= 6) {
                                                badgeColor = "bg-slate-100 text-slate-700 border border-slate-200 font-semibold";
                                                badgeText = "Stříbrný 🥈";
                                            }
                                            
                                            return (
                                                <tr key={cust.id} className="border-t hover:bg-gray-50">
                                                    <td className="px-6 py-4 text-center font-extrabold text-gray-500">
                                                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-800">{cust.name}</td>
                                                    <td className="px-6 py-4 text-xs">
                                                        <div>{cust.email}</div>
                                                        <div className="text-gray-500">{cust.phone}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-semibold text-gray-700">{cust.rentalsCount}x</td>
                                                    <td className="px-6 py-4 text-right font-extrabold text-blue-700">{cust.totalSpent.toLocaleString('cs-CZ')} Kč</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs uppercase tracking-wider ${badgeColor}`}>
                                                            {badgeText}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    Nebyly nalezeny žádné historické rezervace pro vyhodnocení zákazníků.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
