const redis = require('../config/redis');

const cache = (duration) => {
    return async (req, res, next) => {
        const key = `cache:${req.originalUrl || req.url}`;

        try {
            const cachedData = await redis.get(key);

            if (cachedData) {
                console.log(`Cache HIT for ${key}`);
                return res.json(JSON.parse(cachedData));
            }

            console.log(`Cache MISS for ${key}`);

            const originalSend = res.json;
            res.json = (body) => {
                redis.set(key, JSON.stringify(body), 'EX', duration);
                originalSend.call(res, body);
            };

            next();
        } catch (err) {
            console.error('Redis Cache Error:', err);
            next();
        }
    };
};

module.exports = cache;
