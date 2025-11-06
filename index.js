import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

// Inicializa Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://bazaruniversal-c1d7f-default-rtdb.firebaseio.com" 
});
const db = admin.database();

// ---- Endpoints ----

// GET /api/items?q=
app.get("/api/items", async (req, res) => {
  try {
    const q = (req.query.q || "").toLowerCase();
    const snap = await db.ref("products").once("value");
    const all = Object.values(snap.val() || {});
    const filtered = q
      ? all.filter(p =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
        )
      : all;
    res.json({ total: filtered.length, items: filtered });
  } catch (e) {
    res.status(500).json({ error: "items_failed" });
  }
});

// GET /api/items/:id
app.get("/api/items/:id", async (req, res) => {
  const id = req.params.id;
  const snap = await db.ref(`products/${id}`).once("value");
  if (!snap.exists()) return res.status(404).json({ error: "not_found" });
  res.json(snap.val());
});

// POST /api/addSale
app.post("/api/addSale", async (req, res) => {
  const { productId, qty = 1 } = req.body;
  if (!productId) return res.status(400).json({ ok: false, error: "missing_productId" });

  const prodSnap = await db.ref(`products/${productId}`).once("value");
  if (!prodSnap.exists()) return res.status(404).json({ ok: false, error: "product_not_found" });
  const p = prodSnap.val();

  const sale = { productId, title: p.title, price: p.price, qty, createdAt: Date.now() };
  const newSale = await db.ref("sales").push(sale);
  res.json({ ok: true, id: newSale.key });
});

// GET /api/sales
app.get("/api/sales", async (_req, res) => {
  const snap = await db.ref("sales").once("value");
  const list = Object.entries(snap.val() || {}).map(([id, s]) => ({ id, ...s })).reverse();
  res.json({ total: list.length, sales: list });
});

// ---- Servidor ----
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ API corriendo en puerto ${PORT}`));

