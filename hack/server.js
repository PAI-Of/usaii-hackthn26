/**
 * server.js — Flim.ai Core Protocol v1.0
 *
 * Routes
 * ──────
 *  POST   /auth/cookie       — Login: issue httpOnly JWT cookie
 *  DELETE /auth/logout       — Logout: clear cookie
 *  GET    /valid             — Auth-gated liveness check
 *
 *  POST   /food/snap         — Upload + classify food image (auth required)
 *  GET    /food/get?id=…     — Fetch a single food item by id
 *  GET    /food/available    — List all food items still within shelf life
 */

import "dotenv/config";

import express      from "express";
import cors         from "cors";
import cookieParser from "cookie-parser";
import multer       from "multer";
import path         from "path";
import argon2       from "argon2";

import { initDB }                        from "./mod/database.js";
import { validate, create_token, middleware } from "./mod/authentication.js";
import { snapped }                       from "./mod/foodsnapper.js";
import { db }                            from "./mod/database.js";

// ── 1. Initialise DB (creates tables if they don't exist) ─────────────────
initDB();

// ── 2. Express setup ──────────────────────────────────────────────────────
const app = express();

app.use(cors({
    origin:      "http://localhost:5173",
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ── 3. Multer — save uploads with a unique filename ───────────────────────
const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `food-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});
const upload = multer({ storage });

// ── 4. Routes ─────────────────────────────────────────────────────────────

/** Health check */
app.get("/", (req, res) => {
    res.send("Flim.ai server is running on :3000");
});

/**
 * POST /auth/cookie
 * Body: { name: string, password: string }
 * Sets an httpOnly cookie "authentication-token" on success.
 */
app.post("/auth/cookie", async (req, res) => {
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: "name and password are required" });
    }

    const valid = await validate(name, password);
    if (!valid) {
        console.log(`[auth][-] failed login for '${name}'`);
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = create_token(name);
    res.cookie("authentication-token", token, {
        httpOnly: true,
        secure:   false,   // set true behind HTTPS in production
        sameSite: "lax",
        maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    console.log(`[auth][+] cookie issued for '${name}'`);
    res.status(200).json({ message: "Logged in successfully" });
});

/**
 * DELETE /auth/logout
 * Clears the authentication cookie.
 */
app.delete("/auth/logout", (req, res) => {
    res.clearCookie("authentication-token");
    res.status(200).json({ message: "Logged out successfully" });
});

/**
 * GET /valid
 * Returns 200 if the request carries a valid JWT cookie, 401/403 otherwise.
 */
app.get("/valid", middleware, (req, res) => {
    res.status(200).json({ message: "Authorized", user: req.user.name });
});

/**
 * POST /food/snap or POST /food/upload
 * Multipart form-data: field "food" or "image" = image file.
 * Requires auth cookie.
 * Classifies image via Gemini Vision, accepts publisher's location, and stores the food item.
 */
app.post(["/food/snap", "/food/upload"], middleware, upload.any(), async (req, res) => {
    const file = req.files && req.files.find(f => f.fieldname === "food" || f.fieldname === "image");
    if (!file) {
        const errorMsg = req.path.includes("upload")
            ? "No file uploaded. Use field name 'image'."
            : "No file uploaded. Use field name 'food'.";
        return res.status(400).json({ error: errorMsg });
    }

    try {
        const filepath = file.path;
        const username = req.user.name;

        console.log(`[snap][+] received from '${username}': ${file.filename}`);

        // Parse location
        let fromLocation = "none";
        if (req.body.location) {
            fromLocation = typeof req.body.location === "object" ? JSON.stringify(req.body.location) : req.body.location;
        } else if (req.body.from_location) {
            fromLocation = typeof req.body.from_location === "object" ? JSON.stringify(req.body.from_location) : req.body.from_location;
        } else if (req.body.latitude && req.body.longitude) {
            fromLocation = JSON.stringify({ latitude: req.body.latitude, longitude: req.body.longitude });
        }

        // Run AI classification + DB insert
        const { id, name } = await snapped(filepath, username, undefined, fromLocation, file.originalname);

        console.log(`[snap][+] classified as '${name}' (id=${id}) with location '${fromLocation}'`);
        res.status(200).json({ id, name });
    } catch (err) {
        console.error("[snap][!] error:", err.message);
        if (err.message.toUpperCase().startsWith("REJECTED")) {
            const reason = err.message.replace(/^REJECTED:\s*/i, "");
            return res.status(400).json({ error: `Food upload rejected: ${reason}` });
        }
        res.status(500).json({ error: "Failed to process food image" });
    }
});

/** Serve static images from /uploads endpoint */
app.use("/uploads", express.static("./uploads"));

/**
 * GET /food/asset/:url
 * Helper route to send the requested file from the uploads directory.
 */
app.get("/food/asset/:url", (req, res) => {
    const filename = req.params.url;
    const safeFilename = path.basename(filename);
    const filepath = path.join(process.cwd(), "uploads", safeFilename);
    res.sendFile(filepath);
});

/**
 * POST /auth/register
 * Body: { name: string, password: string, email: string (optional) }
 * Registers a new user, hashes password via argon2, and sets auth cookie.
 */
app.post("/auth/register", async (req, res) => {
    const name = req.body.name || req.body.username;
    const { password, email } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: "name and password are required" });
    }

    try {
        // Check if user already exists
        const existingUser = db.prepare("SELECT id FROM users WHERE name = ?").get(name);
        if (existingUser) {
            return res.status(400).json({ error: "Username already exists" });
        }

        // Hash password
        const hashedPassword = await argon2.hash(password);

        // Insert new user
        db.prepare("INSERT INTO users (name, password, email) VALUES (?, ?, ?)")
            .run(name, hashedPassword, email || null);

        // Auto-login after registration
        const token = create_token(name);
        res.cookie("authentication-token", token, {
            httpOnly: true,
            secure:   false,
            sameSite: "lax",
            maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
        });

        console.log(`[auth][+] registered and logged in '${name}'`);
        res.status(201).json({ message: "Registered and logged in successfully", name });
    } catch (err) {
        console.error("[auth][!] registration error:", err.message);
        res.status(500).json({ error: "Failed to register user" });
    }
});

/**
 * POST /order/create
 * Body: { food_id: integer, location: string/object }
 * Creates an order, updates the food record, and sends a notification message to the publisher.
 */
app.post("/order/create", middleware, async (req, res) => {
    const { food_id } = req.body;
    let buyer_location = req.body.location || req.body.buyer_location || req.body.buyerLocation || "none";
    if (req.body.latitude && req.body.longitude) {
        buyer_location = JSON.stringify({ latitude: req.body.latitude, longitude: req.body.longitude });
    }
    if (typeof buyer_location === "object") {
        buyer_location = JSON.stringify(buyer_location);
    }

    if (!food_id) {
        return res.status(400).json({ error: "food_id is required" });
    }

    try {
        // Fetch food item
        const food = db.prepare("SELECT * FROM food_items WHERE id = ?").get(food_id);
        if (!food) {
            return res.status(404).json({ error: "Food item not found" });
        }

        const buyer = req.user.name;
        const now = Math.floor(Date.now() / 1000);

        // Check expiration
        if ((food.time_posted + food.shelf_life) <= now) {
            return res.status(400).json({ error: "Cannot order: This food item has expired." });
        }

        // Update food item record
        db.prepare("UPDATE food_items SET buyer = ?, buyer_location = ? WHERE id = ?")
            .run(buyer, buyer_location, food_id);

        // Create order record
        const orderResult = db.prepare(`
            INSERT INTO orders (food_id, buyer, buyer_location, status, time_ordered)
            VALUES (?, ?, ?, 'pending', ?)
        `).run(food_id, buyer, buyer_location, now);

        const orderId = orderResult.lastInsertRowid;

        // Create inbox notification message for the publisher
        db.prepare(`
            INSERT INTO messages (order_id, sender, recipient, content, status, type, time_sent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            orderId,
            buyer,
            food.publisher,
            `Is ${food.name} available?`,
            "unread",
            "order_request",
            now
        );

        console.log(`[order][+] created order ${orderId} for food '${food.name}' (id=${food_id}) by buyer '${buyer}'`);
        res.status(201).json({
            message: "Order created successfully",
            order_id: orderId,
            status: "pending"
        });
    } catch (err) {
        console.error("[order][!] failed to create order:", err.message);
        res.status(500).json({ error: "Failed to create order" });
    }
});

/**
 * POST /order/respond
 * Body: { order_id: integer, response: "yes"|"no", status: "accepted"|"rejected" }
 * Updates the order status and notifies the buyer of the response.
 */
app.post("/order/respond", middleware, async (req, res) => {
    const { order_id, response, status } = req.body;

    if (!order_id) {
        return res.status(400).json({ error: "order_id is required" });
    }

    let newStatus;
    if (status === "accepted" || status === "rejected") {
        newStatus = status;
    } else if (response === "yes" || response === "accept") {
        newStatus = "accepted";
    } else if (response === "no" || response === "reject") {
        newStatus = "rejected";
    } else {
        return res.status(400).json({ error: "Invalid response, must specify response (yes/no) or status (accepted/rejected)" });
    }

    try {
        // Fetch order
        const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(order_id);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Fetch food item to verify publisher
        const food = db.prepare("SELECT * FROM food_items WHERE id = ?").get(order.food_id);
        if (!food) {
            return res.status(404).json({ error: "Associated food item not found" });
        }

        // Verify publisher identity
        if (food.publisher !== req.user.name) {
            return res.status(403).json({ error: "Unauthorized: only the food publisher can respond to this order" });
        }

        // Update order status
        db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(newStatus, order_id);

        const now = Math.floor(Date.now() / 1000);

        // Send response message to the buyer
        db.prepare(`
            INSERT INTO messages (order_id, sender, recipient, content, status, type, time_sent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            order_id,
            req.user.name, // sender is publisher
            order.buyer,   // recipient is buyer
            `Publisher answered ${newStatus === "accepted" ? "Yes" : "No"} for "${food.name}"`,
            "unread",
            "order_response",
            now
        );

        console.log(`[order][+] order ${order_id} updated to status '${newStatus}'`);
        res.status(200).json({
            message: `Order status updated to ${newStatus}`,
            order_id,
            status: newStatus
        });
    } catch (err) {
        console.error("[order][!] failed to respond to order:", err.message);
        res.status(500).json({ error: "Failed to respond to order" });
    }
});

/**
 * GET /orders/my
 * Optional query param: format=object
 * Returns all orders where the current user is the buyer.
 */
app.get("/orders/my", middleware, (req, res) => {
    const username = req.user.name;

    try {
        const orders = db.prepare(`
            SELECT o.id, o.food_id, o.buyer, o.buyer_location, o.status, o.time_ordered,
                   f.name as food_name, f.image as food_image, f.publisher as publisher
            FROM orders o
            JOIN food_items f ON o.food_id = f.id
            WHERE o.buyer = ?
            ORDER BY o.time_ordered DESC
        `).all(username);

        // Compute total filled stomachs count
        const stats = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'accepted'").get();
        const filled_stomachs_count = stats ? stats.count : 0;

        res.setHeader("X-Filled-Stomachs-Count", filled_stomachs_count.toString());

        if (req.query.format === "object") {
            return res.status(200).json({
                orders,
                filled_stomachs_count
            });
        }

        return res.status(200).json(orders);
    } catch (err) {
        console.error("[orders][!] failed to fetch my orders:", err.message);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

/**
 * GET /orders/stats
 * Returns overall statistics for orders.
 */
app.get("/orders/stats", (req, res) => {
    try {
        const stats = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'accepted'").get();
        const filled_stomachs_count = stats ? stats.count : 0;
        res.status(200).json({ filled_stomachs_count });
    } catch (err) {
        console.error("[orders][!] failed to fetch stats:", err.message);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

/**
 * GET /messages/my
 * Returns messages involving the user (as sender or recipient).
 */
app.get("/messages/my", middleware, (req, res) => {
    const username = req.user.name;

    try {
        const messages = db.prepare(`
            SELECT m.id, m.order_id, m.sender, m.recipient, m.content, m.status, m.type, m.time_sent,
                   f.name as food_name, f.image as food_image
            FROM messages m
            LEFT JOIN orders o ON m.order_id = o.id
            LEFT JOIN food_items f ON o.food_id = f.id
            WHERE m.recipient = ? OR m.sender = ?
            ORDER BY m.time_sent DESC
        `).all(username, username);

        res.status(200).json(messages);
    } catch (err) {
        console.error("[messages][!] failed to fetch my messages:", err.message);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

/**
 * GET /food/get?id=<integer>
 * Returns the food item with the given id.
 */
app.get("/food/get", (req, res) => {
    const id = parseInt(req.query.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: "Query param 'id' must be an integer" });
    }

    const item = db
        .prepare("SELECT * FROM food_items WHERE id = ?")
        .get(id);

    if (!item) {
        return res.status(404).json({ error: "Food item not found" });
    }

    res.status(200).json(item);
});

/**
 * GET /food/available
 * Returns all food items where time_posted + shelf_life > now (Unix seconds).
 */
app.get("/food/available", (req, res) => {
    const now = Math.floor(Date.now() / 1000);

    const items = db
        .prepare("SELECT * FROM food_items WHERE (time_posted + shelf_life) > ?")
        .all(now);

    res.status(200).json(items);
});

// ── 5. Start ──────────────────────────────────────────────────────────────
app.listen(3000, () => {
    console.log("[server] Flim.ai listening on http://localhost:3000");
});