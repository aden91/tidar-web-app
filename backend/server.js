const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Muat variabel lingkungan
const admin = require('firebase-admin');

// Inisialisasi Firebase Admin SDK
try {
    // PERBAIKAN PENTING DI SINI
    // Membaca seluruh JSON akun layanan dari variabel lingkungan
    const serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJson), // Gunakan objek JSON yang sudah di-parse
        databaseURL: `https://${serviceAccountJson.projectId}.firebaseio.com` // Gunakan projectId dari JSON
    });
    console.log("✅ Firebase Admin SDK berhasil diinisialisasi.");
} catch (error) {
    console.error("❌ Error menginisialisasi Firebase Admin SDK:", error);
    // Tambahkan detail error untuk debugging
    if (error.message.includes("JSON.parse")) {
        console.error("Pastikan nilai FIREBASE_SERVICE_ACCOUNT_JSON adalah JSON yang valid di Render Environment Variables.");
    }
    process.exit(1);
}

// ... (sisa kode server.js Anda tidak berubah) ...

const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi CORS (menggunakan variabel lingkungan)
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `Kebijakan CORS untuk situs ini tidak mengizinkan akses dari Origin ${origin}.`;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}));
app.use(express.json());

// SAJIKAN FILE STATIS DARI FOLDER 'public' (Satu tingkat di atas backend)
app.use(express.static(path.join(__dirname, '../public')));

// Endpoint dasar untuk cek status API
app.get('/api', (req, res) => {
  res.send('✅ Server API TIDAR Berjalan!');
});

// Gunakan Router Pengguna dengan prefix /api/users
app.use('/api/users', usersRoutes);

// Fallback: Arahkan semua request non-API ke index.html di folder public
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server aktif di port ${PORT}`);
});