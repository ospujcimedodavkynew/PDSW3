import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import * as api from '../services/api';
import { Customer, Reservation, Vehicle, Contract, FinancialTransaction, VehicleService, VehicleDamage, HandoverProtocol, CompanySettings, Invoice, Page, ReservationDefaults } from '../types';
import { Session, RealtimeChannel } from '@supabase/supabase-js';


interface AppData {
    vehicles: Vehicle[];
    customers: Customer[];
    reservations: Reservation[];
    contracts: Contract[];
    handoverProtocols: HandoverProtocol[];
    financials: FinancialTransaction[];
    services: VehicleService[];
    settings: CompanySettings | null;
    invoices: Invoice[];
}

export interface ProtocolData {
    notes: string;
    fuelLevel: string;
    cleanliness: string;
    keysAndDocsOk: boolean;
    customerAgreed: boolean;
}

interface DataContextActions {
    refreshData: () => Promise<void>;
    signOut: () => Promise<void>;
    addCustomer: (customerData: Omit<Customer, 'id'>) => Promise<Customer>;
    updateCustomer: (customerData: Customer) => Promise<void>;
    addVehicle: (vehicleData: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
    updateVehicle: (vehicleData: Vehicle) => Promise<void>;
    openVehicleFormModal: (vehicle: Partial<Vehicle> | null) => void;
    closeVehicleFormModal: () => void;
    addReservation: (reservationData: Omit<Reservation, 'id' | 'status'>) => Promise<Reservation>;
    updateReservation: (reservationId: string, updates: Partial<Reservation>) => Promise<void>;
    approveReservation: (reservationId: string) => Promise<{ contractId: string; customerEmail: string; vehicleName: string; } | null>;
    rejectReservation: (reservationId: string) => Promise<void>;
    activateReservation: (reservationId: string, startMileage: number, signatureDataUrl: string) => Promise<void>;
    completeReservation: (reservationId: string, endMileage: number, protocolData: ProtocolData, signatureDataUrl: string, refuelingCost?: number, forfeitDeposit?: boolean) => Promise<void>;
    addContract: (contractData: Omit<Contract, 'id'>, signatureDataUrl: string) => Promise<Contract>;
    updateContract: (contractId: string, updates: Partial<Contract>) => Promise<void>;
    addExpense: (expenseData: { description: string; amount: number; date: Date; }) => Promise<void>;
    addService: (serviceData: Omit<VehicleService, 'id'>) => Promise<void>;
    updateService: (serviceId: string, updates: Partial<VehicleService>) => Promise<void>;
    addDamage: (damageData: { vehicleId: string; reservationId: string; description: string; location: string; imageFile: File; }) => Promise<void>;
    createOnlineReservation: (vehicleId: string, startDate: Date, endDate: Date, customerData: Omit<Customer, 'id'>, destination?: string, estimatedMileage?: number) => Promise<void>;
    updateSettings: (settingsData: Omit<CompanySettings, 'id'>) => Promise<void>;
    addInvoice: (invoiceData: Omit<Invoice, 'id'>) => Promise<Invoice>;
    setReservationToEdit: (reservation: Reservation | null) => void;
    setReservationDefaults: (defaults: ReservationDefaults | null) => void;
}

interface DataContextState {
    data: AppData;
    loading: boolean;
    actions: DataContextActions;
    session: Session | null;
    isVehicleFormModalOpen: boolean;
    vehicleBeingEdited: Partial<Vehicle> | null;
    reservationToEdit: Reservation | null;
    reservationDefaults: ReservationDefaults | null;
}

const DataContext = createContext<DataContextState | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

// --- CENTRALIZED HELPER FUNCTIONS ---

export const calculateTotalPrice = (vehicle: Vehicle, startDate: Date, endDate: Date): number => {
    if (!vehicle || !startDate || !endDate) return 0;
    if (endDate <= startDate) return 0;

    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 3600);
    
    if (durationHours <= 4) return vehicle.rate4h;
    if (durationHours <= 12) return vehicle.rate12h;
    const days = Math.ceil(durationHours / 24);
    return days * vehicle.dailyRate;
};

interface ContractTemplateData {
    customer: Customer;
    vehicle: Vehicle;
    startDate: Date;
    endDate: Date;
    totalPrice: number;
}

export const generateContractText = (
    templateData: ContractTemplateData,
    signaturePlaceholder: 'image_placeholder' | 'text_placeholder'
): string => {
    const { customer, vehicle, startDate, endDate, totalPrice } = templateData;

    const signatureSection = signaturePlaceholder === 'image_placeholder'
        ? `Digitální podpis nájemce:\n%%SIGNATURE_IMAGE%%`
        : `Smlouva bude digitálně podepsána při převzetí vozidla.`;

    const contractVehicle = vehicle;
    const customerForContract = customer;
    
    return `
SMLOUVA O NÁJMU DOPRAVNÍHO PROSTŘEDKU
=========================================

Článek I. - Smluvní strany
-----------------------------------------
Pronajímatel:
Milan Gula
Ghegova 117, Brno Nové Sady, 60200
Web: pujcimedodavky.cz
IČO: 07031653
(dále jen "pronajímatel")

Nájemce:
Jméno: ${customerForContract.firstName} ${customerForContract.lastName}
Adresa: ${customerForContract.address}
${customerForContract.ico ? `IČO: ${customerForContract.ico}` : ''}
Email: ${customerForContract.email}
Telefon: ${customerForContract.phone}
Číslo ŘP: ${customerForContract.driverLicenseNumber}
(dále jen "nájemce")

Článek II. - Předmět a účel nájmu
-----------------------------------------
1. Pronajímatel tímto přenechává nájemci do dočasného užívání (nájmu) následující motorové vozidlo (dále jen "předmět nájmu" nebo "vozidlo"):
   Vozidlo: ${contractVehicle.name} (${contractVehicle.make} ${contractVehicle.model})
   SPZ: ${contractVehicle.licensePlate}
   Rok výroby: ${contractVehicle.year}
2. Nájemce se zavazuje užívat vozidlo k obvyklému účelu a v souladu s platnými právními předpisy.

Článek III. - Doba nájmu a cena
-----------------------------------------
1. Doba nájmu je sjednána od: ${startDate.toLocaleString('cs-CZ')} do: ${endDate.toLocaleString('cs-CZ')}.
2. Celková cena nájmu činí: ${totalPrice.toLocaleString('cs-CZ')} Kč. Cena je splatná při převzetí vozidla, není-li dohodnuto jinak.
3. Nájemce bere na vědomí, že denní limit pro nájezd je 300 km. Za každý kilometr nad tento limit (vypočtený jako 300 km * počet dní pronájmu) bude účtován poplatek 3 Kč/km.
   Počáteční stav kilometrů: ${(contractVehicle.currentMileage ?? 0).toLocaleString('cs-CZ')} km.

Článek IV. - Vratná kauce (jistota)
-----------------------------------------
1. Nájemce skládá při podpisu této smlouvy a předání vozidla vratnou kauci ve výši 5.000 Kč (slovy: pět tisíc korun českých) v hotovosti nebo na bankovní účet pronajímatele. Tato kauce je plně vratná za podmínek uvedených níže.
2. Tato kauce slouží k zajištění případných pohledávek pronajímatele vůči nájemci (např. na úhradu škody, smluvních pokut, nákladů na dotankování paliva atd.).
3. Kauce bude nájemci vrácena v plné výši po řádném vrácení vozidla, a to bezodkladně, pokud nebudou shledány žádné vady či škody. V opačném případě je pronajímatel oprávněn kauci (nebo její část) použít na úhradu svých pohledávek.

Článek V. - Práva a povinnosti stran
-----------------------------------------
1. Nájemce svým podpisem potvrzuje, že vozidlo převzal v řádném technickém stavu, bez zjevných závad, s kompletní povinnou výbavou a s plnou nádrží pohonných hmot.
2. Nájemce je povinen užívat vozidlo s péčí řádného hospodáře, chránit ho před poškozením, ztrátou či zničením a dodržovat pokyny výrobce pro jeho provoz.
3. V celém vozidle je PŘÍSNĚ ZAKÁZÁNO KOUŘIT. V případě porušení tohoto zákazu je nájemce povinen uhradit smluvní pokutu ve výši 500 Kč.
4. Nájemce je povinen vrátit vozidlo s plnou nádrží pohonných hmot. V případě vrácení vozidla s neúplnou nádrží je nájemce povinen uhradit náklady na dotankování a smluvní pokutu ve výši 500 Kč.
5. Nájemce není oprávněn provádět na vozidle jakékoliv úpravy, přenechat ho do podnájmu třetí osobě, ani ho použít k účasti na závodech, k trestné činnosti či k přepravě nebezpečných nákladů.

Článek VI. - Odpovědnost za škodu a spoluúčast
-----------------------------------------
1. V případě poškození předmětu nájmu zaviněného nájemcem, nebo v případě odcizení, se sjednává spoluúčast nájemce na vzniklé škodě.
2. Výše spoluúčasti činí 5.000 Kč při poškození pronajatého vozidla.
3. V případě dopravní nehody, při které dojde k poškození jiných vozidel nebo majetku třetích stran, činí spoluúčast 10.000 Kč.
4. Nájemce je povinen každou dopravní nehodu, poškození vozidla nebo jeho odcizení neprodleně ohlásit pronajimateli a Policii ČR.

Článek VII. - Závěrečná ustanovení
-----------------------------------------
1. Tato smlouva nabývá platnosti a účinnosti dnem jejího podpisu oběma smluvními stranami.
2. Smluvní strany prohlašují, že si smlouvu přečetly, s jejím obsahem souhlasí a na důkaz toho připojují své podpisy.
3. Tato smlouva je vyhotovena elektronicky. Nájemce svým digitálním podpisem stvrzuje, že se seznámil s obsahem smlouvy, souhlasí s ním a vozidlo v uvedeném stavu přebírá.

${signatureSection}
    `.trim();
};

const expandData = (data: Omit<AppData, 'handoverProtocols' | 'settings' | 'invoices'> & { handoverProtocols: HandoverProtocol[], settings: CompanySettings | null, invoices: Invoice[] }): AppData => {
    const vehiclesById = new Map(data.vehicles.map(v => [v.id, v]));
    const customersById = new Map(data.customers.map(c => [c.id, c]));
    const reservationsById = new Map(data.reservations.map(r => [r.id, r]));
    const contractsById = new Map(data.contracts.map(c => [c.id, c]));

    const reservations = data.reservations.map(r => ({
        ...r,
        customer: customersById.get(r.customerId),
        vehicle: vehiclesById.get(r.vehicleId),
    }));

    const contracts = data.contracts.map(c => ({
        ...c,
        customer: customersById.get(c.customerId),
        // FIX: The variable 'r' was undefined in this context. It should be 'c' to reference the current contract object.
        vehicle: vehiclesById.get(c.vehicleId),
    }));

    const handoverProtocols = data.handoverProtocols.map(p => ({
        ...p,
        customer: customersById.get(p.customerId),
        vehicle: vehiclesById.get(p.vehicleId),
        reservation: reservationsById.get(p.reservationId)
    }));
    
    const services = data.services.map(s => ({
        ...s,
        vehicle: vehiclesById.get(s.vehicleId),
    }));

    const financials = data.financials.map(f => {
        const reservation = reservations.find(r => r.id === f.reservationId);
        return {
            ...f,
            reservation,
        }
    });
    
    const invoices = data.invoices.map(i => ({
        ...i,
        customer: customersById.get(i.customerId),
        contract: contractsById.get(i.contractId),
    }));

    return { ...data, reservations, contracts, handoverProtocols, services, financials, invoices };
};

const dataUrlToBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error("Invalid data URL");
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [data, setData] = useState<AppData>({
        vehicles: [], customers: [], reservations: [], contracts: [], handoverProtocols: [], financials: [], services: [], settings: null, invoices: []
    });
    const [loading, setLoading] = useState(true);
    const [isVehicleFormModalOpen, setIsVehicleFormModalOpen] = useState(false);
    const [vehicleBeingEdited, setVehicleBeingEdited] = useState<Partial<Vehicle> | null>(null);
    const [reservationToEdit, setReservationToEdit] = useState<Reservation | null>(null);
    const [reservationDefaults, setReservationDefaults] = useState<ReservationDefaults | null>(null);

    const refreshData = useCallback(async () => {
        try {
            const allData = await api.getAllData();
            const expanded = expandData(allData);
            setData(expanded);
        } catch (error) {
            console.error("Failed to refresh data:", error);
        }
    }, []);

    useEffect(() => {
        let subscription: any;
        let channel: RealtimeChannel | null = null;
        
        const checkSession = async () => {
            setLoading(true);
            const { data: { session } } = await api.getSession();
            setSession(session);
            if (session) {
                await refreshData();
                channel = api.onNewReservation(() => {
                    console.log("New reservation detected, refreshing data...");
                    refreshData();
                });
            }
            setLoading(false);
        };
        
        checkSession();
        
        // FIX: Correctly subscribe to auth state changes. The `onAuthStateChange` function
        // returns the subscription directly, not a nested data object. The callback also
        // only receives the session as its single argument.
        const authSubscription = api.onAuthStateChange((newSession) => {
            setSession(newSession);
            if (newSession) {
                refreshData();
                 if (!channel) {
                    channel = api.onNewReservation(() => {
                        console.log("New reservation detected, refreshing data...");
                        refreshData();
                    });
                }
            } else {
                setData({ vehicles: [], customers: [], reservations: [], contracts: [], handoverProtocols: [], financials: [], services: [], settings: null, invoices: [] });
                if (channel) {
                    api.removeChannel(channel);
                    channel = null;
                }
            }
        });
        
        return () => {
            authSubscription.unsubscribe();
            if (channel) {
                api.removeChannel(channel);
            }
        };
    }, [refreshData]);

    const uploadSignature = async (signatureDataUrl: string): Promise<string> => {
        const signatureBlob = dataUrlToBlob(signatureDataUrl);
        const signatureFile = new File([signatureBlob], `signature_${Date.now()}.png`, { type: 'image/png' });
        // The path should not contain 'public/' as the api.uploadFile function handles it now.
        const filePath = `${signatureFile.name}`;
        return await api.uploadFile('signatures', filePath, signatureFile);
    };

    const actions: DataContextActions = useMemo(() => ({
        refreshData,
        signOut: api.signOut,
        addCustomer: async (customerData) => {
            const newCustomer = await api.addCustomer(customerData);
            await refreshData();
            return newCustomer;
        },
        updateCustomer: async (customerData) => {
            await api.updateCustomer(customerData);
            await refreshData();
        },
        addVehicle: async (vehicleData) => {
            const newVehicle = await api.addVehicle(vehicleData);
            await refreshData();
            return newVehicle;
        },
        updateVehicle: async (vehicleData) => {
            await api.updateVehicle(vehicleData);
            await refreshData();
        },
        openVehicleFormModal: (vehicle) => {
            setVehicleBeingEdited(vehicle);
            setIsVehicleFormModalOpen(true);
        },
        closeVehicleFormModal: () => {
            setIsVehicleFormModalOpen(false);
            setVehicleBeingEdited(null);
        },
        addReservation: async (reservationData) => {
            const newReservation = await api.addReservation(reservationData);
            await refreshData();
            return newReservation;
        },
        updateReservation: async (reservationId, updates) => {
            await api.updateReservation(reservationId, updates);
            await refreshData();
        },
        approveReservation: async (reservationId) => {
            const reservation = data.reservations.find(r => r.id === reservationId);
            if (!reservation || !reservation.customer || !reservation.vehicle) return null;
            
            await api.updateReservation(reservationId, { status: 'scheduled' });

            const totalPrice = calculateTotalPrice(reservation.vehicle, new Date(reservation.startDate), new Date(reservation.endDate));

            const contractText = generateContractText({
                customer: reservation.customer,
                vehicle: reservation.vehicle,
                startDate: new Date(reservation.startDate),
                endDate: new Date(reservation.endDate),
                totalPrice: totalPrice,
            }, 'text_placeholder');

            const contract = await api.addContract({
                reservationId: reservation.id,
                customerId: reservation.customerId,
                vehicleId: reservation.vehicleId,
                generatedAt: new Date(),
                contractText: contractText
            });

            // Do not refresh data here to prevent modal from closing early.
            // The ApprovalModal component will call refreshData.
            return {
                contractId: contract.id,
                customerEmail: reservation.customer.email,
                vehicleName: reservation.vehicle.name,
            };
        },
        rejectReservation: async (reservationId) => {
            await api.deleteReservation(reservationId);
            await refreshData();
        },
        activateReservation: async (reservationId, startMileage, signatureDataUrl) => {
            const reservation = data.reservations.find(r => r.id === reservationId);
            if (!reservation || !reservation.vehicle) throw new Error("Reservation or vehicle not found");
            
            const signatureUrl = await uploadSignature(signatureDataUrl);
            const signatureImgTag = `<img src="${signatureUrl}" alt="signature" style="width: 250px; height: auto;" />`;
            
            // Find the contract created on approval
            const existingContract = data.contracts.find(c => c.reservationId === reservationId);
            if (!existingContract) throw new Error("Contract for reservation not found");
            
            const updatedContractText = existingContract.contractText.replace('Smlouva bude digitálně podepsána při převzetí vozidla.', `Digitální podpis nájemce:\n${signatureImgTag}`);
            await api.updateContract(existingContract.id, { contractText: updatedContractText });

            await api.updateReservation(reservationId, { status: 'active', startMileage });
            await api.updateVehicle({ ...reservation.vehicle, status: 'rented', currentMileage: startMileage });
            
            const protocolText = `PŘEDÁVACÍ PROTOKOL (PŘEDÁNÍ)\n\nZákazník: ${reservation.customer?.firstName} ${reservation.customer?.lastName}\nVozidlo: ${reservation.vehicle.name} (${reservation.vehicle.licensePlate})\nPočáteční stav km: ${startMileage}\n\nDigitální podpis zákazníka:\n${signatureImgTag}`;
            await api.addHandoverProtocol({
                reservationId,
                customerId: reservation.customerId,
                vehicleId: reservation.vehicleId,
                generatedAt: new Date(),
                protocolText,
                signatureUrl,
            });

            await refreshData();
        },
        completeReservation: async (reservationId, endMileage, protocolData, signatureDataUrl, refuelingCost, forfeitDeposit) => {
            const reservation = data.reservations.find(r => r.id === reservationId);
            if (!reservation || !reservation.vehicle) throw new Error("Reservation or vehicle not found");
            
            const signatureUrl = await uploadSignature(signatureDataUrl);
            const signatureImgTag = `<img src="${signatureUrl}" alt="signature" style="width: 250px; height: auto;" />`;

            const protocolText = `
PŘEDÁVACÍ PROTOKOL (VRÁCENÍ)
---------------------------
Zákazník: ${reservation.customer?.firstName} ${reservation.customer?.lastName}
Vozidlo: ${reservation.vehicle.name} (${reservation.vehicle.licensePlate})
Datum: ${new Date().toLocaleString('cs-CZ')}

Počáteční stav km: ${reservation.startMileage}
Konečný stav km: ${endMileage}
Ujeto celkem: ${endMileage - (reservation.startMileage || 0)} km

Stav paliva: ${protocolData.fuelLevel}
Čistota: ${protocolData.cleanliness}
Klíče a doklady: ${protocolData.keysAndDocsOk ? 'V pořádku' : 'Chybí'}
Poznámky: ${protocolData.notes || 'Bez poznámek.'}

Digitální podpis zákazníka:
${signatureImgTag}
            `.trim();

            await api.addHandoverProtocol({
                reservationId,
                customerId: reservation.customerId,
                vehicleId: reservation.vehicleId,
                generatedAt: new Date(),
                protocolText,
                signatureUrl,
            });

            await api.updateReservation(reservationId, { status: 'completed', endMileage });
            await api.updateVehicle({ ...reservation.vehicle, status: 'available', currentMileage: endMileage });
            
            const durationMs = new Date(reservation.endDate).getTime() - new Date(reservation.startDate).getTime();
            const rentalDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
            const kmDriven = endMileage - (reservation.startMileage || 0);
            const kmLimit = rentalDays * 300;
            const kmOver = Math.max(0, kmDriven - kmLimit);
            const extraCharge = kmOver * 3;
            
            const durationHours = durationMs / (1000 * 3600);
            let basePrice = 0;
            if (durationHours <= 4) basePrice = reservation.vehicle.rate4h;
            else if (durationHours <= 12) basePrice = reservation.vehicle.rate12h;
            else basePrice = Math.ceil(durationHours / 24) * reservation.vehicle.dailyRate;
            
            const totalIncome = basePrice + extraCharge;

            await api.addFinancialTransaction({
                type: 'income',
                amount: totalIncome,
                date: new Date(),
                description: `Příjem z pronájmu - ${reservation.vehicle.name}`,
                reservationId,
            });

            if (refuelingCost && refuelingCost > 0) {
                await api.addFinancialTransaction({
                    type: 'expense',
                    amount: refuelingCost,
                    date: new Date(),
                    description: `Náklady na dotankování - ${reservation.vehicle.name}`,
                    reservationId,
                });
            }

            if (forfeitDeposit) {
                await api.addFinancialTransaction({
                    type: 'income',
                    amount: 5000, // Fixed deposit amount from contract
                    date: new Date(),
                    description: `Propadlá kauce (poškození) - ${reservation.vehicle.name}`,
                    reservationId,
                });
            }

            await refreshData();
        },
        addContract: async (contractData, signatureDataUrl) => {
            const signatureUrl = await uploadSignature(signatureDataUrl);
            const signatureImgTag = `<img src="${signatureUrl}" alt="signature" style="width: 250px; height: auto;" />`;
            const finalContractText = contractData.contractText.replace('%%SIGNATURE_IMAGE%%', signatureImgTag);
            
            // This action is only for manual reservations, so we don't need to check for existing contracts.
            const newContract = await api.addContract({ ...contractData, contractText: finalContractText });
            await refreshData();
            return newContract;
        },
        updateContract: async (contractId, updates) => {
            await api.updateContract(contractId, updates);
            await refreshData();
        },
        addExpense: async (expenseData) => {
            await api.addFinancialTransaction({ ...expenseData, type: 'expense' });
            await refreshData();
        },
        addService: async (serviceData) => {
            await api.addService(serviceData);
            await refreshData();
        },
        updateService: async (serviceId, updates) => {
            await api.updateService(serviceId, updates);
            await refreshData();
        },
        addDamage: async (damageData) => {
            await api.addDamage(damageData);
            await refreshData();
        },
        createOnlineReservation: async (vehicleId, startDate, endDate, customerData, destination, estimatedMileage) => {
            await api.createOnlineReservation(vehicleId, startDate, endDate, customerData, destination, estimatedMileage);
            await refreshData();
        },
        updateSettings: async (settingsData) => {
            await api.updateSettings(settingsData);
            await refreshData();
        },
        addInvoice: async (invoiceData) => {
            const newInvoice = await api.addInvoice(invoiceData);
            await refreshData();
            return newInvoice;
        },
        setReservationToEdit: (reservation) => {
            setReservationToEdit(reservation);
        },
        setReservationDefaults: (defaults) => {
            setReservationDefaults(defaults);
        },
    }), [data.reservations, data.contracts, refreshData]);

    const value = useMemo(() => ({
        data,
        loading,
        session,
        actions,
        isVehicleFormModalOpen,
        vehicleBeingEdited,
        reservationToEdit,
        reservationDefaults,
    }), [data, loading, session, actions, isVehicleFormModalOpen, vehicleBeingEdited, reservationToEdit, reservationDefaults]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};