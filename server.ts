import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize Supabase with SERVICE_ROLE_KEY (Server-side only!)
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables!");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // --- API Routes ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy for sensitive data - example: get all data for admin
  app.get("/api/admin/data", async (req, res) => {
    try {
      // In a real app, you would verify the user's session/token here
      // For now, we assume the frontend sends a valid request
      
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

  // Public booking data
  app.get("/api/public/booking-data", async (req, res) => {
    try {
      const [vehicles, reservations] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('reservations').select('vehicle_id, start_date, end_date, status'),
      ]);
      res.json({ vehicles: vehicles.data, reservations: reservations.data });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch booking data" });
    }
  });

  // Reservation by token
  app.get("/api/reservations/token/:token", async (req, res) => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*, vehicle:vehicles(*)')
      .eq('portal_token', req.params.token)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
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
    const { data, error } = await supabase
      .from(table)
      .upsert(req.body)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // Generic Insert
  app.post("/api/:table", async (req, res) => {
    const { table } = req.params;
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
    const { data, error } = await supabase
      .from(table)
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // Generic Delete
  app.delete("/api/:table/:id", async (req, res) => {
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

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // On Vercel, static files are served by Vercel itself, 
    // but we keep this for other production environments
    const distPath = path.join(process.cwd(), "dist");
    if (require('fs').existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  // Vercel handles the listening, so we only listen locally or on other platforms
  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

// For local development
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
  });
}

// For Vercel Serverless Functions
export default async (req: any, res: any) => {
  const app = await startServer();
  return app(req, res);
};

