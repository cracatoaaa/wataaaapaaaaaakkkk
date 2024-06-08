const express = require('express');
const axios = require('axios');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi koneksi database
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// Koneksi ke database
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});

// Buat middleware untuk membuat koneksi database tersedia di req
app.use((req, res, next) => {
    req.db = db;
    next();
});

const TELEGRAM_BOT_TOKEN = '7240533750:AAEEV3EXxLtsGX-A2T0-0JEyxptAa-O66fo';
const TELEGRAM_CHAT_ID = '-4197535723';

let users = [
    { id: 1, username: 'admin', password: 'admin', role: 'admin' },
    { id: 2, username: 'user', password: 'user', role: 'user' }
];

let urls = [
    { url: 'https://example.com', description: 'Example Domain', status: 'Checking', lastChecked: 'Never', notified: false }
];

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ success: true, user });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.get('/api/urls', (req, res) => {
    res.json(urls);
});

app.post('/api/urls', (req, res) => {
    const newUrl = req.body;
    newUrl.status = 'Checking';
    newUrl.lastChecked = 'Never';
    newUrl.notified = false;
    urls.push(newUrl);
    checkUrl(newUrl);
    res.json(urls);
});

app.put('/api/urls/:index', (req, res) => {
    const index = req.params.index;
    urls[index] = { ...urls[index], ...req.body, status: 'Checking', lastChecked: 'Never', notified: false };
    checkUrl(urls[index]);
    res.json(urls);
});

app.delete('/api/urls/:index', (req, res) => {
    const index = req.params.index;
    urls.splice(index, 1);
    res.json(urls);
});

app.post('/api/check-domains', async (req, res) => {
    const { domains } = req.body;
    const results = await Promise.all(domains.map(domain => checkDomain(domain)));
    res.json(results);
});

app.post('/api/users', (req, res) => {
    const { username, password, role } = req.body;
    const newUser = { id: users.length + 1, username, password, role };
    users.push(newUser);
    res.json({ success: true, user: newUser });
});

app.get('/api/users', (req, res) => {
    res.json(users);
});

app.delete('/api/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    users = users.filter(user => user.id !== id);
    res.json({ success: true });
});

app.get('/api/getUserRole', (req, res) => {
    // Placeholder logic for getting user role, typically this would be done via authentication middleware
    res.json({ role: 'admin' }); // Always returns 'admin' for simplicity
});

async function sendTelegramMessage(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}

async function checkDomain(domain) {
    try {
        const response = await axios.get(`https://${domain}`, { maxRedirects: 0 });
        const ip = response.request.socket.remoteAddress;
        return { domain, ip, status: ip === '36.86.63.185' ? 'blocked' : 'allowed' };
    } catch (error) {
        return { domain, status: 'blocked' }; // Treat errors as blocked
    }
}

async function checkUrl(url) {
    if (url.status === 'Blocked') {
        return; // Skip checking if URL is already blocked
    }

    try {
        const response = await axios.get(url.url, { maxRedirects: 0 });
        const ip = response.request.socket.remoteAddress;

        console.log(`Checking URL: ${url.url}, IP: ${ip}`);

        if (ip === '36.86.63.185') {
            url.status = 'Blocked';
            if (!url.notified) {
                sendTelegramMessage(`🚫 URL terblokir: ${url.url}\nDescription: ${url.description}`);
                url.notified = true;
            }
        } else {
            url.status = 'Safe';
            url.notified = false; // Reset notified status if safe
        }
    } catch (error) {
        if (error.response && error.response.status === 301) {
            url.status = 'Redirected (301)';
            if (!url.notified) {
                sendTelegramMessage(`🔄 URL mengarah ke redirect 301: ${url.url}\nRedirect to: ${error.response.headers.location}\nDescription: ${url.description}`);
                url.notified = true;
            }
        } else {
            console.error(`Error checking URL: ${url.url}`, error);
            url.status = 'Blocked';
            if (!url.notified) {
                sendTelegramMessage(`🚫 URL terblokir karena tidak dapat dijangkau: ${url.url}\nDescription: ${url.description}`);
                url.notified = true;
            }
        }
    }
    url.lastChecked = new Date().toLocaleString();
    console.log(`URL checked: ${url.url}, Status: ${url.status}, Last Checked: ${url.lastChecked}`);
}

async function checkUrls() {
    for (const url of urls) {
        await checkUrl(url);
    }
}

setInterval(checkUrls, 120000); // 2 minutes in milliseconds

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    checkUrls(); // Initial URL check when server starts
});
