import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import * as api from '../services/api';
import { Customer, Reservation, Vehicle, Contract, FinancialTransaction, VehicleService, VehicleDamage, HandoverProtocol, CompanySettings, Invoice, Page } from '../types';
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
    completeReservation: (reservationId: string, endMileage: number, protocolData: ProtocolData, signatureDataUrl: string) => Promise<void>;
    addContract: (contractData: Omit<Contract, 'id'>, signatureDataUrl: string) => Promise<Contract>;
    updateContract: (contractId: string, updates: Partial<Contract>) => Promise<void>;
    addExpense: (expenseData: { description: string; amount: number; date: Date; }) => Promise<void>;
    addService: (serviceData: Omit<VehicleService, 'id'>) => Promise<void>;
    updateService: (serviceId: string, updates: Partial<VehicleService>) => Promise<void>;
    addDamage: (damageData: { vehicleId: string; reservationId: string; description: string; location: string; imageFile: File; }) => Promise<void>;
    createOnlineReservation: (vehicleId: string, startDate: Date, endDate: Date, customerData: Omit<Customer, 'id'>) => Promise<void>;
    updateSettings: (settingsData: Omit<CompanySettings, 'id'>) => Promise<void>;
    addInvoice: (invoiceData: Omit<Invoice, 'id'>) => Promise<Invoice>;
    setReservationToEdit: (reservation: Reservation | null) => void;
}

interface DataContextState {
    data: AppData;
    loading: boolean;
    actions: DataContextActions;
    session: Session | null;
    isVehicleFormModalOpen: boolean;
    vehicleBeingEdited: Partial<Vehicle> | null;
    reservationToEdit: Reservation | null;
}

const DataContext = createContext<DataContextState | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
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

    const financials = data.financials.map(f => ({
        ...f,
        reservation: data.reservations.find(r => r.id === f.reservationId)
    }));
    
    const invoices = data.invoices.map(i => ({
        ...i,
        customer: customersById.get(i.customerId),
        contract: contractsById.get(i.contractId),
    }));


    return { ...data, reservations, contracts, handoverProtocols, services, financials, invoices };
};


export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<AppData>({
        vehicles: [], customers: [], reservations: [], contracts: [], handoverProtocols: [], financials: [], services: [], settings: null, invoices: [],
    });
    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    
    // State for the global vehicle form modal
    const [isVehicleFormModalOpen, setIsVehicleFormModalOpen] = useState(false);
    const [vehicleBeingEdited, setVehicleBeingEdited] = useState<Partial<Vehicle> | null>(null);
    const [reservationToEdit, setReservationToEdit] = useState<Reservation | null>(null);

    useEffect(() => {
        api.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
        });

        const subscription = api.onAuthStateChange((session) => {
            setSession(session);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const refreshData = useCallback(async () => {
        setDataLoading(true);
        try {
            const fetchedData = await api.getAllData();
            const expanded = expandData(fetchedData as any); // cast as any to handle initial null settings
            setData(expanded);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        let reservationListener: RealtimeChannel | null = null;

        if (session) {
            refreshData();
            
            // Set up real-time listener for new reservations
            reservationListener = api.onNewReservation(() => {
                refreshData();
            });

        } else {
            setData({ vehicles: [], customers: [], reservations: [], contracts: [], handoverProtocols: [], financials: [], services: [], settings: null, invoices: [] });
            setDataLoading(false);
        }

        // Cleanup listener on component unmount or session change
        return () => {
            if (reservationListener) {
                api.removeChannel(reservationListener);
            }
        };
    }, [session, refreshData]);

    const openVehicleFormModal = useCallback((vehicle: Partial<Vehicle> | null) => {
        setVehicleBeingEdited(vehicle);
        setIsVehicleFormModalOpen(true);
    }, []);

    const closeVehicleFormModal = useCallback(() => {
        setIsVehicleFormModalOpen(false);
        setVehicleBeingEdited(null);
    }, []);
    
    const uploadSignature = async (dataUrl: string, reservationId: string, type: 'takeover' | 'return'): Promise<string> => {
        if (!dataUrl) return '';
        const fetchRes = await fetch(dataUrl);
        const blob = await fetchRes.blob();
        const signatureFile = new File([blob], `signature_${type}_${reservationId}.png`, { type: 'image/png' });
        // The path should NOT include 'public/'. The centralized `uploadFile` function handles this.
        const filePath = `${Date.now()}_${signatureFile.name}`;
        return await api.uploadFile('signatures', filePath, signatureFile);
    };

    const actions = useMemo((): DataContextActions => ({
        refreshData,
        signOut: api.signOut,
        setReservationToEdit,
        addCustomer: async (customerData) => {
            const newCustomer = await api.addCustomer(customerData);
            setData(prev => expandData({ ...prev, customers: [...prev.customers, newCustomer] }));
            return newCustomer;
        },
        updateCustomer: async (customerData) => {
            const updatedCustomer = await api.updateCustomer(customerData);
            setData(prev => expandData({
                ...prev,
                customers: prev.customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c)
            }));
        },
        addVehicle: async (vehicleData) => {
            const newVehicle = await api.addVehicle(vehicleData);
            setData(prev => expandData({ ...prev, vehicles: [...prev.vehicles, newVehicle] }));
            return newVehicle;
        },
        updateVehicle: async (vehicleData) => {
            const updatedVehicle = await api.updateVehicle(vehicleData);
            setData(prev => expandData({
                ...prev,
                vehicles: prev.vehicles.map(v => v.id === updatedVehicle.id ? updatedVehicle : v)
            }));
        },
        openVehicleFormModal,
        closeVehicleFormModal,
        addReservation: async (resData) => {
            const newReservation = await api.addReservation(resData);
            setData(prev => expandData({ ...prev, reservations: [...prev.reservations, newReservation] }));
            return newReservation;
        },
        updateReservation: async (reservationId, updates) => {
            const updated = await api.updateReservation(reservationId, updates);
            setData(prev => {
                const updatedReservations = prev.reservations.map(r => r.id === updated.id ? { ...r, ...updated, customer: prev.customers.find(c => c.id === updated.customerId), vehicle: prev.vehicles.find(v => v.id === updated.vehicleId) } : r);
                return expandData({ ...prev, reservations: updatedReservations });
            });
        },
        approveReservation: async (reservationId) => {
            const reservation = data.reservations.find(r => r.id === reservationId);
            if (!reservation || !reservation.customer || !reservation.vehicle) {
                throw new Error("Detaily rezervace nebyly pro schválení nalezeny.");
            }
        
            const contractExists = data.contracts.some(c => c.reservationId === reservationId);
            if (contractExists) {
                await api.updateReservation(reservationId, { status: 'scheduled' });
                await refreshData();
                const existingContract = data.contracts.find(c => c.reservationId === reservationId)!;
                return {
                    contractId: existingContract.id,
                    customerEmail: reservation.customer.email,
                    vehicleName: reservation.vehicle.name,
                };
            }
        
            const start = new Date(reservation.startDate);
            const end = new Date(reservation.endDate);
            const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
            let rentalPrice = 0;
            if (durationHours <= 4) rentalPrice = reservation.vehicle.rate4h;
            else if (durationHours <= 12) rentalPrice = reservation.vehicle.rate12h;
            else rentalPrice = Math.ceil(durationHours / 24) * reservation.vehicle.dailyRate;
        
            const contractTextTemplate = `
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
Jméno: ${reservation.customer.firstName} ${reservation.customer.lastName}
Adresa: ${reservation.customer.address}
${reservation.customer.ico ? `IČO: ${reservation.customer.ico}` : ''}
Email: ${reservation.customer.email}
Telefon: ${reservation.customer.phone}
Číslo ŘP: ${reservation.customer.driverLicenseNumber}
(dále jen "nájemce")

Článek II. - Předmět a účel nájmu
-----------------------------------------
1. Vozidlo: ${reservation.vehicle.name} (${reservation.vehicle.make} ${reservation.vehicle.model}), SPZ: ${reservation.vehicle.licensePlate}, Rok výroby: ${reservation.vehicle.year}

Článek III. - Doba nájmu a cena
-----------------------------------------
1. Doba nájmu: ${start.toLocaleString('cs-CZ')} - ${end.toLocaleString('cs-CZ')}.
2. Cena nájmu: ${rentalPrice.toLocaleString('cs-CZ')} Kč.
3. Denní limit: 300 km. Poplatek nad limit: 3 Kč/km.

Článek IV. - Vratná kauce (jistota)
-----------------------------------------
1. Kauce: 5.000 Kč.

Článek V. - Práva a povinnosti stran
-----------------------------------------
1. Zákaz kouření ve vozidle (pokuta 500 Kč).
2. Vozidlo se vrací s plnou nádrží (jinak náklady na dotankování + pokuta 500 Kč).

Článek VI. - Odpovědnost za škodu a spoluúčast
-----------------------------------------
1. Spoluúčast při poškození vozidla: 5.000 Kč.
2. Spoluúčast při nehodě s poškozením třetích stran: 10.000 Kč.

Článek VII. - Závěrečná ustanovení
-----------------------------------------
1. Tato smlouva je vyhotovena elektronicky. Nájemce se seznámil s obsahem smlouvy, souhlasí s ním a stvrzuje svůj souhlas digitálním podpisem na Protokolu o předání vozidla.

Digitální podpis nájemce:
%%SIGNATURE_IMAGE%%
            `.trim().replace(/^\s+/gm, '');
        
            const contractTextWithPlaceholder = contractTextTemplate.replace('%%SIGNATURE_IMAGE%%', '(Bude podepsáno digitálně při převzetí vozidla)');
        
            const newContract = await api.addContract({
                reservationId: reservation.id,
                customerId: reservation.customerId,
                vehicleId: reservation.vehicleId,
                generatedAt: new Date(),
                contractText: contractTextWithPlaceholder,
            });
        
            await api.updateReservation(reservationId, { status: 'scheduled' });
            await refreshData();
        
            return {
                contractId: newContract.id,
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
            if (!reservation || !reservation.customer || !reservation.vehicle) throw new Error("Rezervace nebo její detaily nebyly nalezeny.");
        
            const signatureUrl = await uploadSignature(signatureDataUrl, reservationId, 'takeover');
            const signatureHtml = `<br/><img src="${signatureUrl}" alt="Podpis" style="max-height: 80px; margin-top: 10px;" />`;
        
            // Update the existing contract with the signature
            const contract = data.contracts.find(c => c.reservationId === reservationId);
            if (contract) {
                const updatedText = contract.contractText
                    .replace('(Bude podepsáno digitálně při převzetí vozidla)', signatureHtml)
                    .replace('%%SIGNATURE_IMAGE%%', signatureHtml); // Also replace the original placeholder for robustness
                await actions.updateContract(contract.id, { contractText: updatedText });
            }
        
            const departureProtocolText = `
PROTOKOL O PŘEDÁNÍ VOZIDLA
=========================================
Datum a čas: ${new Date().toLocaleString('cs-CZ')}
Rezervace ID: ${reservation.id}
Vozidlo: ${reservation.vehicle.name} (${reservation.vehicle.licensePlate})
Zákazník: ${reservation.customer.firstName} ${reservation.customer.lastName}

--- STAV PŘI PŘEDÁNÍ ---
Stav tachometru: ${startMileage.toLocaleString('cs-CZ')} km
Stav paliva: Plná nádrž
Stav čistoty: Čisté

--- PROHLÁŠENÍ ---
Zákazník svým podpisem potvrzuje, že vozidlo převzal v řádném technickém stavu, bez zjevných závad, s kompletní povinnou výbavou a seznámil se s podmínkami smlouvy o nájmu.
${signatureHtml}
            `.trim();
        
            await api.addHandoverProtocol({
                reservationId: reservation.id,
                customerId: reservation.customerId,
                vehicleId: reservation.vehicleId,
                generatedAt: new Date(),
                protocolText: departureProtocolText,
                signatureUrl: signatureUrl,
            });
        
            await api.updateReservation(reservationId, { status: 'active', startMileage });
            await api.updateVehicle({ ...reservation.vehicle, status: 'rented', currentMileage: startMileage });
            await refreshData();
        },
        completeReservation: async (reservationId, endMileage, protocolData, signatureDataUrl) => {
            const reservation = data.reservations.find(r => r.id === reservationId);
            if (!reservation || !reservation.vehicle || !reservation.customer) throw new Error("Reservation not found or is incomplete");
            
            const returnSignatureUrl = await uploadSignature(signatureDataUrl, reservationId, 'return');
            const signatureHtml = `<br/><img src="${returnSignatureUrl}" alt="Podpis při vrácení" style="max-height: 80px; margin-top: 10px;" />`;

            const startKm = reservation.startMileage || 0;
            const kmDriven = endMileage > startKm ? endMileage - startKm : 0;
            const durationMs = new Date(reservation.endDate).getTime() - new Date(reservation.startDate).getTime();
            const rentalDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
            const kmLimit = rentalDays * 300;
            const kmOver = Math.max(0, kmDriven - kmLimit);
            const extraCharge = kmOver * 3;

            const protocolText = `
PŘEDÁVACÍ PROTOKOL - VRÁCENÍ VOZIDLA
=========================================
Datum a čas: ${new Date().toLocaleString('cs-CZ')}
Rezervace ID: ${reservation.id}
Vozidlo: ${reservation.vehicle.name} (${reservation.vehicle.licensePlate})
Zákazník: ${reservation.customer.firstName} ${reservation.customer.lastName}

--- KONTROLA STAVU VOZIDLA ---
Stav paliva: ${protocolData.fuelLevel}
Čistota: ${protocolData.cleanliness}
Klíče a dokumentace: ${protocolData.keysAndDocsOk ? 'V pořádku' : 'Chybí / Nekompletní'}

--- PŘEHLED KILOMETRŮ ---
Počáteční stav: ${startKm.toLocaleString('cs-CZ')} km
Konečný stav: ${endMileage.toLocaleString('cs-CZ')} km
Ujeto celkem: ${kmDriven.toLocaleString('cs-CZ')} km
Limit nájezdu (${rentalDays} dní): ${kmLimit.toLocaleString('cs-CZ')} km
Překročeno o: ${kmOver.toLocaleString('cs-CZ')} km
Poplatek za překročení: ${extraCharge.toLocaleString('cs-CZ')} Kč

--- POZNÁMKY OBSLUHY ---
${protocolData.notes || 'Žádné.'}
---------------------------------
Nová poškození nahlášená při tomto vrácení jsou zaznamenána samostatně v historii poškození vozidla.

--- SOUHLAS A PODPIS ZÁKAZNÍKA ---
Zákazník souhlasí se stavem vozidla, vyúčtováním a obsahem tohoto protokolu, což stvrzuje svým podpisem.
${signatureHtml}
`.trim();

            await api.addHandoverProtocol({
                reservationId: reservation.id,
                customerId: reservation.customerId,
                vehicleId: reservation.vehicleId,
                generatedAt: new Date(),
                protocolText,
                signatureUrl: returnSignatureUrl,
            });

            await api.updateReservation(reservationId, { status: 'completed', endMileage, notes: protocolData.notes });
            await api.updateVehicle({ ...reservation.vehicle, status: 'available', currentMileage: endMileage });

            const start = new Date(reservation.startDate);
            const end = new Date(reservation.endDate);
            const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
            let rentalPrice = 0;
            if (durationHours <= 4) rentalPrice = reservation.vehicle.rate4h;
            else if (durationHours <= 12) rentalPrice = reservation.vehicle.rate12h;
            else {
                const days = Math.ceil(durationHours / 24);
                rentalPrice = days * reservation.vehicle.dailyRate;
            }
            const totalPrice = rentalPrice + extraCharge;

            await api.addFinancialTransaction({
                type: 'income',
                amount: totalPrice,
                date: new Date(),
                description: `Pronájem ${reservation.vehicle?.name} - ${reservation.customer?.firstName} ${reservation.customer?.lastName} (vč. poplatků)`,
                reservationId,
            });

            await refreshData();
        },
        addContract: async (contractData, signatureDataUrl) => {
             const signatureUrl = await uploadSignature(signatureDataUrl, contractData.reservationId, 'takeover');
             const signatureHtml = `<br/><img src="${signatureUrl}" alt="Podpis" style="max-height: 80px; margin-top: 10px;" />`;
             const contractTextWithSignature = contractData.contractText.replace('%%SIGNATURE_IMAGE%%', signatureHtml);

             const newContract = await api.addContract({ ...contractData, contractText: contractTextWithSignature });
             setData(prev => expandData({ ...prev, contracts: [...prev.contracts, newContract] }));
             return newContract;
        },
        updateContract: async (contractId, updates) => {
            const updatedContract = await api.updateContract(contractId, updates);
            setData(prev => expandData({
                ...prev,
                contracts: prev.contracts.map(c => c.id === updatedContract.id ? { ...c, ...updatedContract } : c)
            }));
        },
        addExpense: async (expenseData) => {
            const newExpense = await api.addFinancialTransaction({ ...expenseData, type: 'expense' });
            setData(prev => expandData({ ...prev, financials: [...prev.financials, newExpense] }));
        },
        addService: async (serviceData) => {
            const newService = await api.addService(serviceData);
            setData(prev => expandData({ ...prev, services: [...prev.services, newService] }));
        },
        updateService: async (serviceId, updates) => {
             const updatedService = await api.updateService(serviceId, updates);
             setData(prev => expandData({
                 ...prev,
                 services: prev.services.map(s => s.id === updatedService.id ? updatedService : s)
             }));
        },
        addDamage: async (damageData) => {
            await api.addDamage(damageData);
            // No local state update, damage history is fetched on demand
        },
        createOnlineReservation: async (vehicleId, startDate, endDate, customerData) => {
            await api.createOnlineReservation(vehicleId, startDate, endDate, customerData);
            // No local refresh needed, realtime listener will trigger it.
        },
        updateSettings: async (settingsData) => {
            const updatedSettings = await api.updateSettings(settingsData);
            setData(prev => expandData({ ...prev, settings: updatedSettings }));
        },
        addInvoice: async (invoiceData) => {
            const newInvoice = await api.addInvoice(invoiceData);
            setData(prev => expandData({ ...prev, invoices: [...prev.invoices, newInvoice] }));
            return newInvoice;
        },
    }), [data, refreshData, openVehicleFormModal, closeVehicleFormModal]);

    const value: DataContextState = { 
        data, 
        loading: authLoading || (!!session && dataLoading), 
        actions, 
        session, 
        isVehicleFormModalOpen, 
        vehicleBeingEdited,
        reservationToEdit 
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};