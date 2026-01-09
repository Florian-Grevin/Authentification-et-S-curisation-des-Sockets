const puppeteer = require('puppeteer');

(async () => {
    // Lancement du navigateur (headless: false permet de le voir s'ouvrir)
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    // Navigation
    await page.goto('http://books.toscrape.com/');

    // Cette fonction s'exécute DANS la page web, pas dans votre terminal
    const result = await page.evaluate(() => {
        // Code JavaScript standard (comme dans la console Chrome)
        const titre = document.title;
        const produits = document.querySelectorAll('article.product_pod');   
        const produitsCnt = produits.length;     
        // Pour retourner des données vers Node.js
        return {
        titrePage: titre,
        nombreproduits: produitsCnt
        };
    });
    console.log(result);
    await browser.close();
})();