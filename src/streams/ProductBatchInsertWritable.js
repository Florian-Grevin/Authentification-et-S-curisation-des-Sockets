// src/streams/ProductBatchInsertWritable.js
const { Writable } = require('stream');
const AppDataSource = require('../config/db');

class ProductBatchInsertWritable extends Writable {
    constructor(options = {}) {
        super({ ...options, objectMode: true });

        this.batchSize = options.batchSize || 1000;
        this.batch = [];

        this.productRepository = AppDataSource.getRepository("Product");
    }

    async _write(chunk, encoding, callback) {
    // 1. Ajouter au buffer
    this.batch.push(chunk);
    // 2. Vérifier si on doit vider le buffer
    if (this.batch.length >= this.batchSize) {
    try {
        console.log(`⚡ Buffer plein (${this.batch.length} items). Écriture en base...`);
        await this.flushBatch();
        // Une fois écrit, on libère le flux
        callback();
    } catch (error) {
        // En cas d'erreur SQL, on arrête tout
        callback(error);
    }
    } else {
        // Buffer pas plein, on continue de lire
        callback();
    }
    }
    async _final(callback) {
        try {
            console.log('🏁 Fin du flux. Écriture des derniers éléments...');
            // TODO: Si le batch n'est pas vide, appeler flushBatch()
            if (this.batch.length > 0) {
                await this.flushBatch();
            }
            callback();
        } catch (error) {
            callback(error);
        }
    }
    // Méthode helper pour écrire en DB
    async flushBatch() {
        if (this.batch.length === 0) return;
        // Utilisation de insert pour la performance (plus rapide que save)
        await this.productRepository.insert(this.batch);
        // Important : On vide le tableau pour recommencer
        this.batch = [];
    }
}

module.exports = ProductBatchInsertWritable;
