import React from 'react';

interface LogoWithQRProps {
    companyName: string;
    totalAmount: number;
    iban: string;
    invoiceNumber: string;
}

const LogoWithQR: React.FC<LogoWithQRProps> = ({ companyName, totalAmount, iban, invoiceNumber }) => {
    // This is a simplified placeholder for a QR code.
    // In a real application, you would use a library like 'qrcode.react' to generate a real QR payment code.
    // The string format for SPAYD (Short Payment Descriptor) is complex.
    const qrCodePayload = `ACC:${iban}*AM:${totalAmount.toFixed(2)}*CC:CZK*MSG:Platba faktury ${invoiceNumber}`;

    return (
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold text-primary">{companyName}</h1>
            </div>
            <div className="text-center">
                {/* Placeholder for QR code. A real implementation would use a QR code library. */}
                <div className="w-28 h-28 bg-gray-100 border p-1">
                    <div className="w-full h-full bg-white flex items-center justify-center text-center text-[8px] p-1 break-all">
                        {/* QR Code would be rendered here */}
                        QR kód pro platbu (placeholder)
                        <br />
                        <span className="sr-only">{qrCodePayload}</span>
                    </div>
                </div>
                <p className="text-xs font-semibold mt-1">QR Platba</p>
            </div>
        </div>
    );
};

export default LogoWithQR;
