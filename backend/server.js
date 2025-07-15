const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Memuat variabel lingkungan dari .env
const admin = require('firebase-admin'); // Import Firebase Admin SDK

const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// Inisialisasi Firebase Admin SDK
// Menggunakan variabel lingkungan agar aman di produksi 
try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Penting: Mengganti '\\n' menjadi karakter newline aktual
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    console.log("✅ Firebase Admin SDK berhasil diinisialisasi.");
} catch (error) {
    console.error("❌ Error menginisialisasi Firebase Admin SDK:", error);
    process.exit(1); // Keluar dari aplikasi jika inisialisasi gagal
}

// Konfigurasi CORS
// Mengizinkan berbagai origin, termasuk localhost dan URL GitHub Pages Anda
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
app.use(express.json()); // Untuk mengurai body permintaan JSON

// Serving file statis dari folder 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Rute API
app.get('/api', (req, res) => {
  res.send('✅ Server API TIDAR Berjalan!');
});

// Menggunakan rute users
app.use('/api/users', usersRoutes);

// Rute catch-all untuk serving index.html (untuk SPA atau refresh halaman)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Mulai server
app.listen(PORT, () => {
  console.log(`🚀 Server aktif di port ${PORT}`);
});