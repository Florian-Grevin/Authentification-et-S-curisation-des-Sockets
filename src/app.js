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
// On force TypeORM à connaître nos deux entités : User (déjà là) et Message (nouveau)
AppDataSource.setOptions({ entities: [require('./entities/User'), require('./entities/Message')]
});

AppDataSource.initialize()
    .then(() => console.log('Database connected (SQLite)'))
    .catch((err) => console.error('Database connection error:', err));

const messageRepository = AppDataSource.getRepository('Message');

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
    // 0. Ping Pong
    socket.on('my_ping', (data) => {
        console.log(`PING reçu de ${user.username} :`, data);

        socket.emit('my_pong', {
            text: "Pong !",
            time: new Date().toLocaleTimeString()
        });
    });

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
    // Notez le mot clé 'async' car on va parler à la DB
    socket.on('send_message', async (data) => {
        try {
            console.log(` Message reçu de ${user.username} :`, data.content);
        // 1. Validation basique
        if (!data.content || data.content.trim() === "") return;
        // 2. Préparation de la sauvegarde
            const newMessage = messageRepository.create({
            content: data.content,
            room: 'general',
            sender: user // On attache l'objet User complet récupéré de la session
        });
        // 3. Sauvegarde en Base de Données (c'est ici que ça devient persistant)
        await messageRepository.save(newMessage);
        console.log(`Message sauvegardé (ID: ${newMessage.id})`);
        // 4. Diffusion UNIQUEMENT si la sauvegarde a réussi
        // On renvoie aussi la vraie date de création (createdAt) générée par la DB
        io.to('general').emit('new_message', {
            from: user.username,
            content: newMessage.content,
            time: newMessage.createdAt
        });
        } catch (error) {
            console.error('Erreur sauvegarde message:', error);
            // Optionnel : Envoyer une erreur au client
            socket.emit('error', { message: "Impossible d'envoyer votre message." });
        }
    });

    // 5. Déconnexion
    socket.on('disconnect', () => {
        console.log(`Utilisateur ${user.username} déconnecté`);
    });
});

app.get('/api/messages/general', async (req, res) => {
    try {
        const messages = await messageRepository.find({
            where: { room: 'general' },
            order: { createdAt: 'DESC' },
            take: 50
        });

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors de la récupération des messages" });
    }
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
