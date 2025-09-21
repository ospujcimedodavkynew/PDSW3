import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import * as api from '../services/api';
import { Customer, Reservation, Vehicle, Contract, FinancialTransaction, VehicleService, VehicleDamage, HandoverProtocol } from '../types';
import { Session } from '@supabase/supabase-js';


interface AppData {
    vehicles: Vehicle[];
    customers: Customer[];
    reservations: Reservation[];
    contracts: Contract[];
    handoverProtocols: HandoverProtocol[];
    financials: FinancialTransaction[];
    services: VehicleService[];
}

export interface ProtocolData {
    notes: string;
    fuelLevel: string;
    cleanliness: string;
    keysAndDocsOk: boolean;
    customerAgreed: boolean;
}

interface DataContextActions {
    refreshData: () => Promise<void>;
    signOut: () => Promise<void>;
    addCustomer: (customerData: Omit<Customer, 'id'>) => Promise<Customer>;
    updateCustomer: (customerData: Customer) => Promise<void>;
    addVehicle: (vehicleData: Omit<Vehicle, 'id'>) => Promise<Vehicle>;
    updateVehicle: (vehicleData: Vehicle) => Promise<void>;
    addReservation: (reservationData: Omit<Reservation, 'id' | 'status'>) => Promise<Reservation>;
    activateReservation: (reservationId: string, startMileage: number) => Promise<void>;
    completeReservation: (reservationId: string, endMileage: number, protocolData: ProtocolData) => Promise<void>;
    addContract: (contractData: Omit<Contract, 'id'>) => Promise<void>;
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

const expandData = (data: Omit<AppData, 'handoverProtocols'> & { handoverProtocols: HandoverProtocol[] }): AppData => {
    const vehiclesById = new Map(data.vehicles.map(v => [v.id, v]));
    const customersById = new Map(data.customers.map(c => [c.id, c]));
    const reservationsById = new Map(data.reservations.map(r => [r.id, r]));

    const reservations = data.reservations.map(r => ({
        ...r,
        customer: customersById.get(r.customerId),
        vehicle: vehiclesById.get(r.vehicleId),
    }));

    const contracts = data.contracts.map(c => ({
        ...c,
        customer: customersById.get(c.customerId),
        vehicle: vehiclesById.get(c.vehicleId),
    }));

    const handoverProtocols = data.handoverProtocols.map(p => ({
        ...p,
        customer: customersById.get(p.customerId),
        vehicle: vehiclesById.get(p.vehicleId),
        reservation: reservationsById.get(p.reservationId)
    }));
    
    const services = data.services.map(s => ({
        ...s,
        vehicle: vehiclesById.get(s.vehicleId),
    }));

    const financials = data.financials.map(f => ({
        ...f,
        reservation: data.reservations.find(r => r.id === f.reservationId)
    }));


    return { ...data, reservations, contracts, handoverProtocols, services, financials };
};


export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<AppData>({
        vehicles: [], customers: [], reservations: [], contracts: [], handoverProtocols: [], financials: [], services: [],
    });
    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        api.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
        });

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
            setData({ vehicles: [], customers: [], reservations: [], contracts: [], handoverProtocols: [], financials: [], services: [] });
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
        activateReservation: async (reservationId, startMileage) => {
            const reservation = data.reservations.find(r => r.id === reservationId);
            if (!reservation) throw new Error("Reservation not found");
            
            const contractExists = data.contracts.some(c => c.reservationId === reservationId);
            if (!contractExists && reservation.customer && reservation.vehicle) {
                const customerForContract = reservation.customer;
                const contractVehicle = reservation.vehicle;

                // Calculate price
                const start = new Date(reservation.startDate);
                const end = new Date(reservation.endDate);
                const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
                let rentalPrice = 0;
                if (durationHours <= 4) rentalPrice = contractVehicle.rate4h;
                else if (durationHours <= 12) rentalPrice = contractVehicle.rate12h;
                else {
                    const days = Math.ceil(durationHours / 24);
                    rentalPrice = days * contractVehicle.dailyRate;
                }

                // Generate contract text
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
Jméno: ${customerForContract.firstName} ${customerForContract.lastName}
Adresa: ${customerForContract.address}
Email: ${customerForContract.email}
Telefon: ${customerForContract.phone}
Číslo ŘP: ${customerForContract.driverLicenseNumber}
(dále jen "nájemce")

Článek II. - Předmět a účel nájmu
-----------------------------------------
1. Pronajímatel tímto přenechává nájemci do dočasného užívání (nájmu) následující motorové vozidlo (dále jen "předmět nájmu" nebo "vozidlo"):
   Vozidlo: ${contractVehicle.name} (${contractVehicle.make} ${contractVehicle.model})
   SPZ: ${contractVehicle.licensePlate}
   Rok výroby: ${contractVehicle.year}
2. Nájemce se zavazuje užívat vozidlo k obvyklému účelu a v souladu s platnými právními předpisy.

Článek III. - Doba nájmu a cena
-----------------------------------------
1. Doba nájmu je sjednána od: ${new Date(reservation.startDate).toLocaleString('cs-CZ')} do: ${new Date(reservation.endDate).toLocaleString('cs-CZ')}.
2. Celková cena nájmu činí: ${rentalPrice.toLocaleString('cs-CZ')} Kč. Cena je splatná při převzetí vozidla, není-li dohodnuto jinak.
3. Nájemce bere na vědomí, že denní limit pro nájezd je 300 km. Za každý kilometr nad tento limit (vypočtený jako 300 km * počet dní pronájmu) bude účtován poplatek 3 Kč/km.
   Počáteční stav kilometrů: ${(startMileage).toLocaleString('cs-CZ')} km.

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
3. Smlouva byla vygenerována automaticky při převzetí vozidla na základě online rezervace, jejíž podmínky zákazník odsouhlasil. Zákazník svým převzetím vozidla stvrzuje souhlas s podmínkami této smlouvy.
                `;

                await api.addContract({
                    reservationId: reservation.id,
                    customerId: reservation.customerId,
                    vehicleId: reservation.vehicleId,
                    generatedAt: new Date(),
                    contractText,
                });
            }
            
            await api.updateReservation(reservationId, { status: 'active', startMileage });
            if (reservation.vehicleId) {
                await api.updateVehicle({ ...reservation.vehicle!, status: 'rented', currentMileage: startMileage });
            }
            await refreshData();
        },
        completeReservation: async (reservationId, endMileage, protocolData) => {
            const reservation = data.reservations.find(r => r.id === reservationId);
            if (!reservation || !reservation.vehicle || !reservation.customer) throw new Error("Reservation not found or is incomplete");
            
            // 1. Calculate mileage details
            const startKm = reservation.startMileage || 0;
            const kmDriven = endMileage > startKm ? endMileage - startKm : 0;
            const durationMs = new Date(reservation.endDate).getTime() - new Date(reservation.startDate).getTime();
            const rentalDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
            const kmLimit = rentalDays * 300;
            const kmOver = Math.max(0, kmDriven - kmLimit);
            const extraCharge = kmOver * 3;

            // 2. Generate protocol text
            const protocolText = `
PŘEDÁVACÍ PROTOKOL - VRÁCENÍ VOZIDLA
=========================================
Datum a čas: ${new Date().toLocaleString('cs-CZ')}
Rezervace ID: ${reservation.id}
Vozidlo: ${reservation.vehicle.name} (${reservation.vehicle.licensePlate})
Zákazník: ${reservation.customer.firstName} ${reservation.customer.lastName}

--- KONTROLA STAVU VOZIDLA ---
Stav paliva: ${protocolData.fuelLevel}
Čistota: ${protocolData.cleanliness}
Klíče a dokumentace: ${protocolData.keysAndDocsOk ? 'V pořádku' : 'Chybí / Nekompletní'}

--- PŘEHLED KILOMETRŮ ---
Počáteční stav: ${startKm.toLocaleString('cs-CZ')} km
Konečný stav: ${endMileage.toLocaleString('cs-CZ')} km
Ujeto celkem: ${kmDriven.toLocaleString('cs-CZ')} km
Limit nájezdu (${rentalDays} dní): ${kmLimit.toLocaleString('cs-CZ')} km
Překročeno o: ${kmOver.toLocaleString('cs-CZ')} km
Poplatek za překročení: ${extraCharge.toLocaleString('cs-CZ')} Kč

--- POZNÁMKY OBSLUHY ---
${protocolData.notes || 'Žádné.'}
---------------------------------
Nová poškození nahlášená při tomto vrácení jsou zaznamenána samostatně v historii poškození vozidla.

--- SOUHLAS ZÁKAZNÍKA ---
Zákazník digitálně odsouhlasil obsah tohoto protokolu dne ${new Date().toLocaleString('cs-CZ')}.
`.trim();

            // 3. Create handover protocol (without signature URL)
            await api.addHandoverProtocol({
                reservationId: reservation.id,
                customerId: reservation.customerId,
                vehicleId: reservation.vehicleId,
                generatedAt: new Date(),
                protocolText,
            });

            // 4. Update reservation and vehicle
            await api.updateReservation(reservationId, { status: 'completed', endMileage, notes: protocolData.notes });
            await api.updateVehicle({ ...reservation.vehicle, status: 'available', currentMileage: endMileage });

            // 5. Add financial transaction for rental price + extra charges
            const start = new Date(reservation.startDate);
            const end = new Date(reservation.endDate);
            const durationHours = (end.getTime() - start.getTime()) / (1000 * 3600);
            let rentalPrice = 0;
            if (durationHours <= 4) rentalPrice = reservation.vehicle.rate4h;
            else if (durationHours <= 12) rentalPrice = reservation.vehicle.rate12h;
            else {
                const days = Math.ceil(durationHours / 24);
                rentalPrice = days * reservation.vehicle.dailyRate;
            }
            const totalPrice = rentalPrice + extraCharge;

            await api.addFinancialTransaction({
                type: 'income',
                amount: totalPrice,
                date: new Date(),
                description: `Pronájem ${reservation.vehicle?.name} - ${reservation.customer?.firstName} ${reservation.customer?.lastName} (vč. poplatků)`,
                reservationId,
            });

            // 6. Refresh all data
            await refreshData();
        },
        addContract: async (contractData) => {
             const newContract = await api.addContract(contractData);
             setData(prev => expandData({ ...prev, contracts: [...prev.contracts, newContract] }));
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
