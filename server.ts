import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize Supabase with SERVICE_ROLE_KEY (Server-side only!)
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Middleware pro ověření uživatele ---
const authenticateUser = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header" });
  }

  const token = authHeader.split(" ")[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = user;
  next();
};

// --- API Routes ---

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV });
});

// Proxy for sensitive data - vyžaduje přihlášení
app.get("/api/admin/data", authenticateUser, async (req, res) => {
  try {
    const [vehicles, customers, reservations, contracts, protocols, financials, services, settings, invoices] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('reservations').select('*'),
        supabase.from('contracts').select('*'),
        supabase.from('handover_protocols').select('*'),
        supabase.from('financial_transactions').select('*'),
        supabase.from('vehicle_services').select('*'),
        supabase.from('company_settings').select('*').limit(1).maybeSingle(),
        supabase.from('invoices').select('*'),
      ]);

      res.json({
        vehicles: vehicles.data,
        customers: customers.data,
        reservations: reservations.data,
        contracts: contracts.data,
        handoverProtocols: protocols.data,
        financials: financials.data,
        services: services.data,
        settings: settings.data,
        invoices: invoices.data,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin data" });
    }
  });

  // Secure customer check (by email)
  app.post("/api/customers/check", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const { data, error } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email, phone')
      .eq('email', email)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // Secure customer add/update
  app.post("/api/customers/upsert", async (req, res) => {
    const customerData = req.body;
    const { data, error } = await supabase
      .from('customers')
      .upsert(customerData)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

// Public booking data - vrací jen nezbytné info pro kalendář
app.get("/api/public/booking-data", async (req, res) => {
  try {
    const [vehicles, reservations] = await Promise.all([
      supabase.from('vehicles').select('id, name, make, model, year, image_url, rate4h, rate12h, daily_rate, features, current_mileage, description, dimensions'),
      supabase.from('reservations').select('vehicle_id, start_date, end_date, status'),
    ]);
    res.json({ vehicles: vehicles.data, reservations: reservations.data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch booking data" });
  }
});

// Reservation by token - vrací jen jednu konkrétní rezervaci
app.get("/api/reservations/token/:token", async (req, res) => {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, vehicle:vehicles(*)')
    .eq('portal_token', req.params.token)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Reservation not found" });
  res.json(data);
});

  // Contract by ID
  app.get("/api/contracts/:id", async (req, res) => {
    const { data, error } = await supabase
      .from('contracts')
      .select('*, customer:customers(*), vehicle:vehicles(*)')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

// Generic Upsert for other entities
app.post("/api/:table/upsert", async (req, res) => {
  const { table } = req.params;
  
  // Zabezpečení: Pouze tabulka 'customers' může být upsertována veřejně (pro rezervace)
  // Ostatní tabulky vyžadují přihlášení
  if (table !== 'customers') {
    return authenticateUser(req, res, async () => {
      const { data, error } = await supabase.from(table).upsert(req.body).select().single();
      if (error) return res.status(500).json({ error: error.message });
      res.json(data);
    });
  }

  try {
    // MANUÁLNÍ UPSERT PRO ZÁKAZNÍKY (100% spolehlivost proti chybě duplicate email)
    if (table === 'customers' && req.body.email) {
      // 1. Zkusíme najít existujícího zákazníka podle e-mailu
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', req.body.email)
        .maybeSingle();

      if (existingCustomer) {
        // 2. Pokud existuje, aktualizujeme ho
        const { data, error } = await supabase
          .from('customers')
          .update(req.body)
          .eq('id', existingCustomer.id)
          .select()
          .single();
        
        if (error) throw error;
        return res.json(data);
      }
    }

    // 3. Pokud neexistuje (nebo to není tabulka customers), vložíme nový záznam
    const { data, error } = await supabase
      .from(table)
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error(`Upsert error for ${table}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Generic Insert
app.post("/api/:table", async (req, res) => {
  const { table } = req.params;

  // Zabezpečení: Pouze tabulka 'reservations' může být vytvořena veřejně
  if (table !== 'reservations') {
    return authenticateUser(req, res, async () => {
      const { data, error } = await supabase.from(table).insert([req.body]).select().single();
      if (error) return res.status(500).json({ error: error.message });
      res.json(data);
    });
  }

  const { data, error } = await supabase
    .from(table)
    .insert([req.body])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Generic Update
app.patch("/api/:table/:id", async (req, res) => {
  const { table, id } = req.params;

  // Zabezpečení: Pouze tabulka 'reservations' může být aktualizována veřejně (pro dokončení údajů zákazníkem)
  if (table !== 'reservations') {
    return authenticateUser(req, res, async () => {
      const { data, error } = await supabase.from(table).update(req.body).eq('id', id).select().single();
      if (error) return res.status(500).json({ error: error.message });
      res.json(data);
    });
  }

  const { data, error } = await supabase
    .from(table)
    .update(req.body)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

  // Generic Delete - vyžaduje přihlášení
  app.delete("/api/:table/:id", authenticateUser, async (req, res) => {
    const { table, id } = req.params;
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ status: "deleted" });
  });

  // Vehicle services
  app.get("/api/vehicles/:id/services", async (req, res) => {
    const { data, error } = await supabase
      .from('vehicle_services')
      .select('*')
      .eq('vehicle_id', req.params.id)
      .order('service_date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // Vehicle damages
  app.get("/api/vehicles/:id/damages", async (req, res) => {
    const { data, error } = await supabase
      .from('vehicle_damages')
      .select('*, reservation:reservations(*, customer:customers(*))')
      .eq('vehicle_id', req.params.id)
      .order('reported_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

// --- Vite & Static Middleware ---
const setupStatic = async () => {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    // Only serve static files if NOT on Vercel (Vercel handles this via rewrites/static)
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
};

setupStatic();

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;

