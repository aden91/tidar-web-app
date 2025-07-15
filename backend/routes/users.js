const express = require('express');
const admin = require('firebase-admin'); // Import Firebase Admin SDK

const router = express.Router();

// CATATAN: Kita tidak lagi mencoba mendapatkan instance db dan auth di level atas file ini.
// Mereka akan diakses di dalam fungsi setelah inisialisasi di server.js.

// Middleware untuk memverifikasi token Firebase ID
const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized: No token provided.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
        // Ambil instance auth di sini, saat middleware dijalankan
        const auth = admin.auth(); 
        const decodedToken = await auth.verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return res.status(403).json({ success: false, message: 'Unauthorized: Invalid or expired token.' });
    }
};

// Endpoint untuk mendaftarkan data pengguna baru di Firestore
router.post('/register', verifyFirebaseToken, async (req, res) => {
    try {
        // Ambil instance db di sini, saat rute ini dijalankan
        const db = admin.firestore(); 
        const { uid, name, tempatLahir, tanggalLahir, provinsi, kota, kecamatan, kelurahan, alamat, email, phone } = req.body;

        if (req.user.uid !== uid) {
            return res.status(403).json({ success: false, message: 'Forbidden: UID mismatch.' });
        }

        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            return res.status(409).json({ success: false, message: 'Pengguna sudah terdaftar di database.' });
        }

        await userRef.set({
            name: name || null,
            email: email || null,
            phone: phone || null,
            tempatLahir: tempatLahir || null,
            tanggalLahir: tanggalLahir || null,
            alamat: {
                provinsi: provinsi || null,
                kota: kota || null,
                kecamatan: kecamatan || null,
                kelurahan: kelurahan || null,
                detail: alamat || null,
            },
            isVerified: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(201).json({ success: true, message: 'Pendaftaran berhasil! Akun Anda sedang menunggu verifikasi admin.' });
    } catch (error) {
        console.error('Error in /register endpoint:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server saat mendaftar: ' + error.message });
    }
});

// Endpoint untuk sinkronisasi data pengguna setelah login
router.post('/auth', verifyFirebaseToken, async (req, res) => {
    try {
        // Ambil instance db di sini, saat rute ini dijalankan
        const db = admin.firestore(); 
        const { uid, email, name, phone } = req.body;

        if (req.user.uid !== uid) {
            return res.status(403).json({ success: false, message: 'Forbidden: UID mismatch.' });
        }

        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            await userRef.set({
                name: name || req.user.name || 'Nama Pengguna',
                email: email || req.user.email,
                phone: phone || req.user.phone_number || null,
                isVerified: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastLogin: admin.firestore.FieldValue.serverTimestamp(),
                alamat: {
                    provinsi: null,
                    kota: null,
                    kecamatan: null,
                    kelurahan: null,
                    detail: null,
                },
                tempatLahir: null,
                tanggalLahir: null,
            });
            return res.status(200).json({ success: true, message: 'Profil pengguna dibuat dan menunggu verifikasi.' });
        } else {
            await userRef.update({
                lastLogin: admin.firestore.FieldValue.serverTimestamp(),
                name: name || doc.data().name,
                email: email || doc.data().email,
                phone: phone || doc.data().phone || null,
            });
            return res.status(200).json({ success: true, message: 'Login berhasil, data profil diperbarui.' });
        }
    } catch (error) {
        console.error("Error in /auth endpoint:", error);
        res.status(500).json({ success: false, message: "Gagal memproses autentikasi di backend: " + error.message });
    }
});

// Endpoint untuk mendapatkan data pengguna berdasarkan UID
router.get('/:uid', verifyFirebaseToken, async (req, res) => {
    try {
        // Ambil instance db di sini, saat rute ini dijalankan
        const db = admin.firestore(); 
        const { uid } = req.params;

        if (req.user.uid !== uid) {
            return res.status(403).json({ success: false, message: 'Forbidden: Anda hanya bisa mengakses data profil Anda sendiri.' });
        }

        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({ success: false, message: 'Data pengguna tidak ditemukan di database.' });
        }

        res.status(200).json({ success: true, data: userDoc.data() });
    } catch (error) {
        console.error('Error fetching user data in /:uid endpoint:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data pengguna karena kesalahan server: ' + error.message });
    }
});

// Endpoint Admin untuk verifikasi anggota
router.post('/verify', async (req, res) => {
    try {
        // Ambil instance db di sini, saat rute ini dijalankan
        const db = admin.firestore(); 
        const { uid } = req.body;
        if (!uid) {
            return res.status(400).json({ success: false, message: 'UID anggota diperlukan.' });
        }

        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Pengguna dengan UID tersebut tidak ditemukan.' });
        }

        await userRef.update({ isVerified: true });

        res.status(200).json({ success: true, message: `Pengguna dengan UID ${uid} berhasil diverifikasi.` });
    } catch (error) {
        console.error('Error in /verify endpoint:', error);
        res.status(500).json({ success: false, message: 'Gagal memverifikasi pengguna karena kesalahan server: ' + error.message });
    }
});

module.exports = router;