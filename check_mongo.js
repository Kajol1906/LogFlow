const { MongoClient } = require('mongodb');

async function main() {
    const uri = 'mongodb+srv://kajolgehlot980_db_user:t7GZOfARkY3rjnbz@cluster0.i1rpmmy.mongodb.net/logflow?appName=Cluster0';
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('logflow');
        const count = await db.collection('logs').countDocuments();
        console.log('Logs in MongoDB:', count);
    } finally {
        await client.close();
    }
}
main().catch(console.error);
