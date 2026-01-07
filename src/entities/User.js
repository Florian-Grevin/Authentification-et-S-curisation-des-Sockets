const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
    name: 'User',
    tableName: 'users',
    columns: {
        id: {
            primary: true,
            type: 'integer',
            generated: 'increment',
        },
        username: {
            type: 'varchar',
            unique: true,
        },
        password: {
            type: 'varchar',
        },
    },
});