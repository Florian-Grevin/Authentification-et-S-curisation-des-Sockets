const express = require('express');
const router = express.Router();
const cache = require('../middlewares/cache.middleware');

const fakeSalesData = {
    totalSales: 150000,
    topProduct: "Café",
    lastUpdated: new Date()
};

router.get('/stats', cache(60), async (req, res) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({
        ...fakeSalesData,
        generatedAt: new Date().toISOString()
    });
});

module.exports = router;