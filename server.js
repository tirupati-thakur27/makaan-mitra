const express = require('express');
const initSqlJs = require('sql.js');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = './makaan_mitra.db';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let db;

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        fs.writeFileSync(DB_FILE, Buffer.from(data));
    }
}

function queryAll(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

function queryGet(sql, params = []) {
    const rows = queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

function runSql(sql, params = []) {
    db.run(sql, params);
    const res = db.exec("SELECT last_insert_rowid() AS id");
    const lastID = res[0] ? res[0].values[0][0] : 0;
    saveDatabase();
    return lastID;
}

async function startServer() {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_FILE)) {
        const fileBuffer = fs.readFileSync(DB_FILE);
        db = new SQL.Database(fileBuffer);
        console.log('✅ Loaded existing Makaan Mitra SQLite Database.');
    } else {
        db = new SQL.Database();
        console.log('✅ Created fresh Makaan Mitra SQLite Database.');
    }

    // 1. Users Table (Authentication Framework)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'student'
    )`);

    // 2. Properties Table (Detailed Specs, Amenities, Coordinates)
    db.run(`CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        area TEXT NOT NULL,
        landmark TEXT NOT NULL,
        rent INTEGER NOT NULL,
        deposit INTEGER DEFAULT 15000,
        property_type TEXT DEFAULT 'PG / Shared Flat',
        furnishing TEXT DEFAULT 'Fully Furnished',
        sharing_capacity TEXT DEFAULT 'Double Sharing',
        curfew_policy TEXT DEFAULT 'No Curfew (24x7 Access)',
        amenities TEXT DEFAULT 'High-Speed WiFi,AC,Washing Machine,RO Water,Power Backup',
        description TEXT,
        owner_name TEXT NOT NULL,
        owner_phone TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        img TEXT,
        panorama_img TEXT,
        flagged_count INTEGER DEFAULT 0
    )`);

    // 3. Vibe Check Reviews Table
    db.run(`CREATE TABLE IF NOT EXISTS vibe_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER NOT NULL,
        reviewer_name TEXT NOT NULL,
        rating REAL NOT NULL,
        society_behavior TEXT,
        landlord_interference TEXT,
        comment TEXT
    )`);

    // 4. Roommate Matching Table
    db.run(`CREATE TABLE IF NOT EXISTS roommates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER,
        college_or_work TEXT,
        preferred_area TEXT,
        budget INTEGER,
        habits TEXT,
        contact_masked TEXT
    )`);

    // Seed Initial Mumbai Data if Empty
    const countRow = queryGet("SELECT COUNT(*) AS count FROM properties");
    if (countRow && countRow.count === 0) {
        runSql(`INSERT OR IGNORE INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
            ["Tirupati Thakur", "tirupati@makaanmitra.in", hashPassword("123456"), "student"]);

        const props = [
            ["Sai Krupa Premium Student PG", "Kandivali East", "Near Thakur College, Thakur Village, Kandivali East", 8500, 15000, "PG (Double Sharing)", "Fully Furnished", "2 Beds / Room", "No Curfew (Biometric Entry)", "300 Mbps WiFi,Split AC,Washing Machine,RO Purifier,Housekeeping,Study Desk", "Spacious cross-ventilated room 3 mins walking from Thakur College. Zero landlord interference and dedicated study tables.", "Ramesh Sharma", "+91 98201 44510", 19.2065, 72.8742, "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1400&q=80"],
            ["Metro View 1BHK Bachelor Flat", "Kandivali East", "Samta Nagar, Near WEH Metro, Kandivali East", 12000, 30000, "1BHK Shared", "Semi-Furnished", "3 Bachelors Max", "No Curfew (24x7 Access)", "High-Speed WiFi,Modular Kitchen,Fridge,Geyser,24x7 Water,CCTV Security", "Ideal for working professionals and final-year students commuting via Western Express Highway Metro or Kandivali Station.", "Suresh Nair", "+91 98192 77821", 19.2028, 72.8685, "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1400&q=80"],
            ["VJTI Scholars Co-Living Hub", "Matunga", "Five Gardens, Matunga East", 7000, 14000, "Student Hostel", "Fully Furnished", "Triple Sharing", "11:30 PM Gate", "Fiber WiFi,Reading Room,Washing Machine,RO Water,Power Backup,2-Wheeler Parking", "Designed exclusively for engineering and MCA students near VJTI & ICT Mumbai with night-study lounge.", "Prakash Joshi", "+91 98673 11290", 19.0222, 72.8561, "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=80"],
            ["Skyline Independent 1RK Studio", "Borivali West", "IC Colony, Near Link Road, Borivali West", 15000, 40000, "1RK Studio", "Fully Furnished", "Single / Double Occupancy", "No Curfew (24x7 Access)", "Split AC,WiFi,Smart TV,Refrigerator,Private Balcony,Gym Access", "Private modern studio apartment with zero owner interference near Link Road.", "Anil Deshmukh", "+91 98334 99012", 19.2468, 72.8482, "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80"]
        ];
        props.forEach(p => runSql(`INSERT INTO properties (title, area, landmark, rent, deposit, property_type, furnishing, sharing_capacity, curfew_policy, amenities, description, owner_name, owner_phone, lat, lng, img, panorama_img) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, p));

        runSql(`INSERT INTO vibe_reviews (property_id, reviewer_name, rating, society_behavior, landlord_interference, comment) VALUES (?, ?, ?, ?, ?, ?)`, [1, "Aarav (TYCS Student)", 4.8, "Very Friendly", "Zero Interference", "Best PG near Thakur College. WiFi is fast and no curfew issues."]);
        runSql(`INSERT INTO vibe_reviews (property_id, reviewer_name, rating, society_behavior, landlord_interference, comment) VALUES (?, ?, ?, ?, ?, ?)`, [2, "Rohan (IT Engineer)", 4.6, "Chill & Peaceful", "Low", "Walking distance from Western Express Highway metro station."]);
        runSql(`INSERT INTO vibe_reviews (property_id, reviewer_name, rating, society_behavior, landlord_interference, comment) VALUES (?, ?, ?, ?, ?, ?)`, [3, "Siddharth (MCA)", 4.9, "Student Hub", "Zero Interference", "Super safe area near Matunga station and VJTI."]);

        runSql(`INSERT INTO roommates (name, age, college_or_work, preferred_area, budget, habits, contact_masked) VALUES (?, ?, ?, ?, ?, ?, ?)`, ["Karan Verma", 21, "B.Sc. CS Student", "Kandivali East", 8000, "Non-smoker, Night Owl, Clean", "Verified Chat Only"]);
        runSql(`INSERT INTO roommates (name, age, college_or_work, preferred_area, budget, habits, contact_masked) VALUES (?, ?, ?, ?, ?, ?, ?)`, ["Aditya Kulkarni", 23, "Software Developer", "Andheri East", 12000, "Early Riser, Gym, Veg", "Verified Chat Only"]);
        console.log("🌱 Initial Mumbai data seeded.");
    }

    app.listen(PORT, () => {
        console.log(`🚀 Makaan Mitra Server running at http://localhost:${PORT}`);
    });
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ==================== API ROUTES ====================
app.post('/api/register', (req, res) => {
    const { full_name, email, password, role } = req.body;
    try {
        const id = runSql(`INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
            [full_name, email.toLowerCase(), hashPassword(password), role || 'student']);
        res.status(201).json({ id, full_name, email, role: role || 'student' });
    } catch (e) {
        res.status(400).json({ error: "Email already registered!" });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = queryGet(`SELECT id, full_name, email, role FROM users WHERE email = ? AND password_hash = ?`,
        [email.toLowerCase(), hashPassword(password)]);
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    res.json(user);
});

app.get('/api/properties', (req, res) => {
    const { area, maxBudget, lat, lng, radius } = req.query;
    let results = queryAll(`
        SELECT p.*, IFNULL(ROUND(AVG(v.rating), 1), 4.6) AS avg_vibe
        FROM properties p
        LEFT JOIN vibe_reviews v ON p.id = v.property_id
        GROUP BY p.id
    `);
    if (area && area !== 'all') results = results.filter(p => p.area.toLowerCase() === area.toLowerCase());
    if (maxBudget) results = results.filter(p => p.rent <= parseInt(maxBudget));
    if (lat && lng) {
        const pinLat = parseFloat(lat), pinLng = parseFloat(lng), maxKm = parseFloat(radius) || 1.0;
        results = results
            .map(p => ({ ...p, distance: getDistanceKm(pinLat, pinLng, p.lat, p.lng) }))
            .filter(p => p.distance <= maxKm)
            .sort((a, b) => a.distance - b.distance);
    }
    res.json(results);
});

app.get('/api/properties/:id', (req, res) => {
    const property = queryGet("SELECT * FROM properties WHERE id = ?", [req.params.id]);
    if (!property) return res.status(404).json({ error: "Property not found" });
    const reviews = queryAll("SELECT * FROM vibe_reviews WHERE property_id = ? ORDER BY id DESC", [req.params.id]);
    res.json({ property, reviews });
});

app.post('/api/properties', (req, res) => {
    const { title, area, landmark, rent, deposit, property_type, furnishing, sharing_capacity, curfew_policy, amenities, description, owner_name, owner_phone, lat, lng, img } = req.body;
    const defaultImg = img || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80";
    const id = runSql(`INSERT INTO properties (title, area, landmark, rent, deposit, property_type, furnishing, sharing_capacity, curfew_policy, amenities, description, owner_name, owner_phone, lat, lng, img, panorama_img) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        title, area, landmark, rent, deposit || 15000, property_type, furnishing || 'Fully Furnished',
        sharing_capacity || 'Double Sharing', curfew_policy || 'No Curfew (24x7 Access)',
        amenities || 'WiFi,RO Water,Power Backup', description || 'Verified zero-brokerage bachelor accommodation.',
        owner_name, owner_phone, lat || 19.2055, lng || 72.8715, defaultImg, defaultImg
    ]);
    res.status(201).json({ message: "Property listed!", id });
});

app.post('/api/properties/:id/flag', (req, res) => {
    runSql("UPDATE properties SET flagged_count = flagged_count + 1 WHERE id = ?", [req.params.id]);
    res.json({ message: "Flagged" });
});

app.post('/api/vibe-reviews', (req, res) => {
    const { property_id, reviewer_name, rating, society_behavior, landlord_interference, comment } = req.body;
    const id = runSql(`INSERT INTO vibe_reviews (property_id, reviewer_name, rating, society_behavior, landlord_interference, comment) VALUES (?, ?, ?, ?, ?, ?)`,
        [property_id, reviewer_name || "Anonymous Tenant", rating, society_behavior, landlord_interference, comment]);
    res.status(201).json({ id });
});

app.get('/api/roommates', (req, res) => {
    res.json(queryAll("SELECT * FROM roommates ORDER BY id DESC"));
});

app.post('/api/roommates', (req, res) => {
    const { name, age, college_or_work, preferred_area, budget, habits } = req.body;
    const id = runSql(`INSERT INTO roommates (name, age, college_or_work, preferred_area, budget, habits, contact_masked) VALUES (?, ?, ?, ?, ?, ?, 'Privacy Shield Active')`,
        [name, age, college_or_work, preferred_area, budget, habits]);
    res.status(201).json({ id });
});

app.delete('/api/properties/:id', (req, res) => {
    runSql("DELETE FROM properties WHERE id = ?", [req.params.id]);
    res.json({ message: "Deleted" });
});

startServer();