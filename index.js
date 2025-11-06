import express from "express";
import cors from "cors";
import admin from "firebase-admin";

const app = express();
app.use(cors());
app.use(express.json());

const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://bazaruniversal-c1d7f-default-rtdb.firebaseio.com"
});
const db = admin.database();


app.get("/api/items", async (req, res) => {
  try {
    const q = (req.query.q || "").toLowerCase();
    const snap = await db.ref("products").once("value");
    const all = Object.values(snap.val() || {});
    const filtered = q
      ? all.filter(p =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
        )
      : all;
    res.json({ total: filtered.length, items: filtered });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "items_failed" });
  }
});


app.get("/api/items/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const snap = await db.ref("products").once("value");
    const all = Object.values(snap.val() || {});
    const item = all.find(p => p.id === id);
    if (!item) return res.status(404).json({ error: "not_found" });
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "item_failed" });
  }
});


app.post("/api/addSale", async (req, res) => {
  try {
    const { productId, qty = 1 } = req.body;
    const snap = await db.ref("products").once("value");
    const all = Object.values(snap.val() || {});
    const prod = all.find(p => p.id === parseInt(productId));
    if (!prod) return res.status(404).json({ ok: false, error: "product_not_found" });

    const sale = {
      productId,
      title: prod.title,
      price: prod.price,
      qty,
      createdAt: Date.now()
    };
    const newSale = await db.ref("sales").push(sale);
    res.json({ ok: true, id: newSale.key });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "sale_failed" });
  }
});


app.get("/api/sales", async (_req, res) => {
  try {
    const snap = await db.ref("sales").once("value");
    const list = Object.entries(snap.val() || {}).map(([id, s]) => ({ id, ...s })).reverse();
    res.json({ total: list.length, sales: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "sales_failed" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API corriendo en puerto ${PORT}`));
