import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Customer, Reservation, Vehicle, Contract, FinancialTransaction, VehicleService, VehicleDamage } from '../types';

// --- Mappers: Supabase (snake_case) <-> Application (camelCase) ---

const fromVehicle = (v: any): Vehicle => v && ({
    id: v.id,
    name: v.name,
    make: v.make,
    model: v.model,
    year: v.year,
    licensePlate: v.license_plate,
    status: v.status,
    imageUrl: v.image_url,
    rate4h: v.rate4h,
    rate12h: v.rate12h,
    dailyRate: v.daily_rate,
    features: v.features,
    currentMileage: v.current_mileage,
    description: v.description,
    dimensions: v.dimensions,
});

const toVehicle = (v: Partial<Vehicle>) => ({
    ...v,
    license_plate: v.licensePlate,
    image_url: v.imageUrl,
    daily_rate: v.dailyRate,
    current_mileage: v.currentMileage,
    // Unset camelCase versions
    licensePlate: undefined,
    imageUrl: undefined,
    dailyRate: undefined,
    currentMileage: undefined,
});


const fromCustomer = (c: any): Customer => c && ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    email: c.email,
    phone: c.phone,
    driverLicenseNumber: c.driver_license_number,
    address: c.address,
    driverLicenseImageUrl: c.driver_license_image_url,
    ico: c.ico,
});

const toCustomer = (c: Partial<Customer>) => ({
    ...c,
    first_name: c.firstName,
    last_name: c.lastName,
    driver_license_number: c.driverLicenseNumber,
    driver_license_image_url: c.driverLicenseImageUrl,
    firstName: undefined,
    lastName: undefined,
    driverLicenseNumber: undefined,
    driverLicenseImageUrl: undefined,
});

const fromReservation = (r: any): Reservation => r && ({
    id: r.id,
    customerId: r.customer_id,
    vehicleId: r.vehicle_id,
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
    startMileage: r.start_mileage,
    endMileage: r.end_mileage,
    notes: r.notes,
    portalToken: r.portal_token,
    // Nested objects are expanded in DataContext, but if they come from DB, map them too
    customer: r.customer ? fromCustomer(r.customer) : undefined,
    vehicle: r.vehicle ? fromVehicle(r.vehicle) : undefined,
});

const toReservation = (r: Partial<Reservation>) => ({
    ...r,
    customer_id: r.customerId,
    vehicle_id: r.vehicleId,
    start_date: r.startDate,
    end_date: r.endDate,
    start_mileage: r.startMileage,
    end_mileage: r.endMileage,
    portal_token: r.portalToken,
    customerId: undefined,
    vehicleId: undefined,
    startDate: undefined,
    endDate: undefined,
    startMileage: undefined,
    endMileage: undefined,
    portalToken: undefined,
});

const fromContract = (c: any): Contract => c && ({
    id: c.id,
    reservationId: c.reservation_id,
    customerId: c.customer_id,
    vehicleId: c.vehicle_id,
    generatedAt: c.generated_at,
    contractText: c.contract_text,
});

const toContract = (c: Partial<Contract>) => ({
    ...c,
    reservation_id: c.reservationId,
    customer_id: c.customerId,
    vehicle_id: c.vehicleId,
    generated_at: c.generatedAt,
    contract_text: c.contractText,
    reservationId: undefined,
    customerId: undefined,
    vehicleId: undefined,
    generatedAt: undefined,
    contractText: undefined,
});

const fromFinancial = (f: any): FinancialTransaction => f && ({
    id: f.id,
    type: f.type,
    amount: f.amount,
    date: f.date,
    description: f.description,
    reservationId: f.reservation_id,
});

const toFinancial = (f: Partial<FinancialTransaction>) => ({
    ...f,
    reservation_id: f.reservationId,
    reservationId: undefined,
});

const fromService = (s: any): VehicleService => s && ({
    id: s.id,
    vehicleId: s.vehicle_id,
    description: s.description,
    serviceDate: s.service_date,
    cost: s.cost,
    notes: s.notes,
    status: s.status,
});

const toService = (s: Partial<VehicleService>) => ({
    ...s,
    vehicle_id: s.vehicleId,
    service_date: s.serviceDate,
    vehicleId: undefined,
    serviceDate: undefined,
});

const fromDamage = (d: any): VehicleDamage => d && ({
    id: d.id,
    vehicleId: d.vehicle_id,
    reservationId: d.reservation_id,
    description: d.description,
    location: d.location,
    imageUrl: d.image_url,
    reportedAt: d.reported_at,
    status: d.status,
    reservation: d.reservation ? fromReservation(d.reservation) : undefined,
});

const toDamage = (d: Partial<VehicleDamage>) => ({
    ...d,
    vehicle_id: d.vehicleId,
    reservation_id: d.reservationId,
    image_url: d.imageUrl,
    reported_at: d.reportedAt,
    vehicleId: undefined,
    reservationId: undefined,
    imageUrl: undefined,
    reportedAt: undefined,
});

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
export const getSession = async () => await supabase.auth.getSession();
export const onAuthStateChange = (callback: (session: Session | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
    return subscription;
};

// --- Data Fetching ---
export const getAllData = async () => {
    const [vehiclesRes, customersRes, reservationsRes, contractsRes, financialsRes, servicesRes] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('reservations').select('*'),
        supabase.from('contracts').select('*'),
        supabase.from('financial_transactions').select('*'),
        supabase.from('vehicle_services').select('*'),
    ]);

    // Handle potential errors for all fetches
    handleSupabaseError(vehiclesRes, 'vehicles');
    handleSupabaseError(customersRes, 'customers');
    handleSupabaseError(reservationsRes, 'reservations');
    handleSupabaseError(contractsRes, 'contracts');
    handleSupabaseError(financialsRes, 'financials');
    handleSupabaseError(servicesRes, 'services');
    
    return {
        vehicles: vehiclesRes.data!.map(fromVehicle),
        customers: customersRes.data!.map(fromCustomer),
        reservations: reservationsRes.data!.map(fromReservation),
        contracts: contractsRes.data!.map(fromContract),
        financials: financialsRes.data!.map(fromFinancial),
        services: servicesRes.data!.map(fromService),
    };
};

export const getReservationByToken = async (token: string): Promise<Reservation | null> => {
    const { data, error } = await supabase.from('reservations').select('*, vehicle:vehicles(*)').eq('portal_token', token).single();
    return fromReservation(handleSupabaseError({ data, error }, 'reservation by token'));
};

export const getServicesForVehicle = async (vehicleId: string): Promise<VehicleService[]> => {
    const { data, error } = await supabase.from('vehicle_services').select('*').eq('vehicle_id', vehicleId).order('service_date', { ascending: false });
    return (handleSupabaseError({ data, error }, 'vehicle services') as any[]).map(fromService);
};

export const getDamagesForVehicle = async (vehicleId: string): Promise<VehicleDamage[]> => {
    const { data, error } = await supabase.from('vehicle_damages').select('*, reservation:reservations(*, customer:customers(*))').eq('vehicle_id', vehicleId).order('reported_at', { ascending: false });
    return (handleSupabaseError({ data, error }, 'vehicle damages') as any[]).map(fromDamage);
};

// --- Data Mutation ---

const uploadFile = async (bucket: string, path: string, file: File): Promise<string> => {
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file);
    if (uploadError) throw new Error(`Failed to upload file: ${uploadError.message}`);
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
};

export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').insert([toCustomer(customerData)]).select().single();
    return fromCustomer(handleSupabaseError({ data, error }, 'add customer'));
};

export const updateCustomer = async (customerData: Customer): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').update(toCustomer(customerData)).eq('id', customerData.id).select().single();
    return fromCustomer(handleSupabaseError({ data, error }, 'update customer'));
};

export const addVehicle = async (vehicleData: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
    const { data, error } = await supabase.from('vehicles').insert([toVehicle(vehicleData)]).select().single();
    return fromVehicle(handleSupabaseError({ data, error }, 'add vehicle'));
};

export const updateVehicle = async (vehicleData: Vehicle): Promise<Vehicle> => {
    const { data, error } = await supabase.from('vehicles').update(toVehicle(vehicleData)).eq('id', vehicleData.id).select().single();
    return fromVehicle(handleSupabaseError({ data, error }, 'update vehicle'));
};

export const addReservation = async (reservationData: Omit<Reservation, 'id' | 'status'>): Promise<Reservation> => {
    const payload = { ...toReservation(reservationData), status: 'scheduled' };
    const { data, error } = await supabase.from('reservations').insert([payload]).select().single();
    return fromReservation(handleSupabaseError({ data, error }, 'add reservation'));
};

export const updateReservation = async (reservationId: string, updates: Partial<Reservation>): Promise<Reservation> => {
    const { data, error } = await supabase.from('reservations').update(toReservation(updates)).eq('id', reservationId).select().single();
    return fromReservation(handleSupabaseError({ data, error }, 'update reservation'));
};

export const addContract = async (contractData: Omit<Contract, 'id'>): Promise<Contract> => {
    const { data, error } = await supabase.from('contracts').insert([toContract(contractData)]).select().single();
    return fromContract(handleSupabaseError({ data, error }, 'add contract'));
};

export const addFinancialTransaction = async (transactionData: Omit<FinancialTransaction, 'id'>): Promise<FinancialTransaction> => {
    const { data, error } = await supabase.from('financial_transactions').insert([toFinancial(transactionData)]).select().single();
    return fromFinancial(handleSupabaseError({ data, error }, 'add financial transaction'));
};

export const addService = async (serviceData: Omit<VehicleService, 'id'>): Promise<VehicleService> => {
    const { data, error } = await supabase.from('vehicle_services').insert([toService(serviceData)]).select().single();
    return fromService(handleSupabaseError({ data, error }, 'add service'));
};

export const updateService = async (serviceId: string, updates: Partial<VehicleService>): Promise<VehicleService> => {
    const { data, error } = await supabase.from('vehicle_services').update(toService(updates)).eq('id', serviceId).select().single();
    return fromService(handleSupabaseError({ data, error }, 'update service'));
};

export const addDamage = async (damageData: { vehicleId: string; reservationId: string; description: string; location: string; imageFile: File; }): Promise<VehicleDamage> => {
    const { vehicleId, reservationId, description, location, imageFile } = damageData;
    const fileName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = `${fileName}`;
    const imageUrl = await uploadFile('damages', filePath, imageFile);
    const payload: Omit<VehicleDamage, 'id'> = { vehicleId, reservationId, description, location, imageUrl, reportedAt: new Date(), status: 'reported' };
    const { data, error } = await supabase.from('vehicle_damages').insert([toDamage(payload)]).select().single();
    return fromDamage(handleSupabaseError({ data, error }, 'add damage'));
};

export const createPendingReservation = async (vehicleId: string, startDate: Date, endDate: Date): Promise<Reservation> => {
    const portalToken = `${Date.now()}${Math.random().toString(36).substring(2, 15)}`;
    const reservationData: Partial<Reservation> = { vehicleId, startDate, endDate, status: 'pending-customer', portalToken };
    const { data, error } = await supabase.from('reservations').insert([toReservation(reservationData)]).select().single();
    return fromReservation(handleSupabaseError({ data, error }, 'create pending reservation'));
};

export const submitCustomerDetails = async (token: string, customerData: Omit<Customer, 'id' | 'driverLicenseImageUrl'>, driverLicenseFile: File): Promise<void> => {
    const { data: reservation, error: reservationError } = await supabase.from('reservations').select('*').eq('portal_token', token).single();
    const foundReservation = fromReservation(handleSupabaseError({ data: reservation, error: reservationError }, 'find reservation for submission'));
    if (!foundReservation) throw new Error("Reservation not found for this token.");
    if (foundReservation.status !== 'pending-customer') throw new Error("This reservation has already been processed.");

    const fileName = `${Date.now()}_${driverLicenseFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const driverLicenseImageUrl = await uploadFile('licenses', fileName, driverLicenseFile);
    const newCustomer = await addCustomer({ ...customerData, driverLicenseImageUrl });
    await updateReservation(foundReservation.id, { customerId: newCustomer.id, status: 'scheduled' });
};

export const createOnlineReservation = async (vehicleId: string, startDate: Date, endDate: Date, customerData: Omit<Customer, 'id'>): Promise<void> => {
    const newCustomer = await addCustomer(customerData);
    const reservationData: Omit<Reservation, 'id' | 'status'> = { customerId: newCustomer.id, vehicleId, startDate, endDate };
    await addReservation(reservationData);
};
