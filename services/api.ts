import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Customer, Reservation, Vehicle, Contract, FinancialTransaction, VehicleService, VehicleDamage } from '../types';

// Utility to handle Supabase errors
const handleSupabaseError = ({ error, data }: { error: any, data: any }, entityName: string) => {
    if (error) {
        console.error(`Error with ${entityName}:`, error);
        throw new Error(`Could not perform operation on ${entityName}: ${error.message}`);
    }
    return data;
};

// --- Authentication ---

export const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
};

export const getSession = async () => {
    return await supabase.auth.getSession();
};

export const onAuthStateChange = (callback: (session: Session | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session);
    });
    return subscription;
};

// --- Data Fetching ---

export const getAllData = async () => {
    const [vehicles, customers, reservations, contracts, financials, services] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('reservations').select('*'),
        supabase.from('contracts').select('*'),
        supabase.from('financial_transactions').select('*'),
        supabase.from('vehicle_services').select('*'),
    ]);

    if (vehicles.error || customers.error || reservations.error || contracts.error || financials.error || services.error) {
        console.error("Error fetching all data:", {
            vehicles: vehicles.error,
            customers: customers.error,
            reservations: reservations.error,
            contracts: contracts.error,
            financials: financials.error,
            services: services.error,
        });
        throw new Error("Failed to fetch initial application data.");
    }
    
    return {
        vehicles: vehicles.data as Vehicle[],
        customers: customers.data as Customer[],
        reservations: reservations.data as Reservation[],
        contracts: contracts.data as Contract[],
        financials: financials.data as FinancialTransaction[],
        services: services.data as VehicleService[],
    };
};


export const getReservationByToken = async (token: string): Promise<Reservation | null> => {
    const { data, error } = await supabase
        .from('reservations')
        .select(`
            *,
            vehicle:vehicles(*)
        `)
        .eq('portalToken', token)
        .single();
    
    return handleSupabaseError({ data, error }, 'reservation by token');
};

export const getServicesForVehicle = async (vehicleId: string): Promise<VehicleService[]> => {
    const { data, error } = await supabase
        .from('vehicle_services')
        .select('*')
        .eq('vehicleId', vehicleId)
        .order('serviceDate', { ascending: false });
        
    return handleSupabaseError({ data, error }, 'vehicle services');
};

export const getDamagesForVehicle = async (vehicleId: string): Promise<VehicleDamage[]> => {
    const { data, error } = await supabase
        .from('vehicle_damages')
        .select(`
            *,
            reservation:reservations (
                *,
                customer:customers (*)
            )
        `)
        .eq('vehicleId', vehicleId)
        .order('reportedAt', { ascending: false });

    return handleSupabaseError({ data, error }, 'vehicle damages');
};

// --- Data Mutation ---

// Customers
export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
    const { data, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();
    return handleSupabaseError({ data, error }, 'add customer');
};

export const updateCustomer = async (customerData: Customer): Promise<Customer> => {
    const { data, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', customerData.id)
        .select()
        .single();
    return handleSupabaseError({ data, error }, 'update customer');
};

// Vehicles
export const addVehicle = async (vehicleData: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
    const { data, error } = await supabase
        .from('vehicles')
        .insert([vehicleData])
        .select()
        .single();
    return handleSupabaseError({ data, error }, 'add vehicle');
};

export const updateVehicle = async (vehicleData: Vehicle): Promise<Vehicle> => {
    const { data, error } = await supabase
        .from('vehicles')
        .update(vehicleData)
        .eq('id', vehicleData.id)
        .select()
        .single();
    return handleSupabaseError({ data, error }, 'update vehicle');
};

// Reservations
export const addReservation = async (reservationData: Omit<Reservation, 'id' | 'status'>): Promise<Reservation> => {
    const payload = { ...reservationData, status: 'scheduled' };
    const { data, error } = await supabase
        .from('reservations')
        .insert([payload])
        .select()
        .single();
    return handleSupabaseError({ data, error }, 'add reservation');
};

export const updateReservation = async (reservationId: string, updates: Partial<Reservation>): Promise<Reservation> => {
    const { data, error } = await supabase
        .from('reservations')
        .update(updates)
        .eq('id', reservationId)
        .select()
        .single();
    return handleSupabaseError({ data, error }, 'update reservation');
};

// Contracts
export const addContract = async (contractData: Omit<Contract, 'id'>): Promise<Contract> => {
    const { data, error } = await supabase
        .from('contracts')
        .insert([contractData])
        .select()
        .single();
    return handleSupabaseError({ data, error }, 'add contract');
};

// Financials
export const addFinancialTransaction = async (transactionData: Omit<FinancialTransaction, 'id'>): Promise<FinancialTransaction> => {
    const { data, error } = await supabase
        .from('financial_transactions')
        .insert([transactionData])
        .select()
        .single();
    return handleSupabaseError({ data, error }, 'add financial transaction');
};

// Services
export const addService = async (serviceData: Omit<VehicleService, 'id'>): Promise<VehicleService> => {
    const { data, error } = await supabase
        .from('vehicle_services')
        .insert([serviceData])
        .select()
        .single();
    return handleSupabaseError({ data, error }, 'add service');
};

export const updateService = async (serviceId: string, updates: Partial<VehicleService>): Promise<VehicleService> => {
    const { data, error } = await supabase
        .from('vehicle_services')
        .update(updates)
        .eq('id', serviceId)
        .select()
        .single();
    return handleSupabaseError({ data, error }, 'update service');
};

// Damage
const uploadFile = async (bucket: string, path: string, file: File): Promise<string> => {
    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file);
    if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
    }
    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return data.publicUrl;
};

export const addDamage = async (damageData: { vehicleId: string; reservationId: string; description: string; location: string; imageFile: File; }): Promise<VehicleDamage> => {
    const { vehicleId, reservationId, description, location, imageFile } = damageData;
    
    const fileName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = `vehicle-damages/${vehicleId}/${fileName}`;
    
    const imageUrl = await uploadFile('images', filePath, imageFile);

    const payload: Omit<VehicleDamage, 'id'> = {
        vehicleId,
        reservationId,
        description,
        location,
        imageUrl,
        reportedAt: new Date(),
        status: 'reported',
    };
    
    const { data, error } = await supabase
        .from('vehicle_damages')
        .insert([payload])
        .select()
        .single();
        
    return handleSupabaseError({ data, error }, 'add damage');
};


// --- Self-Service & Online Booking ---

export const createPendingReservation = async (vehicleId: string, startDate: Date, endDate: Date): Promise<Reservation> => {
    const portalToken = `${Date.now()}${Math.random().toString(36).substring(2, 15)}`;
    
    const reservationData: Omit<Reservation, 'id' | 'customerId'> = {
        vehicleId,
        startDate,
        endDate,
        status: 'pending-customer',
        portalToken,
    };
    
    const { data, error } = await supabase
        .from('reservations')
        .insert([reservationData])
        .select()
        .single();

    return handleSupabaseError({ data, error }, 'create pending reservation');
};

export const submitCustomerDetails = async (token: string, customerData: Omit<Customer, 'id' | 'driverLicenseImageUrl'>, driverLicenseFile: File): Promise<void> => {
    const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .select('*')
        .eq('portalToken', token)
        .single();
        
    handleSupabaseError({ data: reservation, error: reservationError }, 'find reservation by token for submission');
    if (!reservation) throw new Error("Reservation not found for this token.");
    if (reservation.status !== 'pending-customer') throw new Error("This reservation has already been processed.");

    const fileName = `${Date.now()}_${driverLicenseFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = `drivers-licenses/${fileName}`;
    const driverLicenseImageUrl = await uploadFile('images', filePath, driverLicenseFile);

    const newCustomer = await addCustomer({ ...customerData, driverLicenseImageUrl });

    await updateReservation(reservation.id, {
        customerId: newCustomer.id,
        status: 'scheduled',
    });
};

export const createOnlineReservation = async (vehicleId: string, startDate: Date, endDate: Date, customerData: Omit<Customer, 'id'>): Promise<void> => {
    const newCustomer = await addCustomer(customerData);

    const reservationData: Omit<Reservation, 'id' | 'status'> = {
        customerId: newCustomer.id,
        vehicleId,
        startDate,
        endDate,
    };
    await addReservation(reservationData);
};
