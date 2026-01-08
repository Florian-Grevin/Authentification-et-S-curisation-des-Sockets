// src/streams/ProductValidationTransform.js
const { Transform } = require('stream');

class ProductValidationTransform extends Transform {
    constructor(options) {
        // On active objectMode pour manipuler des objets JS, pas des buffers
        super({ ...options, objectMode: true });
    }
    // La méthode _transform est appelée pour chaque "chunk" (ici, chaque ligne du CSV)
    _transform(chunk, encoding, callback) {
        try {
            // 1. Nettoyage
            const name = chunk.name ? chunk.name.trim() : '';
            const description = chunk.description ? chunk.description.trim() : '';
            // 2. Validation du Prix
            // Vérifier si le prix existe et est un nombre valide
            // Si invalide : return callback(); (On saute la ligne)
            const price = parseFloat(chunk.price);
            if (isNaN(price) || price < 0) {
                return callback();
            }
            // 3. Validation du Stock
            let stock = parseInt(chunk.stock, 10);
            // Si stock est NaN ou < 0, le mettre à 0
            if (isNaN(stock) || stock < 0) {
                stock = 0;
            }
            // 4. Construction de l'objet final
            const cleanProduct = {
            name,
            price,
            stock,
            description,
            isArchived: chunk.isArchived === 'true'
            };
            // On envoie l'objet propre au prochain tuyau
            this.push(cleanProduct);
            // On signale qu'on est prêt à recevoir la suite
            callback();
        } catch (error) {
            callback(error);
        }
    }

}
module.exports = ProductValidationTransform;