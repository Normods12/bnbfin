const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_PW = 'BnBAdmin@2024#Secure'; // Hardcoded simple password

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const FAQS_FILE = path.join(DATA_DIR, 'faqs.json');
const PDFS_FILE = path.join(DATA_DIR, 'pdfs.json');
const COMPLAINTS_FILE = path.join(DATA_DIR, 'complaints.json');

// Helper to read JSON safely
function readJsonFile(file) {
    try {
        if (!fs.existsSync(file)) return null;
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error(`Error reading ${file}:`, e);
        return null;
    }
}

// Helper to write JSON safely
function writeJsonFile(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error(`Error writing ${file}:`, e);
        return false;
    }
}

// Auth Middleware
function requireAdmin(req, res, next) {
    const pwd = req.headers['x-admin-password'];
    if (pwd === ADMIN_PW) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Incorrect password.' });
    }
}

// --- FILE UPLOAD (MULTER) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public', 'uploads'));
    },
    filename: function (req, file, cb) {
        // Create unique filename to avoid overwrites
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
    const pwd = req.headers['x-admin-password'] || req.body['x-admin-password'];
    if (pwd !== ADMIN_PW) return res.status(401).json({ error: 'Unauthorized.' });
    
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    
    // Return the URL relative to the public directory
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});


// === GET ROUTES ===

app.get('/api/faqs', (req, res) => {
    res.json(readJsonFile(FAQS_FILE) || []);
});

app.get('/api/pdfs', (req, res) => {
    res.json(readJsonFile(PDFS_FILE) || []);
});

app.get('/api/complaints', (req, res) => {
    res.json(readJsonFile(COMPLAINTS_FILE) || {});
});


// === POST ROUTES (Protected) ===

app.post('/api/faqs', requireAdmin, (req, res) => {
    const success = writeJsonFile(FAQS_FILE, req.body);
    if (success) res.json({ success: true });
    else res.status(500).json({ error: 'Failed to save FAQs' });
});

app.post('/api/pdfs', requireAdmin, (req, res) => {
    const success = writeJsonFile(PDFS_FILE, req.body);
    if (success) res.json({ success: true });
    else res.status(500).json({ error: 'Failed to save PDFs' });
});

app.post('/api/complaints', requireAdmin, (req, res) => {
    const success = writeJsonFile(COMPLAINTS_FILE, req.body);
    if (success) res.json({ success: true });
    else res.status(500).json({ error: 'Failed to save Complaints' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
