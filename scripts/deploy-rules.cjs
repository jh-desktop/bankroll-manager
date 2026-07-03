const admin = require('firebase-admin')
const fs = require('fs')

const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
admin.initializeApp({ credential: admin.credential.cert(key), projectId: 'schedule-manager-df97f' })

const content = fs.readFileSync('firestore.rules', 'utf8')
admin.securityRules()
  .createRuleset({ name: 'firestore.rules', content })
  .then(rs => admin.securityRules().releaseFirestoreRuleset(rs))
  .then(() => { console.log('Firestore rules deployed!'); process.exit(0) })
  .catch(e => { console.error(e.message); process.exit(1) })
