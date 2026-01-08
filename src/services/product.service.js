// À ajouter en haut de src/services/product.service.js
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { stringify } = require('csv-stringify');
// Assurez-vous d'avoir importé votre DataSource ou Repository
const AppDataSource = require('../config/db');


class ProductService { 
    async exportProducts(outputStream) {
                
        const productRepository = AppDataSource.getRepository("Product");

        async function* productGenerator() {
            let lastId = 0;
            const batchSize = 1000;
            while (true) {
                // Log pour vérifier que la pagination se fait bien
                console.log(`📦 Fetching batch starting after ID ${lastId}...`);
                // TODO: Construire la requête avec QueryBuilder
                const products = await productRepository.createQueryBuilder("product")
                .select(["product.id", "product.name", "product.price", "product.stock",
                "product.description", "product.isArchived"])
                .where("product.id > :lastId", { lastId })
                .orderBy("product.id", "ASC")
                .take(batchSize)
                .getMany();
                // Si aucun produit n'est retourné, on a fini : on sort de la boucle
                if (products.length === 0) break;
                // On "émet" (yield) chaque produit un par un vers le stream
                for (const product of products) {
                yield product;
            }
            // On met à jour le curseur pour le prochain tour
            lastId = products[products.length - 1].id;
            }
        }

        // ... suite de la méthode exportProducts
        // 1. Conversion du générateur en Readable Stream Node.js
        const sourceStream = Readable.from(productGenerator());
        // 2. Configuration du transformateur JSON vers CSV
        const csvTransformer = stringify({
        header: true,
        columns: ["id", "name", "price", "stock", "description", "isArchived"]
        });
        // 3. Exécution du pipeline (connecte Source -> CSV -> Sortie)
        // Le 'await' permet d'attendre que tout le transfert soit terminé avant de finir la fonction
        await pipeline(
        sourceStream,
        csvTransformer,
        outputStream // Ceci est l'objet 'res' passé par le contrôleur
        );


    }
}
module.exports = new ProductService();