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

// --- API Helpers ---
const API_BASE = '/api';

const callApi = async (endpoint: string, options: RequestInit = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        // Získáme aktuální sezení (session) a z něj přístupový token (JWT)
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers,
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API call failed: ${response.statusText}`);
        }
        return await response.json();
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Server neodpovídá (timeout). Zkontrolujte, zda běží backend.');
        }
        console.error(`API Call failed (${endpoint}):`, error);
        throw error;
    }
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
    const data = await callApi('/admin/data');
    
    return {
        vehicles: (data.vehicles || []).map(fromVehicle),
        customers: (data.customers || []).map(fromCustomer),
        reservations: (data.reservations || []).map(fromReservation),
        contracts: (data.contracts || []).map(fromContract),
        handoverProtocols: (data.handoverProtocols || []).map(fromHandoverProtocol),
        financials: (data.financials || []).map(fromFinancial),
        services: (data.services || []).map(fromService),
        settings: data.settings ? fromSettings(data.settings) : null,
        invoices: (data.invoices || []).map(fromInvoice),
    };
};

// --- Data Fetching (For Public Pages) ---
export const getPublicBookingData = async () => {
    const data = await callApi('/public/booking-data');
    
    return {
        vehicles: (data.vehicles || []).map(fromVehicle),
        reservations: (data.reservations || []).map(fromReservation),
    };
};

export const getReservationByToken = async (token: string): Promise<Reservation | null> => {
    const data = await callApi(`/reservations/token/${token}`);
    return fromReservation(data);
};

export const getContractById = async (id: string): Promise<Contract | null> => {
    const data = await callApi(`/contracts/${id}`);
    if (!data) return null;
    
    const contract = fromContract(data);
    if (data.customer) contract.customer = fromCustomer(data.customer);
    if (data.vehicle) contract.vehicle = fromVehicle(data.vehicle);
    return contract;
};


export const getServicesForVehicle = async (vehicleId: string): Promise<VehicleService[]> => {
    const data = await callApi(`/vehicles/${vehicleId}/services`);
    return (data as any[]).map(fromService);
};

export const getDamagesForVehicle = async (vehicleId: string): Promise<VehicleDamage[]> => {
    const data = await callApi(`/vehicles/${vehicleId}/damages`);
    return (data as any[]).map(fromDamage);
};

// --- Data Mutation ---

export const uploadFile = async (bucket: string, path: string, file: File): Promise<string> => {
    // SYSTEM-WIDE FIX: Prepend 'public/' to all uploads to comply with RLS policies.
    const finalPath = `public/${path}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(finalPath, file);
    if (uploadError) throw new Error(`Failed to upload file: ${uploadError.message}`);
    const { data } = supabase.storage.from(bucket).getPublicUrl(finalPath);
    return data.publicUrl;
};

export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
    const data = await callApi('/customers/upsert', {
        method: 'POST',
        body: JSON.stringify(toCustomer(customerData)),
    });
    return fromCustomer(data);
};

export const updateCustomer = async (customerData: Customer): Promise<Customer> => {
    const data = await callApi('/customers/upsert', {
        method: 'POST',
        body: JSON.stringify(toCustomer(customerData)),
    });
    return fromCustomer(data);
};

export const addVehicle = async (vehicleData: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
    const data = await callApi('/vehicles', {
        method: 'POST',
        body: JSON.stringify(toVehicle(vehicleData)),
    });
    return fromVehicle(data);
};

export const updateVehicle = async (vehicleData: Vehicle): Promise<Vehicle> => {
    const data = await callApi(`/vehicles/${vehicleData.id}`, {
        method: 'PATCH',
        body: JSON.stringify(toVehicle(vehicleData)),
    });
    return fromVehicle(data);
};

export const addReservation = async (reservationData: Omit<Reservation, 'id' | 'status'>): Promise<Reservation> => {
    const payload = { ...toReservation(reservationData), status: 'scheduled' };
    const data = await callApi('/reservations', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return fromReservation(data);
};

export const updateReservation = async (reservationId: string, updates: Partial<Reservation>): Promise<Reservation> => {
    const data = await callApi(`/reservations/${reservationId}`, {
        method: 'PATCH',
        body: JSON.stringify(toReservation(updates)),
    });
    return fromReservation(data);
};

export const deleteReservation = async (reservationId: string): Promise<void> => {
    await callApi(`/reservations/${reservationId}`, {
        method: 'DELETE',
    });
};

export const addContract = async (contractData: Omit<Contract, 'id'>): Promise<Contract> => {
    const data = await callApi('/contracts', {
        method: 'POST',
        body: JSON.stringify(toContract(contractData)),
    });
    return fromContract(data);
};

export const updateContract = async (contractId: string, updates: Partial<Contract>): Promise<Contract> => {
    const data = await callApi(`/contracts/${contractId}`, {
        method: 'PATCH',
        body: JSON.stringify(toContract(updates)),
    });
    return fromContract(data);
};

export const addHandoverProtocol = async (protocolData: Omit<HandoverProtocol, 'id'>): Promise<HandoverProtocol> => {
    const data = await callApi('/handover_protocols', {
        method: 'POST',
        body: JSON.stringify(toHandoverProtocol(protocolData)),
    });
    return fromHandoverProtocol(data);
};

export const addFinancialTransaction = async (transactionData: Omit<FinancialTransaction, 'id'>): Promise<FinancialTransaction> => {
    const data = await callApi('/financial_transactions', {
        method: 'POST',
        body: JSON.stringify(toFinancial(transactionData)),
    });
    return fromFinancial(data);
};

export const addService = async (serviceData: Omit<VehicleService, 'id'>): Promise<VehicleService> => {
    const data = await callApi('/vehicle_services', {
        method: 'POST',
        body: JSON.stringify(toService(serviceData)),
    });
    return fromService(data);
};

export const updateService = async (serviceId: string, updates: Partial<VehicleService>): Promise<VehicleService> => {
    const data = await callApi(`/vehicle_services/${serviceId}`, {
        method: 'PATCH',
        body: JSON.stringify(toService(updates)),
    });
    return fromService(data);
};

export const addDamage = async (damageData: { vehicleId: string; reservationId: string; description: string; location: string; imageFile: File; }): Promise<VehicleDamage> => {
    const { vehicleId, reservationId, description, location, imageFile } = damageData;
    const fileName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = `${fileName}`;
    const imageUrl = await uploadFile('damages', filePath, imageFile);
    const payload: Omit<VehicleDamage, 'id'> = { vehicleId, reservationId, description, location, imageUrl, reportedAt: new Date(), status: 'reported' };
    
    const data = await callApi('/vehicle_damages', {
        method: 'POST',
        body: JSON.stringify(toDamage(payload)),
    });
    return fromDamage(data);
};

export const createPendingReservation = async (vehicleId: string, startDate: Date, endDate: Date): Promise<Reservation> => {
    const portalToken = `${Date.now()}${Math.random().toString(36).substring(2, 15)}`;
    const reservationData: Partial<Reservation> = { vehicleId, startDate, endDate, status: 'pending-customer', portalToken };
    
    const data = await callApi('/reservations', {
        method: 'POST',
        body: JSON.stringify(toReservation(reservationData)),
    });
    return fromReservation(data);
};

export const submitCustomerDetails = async (token: string, customerData: Omit<Customer, 'id' | 'driverLicenseImageUrl'>, driverLicenseFile: File): Promise<void> => {
    const foundReservation = await getReservationByToken(token);
    if (!foundReservation) throw new Error("Reservation not found for this token.");
    if (foundReservation.status !== 'pending-customer') throw new Error("This reservation has already been processed.");

    const fileName = `${Date.now()}_${driverLicenseFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const driverLicenseImageUrl = await uploadFile('licenses', fileName, driverLicenseFile);
    const newCustomer = await addCustomer({ ...customerData, driverLicenseImageUrl });
    // FIX: Transition to 'pending-approval' instead of 'scheduled' to ensure admin oversight.
    await updateReservation(foundReservation.id, { customerId: newCustomer.id, status: 'pending-approval' });
};

export const createOnlineReservation = async (vehicleId: string, startDate: Date, endDate: Date, customerData: Omit<Customer, 'id'>): Promise<Reservation> => {
    // REFACTOR: Centralize the customer upsert logic by calling `addCustomer`,
    // which already handles checking for an existing customer and updating or creating them.
    // This removes duplicate code and ensures consistent behavior.
    const customer = await addCustomer(customerData);

    // Create the reservation with the correct customer ID and 'pending-approval' status.
    const reservationData: Partial<Reservation> = { customerId: customer.id, vehicleId, startDate, endDate, status: 'pending-approval' };
    
    const data = await callApi('/reservations', {
        method: 'POST',
        body: JSON.stringify(toReservation(reservationData)),
    });
    return fromReservation(data);
};

export const updateSettings = async (settingsData: Omit<CompanySettings, 'id'>): Promise<CompanySettings> => {
    const data = await callApi('/company_settings/upsert', {
        method: 'POST',
        body: JSON.stringify({ id: 1, ...toSettings(settingsData) }),
    });
    return fromSettings(data);
};

export const addInvoice = async (invoiceData: Omit<Invoice, 'id'>): Promise<Invoice> => {
    const data = await callApi('/invoices', {
        method: 'POST',
        body: JSON.stringify(toInvoice(invoiceData)),
    });
    return fromInvoice(data);
};