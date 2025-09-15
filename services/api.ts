import { createClient, Session } from '@supabase/supabase-js';
import type { Vehicle, Customer, Reservation, Contract, FinancialTransaction } from '../types';

// Načtení konfigurace z globálního objektu window, který je definován v index.html
const env = (window as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;


// Exportujeme stav, aby UI mohlo reagovat a zobrazit chybovou hlášku.
// Kontrolujeme, zda hodnoty nejsou výchozí placeholdery.
export const areSupabaseCredentialsSet = 
    !!(supabaseUrl && supabaseAnonKey && 
    !supabaseUrl.includes("vasedomena") && 
    !supabaseAnonKey.includes("vas_anon_public_klic"));

const supabase = areSupabaseCredentialsSet ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Helper, který zajistí, že nevoláme funkce, pokud není klient nakonfigurován
const getClient = () => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized. Check your environment variables in index.html.");
    }
    return supabase;
}

// Helper pro zpracování chyb od Supabase
const handleSupabaseError = (error: any, context: string) => {
    if (error) {
        console.error(`Error in ${context}:`, error);
        throw new Error(error.message);
    }
};

// --- Authentication API ---

export const signInWithPassword = async (email: string, password: string) => {
    const { error } = await getClient().auth.signInWithPassword({ email, password });
    if (error) {
        if (error.message === 'Invalid login credentials') {
            throw new Error('Neplatné přihlašovací údaje. Zkontrolujte prosím e-mail a heslo.');
        }
        throw error;
    }
};

export const signOut = async () => {
    const { error } = await getClient().auth.signOut();
    handleSupabaseError(error, 'signOut');
};

export const getSession = async (): Promise<Session | null> => {
    const { data, error } = await getClient().auth.getSession();
    handleSupabaseError(error, 'getSession');
    return data.session;
}

export const onAuthChange = (callback: (session: Session | null) => void) => {
    const { data: { subscription } } = getClient().auth.onAuthStateChange((_event, session) => {
        callback(session);
    });
    return subscription;
};


// --- Mappers for data consistency ---

const toVehicle = (dbVehicle: any): Vehicle => ({
    id: dbVehicle.id,
    name: dbVehicle.name,
    make: dbVehicle.make,
    model: dbVehicle.model,
    year: dbVehicle.year,
    licensePlate: dbVehicle.license_plate,
    status: dbVehicle.status,
    imageUrl: dbVehicle.image_url || `https://placehold.co/600x400/e2e8f0/475569?text=${encodeURIComponent(dbVehicle.name || 'Vozidlo')}`,
    rate4h: dbVehicle.rate4h,
    rate12h: dbVehicle.rate12h,
    dailyRate: dbVehicle.daily_rate,
    features: dbVehicle.features || [],
    currentMileage: dbVehicle.current_mileage ?? 0,
});

const fromVehicle = (vehicle: Partial<Vehicle>) => ({
    name: vehicle.name,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    license_plate: vehicle.licensePlate,
    status: vehicle.status,
    rate4h: vehicle.rate4h,
    rate12h: vehicle.rate12h,
    daily_rate: vehicle.dailyRate,
    features: vehicle.features,
    image_url: vehicle.imageUrl,
    current_mileage: vehicle.currentMileage,
});

const toCustomer = (dbCustomer: any): Customer => ({
    id: dbCustomer.id,
    firstName: dbCustomer.first_name,
    lastName: dbCustomer.last_name,
    email: dbCustomer.email,
    phone: dbCustomer.phone,
    driverLicenseNumber: dbCustomer.driver_license_number,
    address: dbCustomer.address,
    driverLicenseImageUrl: dbCustomer.driver_license_image_url,
});

const fromCustomer = (customer: Partial<Customer>) => ({
    first_name: customer.firstName,
    last_name: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    driver_license_number: customer.driverLicenseNumber,
    address: customer.address,
    driver_license_image_url: customer.driverLicenseImageUrl,
});

const toReservation = (dbReservation: any): Reservation => ({
    id: dbReservation.id,
    customerId: dbReservation.customer_id,
    vehicleId: dbReservation.vehicle_id,
    startDate: dbReservation.start_date ? new Date(dbReservation.start_date) : new Date(0),
    endDate: dbReservation.end_date ? new Date(dbReservation.end_date) : new Date(0),
    status: dbReservation.status,
    portalToken: dbReservation.portal_token,
    notes: dbReservation.notes,
    customer: dbReservation.customers ? toCustomer(dbReservation.customers) : undefined,
    vehicle: dbReservation.vehicles ? toVehicle(dbReservation.vehicles) : undefined,
    startMileage: dbReservation.start_mileage,
    endMileage: dbReservation.end_mileage,
});

const toContract = (dbContract: any): Contract => ({
    id: dbContract.id,
    reservationId: dbContract.reservation_id,
    customerId: dbContract.customer_id,
    vehicleId: dbContract.vehicle_id,
    generatedAt: new Date(dbContract.generated_at),
    contractText: dbContract.contract_text,
    customer: dbContract.customers ? toCustomer(dbContract.customers) : undefined,
    vehicle: dbContract.vehicles ? toVehicle(dbContract.vehicles) : undefined,
});

const toFinancialTransaction = (dbTransaction: any): FinancialTransaction => ({
    id: dbTransaction.id,
    reservationId: dbTransaction.reservation_id,
    amount: dbTransaction.amount,
    date: new Date(dbTransaction.date),
    description: dbTransaction.description,
    type: dbTransaction.type,
});


// Vehicle API
export const getVehicles = async (): Promise<Vehicle[]> => {
    const { data, error } = await getClient().from('vehicles').select('*').order('name');
    handleSupabaseError(error, 'getVehicles');
    return (data || []).map(toVehicle);
};

export const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'imageUrl'>): Promise<Vehicle> => {
    const dbData = fromVehicle(vehicleData);
    dbData.image_url = `https://placehold.co/600x400/e2e8f0/475569?text=${encodeURIComponent(vehicleData.name)}`;
    
    const { data, error } = await getClient()
        .from('vehicles')
        .insert(dbData)
        .select()
        .single();
    handleSupabaseError(error, 'addVehicle');
    return toVehicle(data);
};

export const updateVehicle = async (updatedVehicle: Vehicle): Promise<Vehicle> => {
    const dbData = fromVehicle(updatedVehicle);
    const { data, error } = await getClient()
        .from('vehicles')
        .update(dbData)
        .eq('id', updatedVehicle.id)
        .select()
        .single();
    handleSupabaseError(error, 'updateVehicle');
    return toVehicle(data);
};

// Customer API
export const getCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await getClient().from('customers').select('*').order('last_name');
    handleSupabaseError(error, 'getCustomers');
    return (data || []).map(toCustomer);
};

export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
    const { data, error } = await getClient().from('customers').insert(fromCustomer(customerData)).select().single();
    handleSupabaseError(error, 'addCustomer');
    return toCustomer(data);
};

export const updateCustomer = async (updatedCustomer: Customer): Promise<Customer> => {
    const { data, error } = await getClient().from('customers').update(fromCustomer(updatedCustomer)).eq('id', updatedCustomer.id).select().single();
    handleSupabaseError(error, 'updateCustomer');
    return toCustomer(data);
};

// Reservation API
export const getReservations = async (): Promise<Reservation[]> => {
    const { data, error } = await getClient()
        .from('reservations')
        .select('*, customers(*), vehicles(*)');
    handleSupabaseError(error, 'getReservations');
    return (data || []).map(toReservation);
};

export const addReservation = async (reservationData: Omit<Reservation, 'id' | 'status'>): Promise<Reservation> => {
    const { data, error } = await getClient().from('reservations').insert({ 
        customer_id: reservationData.customerId,
        vehicle_id: reservationData.vehicleId,
        start_date: reservationData.startDate.toISOString(),
        end_date: reservationData.endDate.toISOString(),
        status: 'scheduled' 
    }).select().single();
    handleSupabaseError(error, 'addReservation');
    return toReservation(data);
};

export const activateReservation = async (reservationId: string, startMileage: number): Promise<Reservation> => {
    const { data: reservation, error: resError } = await getClient()
        .from('reservations')
        .update({ status: 'active', start_mileage: startMileage })
        .eq('id', reservationId)
        .select()
        .single();
    handleSupabaseError(resError, 'activateReservation - update reservation');

    const { error: vehicleError } = await getClient()
        .from('vehicles')
        .update({ status: 'rented', current_mileage: startMileage })
        .eq('id', reservation.vehicle_id);
    handleSupabaseError(vehicleError, 'activateReservation - update vehicle');
    
    return toReservation(reservation);
};

export const completeReservation = async (reservationId: string, endMileage: number, notes: string): Promise<Reservation> => {
    const client = getClient();
    // 1. Update reservation status
    const { data: reservation, error: resError } = await client
        .from('reservations')
        .update({ status: 'completed', notes, end_mileage: endMileage })
        .eq('id', reservationId)
        .select('*, customers(*), vehicles(*)') // Fetch related data for financial transaction
        .single();
    handleSupabaseError(resError, 'completeReservation - update reservation');

    // 2. Update vehicle status
    const { error: vehicleError } = await client
        .from('vehicles')
        .update({ status: 'available', current_mileage: endMileage })
        .eq('id', reservation.vehicle_id);
    handleSupabaseError(vehicleError, 'completeReservation - update vehicle');

    // 3. Calculate price and create financial transaction
    const vehicle = toVehicle(reservation.vehicles);
    const customer = toCustomer(reservation.customers);
    const start = new Date(reservation.start_date);
    const end = new Date(reservation.end_date);
    
    // Base rental price calculation
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
    let rentalPrice = 0;
    if (durationHours <= 4) {
        rentalPrice = vehicle.rate4h;
    } else if (durationHours <= 12) {
        rentalPrice = vehicle.rate12h;
    } else {
        const days = Math.ceil(durationHours / 24);
        rentalPrice = days * vehicle.dailyRate;
    }

    // Mileage fee calculation
    const startKm = reservation.start_mileage || 0;
    const endKm = endMileage;
    const kmDriven = endKm > startKm ? endKm - startKm : 0;
    const rentalDays = Math.max(1, Math.ceil(durationHours / (24)));
    const kmLimit = rentalDays * 300;
    const kmOver = Math.max(0, kmDriven - kmLimit);
    const extraCharge = kmOver * 3;

    const totalAmount = rentalPrice + extraCharge;

    const description = `Příjem z pronájmu - ${vehicle.name} (${vehicle.licensePlate}) - ${customer.firstName} ${customer.lastName}`;

    // Insert transaction
    const { error: transactionError } = await client
        .from('financial_transactions')
        .insert({
            reservation_id: reservation.id,
            amount: totalAmount,
            date: new Date().toISOString(),
            description: description,
            type: 'income',
        });
    handleSupabaseError(transactionError, 'completeReservation - create financial transaction');
    
    return toReservation(reservation);
};

// Self-service API
export const createPendingReservation = async (vehicleId: string, startDate: Date, endDate: Date): Promise<Reservation> => {
    const token = `portal-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const { data, error } = await getClient()
        .from('reservations')
        .insert({
            customer_id: null,
            vehicle_id: vehicleId,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'pending-customer',
            portal_token: token
        })
        .select()
        .single();
    handleSupabaseError(error, 'createPendingReservation');
    return toReservation(data);
};

export const getReservationByToken = async (token: string): Promise<Reservation | undefined> => {
    const { data, error } = await getClient()
        .from('reservations')
        .select('*, vehicles(*)')
        .eq('portal_token', token)
        .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = "exact one row not found"
      handleSupabaseError(error, 'getReservationByToken');
    }
    if (!data) return undefined;
    return toReservation(data);
}

export const submitCustomerDetails = async (portalToken: string, customerData: Omit<Customer, 'id' | 'driverLicenseImageUrl'>, driverLicenseImage: File): Promise<Reservation> => {
    const client = getClient();
    let customerId: string;

    // 1. Zjistit, zda zákazník již existuje podle e-mailu
    const { data: existingCustomer, error: findError } = await client
        .from('customers')
        .select('id')
        .eq('email', customerData.email)
        .single();

    if (existingCustomer) {
        // Zákazník existuje, použijeme jeho ID
        customerId = existingCustomer.id;
    } else if (findError && findError.code === 'PGRST116') { // PGRST116 = 'exact one row not found', což je v pořádku
        // Zákazník neexistuje, vytvoříme nového
        const { data: newCustomer, error: createError } = await client
            .from('customers')
            .insert(fromCustomer(customerData))
            .select('id')
            .single();
        handleSupabaseError(createError, 'submitCustomerDetails - create customer');
        customerId = newCustomer.id;
    } else {
        // Jiná chyba při hledání zákazníka
        handleSupabaseError(findError, 'submitCustomerDetails - find customer');
        throw new Error("Could not find or create customer.");
    }
    
    // 2. Nahrát obrázek s unikátním názvem (ID zákazníka + časová značka)
    const filePath = `${customerId}/${Date.now()}-${driverLicenseImage.name}`;
    const { error: uploadError } = await client.storage
        .from('licenses')
        .upload(filePath, driverLicenseImage, {
            // upsert: true by přepsalo stávající, ale náš název je už unikátní
        });
    handleSupabaseError(uploadError, 'submitCustomerDetails - image upload');

    // 3. Získat veřejnou URL a aktualizovat záznam zákazníka
    const { data: { publicUrl } } = client.storage
        .from('licenses')
        .getPublicUrl(filePath);

    const { error: updateCustomerError } = await client
        .from('customers')
        .update({ driver_license_image_url: publicUrl })
        .eq('id', customerId);
    handleSupabaseError(updateCustomerError, 'submitCustomerDetails - update customer with image URL');


    // 4. Aktualizovat rezervaci s ID zákazníka a změnit status
    const { data: updatedReservation, error: reservationError } = await client
        .from('reservations')
        .update({
            customer_id: customerId,
            status: 'scheduled',
        })
        .eq('portal_token', portalToken)
        .select()
        .single();
    handleSupabaseError(reservationError, 'submitCustomerDetails - update reservation');

    return toReservation(updatedReservation);
};

// Contract API
export const getContracts = async (): Promise<Contract[]> => {
    const { data, error } = await getClient()
        .from('contracts')
        .select('*, customers(*), vehicles(*)')
        .order('generated_at', { ascending: false });
    handleSupabaseError(error, 'getContracts');
    return (data || []).map(toContract);
};

export const addContract = async (contractData: Omit<Contract, 'id' | 'customer' | 'vehicle'>): Promise<Contract> => {
    const { data, error } = await getClient()
        .from('contracts')
        .insert({
            reservation_id: contractData.reservationId,
            customer_id: contractData.customerId,
            vehicle_id: contractData.vehicleId,
            generated_at: contractData.generatedAt.toISOString(),
            contract_text: contractData.contractText,
        })
        .select()
        .single();
    handleSupabaseError(error, 'addContract');
    // The returned data from insert doesn't have joined customer/vehicle, so we return a partial contract.
    // This is acceptable as we don't use the return value in the UI after creation.
    return { ...toContract(data), customer: {} as Customer, vehicle: {} as Vehicle };
};


// Finance API
export const getFinancials = async (): Promise<FinancialTransaction[]> => {
    const { data, error } = await getClient()
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false });
    handleSupabaseError(error, 'getFinancials');
    return (data || []).map(toFinancialTransaction);
};

export const addExpense = async (expenseData: { amount: number; date: Date; description: string }): Promise<FinancialTransaction> => {
    const { data, error } = await getClient()
        .from('financial_transactions')
        .insert({
            reservation_id: null,
            amount: expenseData.amount,
            date: expenseData.date.toISOString(),
            description: expenseData.description,
            type: 'expense',
        })
        .select()
        .single();
    handleSupabaseError(error, 'addExpense');
    return toFinancialTransaction(data);
};
