// scripts/seed_products.js
const AppDataSource = require('../src/config/db');
const Product = require('../src/entities/Product');
async function seed() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Product);
    console.log("🌱 Génération de 2500 produits en cours...");
    const products = [];
    for (let i = 0; i < 2500; i++) {
        products.push({
            name: `Produit ${i}`,
            price: (Math.random() * 100).toFixed(2),
            stock: Math.floor(Math.random() * 50),
            description: "Description automatique",
            isArchived: false
        });
    }
    await repo.save(products);
    console.log("✅ 2500 produits insérés !");
    process.exit(0);
}
seed();
