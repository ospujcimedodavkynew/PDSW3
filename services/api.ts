import { supabase } from './supabaseClient';
import { Session, RealtimeChannel } from '@supabase/supabase-js';
import { Customer, Reservation, Vehicle, Contract, FinancialTransaction, VehicleService, VehicleDamage, HandoverProtocol, CompanySettings, Invoice } from '../types';

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
    insuranceProviderPov: v.insurance_provider_pov,
    insurancePolicyNumberPov: v.insurance_policy_number_pov,
    insuranceCostPov: v.insurance_cost_pov,
    insuranceIntervalPov: v.insurance_interval_pov,
    insuranceDueDatePov: v.insurance_due_date_pov,
    insuranceProviderHav: v.insurance_provider_hav,
    insurancePolicyNumberHav: v.insurance_policy_number_hav,
    insuranceCostHav: v.insurance_cost_hav,
    insuranceIntervalHav: v.insurance_interval_hav,
    insuranceDueDateHav: v.insurance_due_date_hav,
    vignetteExpiry: v.vignette_expiry,
    stkExpiry: v.stk_expiry,
});

const toVehicle = (v: Partial<Vehicle>) => {
    const { 
        licensePlate, imageUrl, dailyRate, currentMileage, 
        insuranceProviderPov, insurancePolicyNumberPov, insuranceCostPov, insuranceIntervalPov, insuranceDueDatePov,
        insuranceProviderHav, insurancePolicyNumberHav, insuranceCostHav, insuranceIntervalHav, insuranceDueDateHav,
        vignetteExpiry, stkExpiry, ...rest 
    } = v;
    const payload = {
        ...rest,
        license_plate: licensePlate,
        image_url: imageUrl,
        daily_rate: dailyRate,
        current_mileage: currentMileage,
        insurance_provider_pov: insuranceProviderPov,
        insurance_policy_number_pov: insurancePolicyNumberPov,
        insurance_cost_pov: insuranceCostPov,
        insurance_interval_pov: insuranceIntervalPov,
        insurance_due_date_pov: insuranceDueDatePov,
        insurance_provider_hav: insuranceProviderHav,
        insurance_policy_number_hav: insurancePolicyNumberHav,
        insurance_cost_hav: insuranceCostHav,
        insurance_interval_hav: insuranceIntervalHav,
        insurance_due_date_hav: insuranceDueDateHav,
        vignette_expiry: vignetteExpiry,
        stk_expiry: stkExpiry,
    };
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    return payload;
};


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

const toCustomer = (c: Partial<Customer>) => {
    const { firstName, lastName, driverLicenseNumber, driverLicenseImageUrl, ...rest } = c;
    const payload = {
        ...rest,
        first_name: firstName,
        last_name: lastName,
        driver_license_number: driverLicenseNumber,
        driver_license_image_url: driverLicenseImageUrl,
    };
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    return payload;
};

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

const toReservation = (r: Partial<Reservation>) => {
    const { customerId, vehicleId, startDate, endDate, startMileage, endMileage, portalToken, customer, vehicle, ...rest } = r;
    const payload = {
        ...rest,
        customer_id: customerId,
        vehicle_id: vehicleId,
        start_date: startDate,
        end_date: endDate,
        start_mileage: startMileage,
        end_mileage: endMileage,
        portal_token: portalToken,
    };
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    return payload;
};

const fromContract = (c: any): Contract => c && ({
    id: c.id,
    reservationId: c.reservation_id,
    customerId: c.customer_id,
    vehicleId: c.vehicle_id,
    generatedAt: c.generated_at,
    contractText: c.contract_text,
});

const toContract = (c: Partial<Contract>) => {
    const { reservationId, customerId, vehicleId, generatedAt, contractText, customer, vehicle, ...rest } = c;
    const payload = {
        ...rest,
        reservation_id: reservationId,
        customer_id: customerId,
        vehicle_id: vehicleId,
        generated_at: generatedAt,
        contract_text: contractText,
    };
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    return payload;
};

const fromHandoverProtocol = (p: any): HandoverProtocol => p && ({
    id: p.id,
    reservationId: p.reservation_id,
    customerId: p.customer_id,
    vehicleId: p.vehicle_id,
    generatedAt: p.generated_at,
    protocolText: p.protocol_text,
    signatureUrl: p.signature_url,
});

const toHandoverProtocol = (p: Partial<HandoverProtocol>) => {
    const { reservationId, customerId, vehicleId, generatedAt, protocolText, signatureUrl, customer, vehicle, reservation, ...rest } = p;
    const payload = {
        ...rest,
        reservation_id: reservationId,
        customer_id: customerId,
        vehicle_id: vehicleId,
        generated_at: generatedAt,
        protocol_text: protocolText,
        signature_url: signatureUrl,
    };
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    return payload;
};

const fromFinancial = (f: any): FinancialTransaction => f && ({
    id: f.id,
    type: f.type,
    amount: f.amount,
    date: f.date,
    description: f.description,
    reservationId: f.reservation_id,
});

const toFinancial = (f: Partial<FinancialTransaction>) => {
    const { reservationId, reservation, ...rest } = f;
    const payload = { ...rest, reservation_id: reservationId };
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    return payload;
};

const fromService = (s: any): VehicleService => s && ({
    id: s.id,
    vehicleId: s.vehicle_id,
    description: s.description,
    serviceDate: s.service_date,
    cost: s.cost,
    notes: s.notes,
    status: s.status,
});

const toService = (s: Partial<VehicleService>) => {
    const { vehicleId, serviceDate, vehicle, ...rest } = s;
    const payload = { ...rest, vehicle_id: vehicleId, service_date: serviceDate };
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    return payload;
};

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

const toDamage = (d: Partial<VehicleDamage>) => {
    const { vehicleId, reservationId, imageUrl, reportedAt, reservation, ...rest } = d;
    const payload = {
        ...rest,
        vehicle_id: vehicleId,
        reservation_id: reservationId,
        image_url: imageUrl,
        reported_at: reportedAt,
    };
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    return payload;
};

const fromSettings = (s: any): CompanySettings => s && ({
    id: s.id,
    companyName: s.company_name,
    address: s.address,
    ico: s.ico,
    dic: s.dic,
    bankAccount: s.bank_account,
    iban: s.iban,
    swift: s.swift,
    contactEmail: s.contact_email,
    contactPhone: s.contact_phone,
});

const toSettings = (s: Partial<CompanySettings>) => ({
    company_name: s.companyName,
    address: s.address,
    ico: s.ico,
    dic: s.dic,
    bank_account: s.bankAccount,
    iban: s.iban,
    swift: s.swift,
    contact_email: s.contactEmail,
    contact_phone: s.contactPhone,
});

const fromInvoice = (i: any): Invoice => i && ({
    id: i.id,
    invoiceNumber: i.invoice_number,
    contractId: i.contract_id,
    customerId: i.customer_id,
    issueDate: i.issue_date,
    dueDate: i.due_date,
    paymentMethod: i.payment_method,
    totalAmount: i.total_amount,
    status: i.status,
    supplierJson: i.supplier_json,
    customerJson: i.customer_json,
});

const toInvoice = (i: Partial<Invoice>) => ({
    invoice_number: i.invoiceNumber,
    contract_id: i.contractId,
    customer_id: i.customerId,
    issue_date: i.issueDate,
    due_date: i.dueDate,
    payment_method: i.paymentMethod,
    total_amount: i.totalAmount,
    status: i.status,
    supplier_json: i.supplierJson,
    customer_json: i.customerJson,
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

// --- Real-time Subscriptions ---
export const onNewReservation = (callback: () => void): RealtimeChannel => {
    const channel = supabase
        .channel('public:reservations')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'reservations' },
            () => {
                callback();
            }
        )
        .subscribe();
    return channel;
};

export const removeChannel = (channel: RealtimeChannel) => {
    supabase.removeChannel(channel);
};

// --- Data Fetching (For Authenticated Admin) ---
export const getAllData = async () => {
    const [vehiclesRes, customersRes, reservationsRes, contractsRes, protocolsRes, financialsRes, servicesRes, settingsRes, invoicesRes] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('reservations').select('*'),
        supabase.from('contracts').select('*'),
        supabase.from('handover_protocols').select('*'),
        supabase.from('financial_transactions').select('*'),
        supabase.from('vehicle_services').select('*'),
        supabase.from('company_settings').select('*').limit(1).single(),
        supabase.from('invoices').select('*'),
    ]);

    // Handle potential errors for all fetches
    handleSupabaseError(vehiclesRes, 'vehicles');
    handleSupabaseError(customersRes, 'customers');
    handleSupabaseError(reservationsRes, 'reservations');
    handleSupabaseError(contractsRes, 'contracts');
    handleSupabaseError(protocolsRes, 'handover_protocols');
    handleSupabaseError(financialsRes, 'financials');
    handleSupabaseError(servicesRes, 'services');
    handleSupabaseError(invoicesRes, 'invoices');
    // Settings can be null if not set, that's okay, so no error handling
    
    return {
        vehicles: vehiclesRes.data!.map(fromVehicle),
        customers: customersRes.data!.map(fromCustomer),
        reservations: reservationsRes.data!.map(fromReservation),
        contracts: contractsRes.data!.map(fromContract),
        handoverProtocols: protocolsRes.data!.map(fromHandoverProtocol),
        financials: financialsRes.data!.map(fromFinancial),
        services: servicesRes.data!.map(fromService),
        settings: settingsRes.data ? fromSettings(settingsRes.data) : null,
        invoices: invoicesRes.data!.map(fromInvoice),
    };
};

// --- Data Fetching (For Public Booking Page) ---
export const getPublicBookingData = async () => {
    const [vehiclesRes, reservationsRes] = await Promise.all([
        supabase.from('vehicles').select('*'),
        // Only select columns needed for availability check to be efficient and secure
        supabase.from('reservations').select('vehicle_id, start_date, end_date, status'),
    ]);

    handleSupabaseError(vehiclesRes, 'public vehicles');
    handleSupabaseError(reservationsRes, 'public reservations');
    
    return {
        vehicles: vehiclesRes.data!.map(fromVehicle),
        // Note: fromReservation can handle partial data
        reservations: reservationsRes.data!.map(fromReservation),
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

export const uploadFile = async (bucket: string, path: string, file: File): Promise<string> => {
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

export const deleteReservation = async (reservationId: string): Promise<void> => {
    const { error } = await supabase.from('reservations').delete().eq('id', reservationId);
    handleSupabaseError({ data: null, error }, 'delete reservation');
};

export const addContract = async (contractData: Omit<Contract, 'id'>): Promise<Contract> => {
    const { data, error } = await supabase.from('contracts').insert([toContract(contractData)]).select().single();
    return fromContract(handleSupabaseError({ data, error }, 'add contract'));
};

export const addHandoverProtocol = async (protocolData: Omit<HandoverProtocol, 'id'>): Promise<HandoverProtocol> => {
    const { data, error } = await supabase.from('handover_protocols').insert([toHandoverProtocol(protocolData)]).select().single();
    return fromHandoverProtocol(handleSupabaseError({ data, error }, 'add handover protocol'));
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

export const createOnlineReservation = async (vehicleId: string, startDate: Date, endDate: Date, customerData: Omit<Customer, 'id'>): Promise<Reservation> => {
    // Check if customer exists by email
    const { data: existingCustomer, error: findError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customerData.email)
        .single();

    // Supabase returns an error with code 'PGRST116' when no rows are found for a .single() query.
    // We should only throw an error if it's something other than that.
    if (findError && findError.code !== 'PGRST116') {
        throw handleSupabaseError({ error: findError, data: null }, 'find existing customer');
    }

    let customerId: string;

    if (existingCustomer) {
        // Customer exists: use their ID and update their details with the new ones.
        customerId = existingCustomer.id;
        await updateCustomer({ id: customerId, ...customerData });
    } else {
        // New customer: create them.
        const newCustomer = await addCustomer(customerData);
        customerId = newCustomer.id;
    }

    // Create the reservation with the correct customer ID and 'pending-approval' status.
    const reservationData: Partial<Reservation> = { customerId, vehicleId, startDate, endDate, status: 'pending-approval' };
    const { data, error } = await supabase.from('reservations').insert([toReservation(reservationData)]).select().single();
    return fromReservation(handleSupabaseError({ data, error }, 'create online reservation'));
};

export const updateSettings = async (settingsData: Omit<CompanySettings, 'id'>): Promise<CompanySettings> => {
    const { data, error } = await supabase
        .from('company_settings')
        .upsert({ id: 1, ...toSettings(settingsData) }) // Use upsert with a fixed ID
        .select()
        .single();
    return fromSettings(handleSupabaseError({ data, error }, 'update settings'));
};

export const addInvoice = async (invoiceData: Omit<Invoice, 'id'>): Promise<Invoice> => {
    const { data, error } = await supabase.from('invoices').insert([toInvoice(invoiceData)]).select().single();
    return fromInvoice(handleSupabaseError({ data, error }, 'add invoice'));
};