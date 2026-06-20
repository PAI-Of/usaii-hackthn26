import { spawn } from "child_process";
import axios from "axios";
import { beforeAll, afterAll, test, expect, describe } from "vitest";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import argon2 from "argon2";

const BASE_URL = "http://localhost:3000";
let serverProcess;

describe("Flim.ai API Integration Tests", () => {
    beforeAll(async () => {
        // Clean up database and seed user
        const db = new Database("food_store.db");
        db.exec("DELETE FROM users; DELETE FROM food_items;");
        const hash = await argon2.hash("hunter2");
        db.prepare("INSERT INTO users (name, password) VALUES (?, ?)").run("alice", hash);
        db.close();

        // Start server in background
        serverProcess = spawn("node", ["server.js"], {
            env: { ...process.env, NODE_ENV: "test", PORT: "3000" }
        });

        // Wait a moment for server to start
        await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    afterAll(() => {
        if (serverProcess) {
            serverProcess.kill();
        }
    });

    let cookieHeader = "";

    test("POST /auth/cookie - Missing credentials", async () => {
        try {
            await axios.post(`${BASE_URL}/auth/cookie`, { name: "alice" });
            throw new Error("Expected request to fail with 400");
        } catch (err) {
            expect(err.response.status).toBe(400);
            expect(err.response.data.error).toBe("name and password are required");
        }
    });

    test("POST /auth/cookie - Invalid credentials", async () => {
        try {
            await axios.post(`${BASE_URL}/auth/cookie`, { name: "alice", password: "wrong_password" });
            throw new Error("Expected request to fail with 401");
        } catch (err) {
            expect(err.response.status).toBe(401);
            expect(err.response.data.error).toBe("Invalid credentials");
        }
    });

    test("POST /auth/cookie - Successful login", async () => {
        const res = await axios.post(`${BASE_URL}/auth/cookie`, { name: "alice", password: "hunter2" });
        expect(res.status).toBe(200);
        expect(res.data.message).toBe("Logged in successfully");
        
        const setCookie = res.headers["set-cookie"];
        expect(setCookie).toBeDefined();
        cookieHeader = setCookie[0].split(";")[0];
        expect(cookieHeader).toContain("authentication-token=");
    });

    test("GET /valid - Without cookie (403)", async () => {
        try {
            await axios.get(`${BASE_URL}/valid`);
            throw new Error("Expected request to fail with 403");
        } catch (err) {
            expect(err.response.status).toBe(403);
            expect(err.response.data.error).toBe("No token provided");
        }
    });

    test("GET /valid - With invalid cookie (401)", async () => {
        try {
            await axios.get(`${BASE_URL}/valid`, {
                headers: { Cookie: "authentication-token=invalidtoken123" }
            });
            throw new Error("Expected request to fail with 401");
        } catch (err) {
            expect(err.response.status).toBe(401);
            expect(err.response.data.error).toBe("Invalid or expired token");
        }
    });

    test("GET /valid - With valid cookie (200)", async () => {
        const res = await axios.get(`${BASE_URL}/valid`, {
            headers: { Cookie: cookieHeader }
        });
        expect(res.status).toBe(200);
        expect(res.data.user).toBe("alice");
    });

    let uploadedFoodId = null;

    test("POST /food/snap - Unauthorized (403)", async () => {
        try {
            const formData = new FormData();
            const fileBlob = new Blob(["mock content"], { type: "image/jpeg" });
            formData.append("food", fileBlob, "dummy.jpg");

            await axios.post(`${BASE_URL}/food/snap`, formData);
            throw new Error("Expected snap to fail with 403");
        } catch (err) {
            expect(err.response.status).toBe(403);
        }
    });

    test("POST /food/snap - Missing file (400)", async () => {
        try {
            const formData = new FormData(); // empty
            await axios.post(`${BASE_URL}/food/snap`, formData, {
                headers: { Cookie: cookieHeader }
            });
            throw new Error("Expected snap to fail with 400");
        } catch (err) {
            expect(err.response.status).toBe(400);
            expect(err.response.data.error).toBe("No file uploaded. Use field name 'food'.");
        }
    });

    test("POST /food/snap - Successful classification and save", async () => {
        const formData = new FormData();
        const fileBlob = new Blob(["mock image data"], { type: "image/jpeg" });
        formData.append("food", fileBlob, "pizza.jpg");

        const res = await axios.post(`${BASE_URL}/food/snap`, formData, {
            headers: { Cookie: cookieHeader }
        });

        expect(res.status).toBe(200);
        expect(res.data.id).toBeDefined();
        expect(res.data.name).toBe("Pizza"); // mocked in test mode
        uploadedFoodId = res.data.id;
    });

    test("GET /food/get - Invalid id query parameter (400)", async () => {
        try {
            await axios.get(`${BASE_URL}/food/get?id=abc`);
            throw new Error("Expected get to fail with 400");
        } catch (err) {
            expect(err.response.status).toBe(400);
            expect(err.response.data.error).toBe("Query param 'id' must be an integer");
        }
    });

    test("GET /food/get - Non-existent id (404)", async () => {
        try {
            await axios.get(`${BASE_URL}/food/get?id=99999`);
            throw new Error("Expected get to fail with 404");
        } catch (err) {
            expect(err.response.status).toBe(404);
            expect(err.response.data.error).toBe("Food item not found");
        }
    });

    test("GET /food/get - Success", async () => {
        const res = await axios.get(`${BASE_URL}/food/get?id=${uploadedFoodId}`);
        expect(res.status).toBe(200);
        expect(res.data.id).toBe(uploadedFoodId);
        expect(res.data.name).toBe("Pizza");
        expect(res.data.publisher).toBe("alice");
        expect(res.data.shelf_life).toBe(86400);
        expect(res.data.image).toContain("food-");
    });

    test("GET /food/available - Success", async () => {
        const res = await axios.get(`${BASE_URL}/food/available`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data)).toBe(true);
        const pizzaItem = res.data.find(item => item.id === uploadedFoodId);
        expect(pizzaItem).toBeDefined();
        expect(pizzaItem.name).toBe("Pizza");
    });

    test("POST /auth/register - Success & Login", async () => {
        const registerData = {
            name: "bob",
            password: "hunter_bob",
            email: "bob@flim.ai"
        };
        const res = await axios.post(`${BASE_URL}/auth/register`, registerData);
        expect(res.status).toBe(201);
        expect(res.data.name).toBe("bob");
        
        const setCookie = res.headers["set-cookie"];
        expect(setCookie).toBeDefined();
        const bobCookie = setCookie[0].split(";")[0];
        expect(bobCookie).toContain("authentication-token=");

        // Verify validity of the new cookie
        const validRes = await axios.get(`${BASE_URL}/valid`, {
            headers: { Cookie: bobCookie }
        });
        expect(validRes.status).toBe(200);
        expect(validRes.data.user).toBe("bob");
    });

    test("POST /food/snap - Location support", async () => {
        const formData = new FormData();
        const fileBlob = new Blob(["mock food"], { type: "image/png" });
        formData.append("food", fileBlob, "apple.png");
        formData.append("location", JSON.stringify({ latitude: 12.9716, longitude: 77.5946 }));

        const res = await axios.post(`${BASE_URL}/food/snap`, formData, {
            headers: { Cookie: cookieHeader } // Upload as alice
        });

        expect(res.status).toBe(200);
        expect(res.data.id).toBeDefined();
        expect(res.data.name).toBe("Pizza"); // mocked in test mode

        // Retrieve food and check location
        const getRes = await axios.get(`${BASE_URL}/food/get?id=${res.data.id}`);
        expect(getRes.status).toBe(200);
        expect(getRes.data.from_location).toContain("12.9716");
    });

    test("GET /food/asset/:url - Success", async () => {
        // Find a filename of an existing food
        const availRes = await axios.get(`${BASE_URL}/food/available`);
        const item = availRes.data[0];
        expect(item).toBeDefined();
        
        const assetRes = await axios.get(`${BASE_URL}/food/asset/${item.image}`);
        expect(assetRes.status).toBe(200);
    });

    test("Order and Message Flow (create, respond, my, messages)", async () => {
        // Log in Bob (buyer)
        const bobLoginRes = await axios.post(`${BASE_URL}/auth/cookie`, { name: "bob", password: "hunter_bob" });
        const bobCookie = bobLoginRes.headers["set-cookie"][0].split(";")[0];

        // Fetch available food (which Alice published)
        const availRes = await axios.get(`${BASE_URL}/food/available`);
        const aliceFood = availRes.data.find(item => item.publisher === "alice");
        expect(aliceFood).toBeDefined();

        // Bob creates an order for Alice's food
        let orderRes;
        try {
            orderRes = await axios.post(`${BASE_URL}/order/create`, {
                food_id: aliceFood.id,
                location: { latitude: 12.9, longitude: 77.6 }
            }, {
                headers: { Cookie: bobCookie }
            });
        } catch (err) {
            console.error("Order creation failed with response:", err.response ? err.response.data : err.message);
            throw err;
        }

        expect(orderRes.status).toBe(201);
        expect(orderRes.data.order_id).toBeDefined();
        expect(orderRes.data.status).toBe("pending");
        const orderId = orderRes.data.order_id;

        // Verify food item has updated buyer/buyer_location
        const foodRes = await axios.get(`${BASE_URL}/food/get?id=${aliceFood.id}`);
        expect(foodRes.data.buyer).toBe("bob");
        expect(foodRes.data.buyer_location).toContain("12.9");

        // Alice fetches messages, should see Bob's request
        const aliceMsgRes = await axios.get(`${BASE_URL}/messages/my`, {
            headers: { Cookie: cookieHeader } // alice
        });
        const orderReqMsg = aliceMsgRes.data.find(m => m.order_id === orderId && m.type === "order_request");
        expect(orderReqMsg).toBeDefined();
        expect(orderReqMsg.content).toBe(`Is ${aliceFood.name} available?`);

        // Alice responds "Yes" to Bob's order
        const respondRes = await axios.post(`${BASE_URL}/order/respond`, {
            order_id: orderId,
            response: "yes"
        }, {
            headers: { Cookie: cookieHeader } // alice
        });
        expect(respondRes.status).toBe(200);
        expect(respondRes.data.status).toBe("accepted");

        // Bob fetches his orders, should see the accepted order
        const bobOrdersRes = await axios.get(`${BASE_URL}/orders/my`, {
            headers: { Cookie: bobCookie }
        });
        const bobOrder = bobOrdersRes.data.find(o => o.id === orderId);
        expect(bobOrder).toBeDefined();
        expect(bobOrder.status).toBe("accepted");
        expect(bobOrder.food_name).toBe(aliceFood.name);

        // Fetch overall stats
        const statsRes = await axios.get(`${BASE_URL}/orders/stats`);
        expect(statsRes.status).toBe(200);
        expect(statsRes.data.filled_stomachs_count).toBeGreaterThan(0);
    });

    test("POST /food/snap - Reject invalid food (chair/moldy)", async () => {
        const formData = new FormData();
        const fileBlob = new Blob(["mock chair image"], { type: "image/jpeg" });
        formData.append("food", fileBlob, "chair.jpg");

        try {
            await axios.post(`${BASE_URL}/food/snap`, formData, {
                headers: { Cookie: cookieHeader }
            });
            throw new Error("Expected snap to fail for invalid food");
        } catch (err) {
            expect(err.response.status).toBe(400);
            expect(err.response.data.error).toContain("Food upload rejected");
        }
    });

    test("POST /order/create - Reject ordering expired food", async () => {
        // Log in Bob
        const bobLoginRes = await axios.post(`${BASE_URL}/auth/cookie`, { name: "bob", password: "hunter_bob" });
        const bobCookie = bobLoginRes.headers["set-cookie"][0].split(";")[0];

        // Seed an expired food item directly in the database
        const db = new Database("food_store.db");
        const insertStmt = db.prepare(`
            INSERT INTO food_items (name, time_posted, publisher, image, shelf_life, from_location)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const expiredTime = Math.floor(Date.now() / 1000) - 100000; // time_posted in the past
        const runRes = insertStmt.run("Old Pizza", expiredTime, "alice", "old-pizza.jpg", 3600, "none");
        const expiredFoodId = runRes.lastInsertRowid;
        db.close();

        // Bob tries to order the expired food
        try {
            await axios.post(`${BASE_URL}/order/create`, {
                food_id: expiredFoodId,
                location: "Bob's House"
            }, {
                headers: { Cookie: bobCookie }
            });
            throw new Error("Expected order creation to fail for expired food");
        } catch (err) {
            expect(err.response.status).toBe(400);
            expect(err.response.data.error).toContain("expired");
        }
    });

    test("DELETE /auth/logout - Success", async () => {
        const res = await axios.delete(`${BASE_URL}/auth/logout`);
        expect(res.status).toBe(200);
        expect(res.data.message).toBe("Logged out successfully");
    });
});
