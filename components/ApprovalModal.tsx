import React, { useState } from 'react';
import { Reservation, Page } from '../types';
import { useData } from '../contexts/DataContext';
import { X, Check, Trash2, Car, Calendar, User, Mail, Phone, Loader, Edit, MapPin, Gauge } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface ApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservations: Reservation[];
    onNavigateToPage: (page: Page) => void;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({ isOpen, onClose, reservations, onNavigateToPage }) => {
    const { actions } = useData();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [confirmationInfo, setConfirmationInfo] = useState<{ contractId: string; customerEmail: string; vehicleName: string; } | null>(null);

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            const contractInfo = await actions.approveReservation(id);
            if (contractInfo) {
                setConfirmationInfo(contractInfo);
            }
        } catch (error) {
            console.error("Failed to approve reservation:", error);
            alert("Schválení se nezdařilo.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        if (window.confirm("Opravdu chcete tuto rezervaci zamítnout a trvale smazat?")) {
            setProcessingId(id);
            try {
                await actions.rejectReservation(id);
            } catch (error) {
                console.error("Failed to reject reservation:", error);
                alert("Zamítnutí se nezdařilo.");
            } finally {
                setProcessingId(null);
            }
        }
    };
    
    const handleEdit = (res: Reservation) => {
        actions.setReservationToEdit(res);
        onNavigateToPage(Page.RESERVATIONS);
        onClose();
    };
    
    const handleCloseConfirmation = () => {
        setConfirmationInfo(null);
        // FIX: Refresh data only AFTER the confirmation modal is closed.
        // This prevents the main approval modal from closing prematurely.
        actions.refreshData();
    };

    // If reservations list becomes empty, close the modal automatically
    React.useEffect(() => {
        if (isOpen && reservations.length === 0 && !confirmationInfo) {
            onClose();
        }
    }, [reservations, isOpen, onClose, confirmationInfo]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-start z-50 pt-10 pb-10 overflow-y-auto">
            <ConfirmationModal 
                isOpen={!!confirmationInfo}
                onClose={handleCloseConfirmation}
                contractInfo={confirmationInfo}
            />
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-5xl">
                <div className="flex justify-between items-center mb-4 border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Rezervace ke schválení ({reservations.length})</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><X className="w-6 h-6" /></button>
                </div>
                
                {reservations.length > 0 ? (
                    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                        {reservations.map(res => (
                            <div key={res.id} className="bg-gray-50 border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start gap-4">
                                <div className="flex-grow space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                        <div className="flex items-start">
                                            <User className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                                            <div>
                                                <p className="font-bold text-base">{res.customer?.firstName} {res.customer?.lastName}</p>
                                                <p className="text-gray-600 flex items-center truncate"><Mail className="w-3 h-3 mr-1.5" />{res.customer?.email}</p>
                                                <p className="text-gray-600 flex items-center"><Phone className="w-3 h-3 mr-1.5" />{res.customer?.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start">
                                            <Car className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                                            <div>
                                                <p className="font-semibold">{res.vehicle?.name}</p>
                                                <p className="text-gray-600">{res.vehicle?.licensePlate}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start">
                                            <Calendar className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                                            <div>
                                                <p className="font-semibold">Od: {new Date(res.startDate).toLocaleString('cs-CZ')}</p>
                                                <p className="font-semibold">Do: {new Date(res.endDate).toLocaleString('cs-CZ')}</p>
                                            </div>
                                        </div>
                                        {(res.destination || res.estimatedMileage) && (
                                            <div className="flex items-start">
                                                <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-500 flex-shrink-0" />
                                                <div>
                                                    {res.destination && <p className="font-semibold">Cíl: {res.destination}</p>}
                                                    {res.estimatedMileage && <p className="text-gray-600 flex items-center"><Gauge className="w-3 h-3 mr-1.5" />~{res.estimatedMileage} km</p>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 flex flex-row md:flex-col gap-2 w-full md:w-auto">
                                    {processingId === res.id ? (
                                        <div className="flex justify-center items-center w-full h-full p-6"><Loader className="w-6 h-6 animate-spin" /></div>
                                    ) : (
                                        <>
                                            <button onClick={() => handleApprove(res.id)} className="w-full justify-center text-sm flex items-center py-2 px-3 rounded-md font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors">
                                                <Check className="w-4 h-4 mr-2" /> Schválit
                                            </button>
                                            <button onClick={() => handleEdit(res)} className="w-full justify-center text-sm flex items-center py-2 px-3 rounded-md font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                                                <Edit className="w-4 h-4 mr-2" /> Upravit
                                            </button>
                                            <button onClick={() => handleReject(res.id)} className="w-full justify-center text-sm flex items-center py-2 px-3 rounded-md font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">
                                                <Trash2 className="w-4 h-4 mr-2" /> Zamítnout
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center py-10 text-gray-600">Všechny rezervace jsou zpracovány.</p>
                )}
            </div>
        </div>
    );
};

export default ApprovalModal;