const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const AppDataSource = require('./db');

passport.use(new LocalStrategy(async (username, password, done) => {
    try {
        const userRepository = AppDataSource.getRepository('User');
        const user = await userRepository.findOneBy({ username });

        if (!user) {
            return done(null, false, { message: 'Utilisateur non trouvé' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return done(null, false, { message: 'Mot de passe incorrect' });
        }

        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const userRepository = AppDataSource.getRepository('User');
        const user = await userRepository.findOneBy({ id });
        done(null, user);
    } catch (err) {
        done(err);
    }
});

module.exports = passport;
