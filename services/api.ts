import { Customer, Reservation, Vehicle, VehicleDamage, VehicleService, FinancialTransaction, Contract } from '../types';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

// --- Data Mapping Helpers (Database snake_case to App camelCase) ---

const fromVehicle = (dbVehicle: any): Vehicle => ({
    id: dbVehicle.id,
    name: dbVehicle.name,
    make: dbVehicle.make,
    model: dbVehicle.model,
    year: dbVehicle.year,
    licensePlate: dbVehicle.license_plate,
    status: dbVehicle.status,
    imageUrl: dbVehicle.image_url,
    rate4h: dbVehicle.rate4h,
    rate12h: dbVehicle.rate12h,
    dailyRate: dbVehicle.daily_rate,
    features: dbVehicle.features,
    currentMileage: dbVehicle.current_mileage,
    description: dbVehicle.description,
    dimensions: dbVehicle.dimensions,
});

const toVehicle = (appVehicle: Partial<Vehicle>): any => ({
    name: appVehicle.name,
    make: appVehicle.make,
    model: appVehicle.model,
    year: appVehicle.year,
    license_plate: appVehicle.licensePlate,
    status: appVehicle.status,
    image_url: appVehicle.imageUrl,
    rate4h: appVehicle.rate4h,
    rate12h: appVehicle.rate12h,
    daily_rate: appVehicle.dailyRate,
    features: appVehicle.features,
    current_mileage: appVehicle.currentMileage,
    description: appVehicle.description,
    dimensions: appVehicle.dimensions,
});

const fromCustomer = (dbCustomer: any): Customer => ({
    id: dbCustomer.id,
    firstName: dbCustomer.first_name,
    lastName: dbCustomer.last_name,
    email: dbCustomer.email,
    phone: dbCustomer.phone,
    driverLicenseNumber: dbCustomer.driver_license_number,
    address: dbCustomer.address,
    driverLicenseImageUrl: dbCustomer.driver_license_image_url,
    ico: dbCustomer.ico,
});

const toCustomer = (appCustomer: Partial<Customer>): any => ({
    first_name: appCustomer.firstName,
    last_name: appCustomer.lastName,
    email: appCustomer.email,
    phone: appCustomer.phone,
    driver_license_number: appCustomer.driverLicenseNumber,
    address: appCustomer.address,
    driver_license_image_url: appCustomer.driverLicenseImageUrl,
    ico: appCustomer.ico,
});

const fromReservation = (dbReservation: any): Reservation => ({
    id: dbReservation.id,
    customerId: dbReservation.customer_id,
    vehicleId: dbReservation.vehicle_id,
    startDate: dbReservation.start_date,
    endDate: dbReservation.end_date,
    status: dbReservation.status,
    portalToken: dbReservation.portal_token,
    notes: dbReservation.notes,
    startMileage: dbReservation.start_mileage,
    endMileage: dbReservation.end_mileage,
});

const toReservation = (appReservation: Partial<Reservation>): any => ({
    customer_id: appReservation.customerId,
    vehicle_id: appReservation.vehicleId,
    start_date: appReservation.startDate,
    end_date: appReservation.endDate,
    status: appReservation.status,
    portal_token: appReservation.portalToken,
    notes: appReservation.notes,
    start_mileage: appReservation.startMileage,
    end_mileage: appReservation.endMileage,
});

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

// --- REAL API CALLS ---
export const getAllData = async (): Promise<{
    vehicles: Vehicle[],
    customers: Customer[],
    reservations: Reservation[],
    contracts: Contract[],
    financials: FinancialTransaction[],
    services: VehicleService[],
}> => {
    const [vehiclesRes, customersRes, reservationsRes, contractsRes, financialsRes, servicesRes] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('reservations').select('*'),
        supabase.from('contracts').select('*'),
        supabase.from('financial_transactions').select('*'),
        supabase.from('vehicle_services').select('*'),
    ]);

    if (vehiclesRes.error) throw vehiclesRes.error;
    if (customersRes.error) throw customersRes.error;
    if (reservationsRes.error) throw reservationsRes.error;
    if (contractsRes.error) throw contractsRes.error;
    if (financialsRes.error) throw financialsRes.error;
    if (servicesRes.error) throw servicesRes.error;

    return {
        vehicles: vehiclesRes.data.map(fromVehicle),
        customers: customersRes.data.map(fromCustomer),
        reservations: reservationsRes.data.map(fromReservation),
        contracts: contractsRes.data, // Assuming direct mapping for now
        financials: financialsRes.data, // Assuming direct mapping for now
        services: servicesRes.data, // Assuming direct mapping for now
    };
};

export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').insert(toCustomer(customerData)).select().single();
    if (error) throw error;
    return fromCustomer(data);
};

export const updateCustomer = async (customerData: Customer): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').update(toCustomer(customerData)).eq('id', customerData.id).select().single();
    if (error) throw error;
    return fromCustomer(data);
};

export const addVehicle = async (vehicleData: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
    const { data, error } = await supabase.from('vehicles').insert(toVehicle(vehicleData)).select().single();
    if (error) throw error;
    return fromVehicle(data);
};

export const updateVehicle = async (vehicleData: Vehicle): Promise<Vehicle> => {
    const { data, error } = await supabase.from('vehicles').update(toVehicle(vehicleData)).eq('id', vehicleData.id).select().single();
    if (error) throw error;
    return fromVehicle(data);
};


export const addReservation = async (reservationData: Omit<Reservation, 'id' | 'status'>): Promise<Reservation> => {
    const { data, error } = await supabase.from('reservations').insert({
        ...toReservation(reservationData),
        status: 'scheduled'
    }).select().single();
    if (error) throw error;
    return fromReservation(data);
};

export const updateReservation = async (reservationId: string, updates: Partial<Reservation>): Promise<Reservation> => {
     const { data, error } = await supabase.from('reservations').update(toReservation(updates)).eq('id', reservationId).select().single();
     if (error) throw error;
     return fromReservation(data);
};

export const addContract = async (contractData: Omit<Contract, 'id'>): Promise<Contract> => {
    const { data, error } = await supabase.from('contracts').insert({
        reservation_id: contractData.reservationId,
        customer_id: contractData.customerId,
        vehicle_id: contractData.vehicleId,
        generated_at: contractData.generatedAt,
        contract_text: contractData.contractText,
    }).select().single();
    if (error) throw error;
    return data;
};

export const addFinancialTransaction = async (transaction: Omit<FinancialTransaction, 'id'>): Promise<FinancialTransaction> => {
    const { data, error } = await supabase.from('financial_transactions').insert({
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description,
        reservation_id: transaction.reservationId,
    }).select().single();
    if (error) throw error;
    return data;
};

export const getDamagesForVehicle = async (vehicleId: string): Promise<VehicleDamage[]> => {
    const { data, error } = await supabase.from('vehicle_damages')
        .select(`*, reservation:reservations(*, customer:customers(*))`)
        .eq('vehicle_id', vehicleId);
    if (error) throw error;
    
    // Manual mapping because of nested relations
    return data.map(d => ({
        id: d.id,
        vehicleId: d.vehicle_id,
        reservationId: d.reservation_id,
        description: d.description,
        location: d.location,
        imageUrl: d.image_url,
        reportedAt: d.reported_at,
        status: d.status,
        reservation: d.reservation ? {
            ...fromReservation(d.reservation),
            customer: d.reservation.customer ? fromCustomer(d.reservation.customer) : undefined,
        } : undefined,
    }));
};

export const uploadFile = async (bucket: string, file: File, fileName: string): Promise<string> => {
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
};

export const addDamage = async (damageData: Omit<VehicleDamage, 'id' | 'reportedAt' | 'imageUrl' | 'status'> & { imageFile: File }): Promise<VehicleDamage> => {
    const fileName = `${damageData.vehicleId}/${Date.now()}_${damageData.imageFile.name}`;
    const publicUrl = await uploadFile('damages', damageData.imageFile, fileName);

    const { data, error } = await supabase.from('vehicle_damages').insert({
        vehicle_id: damageData.vehicleId,
        reservation_id: damageData.reservationId,
        description: damageData.description,
        location: damageData.location,
        image_url: publicUrl,
        status: 'reported',
    }).select().single();
    
    if (error) throw error;
    return data;
};

export const getServicesForVehicle = async (vehicleId: string): Promise<VehicleService[]> => {
    const { data, error } = await supabase.from('vehicle_services').select('*').eq('vehicle_id', vehicleId);
    if (error) throw error;
    return data;
};

export const addService = async (serviceData: Omit<VehicleService, 'id'>): Promise<VehicleService> => {
    const { data, error } = await supabase.from('vehicle_services').insert({
        vehicle_id: serviceData.vehicleId,
        description: serviceData.description,
        service_date: serviceData.serviceDate,
        cost: serviceData.cost,
        notes: serviceData.notes,
        status: serviceData.status,
    }).select().single();
    if (error) throw error;
    return data;
};

export const updateService = async (serviceId: string, updates: Partial<VehicleService>): Promise<VehicleService> => {
    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.cost) dbUpdates.cost = updates.cost;
    // ... add other updatable fields as needed
    
    const { data, error } = await supabase.from('vehicle_services').update(dbUpdates).eq('id', serviceId).select().single();
    if (error) throw error;
    return data;
};

// --- CUSTOMER PORTAL ---

// FIX: Added createPendingReservation function for the self-service portal link generation.
export const createPendingReservation = async (vehicleId: string, startDate: Date, endDate: Date): Promise<Reservation> => {
    const portalToken = crypto.randomUUID();
    const { data, error } = await supabase.from('reservations').insert({
        vehicle_id: vehicleId,
        start_date: startDate,
        end_date: endDate,
        status: 'pending-customer',
        portal_token: portalToken,
    }).select().single();

    if (error) throw error;
    return fromReservation(data);
};

export const getReservationByToken = async (token: string): Promise<Reservation | null> => {
    const { data, error } = await supabase.from('reservations').select('*, vehicle:vehicles(*)').eq('portal_token', token).single();
    if (error) {
        console.error("Error fetching reservation by token:", error);
        return null;
    }
    if (!data) return null;
    
    const reservation = fromReservation(data);
    if(data.vehicle) {
        reservation.vehicle = fromVehicle(data.vehicle);
    }
    return reservation;
};

export const submitCustomerDetails = async (token: string, customerData: Omit<Customer, 'id' | 'driverLicenseImageUrl'>, driverLicenseFile: File): Promise<void> => {
    // 1. Find if customer exists, or create new
    let customer: Customer;
    const { data: existingCustomer } = await supabase.from('customers').select('*').eq('email', customerData.email).single();

    if (existingCustomer) {
        customer = fromCustomer(existingCustomer);
    } else {
        customer = await addCustomer(customerData);
    }

    // 2. Upload driver license
    const licenseFileName = `licenses/${customer.id}/${Date.now()}_${driverLicenseFile.name}`;
    const licensePublicUrl = await uploadFile('licenses', driverLicenseFile, licenseFileName);

    // 3. Update customer with license URL
    await updateCustomer({ ...customer, driverLicenseImageUrl: licensePublicUrl });

    // 4. Update reservation with customer ID and new status
    const { data: reservationToUpdate, error: reservationError } = await supabase.from('reservations').select('id').eq('portal_token', token).single();
    if (reservationError || !reservationToUpdate) throw new Error("Reservation for token not found.");

    await updateReservation(reservationToUpdate.id, {
        customerId: customer.id,
        status: 'scheduled',
    });
};

export const createOnlineReservation = async (
    vehicleId: string,
    startDate: Date,
    endDate: Date,
    customerData: Omit<Customer, 'id'>
): Promise<void> => {
    // This function combines creating a customer and a reservation
    let customer: Customer;
    const { data: existingCustomer } = await supabase.from('customers').select('*').eq('email', customerData.email).single();

    if (existingCustomer) {
        // Optionally update existing customer data
        customer = await updateCustomer({ id: existingCustomer.id, ...customerData });
    } else {
        customer = await addCustomer(customerData);
    }

    await addReservation({
        vehicleId,
        startDate,
        endDate,
        customerId: customer.id
    });
};