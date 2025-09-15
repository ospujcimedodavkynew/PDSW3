import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import * as api from '../services/api';
import { Customer, Reservation, Vehicle, Contract, FinancialTransaction, VehicleService, VehicleDamage } from '../types';
import { Session } from '@supabase/supabase-js';


interface AppData {
    vehicles: Vehicle[];
    customers: Customer[];
    reservations: Reservation[];
    contracts: Contract[];
    financials: FinancialTransaction[];
    services: VehicleService[];
}

interface DataContextActions {
    refreshData: () => Promise<void>;
    signOut: () => Promise<void>;
    addCustomer: (customerData: Omit<Customer, 'id'>) => Promise<Customer>;
    updateCustomer: (customerData: Customer) => Promise<void>;
    addReservation: (reservationData: Omit<Reservation, 'id' | 'status'>) => Promise<Reservation>;
    activateReservation: (reservationId: string, startMileage: number) => Promise<void>;
    completeReservation: (reservationId: string, endMileage: number, notes: string) => Promise<void>;
    addContract: (contractData: Omit<Contract, 'id'>) => Promise<void>;
    addExpense: (expenseData: { description: string; amount: number; date: Date; }) => Promise<void>;
    addService: (serviceData: Omit<VehicleService, 'id'>) => Promise<void>;
    updateService: (serviceId: string, updates: Partial<VehicleService>) => Promise<void>;
    addDamage: (damageData: { vehicleId: string; reservationId: string; description: string; location: string; imageFile: File; }) => Promise<void>;
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

const expandData = (data: AppData): AppData => {
    const vehiclesById = new Map(data.vehicles.map(v => [v.id, v]));
    const customersById = new Map(data.customers.map(c => [c.id, c]));

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
    
    const services = data.services.map(s => ({
        ...s,
        vehicle: vehiclesById.get(s.vehicleId),
    }));

    const financials = data.financials.map(f => ({
        ...f,
        reservation: data.reservations.find(r => r.id === f.reservationId)
    }));


    return { ...data, reservations, contracts, services, financials };
};


export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<AppData>({
        vehicles: [], customers: [], reservations: [], contracts: [], financials: [], services: [],
    });
    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        // Immediately try to get the session to see if the user is already logged in.
        api.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
        });

        // Listen for future changes in auth state.
        const subscription = api.onAuthStateChange((session) => {
            setSession(session);
        });

        // Cleanup the subscription when the component unmounts.
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
        // If there's a user session, fetch data.
        if (session) {
            refreshData();
        } else {
            // If the user logs out, clear data and stop loading.
            setData({ vehicles: [], customers: [], reservations: [], contracts: [], financials: [], services: [] });
            setDataLoading(false);
        }
    }, [session, refreshData]);

    const actions = useMemo((): DataContextActions => ({
        refreshData,
        signOut: api.signOut,
        addCustomer: async (customerData) => {
            console.log("Adding customer:", customerData);
            const newCustomer = { ...customerData, id: `c_${Date.now()}` };
            setData(prev => expandData({ ...prev, customers: [...prev.customers, newCustomer] }));
            return newCustomer;
        },
        updateCustomer: async (customerData) => {
            console.log("Updating customer:", customerData);
            setData(prev => expandData({
                ...prev,
                customers: prev.customers.map(c => c.id === customerData.id ? customerData : c)
            }));
        },
        addReservation: async (resData) => {
            console.log("Adding reservation", resData);
            const newReservation: Reservation = { ...resData, id: `r_${Date.now()}`, status: 'scheduled' };
            setData(prev => expandData({ ...prev, reservations: [...prev.reservations, newReservation] }));
            return newReservation;
        },
        activateReservation: async (reservationId, startMileage) => {
            console.log(`Activating reservation ${reservationId} with mileage ${startMileage}`);
            setData(prev => {
                const reservations = prev.reservations.map(r => 
                    r.id === reservationId ? { ...r, status: 'active' as 'active', startMileage } : r
                );
                const vehicleId = prev.reservations.find(r => r.id === reservationId)?.vehicleId;
                const vehicles = prev.vehicles.map(v => 
                    v.id === vehicleId ? { ...v, status: 'rented' as 'rented', currentMileage: startMileage } : v
                );
                return expandData({ ...prev, reservations, vehicles });
            });
        },
        completeReservation: async (reservationId, endMileage, notes) => {
            console.log(`Completing reservation ${reservationId} with mileage ${endMileage}`);
             setData(prev => {
                const reservations = prev.reservations.map(r => 
                    r.id === reservationId ? { ...r, status: 'completed' as 'completed', endMileage, notes } : r
                );
                const res = prev.reservations.find(r => r.id === reservationId);
                const vehicles = prev.vehicles.map(v => 
                    v.id === res?.vehicleId ? { ...v, status: 'available' as 'available', currentMileage: endMileage } : v
                );
                const financials = [...prev.financials];
                financials.push({
                    id: `f_${Date.now()}`,
                    type: 'income',
                    amount: 2500, // Mock amount
                    date: new Date(),
                    description: `Pronájem ${res?.vehicle?.name} - ${res?.customer?.firstName} ${res?.customer?.lastName}`,
                    reservationId: reservationId,
                });
                return expandData({ ...prev, reservations, vehicles, financials });
            });
        },
        addContract: async (contractData) => {
             console.log("Adding contract:", contractData);
             const newContract = { ...contractData, id: `contract_${Date.now()}` };
             setData(prev => expandData({ ...prev, contracts: [...prev.contracts, newContract] }));
        },
        addExpense: async (expenseData) => {
            console.log("Adding expense:", expenseData);
            const newExpense: FinancialTransaction = { ...expenseData, id: `f_${Date.now()}`, type: 'expense' };
            setData(prev => expandData({ ...prev, financials: [...prev.financials, newExpense] }));
        },
        addService: async (serviceData) => {
            console.log("Adding service:", serviceData);
            const newService: VehicleService = { ...serviceData, id: `s_${Date.now()}`};
            setData(prev => expandData({ ...prev, services: [...prev.services, newService] }));
        },
        updateService: async (serviceId, updates) => {
             console.log(`Updating service ${serviceId}:`, updates);
             setData(prev => {
                const services = prev.services.map(s => s.id === serviceId ? {...s, ...updates} : s);
                return expandData({...prev, services});
             });
        },
        addDamage: async (damageData) => {
            console.log("Adding damage:", damageData);
            const newDamage: VehicleDamage = {
                id: `d_${Date.now()}`,
                vehicleId: damageData.vehicleId,
                reservationId: damageData.reservationId,
                description: damageData.description,
                location: damageData.location,
                imageUrl: URL.createObjectURL(damageData.imageFile),
                reportedAt: new Date()
            };
            console.log("New damage would be saved:", newDamage);
        }
    }), [refreshData]);

    const value = { data, loading: authLoading || (!!session && dataLoading), actions, session };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
