require('dotenv').config();
require('reflect-metadata');

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');
const RedisStore = require('connect-redis').default;
const redis = require('./config/redis');
const AppDataSource = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const statsRoutes = require('./routes/stats.routes');

const app = express();
const httpServer = http.createServer(app);

// --- Socket.IO ---
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST"]
    }
});

// --- Middlewares Express ---
app.use(express.json());
app.use(cookieParser());

// --- Base de données ---
AppDataSource.initialize()
    .then(() => console.log('Database connected (SQLite)'))
    .catch((err) => console.error('Database connection error:', err));

// --- SESSION : refactor pour TP2 ---
const sessionMiddleware = session({
    store: new RedisStore({ client: redis }),
    secret: 'supersecret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 86400 * 1000
    }
});

// On applique à Express
app.use(sessionMiddleware);

// --- Passport ---
app.use(passport.initialize());
app.use(passport.session());

// --- Routes ---
app.use('/', authRoutes);
app.use('/', statsRoutes);

// --- Servir le client-test.html ---
app.use(express.static('public'));

// --- WRAPPER pour réutiliser les middlewares Express dans Socket.IO ---
const wrap = middleware => (socket, next) =>
    middleware(socket.request, {}, next);

// --- Injection Session + Passport dans Socket.IO ---
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

// --- GUARD : Refuser les sockets non authentifiés ---
io.use((socket, next) => {
    const user = socket.request.user;
    if (user) {
        next();
    } else {
        next(new Error("Unauthorized: Veuillez vous connecter"));
    }
});
// --- SOCKET.IO : Connexion authentifiée ---
io.on('connection', (socket) => {
    // 1. Récupération sécurisée (faite au TP 2)
    const user = socket.request.user;
    console.log(` Client connecté : ${socket.id} (${user.username})`);

    // 2. REJOINDRE LA ROOM PRIVÉE "User Room"
    socket.join(`user:${user.id}`);
    console.log(` ${user.username} a rejoint son canal privé user:${user.id}`);

    // 3. REJOINDRE LA ROOM PUBLIQUE "General"
    socket.join('general');
    console.log(` ${user.username} a rejoint la salle General`);

    // 4. Écoute des messages venant du client (CHAT GENERAL)
    socket.on('chat_message', (data) => {
        console.log(`Message reçu de ${user.username} : ${data.content}`);

        // Diffusion à TOUS les gens dans la room 'general'
        io.to('general').emit('new_message', {
            from: user.username,
            content: data.content,
            time: new Date().toLocaleTimeString()
        });
    });

    // 5. Déconnexion
    socket.on('disconnect', () => {
        console.log(`Utilisateur ${user.username} déconnecté`);
    });
});


app.post('/api/admin/notify/:userId', (req, res) => {
    const targetUserId = req.params.userId;
    const { message } = req.body;

    console.log(`📨 Envoi d'une notification à user:${targetUserId} → "${message}"`);

    io.to(`user:${targetUserId}`).emit('notification', {
        type: 'private',
        text: message,
        from: 'System Admin'
    });

    res.json({ status: 'Notification envoyée', target: targetUserId });
});


// --- Lancement du serveur ---
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Serveur prêt sur http://localhost:${PORT}`);
});

module.exports = app;
