import React, { useState, useEffect, FormEvent } from 'react';
import { useData } from '../contexts/DataContext';
import { CompanySettings } from '../types';
import { Save, Loader } from 'lucide-react';

const Settings: React.FC = () => {
    const { data, actions, loading } = useData();
    const [settings, setSettings] = useState<Omit<CompanySettings, 'id'>>({
        companyName: '', address: '', ico: '', dic: '', bankAccount: '', 
        iban: '', swift: '', contactEmail: '', contactPhone: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (data.settings) {
            setSettings(data.settings);
        }
    }, [data.settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await actions.updateSettings(settings);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error("Failed to save settings:", error);
            alert("Uložení nastavení se nezdařilo.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading && !data.settings) {
        return <div className="flex justify-center items-center h-full"><Loader className="w-8 h-8 animate-spin" /> Načítání nastavení...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Nastavení</h1>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-700">Fakturační údaje společnosti</h2>
                    <p className="text-sm text-gray-500">Tyto údaje se budou automaticky zobrazovat na všech vystavených fakturách.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Název společnosti / Jméno</label>
                        <input type="text" name="companyName" id="companyName" value={settings.companyName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" required />
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">Adresa sídla</label>
                        <input type="text" name="address" id="address" value={settings.address} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" required />
                    </div>
                    <div>
                        <label htmlFor="ico" className="block text-sm font-medium text-gray-700">IČO</label>
                        <input type="text" name="ico" id="ico" value={settings.ico} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" required />
                    </div>
                    <div>
                        <label htmlFor="dic" className="block text-sm font-medium text-gray-700">DIČ (pokud jste plátce DPH)</label>
                        <input type="text" name="dic" id="dic" value={settings.dic} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                    </div>
                </div>

                <hr />

                <div>
                    <h2 className="text-xl font-bold text-gray-700">Bankovní spojení</h2>
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="bankAccount" className="block text-sm font-medium text-gray-700">Číslo účtu</label>
                        <input type="text" name="bankAccount" id="bankAccount" value={settings.bankAccount} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                    </div>
                     <div>
                        <label htmlFor="iban" className="block text-sm font-medium text-gray-700">IBAN</label>
                        <input type="text" name="iban" id="iban" value={settings.iban} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                    </div>
                      <div>
                        <label htmlFor="swift" className="block text-sm font-medium text-gray-700">SWIFT / BIC</label>
                        <input type="text" name="swift" id="swift" value={settings.swift} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                    </div>
                </div>

                <hr />

                 <div>
                    <h2 className="text-xl font-bold text-gray-700">Kontaktní údaje</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">Kontaktní e-mail</label>
                        <input type="email" name="contactEmail" id="contactEmail" value={settings.contactEmail} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                    </div>
                     <div>
                        <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">Kontaktní telefon</label>
                        <input type="tel" name="contactPhone" id="contactPhone" value={settings.contactPhone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
                    </div>
                </div>

                <div className="flex justify-end items-center pt-4">
                     {saveSuccess && <span className="text-green-600 font-semibold mr-4">Nastavení bylo úspěšně uloženo!</span>}
                    <button type="submit" disabled={isSaving} className="py-2 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover disabled:bg-gray-400 flex items-center">
                        {isSaving ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                        {isSaving ? 'Ukládám...' : 'Uložit změny'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
