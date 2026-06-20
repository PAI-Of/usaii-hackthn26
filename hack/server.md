### **Server Documentation: Flim.ai (Core Protocol v1.0)**

---

#### **1. Authentication Routes**

* **`POST /auth/cookie`**
* **Request Body:** `{ "name": "string", "password": "string" }`
* **Logic:**
1. Query database for user `name`.
2. Perform `bcrypt.compare` (or equivalent) between stored hash and provided password.
3. If valid, issue `JWT` and set `httpOnly` cookie `authentication-token`.


* **Response:** `200 OK` (cookie set) or `401 Unauthorized`.


* **`DELETE /auth/logout`**
* **Logic:**
1. Access `authentication-token` cookie.
2. Clear cookie from client via `res.clearCookie`.


* **Response:** `200 OK`.



---

#### **2. Food Management Routes**

* **`POST /food/snap`** (Previously `/food/type`)
* **Request:** `multipart/form-data` containing `file` (key: `food`) and metadata (e.g., `foodName`).
* **Logic:**
1. **Middleware:** Validate user identity.
2. **Storage:** Save file to `/uploads/` using `multer` with unique suffix.
3. **AI Layer:** Run classification (e.g., GeminVision API) to determine `name` and safety status.
4. **Persistence:** Insert record into `food_items` table:
```sql
INSERT INTO food_items (name, time_posted, publisher, image) 
VALUES (@name, @time_posted, @publisher, @image);

```




* **Response:** `200 OK` with generated `id`.


* **`GET /food/get?id=...`**
* **Logic:**
1. Query `food_items` where `id = ?`.
2. Verify existence and current availability status.


* **Response:** `200 OK` with JSON object of the food item.


* **`GET /food/available`**
* **Logic:**
1. Query `food_items` table.
2. Filter: `time_posted + shelfLife > current_time`.
3. Return list of active records (the "Collection of Food").


* **Response:** `200 OK` with `Array<food_item>`.



---

#### **Data Schema: `food_items**`

| Field | Type | Description |
| --- | --- | --- |
| `id` | `INTEGER` | Primary Key, Auto-increment. |
| `name` | `TEXT` | Categorized food name (e.g., "Biryani"). |
| `time_posted` | `INTEGER` | Unix timestamp of creation. |
| `publisher` | `TEXT` | Username (or ID) of the owner. |
| `image` | `TEXT` | Filename of the stored image. |

---

### **System Architecture Overview**

To ensure you understand the flow of data between your frontend, the logic engine, and your storage layers, refer to the following workflow:

---

### **Final Developer Notes**

* **AI Integration:** Keep the AI processing asynchronous if possible to prevent blocking the `POST` request.
* **Storage Strategy:** Your `uploads/` folder is essentially a local object store. Ensure you have a routine to prune expired images to save disk space.
* **Security:** Always sanitize the `name` and `publisher` fields before pushing them into your SQLite query string.