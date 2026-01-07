const bcrypt = require('bcryptjs');
const AppDataSource = require('../config/db');

class AuthController {
    async register(req, res) {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username et password requis' });
        }

        try {
            const userRepository = AppDataSource.getRepository('User');

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = userRepository.create({
                username,
                password: hashedPassword
            });

            await userRepository.save(newUser);

            res.status(201).json({ message: 'Utilisateur créé', userId: newUser.id });
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT' || error.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ message: 'Username déjà pris' });
            }
            res.status(500).json({ message: 'Erreur serveur', error: error.message });
        }
    }

    login(req, res) {
        // Passport gère l'auth, ici on renvoie juste le succès
        res.json({ message: 'Connecté', user: req.user.username });
    }

    getProfile(req, res) {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: 'Non autorisé' });
        }
        res.json(req.user);
    }

    logout(req, res, next) {
        req.logout((err) => {
            if (err) { return next(err); }
            res.json({ message: 'Déconnecté' });
        });
    }
}

module.exports = new AuthController();