import { supabase } from './supabaseClient';
import { Customer, Reservation, Vehicle, Contract, FinancialTransaction, VehicleService, VehicleDamage } from '../types';
import { Session } from '@supabase/supabase-js';
// FIX: Changed import to full URL to resolve build error on platforms like Vercel.
import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@9.0.1/+esm';


// --- Auth ---
export const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const getSession = () => supabase.auth.getSession();

export const onAuthStateChange = (callback: (session: Session | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session);
    });
    return subscription;
};


// --- Data Fetching ---
export const getAllData = async () => {
    const [
        { data: vehicles, error: vehiclesError },
        { data: customers, error: customersError },
        { data: reservations, error: reservationsError },
        { data: contracts, error: contractsError },
        { data: financials, error: financialsError },
        { data: services, error: servicesError },
    ] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('reservations').select('*'),
        supabase.from('contracts').select('*'),
        supabase.from('financial_transactions').select('*'),
        supabase.from('vehicle_services').select('*'),
    ]);

    if (vehiclesError) throw vehiclesError;
    if (customersError) throw customersError;
    if (reservationsError) throw reservationsError;
    if (contractsError) throw contractsError;
    if (financialsError) throw financialsError;
    if (servicesError) throw servicesError;

    return {
        vehicles: vehicles || [],
        customers: customers || [],
        reservations: reservations || [],
        contracts: contracts || [],
        financials: financials || [],
        services: services || [],
    };
};

// --- Generic Helper for File Upload ---
const uploadFile = async (file: File, bucket: string, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (error) {
        throw new Error(`File upload failed: ${error.message}`);
    }
    
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
};


// --- Customers ---
export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
    const { data, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateCustomer = async (customerData: Customer): Promise<Customer> => {
    const { id, ...updates } = customerData;
    const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

// --- Vehicles ---
export const addVehicle = async (vehicleData: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
    const { data, error } = await supabase
        .from('vehicles')
        .insert([vehicleData])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateVehicle = async (vehicleData: Partial<Vehicle> & { id: string }): Promise<Vehicle> => {
    const { id, ...updates } = vehicleData;
    const { data, error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

// --- Reservations ---
export const addReservation = async (reservationData: Omit<Reservation, 'id' | 'status'>): Promise<Reservation> => {
    const payload = { ...reservationData, status: 'scheduled' };
    const { data, error } = await supabase
        .from('reservations')
        .insert([payload])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateReservation = async (id: string, updates: Partial<Reservation>): Promise<Reservation> => {
    const { data, error } = await supabase
        .from('reservations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const getReservationByToken = async (token: string): Promise<Reservation | null> => {
    const { data, error } = await supabase
        .from('reservations')
        .select('*, vehicle:vehicles(*)')
        .eq('portalToken', token)
        .single();
    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return data as Reservation;
};


// --- Contracts ---
export const addContract = async (contractData: Omit<Contract, 'id'>): Promise<Contract> => {
    const { data, error } = await supabase
        .from('contracts')
        .insert([contractData])
        .select()
        .single();
    if (error) throw error;
    return data;
};

// --- Financials ---
export const addFinancialTransaction = async (transactionData: Omit<FinancialTransaction, 'id'>): Promise<FinancialTransaction> => {
    const { data, error } = await supabase
        .from('financial_transactions')
        .insert([transactionData])
        .select()
        .single();
    if (error) throw error;
    return data;
};

// --- Services ---
export const getServicesForVehicle = async (vehicleId: string): Promise<VehicleService[]> => {
    const { data, error } = await supabase
        .from('vehicle_services')
        .select('*')
        .eq('vehicleId', vehicleId)
        .order('serviceDate', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const addService = async (serviceData: Omit<VehicleService, 'id'>): Promise<VehicleService> => {
    const { data, error } = await supabase
        .from('vehicle_services')
        .insert([serviceData])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateService = async (serviceId: string, updates: Partial<VehicleService>): Promise<VehicleService> => {
    const { data, error } = await supabase
        .from('vehicle_services')
        .update(updates)
        .eq('id', serviceId)
        .select()
        .single();
    if (error) throw error;
    return data;
};


// --- Damages ---
export const getDamagesForVehicle = async (vehicleId: string): Promise<VehicleDamage[]> => {
    const { data, error } = await supabase
        .from('vehicle_damages')
        .select('*, reservation:reservations(*, customer:customers(*))')
        .eq('vehicleId', vehicleId)
        .order('reportedAt', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const addDamage = async (damageData: { vehicleId: string; reservationId: string; description: string; location: string; imageFile: File; }): Promise<void> => {
    const { imageFile, ...rest } = damageData;
    const filePath = `damages/${damageData.vehicleId}/${uuidv4()}-${imageFile.name}`;
    const imageUrl = await uploadFile(imageFile, 'uploads', filePath);

    const payload = {
        ...rest,
        imageUrl,
        reportedAt: new Date(),
        status: 'reported',
    };
    const { error } = await supabase.from('vehicle_damages').insert([payload]);
    if (error) throw error;
};

// --- Self-Service & Online Booking ---

export const createPendingReservation = async (vehicleId: string, startDate: Date, endDate: Date): Promise<Reservation> => {
    const portalToken = uuidv4();
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

    if (error) throw error;
    return data;
};

export const submitCustomerDetails = async (token: string, customerData: Omit<Customer, 'id'|'driverLicenseImageUrl'>, driverLicenseFile: File): Promise<void> => {
    // 1. Find reservation by token
    const reservation = await getReservationByToken(token);
    if (!reservation) throw new Error('Reservation not found or link is invalid.');

    // 2. Upload driver's license
    const filePath = `licenses/${uuidv4()}-${driverLicenseFile.name}`;
    const driverLicenseImageUrl = await uploadFile(driverLicenseFile, 'uploads', filePath);
    
    // 3. Create or find customer (using email as unique identifier for simplicity)
    let customer: Customer;
    const { data: existingCustomer, error: findError } = await supabase
        .from('customers')
        .select('*')
        .eq('email', customerData.email)
        .maybeSingle();
        
    if (findError) throw findError;
    
    if (existingCustomer) {
        // Update existing customer
        customer = await updateCustomer({ ...existingCustomer, ...customerData, driverLicenseImageUrl });
    } else {
        // Create new customer
        customer = await addCustomer({ ...customerData, driverLicenseImageUrl });
    }
    
    // 4. Update reservation with customer ID and change status
    await updateReservation(reservation.id, {
        customerId: customer.id,
        status: 'scheduled',
    });
};

export const createOnlineReservation = async (vehicleId: string, startDate: Date, endDate: Date, customerData: Omit<Customer, 'id'>) => {
    // This is a simplified flow for direct online booking.
    // 1. Create customer
    const newCustomer = await addCustomer(customerData);

    // 2. Create reservation
    const reservationData: Omit<Reservation, 'id' | 'status'> = {
        customerId: newCustomer.id,
        vehicleId,
        startDate,
        endDate,
    };
    await addReservation(reservationData);
    // Note: This simplified flow doesn't create a contract automatically. This could be extended.
};