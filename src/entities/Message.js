const { EntitySchema } = require('typeorm');
module.exports = new EntitySchema({
name: 'Message',
tableName: 'messages',
columns: {
id: {
primary: true,
type: 'integer',
generated: 'increment',
},
content: {
type: 'text',
},
room: {
type: 'varchar',
default: 'general', // Pour l'instant, tout va dans "general"
},
createdAt: {
type: 'datetime',
createDate: true, // TypeORM gère la date automatiquement
},
},
relations: {
sender: {
target: 'User', // Relation vers votre entité User existante
type: 'many-to-one',
joinColumn: true,
eager: true, // IMPORTANT : Charge automatiquement les infos du sender
},
},
});