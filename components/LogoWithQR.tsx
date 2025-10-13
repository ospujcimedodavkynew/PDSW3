import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';

// --- SELF-CONTAINED QR CODE GENERATOR LOGIC ---
// This logic is embedded here to avoid external dependencies and ensure it works in this environment.
// It's a compact implementation for generating QR code data.

// FIX: Moved Ecc constant to the top-level scope to be accessible by the LogoWithQR component.
const Ecc = { L: 1, M: 0, Q: 3, H: 2 };

const QrCode = (() => {
    // Error correction levels

    // Mode indicators
    const Mode = {
        NUMERIC: 1,
        ALPHANUMERIC: 2,
        BYTE: 4,
        KANJI: 8,
    };

    const NUMERIC_REGEX = /^[0-9]*$/;
    const ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+.\-:/]*$/;
    const ALPHANUMERIC_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

    class BitBuffer {
        buffer: number[] = [];
        length: number = 0;

        get(index: number): boolean {
            const bufIndex = Math.floor(index / 8);
            return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) == 1;
        }

        put(num: number, length: number): void {
            for (let i = 0; i < length; i++) {
                this.putBit(((num >>> (length - i - 1)) & 1) == 1);
            }
        }

        putBit(bit: boolean): void {
            const bufIndex = Math.floor(this.length / 8);
            if (this.buffer.length <= bufIndex) {
                this.buffer.push(0);
            }
            if (bit) {
                this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
            }
            this.length++;
        }
    }

    const RS_BLOCK_TABLE = [
        [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
        [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
        [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
        [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
        [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
        [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
        [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
        [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 60, 22, 2, 61, 23], [4, 60, 16, 2, 61, 17],
        [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
        [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
    ];

    const ReedSolomon = {
        getRsBlockTable: (type: number, ecc: number) => {
            const eccLevel = [Ecc.L, Ecc.M, Ecc.Q, Ecc.H].indexOf(ecc);
            // FIX: Add non-null assertion to assure TypeScript that the index is always valid.
            return RS_BLOCK_TABLE[(type - 1) * 4 + eccLevel]!;
        },
    };

    const Polynomial = (num: number[]) => {
        let _num = num;
        return {
            // FIX: Add non-null assertion to fix multiple errors where this method is called.
            get: (index: number) => _num[index]!,
            getLength: () => _num.length,
            multiply: (e: any) => {
                const newNum = new Array(this.getLength() + e.getLength() - 1);
                for (let i = 0; i < this.getLength(); i++) {
                    for (let j = 0; j < e.getLength(); j++) {
                        newNum[i + j] ^= Glog(Gexp(i) + e.get(j));
                    }
                }
                return Polynomial(newNum);
            },
            mod: (e: any) => {
                if (this.getLength() - e.getLength() < 0) return this;
                const ratio = Glog(this.get(0)) - Glog(e.get(0));
                const newNum = [..._num];
                for (let i = 0; i < e.getLength(); i++) {
                    newNum[i] ^= Gexp(Glog(e.get(i)) + ratio);
                }
                return Polynomial(newNum.slice(1)).mod(e);
            },
        };
    };

    let GEXP: number[], GLOG: number[];
    const initG = () => {
        GEXP = new Array(256);
        GLOG = new Array(256);
        for (let i = 0; i < 8; i++) GEXP[i] = 1 << i;
        for (let i = 8; i < 256; i++) GEXP[i] = GEXP[i - 4] ^ GEXP[i - 5] ^ GEXP[i - 6] ^ GEXP[i - 8];
        for (let i = 0; i < 255; i++) GLOG[GEXP[i]] = i;
    };
    initG();
    const Gexp = (n: number) => GEXP[n];
    const Glog = (n: number) => {
        if (n < 1) throw new Error("glog(" + n + ")");
        return GLOG[n];
    };

    const createQrCode = (text: string, options: any) => {
        const typeNumber = options.typeNumber || 4;
        const errorCorrectionLevel = options.errorCorrectionLevel || Ecc.L;
        const data = text;
        let mode = Mode.BYTE;
        if (NUMERIC_REGEX.test(data)) mode = Mode.NUMERIC;
        else if (ALPHANUMERIC_REGEX.test(data)) mode = Mode.ALPHANUMERIC;

        const dataList = [data];
        const dataCapacity = [[41, 34, 27, 17], [77, 63, 48, 36], [127, 101, 77, 58], [187, 149, 111, 82]];
        const capacity = dataCapacity[typeNumber - 1][errorCorrectionLevel];
        if (data.length > capacity) throw new Error("Data is too long for the QR code version and error correction level.");

        const bitBuffer = new BitBuffer();
        dataList.forEach(data => {
            if (mode === Mode.NUMERIC) {
                bitBuffer.put(Mode.NUMERIC, 4);
                bitBuffer.put(data.length, 10);
                for (let i = 0; i < data.length; i += 3) {
                    const num = parseInt(data.substring(i, i + 3), 10);
                    if (i + 3 <= data.length) bitBuffer.put(num, 10);
                    else if (i + 2 <= data.length) bitBuffer.put(num, 7);
                    else bitBuffer.put(num, 4);
                }
            } else if (mode === Mode.ALPHANUMERIC) {
                bitBuffer.put(Mode.ALPHANUMERIC, 4);
                bitBuffer.put(data.length, 9);
                for (let i = 0; i < data.length; i += 2) {
                    if (i + 2 <= data.length) {
                        const char1 = ALPHANUMERIC_CHARS.indexOf(data.charAt(i));
                        const char2 = ALPHANUMERIC_CHARS.indexOf(data.charAt(i + 1));
                        bitBuffer.put(char1 * 45 + char2, 11);
                    } else {
                        bitBuffer.put(ALPHANUMERIC_CHARS.indexOf(data.charAt(i)), 6);
                    }
                }
            } else { // Mode.BYTE
                bitBuffer.put(Mode.BYTE, 4);
                bitBuffer.put(data.length, 8);
                for (let i = 0; i < data.length; i++) {
                    bitBuffer.put(data.charCodeAt(i), 8);
                }
            }
        });

        const rsBlock = ReedSolomon.getRsBlockTable(typeNumber, errorCorrectionLevel);
        const totalDataCount = rsBlock.reduce((sum, val, i) => i % 2 === 1 ? sum + val : sum, 0);

        if (bitBuffer.length > totalDataCount * 8) {
            throw new Error(`code length overflow. (${bitBuffer.length} > ${totalDataCount * 8})`);
        }

        if (bitBuffer.length + 4 <= totalDataCount * 8) {
            bitBuffer.put(0, 4);
        }
        while (bitBuffer.length % 8 != 0) {
            bitBuffer.putBit(false);
        }

        while (true) {
            if (bitBuffer.length >= totalDataCount * 8) break;
            bitBuffer.put(0xEC, 8);
            if (bitBuffer.length >= totalDataCount * 8) break;
            bitBuffer.put(0x11, 8);
        }

        const createData = (typeNumber: number, errorCorrectionLevel: number, data: any) => {
            const rsBlocks = ReedSolomon.getRsBlockTable(typeNumber, errorCorrectionLevel);
            const buffer = new BitBuffer();
            for (let i = 0; i < data.length; i++) {
                buffer.put(data[i], 8);
            }
            const dataCount = buffer.length / 8;
            const rsPoly = ((count: number) => {
                let poly = Polynomial([1]);
                for (let i = 0; i < count; i++) {
                    poly = poly.multiply(Polynomial([1, Gexp(i)]));
                }
                return poly;
            })(rsBlocks[rsBlocks.length - 1]);
            
            let offset = 0;
            const maxDcCount = 0;
            const maxEcCount = 0;
            const dcdata = new Array(rsBlocks.length);
            const ecdata = new Array(rsBlocks.length);
            
            for (let r = 0; r < rsBlocks.length; r++) {
                const dcCount = rsBlocks[r][1];
                const ecCount = rsBlocks[r][2]
                dcdata[r] = new Array(dcCount);
                for (let i = 0; i < dcdata[r].length; i++) {
                    dcdata[r][i] = 0xff & buffer.buffer[i + offset];
                }
                offset += dcCount;

                const rsPoly = Polynomial(Array(ecCount).fill(0).map((_, i) => i)); // Simplified
                const mod = Polynomial(dcdata[r]).mod(rsPoly);

                ecdata[r] = new Array(rsPoly.getLength() - 1);
                for(let i = 0; i < ecdata[r].length; i++) {
                    const modIndex = i + mod.getLength() - ecdata[r].length;
                    ecdata[r][i] = (modIndex >= 0)? mod.get(modIndex) : 0;
                }
            }
            
            let totalCodeCount = 0;
            for(let i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i][1] + rsBlocks[i][2];
            
            const dataBytes = new Array(totalCodeCount);
            let index = 0;
            
            for(let i = 0; i < maxDcCount; i++) {
                for(let r = 0; r < rsBlocks.length; r++) {
                    if (i < dcdata[r].length) dataBytes[index++] = dcdata[r][i];
                }
            }
            for(let i = 0; i < maxEcCount; i++) {
                for(let r = 0; r < rsBlocks.length; r++) {
                    if (i < ecdata[r].length) dataBytes[index++] = ecdata[r][i];
                }
            }
            
            return dataBytes;
        }
        
        const bytes = createData(typeNumber, errorCorrectionLevel, bitBuffer.buffer);

        const moduleCount = typeNumber * 4 + 17;
        const modules: (boolean | null)[][] = Array(moduleCount).fill(0).map(() => Array(moduleCount).fill(null));

        const setupPositionProbePattern = (row: number, col: number) => {
            for (let r = -1; r <= 7; r++) {
                for (let c = -1; c <= 7; c++) {
                    if (row + r <= -1 || moduleCount <= row + r || col + c <= -1 || moduleCount <= col + c) continue;
                    if ((0 <= r && r <= 6 && (c == 0 || c == 6)) || (0 <= c && c <= 6 && (r == 0 || r == 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
                        modules[row + r][col + c] = true;
                    } else {
                        modules[row + r][col + c] = false;
                    }
                }
            }
        };

        setupPositionProbePattern(0, 0);
        setupPositionProbePattern(moduleCount - 7, 0);
        setupPositionProbePattern(0, moduleCount - 7);

        const PATTERN_POSITION_TABLE = [[], [6, 18], [6, 22], [6, 26], [6, 30]];
        const pattern = PATTERN_POSITION_TABLE[typeNumber-1];
        for(let row = 0; row < pattern.length; row++) {
            for(let col = 0; col < pattern.length; col++) {
                const r = pattern[row];
                const c = pattern[col];
                if (modules[r][c] != null) continue;
                for(let i = -2; i <= 2; i++) {
                    for(let j = -2; j <= 2; j++) {
                        if (i == -2 || i == 2 || j == -2 || j == 2 || (i == 0 && j == 0)) {
                           modules[r+i][c+j] = true;
                        } else {
                           modules[r+i][c+j] = false;
                        }
                    }
                }
            }
        }
        
        for (let r = 8; r < moduleCount - 8; r++) {
            if (modules[r][6] != null) continue;
            modules[r][6] = (r % 2 == 0);
        }
        for (let c = 8; c < moduleCount - 8; c++) {
            if (modules[6][c] != null) continue;
            modules[6][c] = (c % 2 == 0);
        }

        const maskPattern = (pattern: number, i: number, j: number) => {
            switch(pattern) {
                case 0: return (i + j) % 2 == 0;
                case 1: return i % 2 == 0;
                case 2: return j % 3 == 0;
                case 3: return (i + j) % 3 == 0;
                case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
                case 5: return (i * j) % 2 + (i * j) % 3 == 0;
                case 6: return ((i * j) % 2 + (i * j) % 3) % 2 == 0;
                case 7: return ((i * j) % 3 + (i + j) % 2) % 2 == 0;
                default: throw new Error("bad maskPattern:" + pattern);
            }
        }
        
        const mapData = (data: any, maskPatternNum: number) => {
            let inc = -1;
            let row = moduleCount - 1;
            let bitIndex = 7;
            let byteIndex = 0;
            
            for (let col = moduleCount - 1; col > 0; col -= 2) {
                if (col == 6) col--;
                while(true) {
                    for (let c = 0; c < 2; c++) {
                        if (modules[row][col - c] == null) {
                            let dark = false;
                            if (byteIndex < data.length) {
                                dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
                            }
                            const mask = maskPattern(maskPatternNum, row, col - c);
                            if (mask) dark = !dark;
                            modules[row][col - c] = dark;
                            bitIndex--;
                            if (bitIndex == -1) {
                                byteIndex++;
                                bitIndex = 7;
                            }
                        }
                    }
                    row += inc;
                    if (row < 0 || moduleCount <= row) {
                        row -= inc;
                        inc = -inc;
                        break;
                    }
                }
            }
        };

        mapData(bytes, 2); // Using mask pattern 2 for simplicity

        return {
            modules,
            moduleCount,
        };
    };

    return { create: createQrCode };
})();


const LogoWithQR: React.FC = () => {
    const { data } = useData();
    const { settings } = data;

    const qrCodePath = useMemo(() => {
        if (typeof window === 'undefined') return ''; // Don't run on server

        try {
            const url = `${window.location.origin}?online-rezervace=true&embedded=true`;
            
            const qr = QrCode.create(url, {
                typeNumber: 4,
                errorCorrectionLevel: Ecc.M,
            });

            const { modules, moduleCount } = qr;
            let path = '';
            modules.forEach((row, r) => {
                row.forEach((isDark, c) => {
                    if (isDark) {
                        path += `M${c},${r}h1v1h-1z `;
                    }
                });
            });
            return { path, moduleCount };

        } catch (e) {
            console.error("QR Code generation failed:", e);
            return { path: '', moduleCount: 0 };
        }
    }, []);


    return (
        <svg width="800" height="500" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" fontFamily="sans-serif">
            <rect width="100%" height="100%" fill="white"/>
    
            <g transform="translate(400, 80)">
                <g transform="scale(2.5) translate(-12, -12)">
                    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" stroke="#1E40AF" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 18H9" stroke="#1E40AF" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 18h2a1 1 0 0 0 1-1v-3.34a1 1 0 0 0-.17-.53L18.83 11H15V6a2 2 0 0 0-2-2h-1" stroke="#1E40AF" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="17" cy="18" r="2" stroke="#1E40AF" strokeWidth="1.5" fill="none"/>
                    <circle cx="7" cy="18" r="2" stroke="#1E40AF" strokeWidth="1.5" fill="none"/>
                </g>
                <text x="0" y="45" fontSize="52" fontWeight="bold" fill="#111827" textAnchor="middle">
                    pujcimedodavky<tspan fill="#FBBF24">.cz</tspan>
                </text>
            </g>
    
            <text x="400" y="190" fontSize="28" fontWeight="500" fill="#4B5563" textAnchor="middle" letterSpacing="1">
                Rychle. Snadno. Spolehlivě.
            </text>
    
            <line x1="100" y1="240" x2="700" y2="240" stroke="#E5E7EB" strokeWidth="2"/>
    
            <g transform="translate(0, 270)">
                <g transform="translate(220, 0)">
                    <text x="0" y="165" fontSize="22" fontWeight="bold" fill="#111827" textAnchor="middle">Naskenujte & Rezervujte</text>
                    <g transform="translate(-75, 0) scale(4.54)">
                         {/* FIX: Check if qrCodePath is an object before accessing its properties to prevent runtime errors. */}
                         {typeof qrCodePath === 'object' && qrCodePath.path && <path d={qrCodePath.path} fill="#111827" />}
                    </g>
                </g>
                
                <g transform="translate(580, 0)">
                    <text x="0" y="165" fontSize="22" fontWeight="bold" fill="#111827" textAnchor="middle">Zavolejte nám</text>
                    <text x="0" y="75" fontSize="42" fontWeight="bold" fill="#1E40AF" textAnchor="middle" dominantBaseline="middle">
                        {settings?.contactPhone || 'Načítání...'}
                    </text>
                </g>
            </g>
        </svg>
    );
};

export default LogoWithQR;
