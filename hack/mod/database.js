/**
 * mod/database.js
 * Shared SQLite database instance + schema initialisation.
 * Call `initDB()` once at server startup.
 */

import Database from "better-sqlite3";

export const db = new Database("food_store.db");

export function initDB() {
    // 1. Create base tables if they don't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            name     TEXT    NOT NULL UNIQUE,
            password TEXT    NOT NULL
        );

        CREATE TABLE IF NOT EXISTS food_items (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            time_posted INTEGER NOT NULL,
            publisher   TEXT    NOT NULL,
            image       TEXT    NOT NULL,
            shelf_life  INTEGER NOT NULL DEFAULT 86400
        );
    `);

    // Helper to add a column to a table if it doesn't already exist
    const addColumnIfMissing = (table, column, definition) => {
        try {
            const info = db.prepare(`PRAGMA table_info(${table})`).all();
            const exists = info.some(col => col.name === column);
            if (!exists) {
                db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                console.log(`[db] Added column '${column}' to table '${table}'`);
            }
        } catch (err) {
            console.error(`[db] Failed to add column '${column}' to table '${table}':`, err.message);
        }
    };

    // Add optional email column to users
    addColumnIfMissing("users", "email", "TEXT");

    // Add columns to food_items for tracking publisher location, buyer, and buyer location
    addColumnIfMissing("food_items", "from_location", "TEXT DEFAULT 'none'");
    addColumnIfMissing("food_items", "buyer", "TEXT DEFAULT 'none'");
    addColumnIfMissing("food_items", "buyer_location", "TEXT DEFAULT 'none'");

    // 2. Create orders and messages tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            food_id        INTEGER NOT NULL,
            buyer          TEXT    NOT NULL,
            buyer_location TEXT    NOT NULL,
            status         TEXT    NOT NULL DEFAULT 'pending',
            time_ordered   INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id     INTEGER,
            sender       TEXT    NOT NULL,
            recipient    TEXT    NOT NULL,
            content      TEXT    NOT NULL,
            status       TEXT    NOT NULL DEFAULT 'unread',
            type         TEXT    NOT NULL DEFAULT 'text',
            time_sent    INTEGER NOT NULL
        );
    `);
    console.log("[db] Database initialization completed.");
}

// Initialize database schema immediately on import
initDB();

