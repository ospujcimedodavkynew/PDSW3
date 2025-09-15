// MOCK API - In a real application, this would be replaced with actual API calls to a backend (e.g., Firebase, REST API).

import { Customer, Reservation, Vehicle, VehicleDamage, VehicleService, FinancialTransaction, Contract } from './types';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';


// Simulate a delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// This function will be called by DataContext to get all data at once
export const getAllData = async (): Promise<{
    vehicles: Vehicle[],
    customers: Customer[],
    reservations: Reservation[],
    contracts: Contract[],
    financials: FinancialTransaction[],
    services: VehicleService[],
}> => {
    await delay(500);
    // In a real app, you would fetch from different endpoints. Here we create some sample data.
    const vehicles: Vehicle[] = [
        { id: 'v1', name: 'Ford Transit', licensePlate: '1AB 1234', year: 2022, imageUrl: 'https://via.placeholder.com/300x200.png?text=Ford+Transit', status: 'available', rate4h: 800, rate12h: 1200, dailyRate: 1500, currentMileage: 50000 },
        { id: 'v2', name: 'Renault Master', licensePlate: '2BC 5678', year: 2021, imageUrl: 'https://via.placeholder.com/300x200.png?text=Renault+Master', status: 'rented', rate4h: 850, rate12h: 1300, dailyRate: 1600, currentMileage: 75000 },
        { id: 'v3', name: 'VW Crafter', licensePlate: '3CD 9012', year: 2023, imageUrl: 'https://via.placeholder.com/300x200.png?text=VW+Crafter', status: 'maintenance', rate4h: 900, rate12h: 1400, dailyRate: 1700, currentMileage: 25000 },
    ];
    const customers: Customer[] = [
        { id: 'c1', firstName: 'Jan', lastName: 'Novák', email: 'jan.novak@example.com', phone: '123 456 789', driverLicenseNumber: 'AB123456', address: 'Praha 1' },
        { id: 'c2', firstName: 'Eva', lastName: 'Svobodová', email: 'eva.svobodova@example.com', phone: '987 654 321', driverLicenseNumber: 'CD654321', address: 'Brno 5' },
    ];
    const reservations: Reservation[] = [
        { id: 'r1', customerId: 'c2', vehicleId: 'v2', startDate: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(), endDate: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString(), status: 'active', startMileage: 74500 },
        { id: 'r2', customerId: 'c1', vehicleId: 'v1', startDate: new Date().toISOString(), endDate: new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString(), status: 'scheduled' },
        { id: 'r3', customerId: 'c1', vehicleId: 'v1', startDate: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(), endDate: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(), status: 'completed', startMileage: 49000, endMileage: 49500 },
    ];
    const financials: FinancialTransaction[] = [
        {id: 'f1', type: 'income', amount: 3000, date: new Date(new Date().setDate(new Date().getDate() - 4)).toISOString(), description: 'Pronájem Ford Transit - Jan Novák', reservationId: 'r3'},
        {id: 'f2', type: 'expense', amount: 5000, date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(), description: 'Servis VW Crafter'},
    ];
    const services: VehicleService[] = [
        {id: 's1', vehicleId: 'v3', description: 'Výměna oleje', serviceDate: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(), cost: 5000, status: 'completed'},
        {id: 's2', vehicleId: 'v1', description: 'Kontrola brzd', serviceDate: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(), status: 'planned'},
    ];
    const contracts: Contract[] = [];

    return { vehicles, customers, reservations, contracts, financials, services };
};

// --- AUTH ---
export const signInWithPassword = async (email: string, password: string): Promise<any> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        if (error.message.includes("Invalid login credentials")) {
            throw new Error("Nesprávné přihlašovací údaje.");
        }
        throw error;
    }
    return data;
};

export const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const getSession = () => {
    return supabase.auth.getSession();
}

export const onAuthStateChange = (callback: (session: Session | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session);
    });
    return subscription;
};


// --- API Functions for specific data ---
export const getDamagesForVehicle = async (vehicleId: string): Promise<VehicleDamage[]> => {
    await delay(500);
    console.log(`Fetching damages for vehicle ${vehicleId}`);
    return [
        { id: 'd1', vehicleId, reservationId: 'r3', description: 'Škrábanec na dveřích', location: 'Pravé přední dveře', imageUrl: 'https://via.placeholder.com/300x200.png?text=Skrabanec', reportedAt: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString() },
    ];
};

export const getServicesForVehicle = async (vehicleId: string): Promise<VehicleService[]> => {
    await delay(500);
    console.log(`Fetching services for vehicle ${vehicleId}`);
    if (vehicleId === 'v1') {
        return [{id: 's2', vehicleId: 'v1', description: 'Kontrola brzd', serviceDate: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(), status: 'planned'}];
    }
    if (vehicleId === 'v3') {
        return [{id: 's1', vehicleId: 'v3', description: 'Výměna oleje', serviceDate: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(), cost: 5000, status: 'completed'}];
    }
    return [];
};


// --- CUSTOMER PORTAL ---
export const createPendingReservation = async (vehicleId: string, startDate: Date, endDate: Date): Promise<Reservation> => {
    await delay(1000);
    const newReservation: Reservation = {
        id: `res_${Date.now()}`,
        vehicleId,
        customerId: 'pending',
        startDate,
        endDate,
        status: 'pending-customer',
        portalToken: `token_${Date.now()}`
    };
    console.log("Created pending reservation:", newReservation);
    return newReservation;
};

export const getReservationByToken = async (token: string): Promise<Reservation | null> => {
    await delay(700);
    if (token.startsWith('token_')) {
        return {
            id: 'res_pending_123',
            customerId: 'pending',
            vehicleId: 'v1',
            startDate: new Date(),
            endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            status: 'pending-customer',
            portalToken: token,
            vehicle: { id: 'v1', name: 'Ford Transit', licensePlate: '1AB 1234', year: 2022, imageUrl: '...', status: 'available', rate4h: 800, rate12h: 1200, dailyRate: 1500, currentMileage: 50000 },
        };
    }
    return null;
};

export const submitCustomerDetails = async (token: string, customerData: Omit<Customer, 'id' | 'driverLicenseImageUrl'>, driverLicenseFile: File): Promise<void> => {
    await delay(1500);
    console.log("Submitting details for token:", token);
    console.log("Customer data:", customerData);
    console.log("Driver license file:", driverLicenseFile.name);
    return;
};
