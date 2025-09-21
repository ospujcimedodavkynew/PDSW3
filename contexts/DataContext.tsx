import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import * as api from '../services/api';
import { Customer, Reservation, Vehicle, Contract, FinancialTransaction, VehicleService, VehicleDamage, HandoverProtocol } from '../types';
import { Session } from '@supabase/supabase-js';


interface AppData {
    vehicles: Vehicle[];
    customers: Customer[];
    reservations: Reservation[];
    contracts: Contract[];
    handoverProtocols: HandoverProtocol[];
    financials: FinancialTransaction[];
    services: VehicleService[];
}

export interface ProtocolData {
    notes: string;
    fuelLevel: string;
    cleanliness: string;
    keysAndDocsOk: boolean;
    signatureDataUrl: string;
}

interface DataContextActions {
    refreshData: () => Promise<void>;
    signOut: () => Promise<void>;
    addCustomer: (customerData: Omit<Customer, 'id'>) => Promise<Customer>;
    updateCustomer: (customerData: Customer) => Promise<void>;
    addVehicle: (vehicleData: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
    updateVehicle: (vehicleData: Vehicle) => Promise<void>;
    addReservation: (reservationData: Omit<Reservation, 'id' | 'status'>) => Promise<Reservation>;
    activateReservation: (reservationId: string, startMileage: number) => Promise<void>;
    completeReservation: (reservationId: string, endMileage: number, protocolData: ProtocolData) => Promise<void>;
    addContract: (contractData: Omit<Contract, 'id'>) => Promise<void>;
    addExpense: (expenseData: { description: string; amount: number; date: Date; }) => Promise<void>;
    addService: (serviceData: Omit<VehicleService, 'id'>) => Promise<void>;
    updateService: (serviceId: string, updates: Partial<VehicleService>) => Promise<void>;
    addDamage: (damageData: { vehicleId: string; reservationId: string; description: string; location: string; imageFile: File; }) => Promise<void>;
    createOnlineReservation: (vehicleId: string, startDate: Date, endDate: Date, customerData: Omit<Customer, 'id'>) => Promise<void>;
}

interface DataContextState {
    data: AppData;
    loading: boolean;
    actions: DataContextActions;
    session: Session | null;
}

const DataContext = createContext<DataContextState | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

// Helper to convert dataURL to File object for uploading
const dataURLtoFile = (dataurl: string, filename: string): File => {
    let arr = dataurl.split(','),
        mimeMatch = arr[0].match(/:(.*?);/),
        mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream',
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

const expandData = (data: Omit<AppData, 'handoverProtocols'> & { handoverProtocols: HandoverProtocol[] }): AppData => {
    const vehiclesById = new Map(data.vehicles.map(v => [v.id, v]));
    const customersById = new Map(data.customers.map(c => [c.id, c]));
    const reservationsById = new Map(data.reservations.map(r => [r.id, r]));

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


    return { ...data, reservations, contracts, handoverProtocols, services, financials };
};


export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<AppData>({
        vehicles: [], customers: [], reservations: [], contracts: [], handoverProtocols: [], financials: [], services: [],
    });
    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        api.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
        });

        // FIX: The `api.onAuthStateChange` function returns the subscription directly,
        // and its callback expects only the `session` argument. The destructuring
        // and callback signature have been corrected.
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
            const expanded = expandData(fetchedData);
            setData(expanded);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session) {
            refreshData();
        } else {
            setData({ vehicles: [], customers: [], reservations: [], contracts: [], handoverProtocols: [], financials: [], services: [] });
            setDataLoading(false);
        }
    }, [session, refreshData]);

    const actions = useMemo((): DataContextActions => ({
        refreshData,
        signOut: api.signOut,
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
        addReservation: async (resData) => {
            const newReservation = await api.addReservation(resData);
            setData(prev => expandData({ ...prev, reservations: [...prev.reservations, newReservation] }));
            return newReservation;
        },
        activateReservation: async (reservationId, startMileage) => {
            const reservation = data.reservations.find(r => r.id === reservationId);
            if (!reservation) throw new Error("Reservation not found");
            await api.updateReservation(reservationId, { status: 'active', startMileage });
            if (reservation.vehicleId) {
                await api.updateVehicle({ ...reservation.vehicle!, status: 'rented', currentMileage: startMileage });
            }
            await refreshData();
        },
        completeReservation: async (reservationId, endMileage, protocolData) => {
            const reservation = data.reservations.find(r => r.id === reservationId);
            if (!reservation || !reservation.vehicle || !reservation.customer) throw new Error("Reservation not found or is incomplete");

            // 1. Upload signature
            const signatureFile = dataURLtoFile(protocolData.signatureDataUrl, `signature-${reservationId}-${Date.now()}.png`);
            // Assuming a 'signatures' bucket exists in Supabase Storage with public access
            const signatureUrl = await api.uploadFile('signatures', signatureFile.name, signatureFile);
            
            // 2. Calculate mileage details
            const startKm = reservation.startMileage || 0;
            const kmDriven = endMileage > startKm ? endMileage - startKm : 0;
            const durationMs = new Date(reservation.endDate).getTime() - new Date(reservation.startDate).getTime();
            const rentalDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
            const kmLimit = rentalDays * 300;
            const kmOver = Math.max(0, kmDriven - kmLimit);
            const extraCharge = kmOver * 3;

            // 3. Generate protocol text
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

--- POTVRZENÍ ZÁKAZNÍKA ---
Zákazník svým podpisem stvrzuje, že souhlasí s výše uvedeným stavem vozidla a vyúčtováním.
`.trim();

            // 4. Create handover protocol
            await api.addHandoverProtocol({
                reservationId: reservation.id,
                customerId: reservation.customerId,
                vehicleId: reservation.vehicleId,
                generatedAt: new Date(),
                protocolText,
                signatureUrl
            });

            // 5. Update reservation and vehicle
            await api.updateReservation(reservationId, { status: 'completed', endMileage, notes: protocolData.notes });
            await api.updateVehicle({ ...reservation.vehicle, status: 'available', currentMileage: endMileage });

            // 6. Add financial transaction for rental price + extra charges
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

            // 7. Refresh all data
            await refreshData();
        },
        addContract: async (contractData) => {
             const newContract = await api.addContract(contractData);
             setData(prev => expandData({ ...prev, contracts: [...prev.contracts, newContract] }));
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
            await refreshData();
        }
    }), [data, refreshData]);

    const value = { data, loading: authLoading || (!!session && dataLoading), actions, session };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
