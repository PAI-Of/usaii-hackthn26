/**
 * seed.js — One-shot user seeding script.
 * Run once:  node seed.js
 *
 * Creates the users table (if absent) and inserts a default user.
 * Edit NAME / PASSWORD below before running.
 */

import argon2   from "argon2";
import Database from "better-sqlite3";

const NAME     = "alice";
const PASSWORD = "hunter2";

const db = new Database("food_store.db");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        name     TEXT    NOT NULL UNIQUE,
        password TEXT    NOT NULL
    );
`);

const hash = await argon2.hash(PASSWORD);

try {
    db.prepare("INSERT INTO users (name, password) VALUES (?, ?)").run(NAME, hash);
    console.log(`[seed] User '${NAME}' created.`);
} catch (err) {
    if (err.message.includes("UNIQUE constraint failed")) {
        console.log(`[seed] User '${NAME}' already exists — skipped.`);
    } else {
        throw err;
    }
}

db.close();
