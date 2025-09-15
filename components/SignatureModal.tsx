import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { X, Trash2, Check } from 'lucide-react';

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (signatureDataUrl: string) => void;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    const getContext = () => canvasRef.current?.getContext('2d');

    const setupCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Make it visually fill the positioned parent
        canvas.style.width ='100%';
        canvas.style.height='100%';
        
        // ...then set the internal size to match
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        const ctx = getContext();
        if (ctx) {
            ctx.strokeStyle = '#111827'; // dark-text color
            ctx.lineWidth = 4; // Zvětšená tloušťka pro lepší pocit na tabletu
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    };

    useEffect(() => {
        if (isOpen) {
            // Delay setup to allow modal to render and get correct dimensions
            setTimeout(() => {
                setupCanvas();
                window.addEventListener('resize', setupCanvas);
            }, 50);
        } else {
             window.removeEventListener('resize', setupCanvas);
        }

        return () => {
            window.removeEventListener('resize', setupCanvas);
        };
    }, [isOpen]);
    
    const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number, y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        let clientX, clientY;
        if ('touches' in e.nativeEvent) {
            clientX = e.nativeEvent.touches[0].clientX;
            clientY = e.nativeEvent.touches[0].clientY;
        } else {
            clientX = (e.nativeEvent as MouseEvent).clientX;
            clientY = (e.nativeEvent as MouseEvent).clientY;
        }
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const ctx = getContext();
        if (ctx) {
            const { x, y } = getCoords(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
            setIsDrawing(true);
            setIsEmpty(false);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawing) return;
        const ctx = getContext();
        if (ctx) {
            const { x, y } = getCoords(e);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const ctx = getContext();
        if (ctx) {
            ctx.closePath();
            setIsDrawing(false);
        }
    };

    const clear = () => {
        const ctx = getContext();
        const canvas = canvasRef.current;
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setIsEmpty(true);
        }
    };
    
    const handleSave = () => {
        if (isEmpty || !canvasRef.current) {
            alert("Prosím, podepište se.");
            return;
        }
        const dataUrl = canvasRef.current.toDataURL('image/png');
        onSave(dataUrl);
        clear();
    };
    
    const handleClose = () => {
        clear();
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4"
             // Prevent background scroll on touch devices
             onTouchMove={(e) => e.preventDefault()}
        >
            <div className="w-full h-full bg-white rounded-lg shadow-2xl flex flex-col p-4">
                <div className="flex-shrink-0 flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Podpis zákazníka</h2>
                    <p className="text-sm text-gray-500">Prosím, podepište se do pole níže.</p>
                </div>

                <div className="flex-grow w-full h-full border border-gray-300 rounded-md relative touch-none">
                     <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                </div>
               
                <div className="flex-shrink-0 flex justify-center items-center space-x-4 mt-4">
                    <button 
                        onClick={handleClose}
                        className="py-3 px-6 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center font-semibold"
                    >
                        <X className="w-5 h-5 mr-2" /> Zrušit
                    </button>
                    <button 
                        onClick={clear}
                        className="py-3 px-6 rounded-lg bg-yellow-400 hover:bg-yellow-500 flex items-center font-semibold"
                    >
                        <Trash2 className="w-5 h-5 mr-2" /> Vymazat
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isEmpty}
                        className="py-3 px-8 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400 flex items-center font-bold text-lg"
                    >
                        <Check className="w-6 h-6 mr-2" /> Potvrdit podpis
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignatureModal;
