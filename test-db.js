const { Client } = require('pg');

const connectionString = 'postgresql://gsnake1102_user:gsnake1102_pw@127.0.0.1:5432/gsnake1102';

console.log('Testing connection to:', connectionString.replace(/:([^:@]+)@/, ':****@'));

const client = new Client({
    connectionString: connectionString,
});

client.connect()
    .then(() => {
        console.log('✅ Connected successfully!');
        return client.query('SELECT NOW()');
    })
    .then(res => {
        console.log('Query result:', res.rows[0]);
        return client.end();
    })
    .catch(err => {
        console.error('❌ Connection error:', err);
        process.exit(1);
    });
