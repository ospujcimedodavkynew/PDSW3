// FIX: Restored correct type definitions. This file was previously overwritten with component code.
export enum Page {
    DASHBOARD = 'DASHBOARD',
    RESERVATIONS = 'RESERVATIONS',
    CALENDAR = 'CALENDAR',
    VEHICLES = 'VEHICLES',
    CUSTOMERS = 'CUSTOMERS',
    CONTRACTS = 'CONTRACTS',
    FINANCIALS = 'FINANCIALS',
    REPORTS = 'REPORTS',
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

export interface Vehicle {
    id: string;
    name: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    status: 'available' | 'rented' | 'maintenance';
    imageUrl: string;
    rate4h: number;
    rate12h: number;
    dailyRate: number;
    features: string[];
    currentMileage: number;
    description: string;
    dimensions: string;
}

export interface Reservation {
    id: string;
    customerId: string;
    vehicleId: string;
    startDate: Date;
    endDate: Date;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled' | 'pending-customer';
    startMileage?: number;
    endMileage?: number;
    notes?: string;
    portalToken?: string;
    customer?: Customer;
    vehicle?: Vehicle;
}

export interface Contract {
    id: string;
    reservationId: string;
    customerId: string;
    vehicleId: string;
    generatedAt: Date;
    contractText: string;
    customer?: Customer;
    vehicle?: Vehicle;
}

export interface FinancialTransaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    date: Date;
    description: string;
    reservationId?: string;
    reservation?: Reservation;
}

export interface VehicleService {
    id: string;
    vehicleId: string;
    description: string;
    serviceDate: Date;
    cost?: number;
    notes?: string;
    status: 'planned' | 'completed';
    vehicle?: Vehicle;
}

export interface VehicleDamage {
    id: string;
    vehicleId: string;
    reservationId?: string;
    description: string;
    location: string;
    imageUrl: string;
    reportedAt: Date;
    status: 'reported' | 'repaired';
    reservation?: Reservation;
}
