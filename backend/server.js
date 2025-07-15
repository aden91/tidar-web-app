const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Muat variabel lingkungan
const admin = require('firebase-admin'); // Import Firebase Admin SDK

// Inisialisasi Firebase Admin SDK (pastikan ini di sini, sebelum routes menggunakannya)
try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    console.log("✅ Firebase Admin SDK berhasil diinisialisasi.");
} catch (error) {
    console.error("❌ Error menginisialisasi Firebase Admin SDK:", error);
    process.exit(1); // Keluar dari aplikasi jika inisialisasi gagal
}


const usersRoutes = require('./routes/users'); // Pastikan jalurnya seperti ini dan variabelnya 'usersRoutes'

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi CORS (menggunakan variabel lingkungan)
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];

app.use(cors({
    origin: (origin, callback) => {
        // Izinkan permintaan tanpa origin (misal: Postman, permintaan file lokal)
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
// __dirname adalah direktori server.js (backend), jadi kita perlu mundur satu tingkat (..)
app.use(express.static(path.join(__dirname, '../public'))); // <--- PERBAIKAN PENTING DI SINI

// Endpoint dasar untuk cek status API
app.get('/api', (req, res) => {
  res.send('✅ Server API TIDAR Berjalan!');
});

// Gunakan Router Pengguna dengan prefix /api/users
app.use('/api/users', usersRoutes); // <--- Pastikan nama variabel 'usersRoutes'

// Fallback: Arahkan semua request non-API ke index.html di folder public
// Ini penting agar aplikasi bisa di-refresh di halaman selain halaman utama
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html')); // <--- PERBAIKAN PENTING DI SINI
});


// Jalankan server
app.listen(PORT, () => {
  console.log(`🚀 Server aktif di port ${PORT}`);
});