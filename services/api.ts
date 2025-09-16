import { supabase } from './supabaseClient';
import { Customer, Reservation, Vehicle, Contract, FinancialTransaction, VehicleService, VehicleDamage } from '../types';
import { Session } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@9.0.1/+esm';

// --- Data Transformation Helpers ---

const toCamelCase = (s: string): string => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
const isObject = (o: any): boolean => o === Object(o) && !Array.isArray(o) && typeof o !== 'function';

const keysToCamelCase = <T>(o: any): T => {
    if (isObject(o)) {
        const n: { [key: string]: any } = {};
        Object.keys(o).forEach((k) => {
            n[toCamelCase(k)] = keysToCamelCase(o[k]);
        });
        return n as T;
    }
    if (Array.isArray(o)) {
        return o.map(i => keysToCamelCase(i)) as T;
    }
    return o as T;
};

const toSnakeCase = (s: string): string => s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const keysToSnakeCase = (o: any): any => {
    if (isObject(o)) {
        const n: { [key: string]: any } = {};
        Object.keys(o).forEach((k) => {
            n[toSnakeCase(k)] = keysToSnakeCase(o[k]);
        });
        return n;
    }
    if (Array.isArray(o)) {
        return o.map(i => keysToSnakeCase(i));
    }
    return o;
};

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
        vehicles: keysToCamelCase<Vehicle[]>(vehicles || []),
        customers: keysToCamelCase<Customer[]>(customers || []),
        reservations: keysToCamelCase<Reservation[]>(reservations || []).map(r => ({...r, startDate: new Date(r.startDate), endDate: new Date(r.endDate)})),
        contracts: keysToCamelCase<Contract[]>(contracts || []).map(c => ({...c, generatedAt: new Date(c.generatedAt)})),
        financials: keysToCamelCase<FinancialTransaction[]>(financials || []).map(f => ({...f, date: new Date(f.date)})),
        services: keysToCamelCase<VehicleService[]>(services || []).map(s => ({...s, serviceDate: new Date(s.serviceDate)})),
    };
};

// --- Generic Helper for File Upload ---
const uploadFile = async (file: File, bucket: string, path: string): Promise<string> => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw new Error(`File upload failed: ${error.message}`);
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
};

// --- Customers ---
export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').insert([keysToSnakeCase(customerData)]).select().single();
    if (error) throw error;
    return keysToCamelCase<Customer>(data);
};

export const updateCustomer = async (customerData: Customer): Promise<Customer> => {
    const { id, ...updates } = customerData;
    const { data, error } = await supabase.from('customers').update(keysToSnakeCase(updates)).eq('id', id).select().single();
    if (error) throw error;
    return keysToCamelCase<Customer>(data);
};

// --- Vehicles ---
export const addVehicle = async (vehicleData: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
    const { data, error } = await supabase.from('vehicles').insert([keysToSnakeCase(vehicleData)]).select().single();
    if (error) throw error;
    return keysToCamelCase<Vehicle>(data);
};

export const updateVehicle = async (vehicleData: Partial<Vehicle> & { id: string }): Promise<Vehicle> => {
    const { id, ...updates } = vehicleData;
    const { data, error } = await supabase.from('vehicles').update(keysToSnakeCase(updates)).eq('id', id).select().single();
    if (error) throw error;
    return keysToCamelCase<Vehicle>(data);
};

// --- Reservations ---
export const addReservation = async (reservationData: Omit<Reservation, 'id' | 'status'>): Promise<Reservation> => {
    const payload = { ...reservationData, status: 'scheduled' };
    const { data, error } = await supabase.from('reservations').insert([keysToSnakeCase(payload)]).select().single();
    if (error) throw error;
    const result = keysToCamelCase<Reservation>(data);
    return {...result, startDate: new Date(result.startDate), endDate: new Date(result.endDate)};
};

export const updateReservation = async (id: string, updates: Partial<Reservation>): Promise<Reservation> => {
    const { data, error } = await supabase.from('reservations').update(keysToSnakeCase(updates)).eq('id', id).select().single();
    if (error) throw error;
    const result = keysToCamelCase<Reservation>(data);
    return {...result, startDate: new Date(result.startDate), endDate: new Date(result.endDate)};
};

export const getReservationByToken = async (token: string): Promise<Reservation | null> => {
    const { data, error } = await supabase.from('reservations').select('*, vehicles(*)').eq('portal_token', token).single();
    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    const result = keysToCamelCase<Reservation>(data);
    return {...result, startDate: new Date(result.startDate), endDate: new Date(result.endDate)};
};

// --- Contracts ---
export const addContract = async (contractData: Omit<Contract, 'id'>): Promise<Contract> => {
    const { data, error } = await supabase.from('contracts').insert([keysToSnakeCase(contractData)]).select().single();
    if (error) throw error;
    const result = keysToCamelCase<Contract>(data);
    return {...result, generatedAt: new Date(result.generatedAt)};
};

// --- Financials ---
export const addFinancialTransaction = async (transactionData: Omit<FinancialTransaction, 'id'>): Promise<FinancialTransaction> => {
    const { data, error } = await supabase.from('financial_transactions').insert([keysToSnakeCase(transactionData)]).select().single();
    if (error) throw error;
    const result = keysToCamelCase<FinancialTransaction>(data);
     return {...result, date: new Date(result.date)};
};

// --- Services ---
export const getServicesForVehicle = async (vehicleId: string): Promise<VehicleService[]> => {
    const { data, error } = await supabase.from('vehicle_services').select('*').eq('vehicle_id', vehicleId).order('service_date', { ascending: false });
    if (error) throw error;
    const result = keysToCamelCase<VehicleService[]>(data || []);
    return result.map(s => ({...s, serviceDate: new Date(s.serviceDate)}));
};

export const addService = async (serviceData: Omit<VehicleService, 'id'>): Promise<VehicleService> => {
    const { data, error } = await supabase.from('vehicle_services').insert([keysToSnakeCase(serviceData)]).select().single();
    if (error) throw error;
    const result = keysToCamelCase<VehicleService>(data);
    return {...result, serviceDate: new Date(result.serviceDate)};
};

export const updateService = async (serviceId: string, updates: Partial<VehicleService>): Promise<VehicleService> => {
    const { data, error } = await supabase.from('vehicle_services').update(keysToSnakeCase(updates)).eq('id', serviceId).select().single();
    if (error) throw error;
    const result = keysToCamelCase<VehicleService>(data);
    return {...result, serviceDate: new Date(result.serviceDate)};
};

// --- Damages ---
export const getDamagesForVehicle = async (vehicleId: string): Promise<VehicleDamage[]> => {
    const { data, error } = await supabase.from('vehicle_damages').select('*, reservation:reservations(*, customer:customers(*))').eq('vehicle_id', vehicleId).order('reported_at', { ascending: false });
    if (error) throw error;
    const result = keysToCamelCase<VehicleDamage[]>(data || []);
    return result.map(d => ({...d, reportedAt: new Date(d.reportedAt)}));
};

export const addDamage = async (damageData: { vehicleId: string; reservationId: string; description: string; location: string; imageFile: File; }): Promise<void> => {
    const { imageFile, ...rest } = damageData;
    const filePath = `damages/${damageData.vehicleId}/${uuidv4()}-${imageFile.name}`;
    const imageUrl = await uploadFile(imageFile, 'damages', filePath); // FIX: Correct bucket name

    const payload = { ...rest, imageUrl, reportedAt: new Date(), status: 'reported' };
    const { error } = await supabase.from('vehicle_damages').insert([keysToSnakeCase(payload)]);
    if (error) throw error;
};

// --- Self-Service & Online Booking ---
export const createPendingReservation = async (vehicleId: string, startDate: Date, endDate: Date): Promise<Reservation> => {
    const portalToken = uuidv4();
    const reservationData = { vehicleId, startDate, endDate, status: 'pending-customer', portalToken };
    const { data, error } = await supabase.from('reservations').insert([keysToSnakeCase(reservationData)]).select().single();
    if (error) throw error;
    const result = keysToCamelCase<Reservation>(data);
    return {...result, startDate: new Date(result.startDate), endDate: new Date(result.endDate)};
};

export const submitCustomerDetails = async (token: string, customerData: Omit<Customer, 'id'|'driverLicenseImageUrl'>, driverLicenseFile: File): Promise<void> => {
    const reservation = await getReservationByToken(token);
    if (!reservation) throw new Error('Reservation not found or link is invalid.');

    const filePath = `licenses/${uuidv4()}-${driverLicenseFile.name}`;
    const driverLicenseImageUrl = await uploadFile(driverLicenseFile, 'licenses', filePath); // FIX: Correct bucket name
    
    let customer: Customer;
    const { data: existingCustomerData } = await supabase.from('customers').select('*').eq('email', customerData.email).maybeSingle();
    const existingCustomer = keysToCamelCase<Customer | null>(existingCustomerData);
    
    if (existingCustomer) {
        customer = await updateCustomer({ ...existingCustomer, ...customerData, driverLicenseImageUrl });
    } else {
        customer = await addCustomer({ ...customerData, driverLicenseImageUrl });
    }
    
    await updateReservation(reservation.id, { customerId: customer.id, status: 'scheduled' });
};

export const getAvailableVehicles = async (startDate: string, endDate: string): Promise<Vehicle[]> => {
    const { data, error } = await supabase.rpc('get_available_vehicles', {
        start_time: startDate,
        end_time: endDate
    });
    if (error) throw error;
    return keysToCamelCase<Vehicle[]>(data || []);
};

export const createOnlineReservation = async (vehicleId: string, startDate: Date, endDate: Date, customerData: Omit<Customer, 'id'>) => {
    const { data: existingCustomerData } = await supabase.from('customers').select('*').eq('email', customerData.email).maybeSingle();
    let customer = keysToCamelCase<Customer | null>(existingCustomerData);

    if (customer) {
        customer = await updateCustomer({ ...customer, ...customerData });
    } else {
        customer = await addCustomer(customerData);
    }

    const reservationData: Omit<Reservation, 'id' | 'status'> = {
        customerId: customer.id, vehicleId, startDate, endDate,
    };
    await addReservation(reservationData);
};
