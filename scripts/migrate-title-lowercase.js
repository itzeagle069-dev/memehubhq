// Migration script to add title_lowercase field to all memes
// Run this once: node scripts/migrate-title-lowercase.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // You'll need to download this from Firebase Console

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateTitleLowercase() {
    console.log('Starting migration: Adding title_lowercase to all memes...');

    try {
        const memesRef = db.collection('memes');
        const snapshot = await memesRef.get();

        console.log(`Found ${snapshot.size} memes to update`);

        const batch = db.batch();
        let count = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            const title = data.title || '';
            const title_lowercase = title.toLowerCase();

            batch.update(doc.ref, { title_lowercase });
            count++;

            // Firestore batch limit is 500
            if (count % 400 === 0) {
                console.log(`Processed ${count} memes...`);
            }
        });

        await batch.commit();
        console.log(`✅ Migration complete! Updated ${count} memes with title_lowercase field`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit();
    }
}

migrateTitleLowercase();
