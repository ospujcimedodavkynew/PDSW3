
import React, { useEffect, useState, useMemo, FormEvent } from 'react';
import { getFinancials, addExpense } from '../services/api';
import type { FinancialTransaction } from '../types';
import { DollarSign, TrendingUp, TrendingDown, Plus, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Modal pro zadávání výdajů
const ExpenseFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!description || !amount || !date) {
            setError('Všechna pole jsou povinná.');
            return;
        }
        setIsSaving(true);
        try {
            await addExpense({
                description,
                amount: parseFloat(amount),
                date: new Date(date),
            });
            onSave();
            onClose();
            // Reset form
            setDescription('');
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
        } catch (err) {
             setError(err instanceof Error ? err.message : 'Uložení výdaje se nezdařilo.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Přidat nový výdaj</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <input type="text" placeholder="Popis (např. Servis, Pojištění)" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded" required />
                     <input type="number" placeholder="Částka v Kč" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border rounded" required />
                     <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded" required />
                     {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                        <button type="submit" disabled={isSaving} className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400">
                            {isSaving ? 'Ukládám...' : 'Uložit výdaj'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const Financials: React.FC = () => {
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getFinancials();
            setTransactions(data);
        } catch (error) {
            console.error("Failed to fetch financials:", error);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);

    const { totalIncome, totalExpense, netProfit } = useMemo(() => {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { totalIncome: income, totalExpense: expense, netProfit: income - expense };
    }, [transactions]);
    
    const monthlyData = useMemo(() => {
        return transactions.reduce((acc, curr) => {
            const month = new Date(curr.date).toLocaleString('cs-CZ', { month: 'short', year: 'numeric' });
            if (!acc[month]) {
                acc[month] = { income: 0, expense: 0 };
            }
            if (curr.type === 'income') {
                acc[month].income += curr.amount;
            } else {
                acc[month].expense += curr.amount;
            }
            return acc;
        }, {} as Record<string, { income: number; expense: number }>);
    }, [transactions]);
    
    const chartData = Object.keys(monthlyData).map(month => ({
        name: month,
        Příjmy: monthlyData[month].income,
        Výdaje: monthlyData[month].expense,
    })).reverse();


    if (loading) return <div>Načítání finančních dat...</div>;

    return (
        <div className="space-y-6">
            <ExpenseFormModal 
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                onSave={fetchData}
            />
            <div className="flex justify-between items-center">
                 <h1 className="text-3xl font-bold text-gray-800">Finance</h1>
                 <button onClick={() => setIsExpenseModalOpen(true)} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Přidat výdaj
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 rounded-full bg-green-100"><TrendingUp className="w-8 h-8 text-green-700"/></div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500 font-medium">Celkové příjmy</p>
                        <p className="text-3xl font-bold text-gray-800">{totalIncome.toLocaleString('cs-CZ')} Kč</p>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 rounded-full bg-red-100"><TrendingDown className="w-8 h-8 text-red-700"/></div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500 font-medium">Celkové výdaje</p>
                        <p className="text-3xl font-bold text-gray-800">{totalExpense.toLocaleString('cs-CZ')} Kč</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 rounded-full bg-blue-100"><DollarSign className="w-8 h-8 text-blue-700"/></div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500 font-medium">Čistý zisk</p>
                        <p className="text-3xl font-bold text-gray-800">{netProfit.toLocaleString('cs-CZ')} Kč</p>
                    </div>
                </div>
            </div>

             <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-gray-700">Měsíční přehled</h2>
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

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <h2 className="text-xl font-bold text-gray-700 p-6">Historie transakcí</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                                <th className="px-6 py-3">Datum</th>
                                <th className="px-6 py-3">Popis</th>
                                <th className="px-6 py-3">Typ</th>
                                <th className="px-6 py-3 text-right">Částka</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 border-t">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(t.date).toLocaleDateString('cs-CZ')}</td>
                                    <td className="px-6 py-4">{t.description}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {t.type === 'income' ? 'Příjem' : 'Výdaj'}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${
                                        t.type === 'income' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {t.type === 'expense' && '- '}{t.amount.toLocaleString('cs-CZ')} Kč
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Financials;
