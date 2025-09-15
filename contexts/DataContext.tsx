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
    addVehicle: (vehicleData: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
    updateVehicle: (vehicleData: Vehicle) => Promise<void>;
    addReservation: (reservationData: Omit<Reservation, 'id' | 'status'>) => Promise<Reservation>;
    activateReservation: (reservationId: string, startMileage: number) => Promise<void>;
    completeReservation: (reservationId: string, endMileage: number, notes: string) => Promise<void>;
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
        api.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
        });

        // FIX: Correctly subscribe to auth changes and use the correct callback signature.
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
            setData({ vehicles: [], customers: [], reservations: [], contracts: [], financials: [], services: [] });
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
        completeReservation: async (reservationId, endMileage, notes) => {
            const reservation = data.reservations.find(r => r.id === reservationId);
            if (!reservation) throw new Error("Reservation not found");

            await api.updateReservation(reservationId, { status: 'completed', endMileage, notes });
            if (reservation.vehicleId) {
                 await api.updateVehicle({ ...reservation.vehicle!, status: 'available', currentMileage: endMileage });
            }
            if(!reservation.vehicle || !reservation.customer) throw new Error("Missing vehicle or customer on reservation");

            // Calculate price and add to financials
            const start = new Date(reservation.startDate);
            const end = new Date(reservation.endDate);
            const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
            let totalPrice = 0;
            if (durationHours <= 4) totalPrice = reservation.vehicle.rate4h;
            else if (durationHours <= 12) totalPrice = reservation.vehicle.rate12h;
            else {
                const days = Math.ceil(durationHours / 24);
                totalPrice = days * reservation.vehicle.dailyRate;
            }
             
            await api.addFinancialTransaction({
                type: 'income',
                amount: totalPrice,
                date: new Date(),
                description: `Pronájem ${reservation.vehicle?.name} - ${reservation.customer?.firstName} ${reservation.customer?.lastName}`,
                reservationId,
            });

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