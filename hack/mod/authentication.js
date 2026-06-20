/**
 * mod/authentication.js
 *
 * Exports:
 *   validate(name, password)  → Promise<boolean>  — argon2 password check
 *   create_token(name)        → string             — signed JWT
 *   middleware                → Express middleware  — JWT cookie guard
 */

import jwt    from "jsonwebtoken";
import argon2 from "argon2";
import { db } from "./database.js";

/**
 * Look up `name` in the users table and verify `password` against the
 * stored argon2 hash.  Returns true on success, false otherwise.
 *
 * @param {string} name
 * @param {string} password
 * @returns {Promise<boolean>}
 */
async function validate(name, password) {
    const user = db
        .prepare("SELECT password FROM users WHERE name = ?")
        .get(name);

    if (!user) return false;

    try {
        return await argon2.verify(user.password, password);
    } catch {
        return false;
    }
}

/**
 * Sign a JWT containing { name }.  Uses JWT_SECRET from env.
 *
 * @param {string} name
 * @returns {string}
 */
function create_token(name) {
    return jwt.sign({ name }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Express middleware — reads the `authentication-token` httpOnly cookie,
 * verifies the JWT, and attaches the decoded payload to `req.user`.
 * Responds 403 if cookie is missing, 401 if the token is invalid.
 */
const middleware = (req, res, next) => {
    const token = req.cookies["authentication-token"];
    if (!token) return res.status(403).json({ error: "No token provided" });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: "Invalid or expired token" });
        req.user = decoded;
        next();
    });
};

export { validate, create_token, middleware };