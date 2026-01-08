const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
    name: 'Product',
    tableName: 'products',
    columns: {
        id: {
            primary: true,
            type: 'integer',
            generated: 'increment',
        },
        name: {
            type: 'text',
            nullable: false,
        },
        price: {
            type: 'real',
            nullable: false,
        },
        stock: {
            type: 'integer',
            nullable: false,
        },
        description: {
            type: 'text',
            nullable: false,
        },
        isArchived: {
            type: 'boolean',
            default: false,
        },
    },
});
