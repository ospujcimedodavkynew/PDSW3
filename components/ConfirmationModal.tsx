import React, { useState, useEffect } from 'react';
import { CheckCircle, Mail, Link as LinkIcon } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    contractInfo: { contractId: string; customerEmail: string; vehicleName: string } | null;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, contractInfo }) => {
    const [copyStatus, setCopyStatus] = useState('Zkopírovat odkaz na smlouvu');

    useEffect(() => {
        if (isOpen) {
            setCopyStatus('Zkopírovat odkaz na smlouvu');
        }
    }, [isOpen]);

    if (!isOpen || !contractInfo) return null;

    const contractLink = `${window.location.origin}${window.location.pathname}?smlouva=${contractInfo.contractId}`;

    const handleSendMail = () => {
        const subject = `Smlouva o pronájmu vozidla: ${contractInfo.vehicleName}`;
        const body = `Dobrý den,\n\nděkujeme za Vaši rezervaci. Zde naleznete odkaz na Vaši smlouvu o pronájmu:\n\n${contractLink}\n\nS pozdravem,\nVáš tým pujcimedodavky.cz`;
        
        const mailtoLink = `mailto:${contractInfo.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        window.location.href = mailtoLink;
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(contractLink).then(() => {
            setCopyStatus('Odkaz zkopírován!');
            setTimeout(() => setCopyStatus('Zkopírovat odkaz na smlouvu'), 2000);
        }).catch(err => {
            alert('Nepodařilo se zkopírovat odkaz.');
            console.error(err);
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Rezervace schválena a smlouva vytvořena!</h2>
                <p className="text-gray-600 mb-6">
                    Smlouva byla uložena a je připravena k odeslání zákazníkovi. E-mail bude obsahovat unikátní odkaz na online verzi smlouvy.
                </p>
                <div className="space-y-3">
                    <button
                        onClick={handleSendMail}
                        className="w-full flex items-center justify-center py-3 px-4 rounded-lg font-semibold transition-colors bg-primary text-white hover:bg-primary-hover"
                    >
                        <Mail className="w-5 h-5 mr-3" /> Odeslat odkaz e-mailem
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center justify-center text-sm py-2 px-4 rounded-lg font-semibold bg-gray-100 hover:bg-gray-200"
                    >
                         <LinkIcon className="w-4 h-4 mr-2" /> {copyStatus}
                    </button>
                </div>
                <div className="mt-6">
                    <button
                        onClick={onClose}
                        className="py-2 px-8 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold"
                    >
                        Hotovo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;