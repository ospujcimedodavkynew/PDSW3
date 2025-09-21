export enum Page {
    DASHBOARD = 'DASHBOARD',
    RESERVATIONS = 'RESERVATIONS',
    CALENDAR = 'CALENDAR',
    VEHICLES = 'VEHICLES',
    CUSTOMERS = 'CUSTOMERS',
    CONTRACTS = 'CONTRACTS',
    HANDOVER_PROTOCOLS = 'HANDOVER_PROTOCOLS',
    FINANCIALS = 'FINANCIALS',
    REPORTS = 'REPORTS',
}

export interface Vehicle {
    id: string;
    name: string;
    make?: string;
    model?: string;
    year: number;
    licensePlate: string;
    status: 'available' | 'rented' | 'maintenance';
    imageUrl?: string;
    rate4h: number;
    rate12h: number;
    dailyRate: number;
    features?: string[];
    currentMileage: number;
    description?: string;
    dimensions?: string;
}

export interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    driverLicenseNumber: string;
    address: string;
    driverLicenseImageUrl?: string;
    ico?: string;
}

export interface Reservation {
    id: string;
    customerId: string;
    vehicleId: string;
    startDate: Date | string;
    endDate: Date | string;
    status: 'pending-customer' | 'pending-approval' | 'scheduled' | 'active' | 'completed';
    startMileage?: number;
    endMileage?: number;
    notes?: string;
    portalToken?: string;
    // Expanded properties for easy access in components
    customer?: Customer;
    vehicle?: Vehicle;
}

export interface Contract {
    id: string;
    reservationId: string;
    customerId: string;
    vehicleId: string;
    generatedAt: Date | string;
    contractText: string;
    // Expanded properties
    customer?: Customer;
    vehicle?: Vehicle;
}

export interface HandoverProtocol {
    id: string;
    reservationId: string;
    customerId: string;
    vehicleId: string;
    generatedAt: Date | string;
    protocolText: string;
    signatureUrl?: string;
    // Expanded properties
    customer?: Customer;
    vehicle?: Vehicle;
    reservation?: Reservation;
}


export interface FinancialTransaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    date: Date | string;
    description: string;
    reservationId?: string;
    // Expanded properties
    reservation?: Reservation;
}

export interface VehicleService {
    id: string;
    vehicleId: string;
    description: string;
    serviceDate: Date | string;
    cost?: number;
    notes?: string;
    status: 'planned' | 'completed';
    // Expanded property
    vehicle?: Vehicle;
}

export interface VehicleDamage {
    id: string;
    vehicleId: string;
    reservationId: string;
    description: string;
    location: string;
    imageUrl: string;
    reportedAt: Date | string;
    status: 'reported' | 'repaired';
    // Expanded property
    reservation?: Reservation;
}