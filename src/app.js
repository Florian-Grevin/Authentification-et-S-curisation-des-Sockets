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
    const user = socket.request.user;

    console.log(`Utilisateur identifié : ${user.username} (ID: ${user.id}) connecté via ${socket.id}`);

    socket.on('my_ping', (data) => {
        console.log("Ping reçu :", data);

        io.emit('broadcast_msg', {
            message: `${user.username} a pingué !`
        });
    });

    socket.on('disconnect', () => {
        console.log(`Utilisateur ${user.username} déconnecté`);
    });
});

// --- Lancement du serveur ---
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Serveur prêt sur http://localhost:${PORT}`);
});

module.exports = app;
