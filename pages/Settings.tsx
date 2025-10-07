import React, { useState, useEffect, FormEvent } from 'react';
import { useData } from '../contexts/DataContext';
import type { CompanySettings } from '../types';
import { Save, Loader } from 'lucide-react';
import LogoWithQR from '../components/LogoWithQR';

// Helper component for input fields to keep the main component cleaner
const InputField: React.FC<{
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    type?: string;
}> = ({ label, name, value, onChange, required = false, type = 'text' }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            className="mt-1 w-full p-2 border rounded-md shadow-sm focus:ring-primary focus:border-primary"
        />
    </div>
);


const Settings: React.FC = () => {
    const { data, actions } = useData();
    const { settings } = data;

    const [formData, setFormData] = useState<Omit<CompanySettings, 'id'>>({
        companyName: '',
        address: '',
        ico: '',
        dic: '',
        bankAccount: '',
        iban: '',
        swift: '',
        contactEmail: '',
        contactPhone: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData({
                companyName: settings.companyName || '',
                address: settings.address || '',
                ico: settings.ico || '',
                dic: settings.dic || '',
                bankAccount: settings.bankAccount || '',
                iban: settings.iban || '',
                swift: settings.swift || '',
                contactEmail: settings.contactEmail || '',
                contactPhone: settings.contactPhone || '',
            });
        }
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await actions.updateSettings(formData);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000); // Hide message after 3 seconds
        } catch (error) {
            console.error("Failed to update settings:", error);
            alert("Uložení nastavení se nezdařilo.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Nastavení</h1>

            <section className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">Logo a firemní identita</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Toto je finální návrh pro vaše magnetické polepy. Klikněte na něj pravým tlačítkem a zvolte "Uložit obrázek jako..." pro stažení ve formátu SVG, který je ideální pro tisk.
                </p>
                <LogoWithQR />
            </section>
            
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md max-w-3xl mx-auto space-y-6">
                <section>
                    <h2 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">Firemní a fakturační údaje</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Název společnosti" name="companyName" value={formData.companyName} onChange={handleChange} required />
                        <InputField label="IČO" name="ico" value={formData.ico} onChange={handleChange} required />
                        <InputField label="DIČ" name="dic" value={formData.dic} onChange={handleChange} required />
                        <div className="md:col-span-2">
                           <InputField label="Adresa sídla" name="address" value={formData.address} onChange={handleChange} required />
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">Bankovní spojení</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Číslo účtu" name="bankAccount" value={formData.bankAccount} onChange={handleChange} required />
                        <InputField label="IBAN" name="iban" value={formData.iban} onChange={handleChange} />
                        <InputField label="SWIFT/BIC" name="swift" value={formData.swift} onChange={handleChange} />
                    </div>
                </section>
                
                <section>
                    <h2 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">Kontaktní údaje</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <InputField label="Kontaktní e-mail" name="contactEmail" type="email" value={formData.contactEmail} onChange={handleChange} required />
                         <InputField label="Kontaktní telefon" name="contactPhone" type="tel" value={formData.contactPhone} onChange={handleChange} required />
                    </div>
                </section>

                <div className="flex justify-end items-center pt-4">
                    {saveSuccess && <p className="text-green-600 mr-4 transition-opacity duration-300">Nastavení bylo úspěšně uloženo.</p>}
                    <button type="submit" disabled={isSaving} className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-hover transition-colors flex items-center disabled:bg-gray-400">
                        {isSaving ? (
                            <Loader className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5 mr-2" />
                        )}
                        {isSaving ? 'Ukládám...' : 'Uložit nastavení'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;