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


// === POST ROUTES (Public / Protected) ===

// Helper to escape HTML characters
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Contact Form Handler with Resend
app.options('/api/contact', cors());
app.post('/api/contact', cors(), async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    try {
        const { name, email, phone, service, message } = req.body || {};

        if (!name || !email || !phone) {
            return res.status(400).json({ error: 'Name, email, and phone number are required.' });
        }

        const apiKey = process.env.RESEND_API_KEY || 're_Z2KECLNy_B7wtdA8fayr33vskTfzrhnfY';
        const toEmail = process.env.FORWARD_EMAIL || 'info@bnbfin.com';
        const fromEmail = process.env.RESEND_FROM || 'BnB Financial Services <contact@bnbfin.com>';

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e6ef; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #0A1F44; color: #ffffff; padding: 24px; text-align: center;">
                    <h2 style="margin: 0; color: #E8CC7A; font-size: 20px;">New Contact Form Submission</h2>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #E2E6EF;">bnbfin.com · Get In Touch</p>
                </div>
                <div style="padding: 24px; color: #1A202C;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr style="border-bottom: 1px solid #F1F3F8;">
                            <td style="padding: 10px 0; font-weight: bold; width: 140px; color: #4A5568;">Full Name:</td>
                            <td style="padding: 10px 0; color: #0A1F44; font-weight: 600;">${escapeHtml(name)}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #F1F3F8;">
                            <td style="padding: 10px 0; font-weight: bold; color: #4A5568;">Email Address:</td>
                            <td style="padding: 10px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #1C3A7A; text-decoration: none; font-weight: 600;">${escapeHtml(email)}</a></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #F1F3F8;">
                            <td style="padding: 10px 0; font-weight: bold; color: #4A5568;">Phone Number:</td>
                            <td style="padding: 10px 0;"><a href="tel:${escapeHtml(phone)}" style="color: #1C3A7A; text-decoration: none; font-weight: 600;">${escapeHtml(phone)}</a></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #F1F3F8;">
                            <td style="padding: 10px 0; font-weight: bold; color: #4A5568;">Interested In:</td>
                            <td style="padding: 10px 0; color: #0A1F44;">${escapeHtml(service || 'General Enquiry')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-weight: bold; color: #4A5568; vertical-align: top;">Message:</td>
                            <td style="padding: 10px 0; color: #2D3748; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(message || 'N/A')}</td>
                        </tr>
                    </table>
                </div>
                <div style="background-color: #F8F9FC; padding: 14px 20px; font-size: 12px; color: #718096; text-align: center; border-top: 1px solid #E2E6EF;">
                    This message was sent via the Get in Touch form on <strong>bnbfin.com</strong> and forwarded to <strong>${escapeHtml(toEmail)}</strong>.
                </div>
            </div>
        `;

        const resendPayload = {
            from: fromEmail,
            to: [toEmail],
            reply_to: email,
            subject: `[Contact Form] ${name} - ${service || 'General Enquiry'}`,
            html: htmlContent
        };

        const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resendPayload)
        });

        const resData = await resendRes.json();

        if (!resendRes.ok) {
            console.error('Resend API Error:', resData);
            return res.status(500).json({ error: resData.message || 'Failed to send message via Resend.' });
        }

        return res.json({ success: true, message: 'Your message has been sent successfully.', id: resData.id });
    } catch (err) {
        console.error('Server error processing contact form:', err);
        return res.status(500).json({ error: 'Internal server error processing contact submission.' });
    }
});

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

