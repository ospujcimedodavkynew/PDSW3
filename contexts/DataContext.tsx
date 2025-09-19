import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import * as api from '../services/api';
import { Customer, Reservation, Vehicle, Contract, FinancialTransaction, VehicleService, VehicleDamage } from '../types';
import { Session } from '@supabase/supabase-js';


interface AppData {
    vehicles: Vehicle[];
    customers: Customer[];
    reservations: Reservation[];
    contracts: Contract[];
    financials: FinancialTransaction[];
    services: VehicleService[];
}

interface DataContextActions {
    refreshData: () => Promise<void>;
    signOut: () => Promise<void>;
    addCustomer: (customerData: Omit<Customer, 'id'>) => Promise<Customer>;
    updateCustomer: (customerData: Customer) => Promise<void>;
    addVehicle: (vehicleData: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
    updateVehicle: (vehicleData: Vehicle) => Promise<void>;
    addReservation: (reservationData: Omit<Reservation, 'id' | 'status'>) => Promise<Reservation>;
    cancelReservation: (reservationId: string) => Promise<void>;
    activateReservation: (reservationId: string, startMileage: number) => Promise<void>;
    completeReservation: (reservationId: string, endMileage: number, notes: string) => Promise<void>;
    addContract: (contractData: Omit<Contract, 'id'>) => Promise<void>;
    generateAndSendContract: (reservation: Reservation, customer: Customer, vehicle: Vehicle) => Promise<{ contractText: string; customer: Customer; vehicle: Vehicle }>;
    addExpense: (expenseData: { description: string; amount: number; date: Date; }) => Promise<void>;
    addService: (serviceData: Omit<VehicleService, 'id'>) => Promise<void>;
    updateService: (serviceId: string, updates: Partial<VehicleService>) => Promise<void>;
    addDamage: (damageData: { vehicleId: string; reservationId: string; description: string; location: string; imageFile: File; }) => Promise<void>;
    createOnlineReservation: (vehicleId: string, startDate: Date, endDate: Date, customerData: Omit<Customer, 'id'>) => Promise<void>;
}

interface DataContextState {
    data: AppData;
    loading: boolean;
    actions: DataContextActions;
    session: Session | null;
}

const DataContext = createContext<DataContextState | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

const expandData = (data: AppData): AppData => {
    const vehiclesById = new Map(data.vehicles.map(v => [v.id, v]));
    const customersById = new Map(data.customers.map(c => [c.id, c]));

    const reservations = data.reservations.map(r => ({
        ...r,
        customer: customersById.get(r.customerId),
        vehicle: vehiclesById.get(r.vehicleId),
    }));

    const contracts = data.contracts.map(c => ({
        ...c,
        customer: customersById.get(c.customerId),
        // FIX: The variable 'r' was not defined in this scope. It should be 'c' to refer to the current contract object.
        vehicle: vehiclesById.get(c.vehicleId),
    }));
    
    const services = data.services.map(s => ({
        ...s,
        vehicle: vehiclesById.get(s.vehicleId),
    }));

    const financials = data.financials.map(f => ({
        ...f,
        reservation: data.reservations.find(r => r.id === f.reservationId)
    }));


    return { ...data, reservations, contracts, services, financials };
};


export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<AppData>({
        vehicles: [], customers: [], reservations: [], contracts: [], financials: [], services: [],
    });
    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        api.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
        });

        // FIX: Correctly subscribe to auth changes and use the correct callback signature.
        const subscription = api.onAuthStateChange((session) => {
            setSession(session);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const refreshData = useCallback(async () => {
        setDataLoading(true);
        try {
            const fetchedData = await api.getAllData();
            const expanded = expandData(fetchedData);
            setData(expanded);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session) {
            refreshData();
        } else {
            setData({ vehicles: [], customers: [], reservations: [], contracts: [], financials: [], services: [] });
            setDataLoading(false);
        }
    }, [session, refreshData]);

    const actions = useMemo((): DataContextActions => ({
        refreshData,
        signOut: api.signOut,
        addCustomer: async (customerData) => {
            const newCustomer = await api.addCustomer(customerData);
            setData(prev => expandData({ ...prev, customers: [...prev.customers, newCustomer] }));
            return newCustomer;
        },
        updateCustomer: async (customerData) => {
            const updatedCustomer = await api.updateCustomer(customerData);
            setData(prev => expandData({
                ...prev,
                customers: prev.customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c)
            }));
        },
        addVehicle: async (vehicleData) => {
            const newVehicle = await api.addVehicle(vehicleData);
            setData(prev => expandData({ ...prev, vehicles: [...prev.vehicles, newVehicle] }));
            return newVehicle;
        },
        updateVehicle: async (vehicleData) => {
            const updatedVehicle = await api.updateVehicle(vehicleData);
            setData(prev => expandData({
                ...prev,
                vehicles: prev.vehicles.map(v => v.id === updatedVehicle.id ? updatedVehicle : v)
            }));
        },
        addReservation: async (resData) => {
            const newReservation = await api.addReservation(resData);
            setData(prev => expandData({ ...prev, reservations: [...prev.reservations, newReservation] }));
            return newReservation;
        },
        cancelReservation: async (reservationId) => {
            await api.updateReservation(reservationId, { status: 'cancelled' });
            await refreshData();
        },
        activateReservation: async (reservationId, startMileage) => {
            const reservation = data.reservations.find(r => r.id === reservationId);
            if (!reservation) throw new Error("Reservation not found");
            await api.updateReservation(reservationId, { status: 'active', startMileage });
            if (reservation.vehicleId) {
                await api.updateVehicle({ ...reservation.vehicle!, status: 'rented', currentMileage: startMileage });
            }
            await refreshData();
        },
        completeReservation: async (reservationId, endMileage, notes) => {
            const reservation = data.reservations.find(r => r.id === reservationId);
            if (!reservation) throw new Error("Reservation not found");

            await api.updateReservation(reservationId, { status: 'completed', endMileage, notes });
            if (reservation.vehicleId) {
                 await api.updateVehicle({ ...reservation.vehicle!, status: 'available', currentMileage: endMileage });
            }
            if(!reservation.vehicle || !reservation.customer) throw new Error("Missing vehicle or customer on reservation");

            // Calculate price and add to financials
            const start = new Date(reservation.startDate);
            const end = new Date(reservation.endDate);
            const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
            let totalPrice = 0;
            if (durationHours <= 4) totalPrice = reservation.vehicle.rate4h;
            else if (durationHours <= 12) totalPrice = reservation.vehicle.rate12h;
            else {
                const days = Math.ceil(durationHours / 24);
                totalPrice = days * reservation.vehicle.dailyRate;
            }
             
            await api.addFinancialTransaction({
                type: 'income',
                amount: totalPrice,
                date: new Date(),
                description: `Pronájem ${reservation.vehicle?.name} - ${reservation.customer?.firstName} ${reservation.customer?.lastName}`,
                reservationId,
            });

            await refreshData();
        },
        addContract: async (contractData) => {
             const newContract = await api.addContract(contractData);
             setData(prev => expandData({ ...prev, contracts: [...prev.contracts, newContract] }));
        },
        generateAndSendContract: async (reservation, customer, vehicle) => {
            const start = new Date(reservation.startDate);
            const end = new Date(reservation.endDate);
            const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
            
            let totalPrice = 0;
            if (durationHours <= 4) totalPrice = vehicle.rate4h;
            else if (durationHours <= 12) totalPrice = vehicle.rate12h;
            else {
                const days = Math.ceil(durationHours / 24);
                totalPrice = days * vehicle.dailyRate;
            }

             const contractText = `
SMLOUVA O NÁJMU DOPRAVNÍHO PROSTŘEDKU
=========================================

Článek I. - Smluvní strany
-----------------------------------------
Pronajímatel:
Milan Gula
Ghegova 117, Brno Nové Sady, 60200
Web: pujcimedodavky.cz
IČO: 07031653
(dále jen "pronajímatel")

Nájemce:
Jméno: ${customer.firstName} ${customer.lastName}
Adresa: ${customer.address}
Email: ${customer.email}
Telefon: ${customer.phone}
Číslo ŘP: ${customer.driverLicenseNumber}
(dále jen "nájemce")

Článek II. - Předmět a účel nájmu
-----------------------------------------
1. Pronajímatel tímto přenechává nájemci do dočasného užívání (nájmu) následující motorové vozidlo (dále jen "předmět nájmu" nebo "vozidlo"):
   Vozidlo: ${vehicle.name} (${vehicle.make} ${vehicle.model})
   SPZ: ${vehicle.licensePlate}
   Rok výroby: ${vehicle.year}
2. Nájemce se zavazuje užívat vozidlo k obvyklému účelu a v souladu s platnými právními předpisy.

Článek III. - Doba nájmu a cena
-----------------------------------------
1. Doba nájmu je sjednána od: ${new Date(reservation.startDate).toLocaleString('cs-CZ')} do: ${new Date(reservation.endDate).toLocaleString('cs-CZ')}.
2. Celková cena nájmu činí: ${totalPrice.toLocaleString('cs-CZ')} Kč. Cena je splatná při převzetí vozidla, není-li dohodnuto jinak.
3. Nájemce bere na vědomí, že denní limit pro nájezd je 300 km. Za každý kilometr nad tento limit (vypočtený jako 300 km * počet dní pronájmu) bude účtován poplatek 3 Kč/km.
   Počáteční stav kilometrů: ${(vehicle.currentMileage ?? 0).toLocaleString('cs-CZ')} km.

Článek IV. - Vratná kauce (jistota)
-----------------------------------------
1. Nájemce skládá při podpisu této smlouvy a předání vozidla vratnou kauci ve výši 5.000 Kč (slovy: pět tisíc korun českých) v hotovosti nebo na bankovní účet pronajímatele. Tato kauce je plně vratná za podmínek uvedených níže.
2. Tato kauce slouží k zajištění případných pohledávek pronajímatele vůči nájemci (např. na úhradu škody, smluvních pokut, nákladů na dotankování paliva atd.).
3. Kauce bude nájemci vrácena v plné výši po řádném vrácení vozidla, a to bezodkladně, pokud nebudou shledány žádné vady či škody. V opačném případě je pronajímatel oprávněn kauci (nebo její část) použít na úhradu svých pohledávek.

Článek V. - Práva a povinnosti stran
-----------------------------------------
1. Nájemce svým podpisem potvrzuje, že vozidlo převzal v řádném technickém stavu, bez zjevných závad, s kompletní povinnou výbavou a s plnou nádrží pohonných hmot.
2. Nájemce je povinen užívat vozidlo s péčí řádného hospodáře, chránit ho před poškozením, ztrátou či zničením a dodržovat pokyny výrobce pro jeho provoz.
3. V celém vozidle je PŘÍSNĚ ZAKÁZÁNO KOUŘIT. V případě porušení tohoto zákazu je nájemce povinen uhradit smluvní pokutu ve výši 500 Kč.
4. Nájemce je povinen vrátit vozidlo s plnou nádrží pohonných hmot. V případě vrácení vozidla s neúplnou nádrží je nájemce povinen uhradit náklady na dotankování a smluvní pokutu ve výši 500 Kč.
5. Nájemce není oprávněn provádět na vozidle jakékoliv úpravy, přenechat ho do podnájmu třetí osobě, ani ho použít k účasti na závodech, k trestné činnosti či k přepravě nebezpečných nákladů.

Článek VI. - Odpovědnost za škodu a spoluúčast
-----------------------------------------
1. V případě poškození předmětu nájmu zaviněného nájemcem, nebo v případě odcizení, se sjednává spoluúčast nájemce na vzniklé škodě.
2. Výše spoluúčasti činí 5.000 Kč při poškození pronajatého vozidla.
3. V případě dopravní nehody, při které dojde k poškození jiných vozidel nebo majetku třetích stran, činí spoluúčast 10.000 Kč.
4. Nájemce je povinen každou dopravní nehodu, poškození vozidla nebo jeho odcizení neprodleně ohlásit pronajímateli a Policii ČR.

Článek VII. - Závěrečná ustanovení
-----------------------------------------
1. Tato smlouva nabývá platnosti a účinnosti dnem jejího podpisu oběma smluvními stranami.
2. Smluvní strany prohlašují, že si smlouvu přečetly, s jejím obsahem souhlasí a na důkaz toho připojují své podpisy.
3. Tato smlouva je vyhotovena elektronicky. Nájemce svým digitálním podpisem stvrzuje, že se seznámil s obsahem smlouvy, souhlasí s ním a vozidlo v uvedeném stavu přebírá.

Digitální podpis nájemce:
(viz přiložený obrazový soubor)
            `;

            const newContract = await api.addContract({
                reservationId: reservation.id,
                customerId: customer.id,
                vehicleId: vehicle.id,
                generatedAt: new Date(),
                contractText,
            });

            setData(prev => expandData({ ...prev, contracts: [...prev.contracts, newContract] }));

            return { contractText, customer, vehicle };
        },
        addExpense: async (expenseData) => {
            const newExpense = await api.addFinancialTransaction({ ...expenseData, type: 'expense' });
            setData(prev => expandData({ ...prev, financials: [...prev.financials, newExpense] }));
        },
        addService: async (serviceData) => {
            const newService = await api.addService(serviceData);
            setData(prev => expandData({ ...prev, services: [...prev.services, newService] }));
        },
        updateService: async (serviceId, updates) => {
             const updatedService = await api.updateService(serviceId, updates);
             setData(prev => expandData({
                 ...prev,
                 services: prev.services.map(s => s.id === updatedService.id ? updatedService : s)
             }));
        },
        addDamage: async (damageData) => {
            await api.addDamage(damageData);
            // No local state update, damage history is fetched on demand
        },
        createOnlineReservation: async (vehicleId, startDate, endDate, customerData) => {
            await api.createOnlineReservation(vehicleId, startDate, endDate, customerData);
            await refreshData();
        }
    }), [data, refreshData]);

    const value = { data, loading: authLoading || (!!session && dataLoading), actions, session };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};