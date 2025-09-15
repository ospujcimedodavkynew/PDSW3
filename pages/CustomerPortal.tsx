import React, { useState, useEffect, FormEvent } from 'react';
import { submitCustomerDetails, getReservationByToken } from '../services/api';
import { Reservation, Customer } from '../types';
import { UploadCloud, CheckCircle } from 'lucide-react';

interface CustomerPortalProps {
    token: string;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ token }) => {
    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [formData, setFormData] = useState<Omit<Customer, 'id' | 'driverLicenseImageUrl'>>({
        firstName: '', lastName: '', email: '', phone: '', driverLicenseNumber: '', address: ''
    });
    const [driverLicenseFile, setDriverLicenseFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        const fetchReservation = async () => {
            setLoading(true);
            try {
                const res = await getReservationByToken(token);
                if (!res || res.status !== 'pending-customer') {
                    setError('Tento odkaz již není platný nebo byla rezervace dokončena.');
                } else {
                    setReservation(res);
                }
            } catch (e) {
                setError('Došlo k chybě při načítání rezervace.');
            } finally {
                setLoading(false);
            }
        };
        fetchReservation();
    }, [token]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setDriverLicenseFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!driverLicenseFile) {
            alert('Prosím, nahrajte fotografii vašeho řidičského průkazu.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await submitCustomerDetails(token, formData, driverLicenseFile);
            setIsSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Došlo k neznámé chybě.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100">Načítání...</div>;
    }
    
    if (error) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-red-600 font-semibold">{error}</div>;
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 text-center p-4">
                 <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
                <h1 className="text-3xl font-bold text-green-800">Děkujeme!</h1>
                <p className="mt-2 text-lg text-gray-700">Vaše údaje byly úspěšně odeslány.</p>
                <p className="mt-1 text-gray-600">Brzy se vám ozveme s potvrzením a dalšími instrukcemi.</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-lg">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-primary">Van Rental Pro</h1>
                    <p className="text-gray-600 mt-2">Dokončete prosím rezervaci vozidla <span className="font-semibold">{reservation?.vehicle?.name}</span>.</p>
                </div>
                
                {reservation?.startDate && new Date(reservation.startDate).getFullYear() > 1970 && (
                     <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center mb-6">
                        <p className="font-semibold text-blue-800">Termín vaší rezervace</p>
                        <p className="text-gray-700">
                            <strong>Od:</strong> {new Date(reservation.startDate).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-gray-700">
                            <strong>Do:</strong> {new Date(reservation.endDate).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                )}


                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl p-8 space-y-6">
                    <h2 className="text-xl font-semibold text-gray-800 border-b pb-3">Vaše údaje</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <input type="text" placeholder="Jméno" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full p-3 border rounded-md" required />
                         <input type="text" placeholder="Příjmení" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full p-3 border rounded-md" required />
                    </div>
                     <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-3 border rounded-md" required />
                     <input type="text" placeholder="Adresa (Ulice, ČP, Město, PSČ)" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-3 border rounded-md" required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="tel" placeholder="Telefon" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full p-3 border rounded-md" required />
                        <input type="text" placeholder="Číslo řidičského průkazu" value={formData.driverLicenseNumber} onChange={e => setFormData({ ...formData, driverLicenseNumber: e.target.value })} className="w-full p-3 border rounded-md" required />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fotografie řidičského průkazu (přední strana)</label>
                        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
                             {imagePreview ? (
                                <img src={imagePreview} alt="Náhled ŘP" className="h-full object-contain"/>
                             ) : (
                                <span className="flex items-center space-x-2">
                                    <UploadCloud className="w-6 h-6 text-gray-600"/>
                                    <span className="font-medium text-gray-600">Klikněte pro nahrání souboru</span>
                                </span>
                             )}
                        </label>
                         <input id="file-upload" name="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} required/>
                    </div>

                    <button type="submit" className="w-full bg-secondary text-dark-text font-bold py-3 px-4 rounded-lg hover:bg-secondary-hover transition-colors text-lg" disabled={loading}>
                        {loading ? 'Odesílám...' : 'Odeslat údaje a dokončit rezervaci'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CustomerPortal;