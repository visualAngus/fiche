const crypto = require('crypto');

// Fonction pour générer une clé secondaire à partir de la clé primaire et du mot de passe
function generateSecondaryKey(primaryKey, password) {
    const salt = crypto.createHash('sha256').update(primaryKey).digest('hex'); // Utiliser une valeur unique pour chaque clé primaire
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256'); // Génère une clé de 32 octets (256 bits)
}

// Fonction pour chiffrer le texte avec la clé secondaire
function encryptWithSecondaryKey(text, secondaryKey) {
    const iv = crypto.randomBytes(16); // Génère un IV aléatoire
    const cipher = crypto.createCipheriv('aes-256-gcm', secondaryKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex'); // Tag pour vérifier l'intégrité du chiffrement

    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        authTag: authTag
    };
}

// Fonction pour déchiffrer le texte avec la clé secondaire
function decryptWithSecondaryKey(encryptedData, secondaryKey, iv, authTag) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', secondaryKey, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Exemple d'utilisation
const primaryKey = 'ma-cle-primaire-unique'; // Cette clé est secrète et unique pour ton serveur
const password = 'mon-mot-de-passe-securise'; // Mot de passe de l'utilisateur

// Générer la clé secondaire à partir de la clé primaire et du mot de passe
// const secondaryKey = generateSecondaryKey(primaryKey, password);
// console.log("Clé secondaire :", secondaryKey.toString('hex'));

// // Chiffrer un texte avec la clé secondaire
// const dataToEncrypt = "Texte sensible à chiffrer";
// const encrypted = encryptWithSecondaryKey(dataToEncrypt, secondaryKey);
// console.log("Chiffré :", encrypted);
let txt = "2215250f5980e07a236d97ae0835438663f975ac67d5de2a0557d153374ea567df62";
let secondaryKey = Buffer.from("15bf55048c5a02e65956ff8b639500c5cf8ce5acd2fc00e1c68ca0fb714b443d", 'hex');
let iv = "0bea38dbf6038343ce2d85b98c119902";
let authTag = "7ee112c51428da3c7ff619971263a3ca";

// Déchiffrer le texte avec la clé secondaire
try {
    const decrypted = decryptWithSecondaryKey(txt, secondaryKey, iv, authTag);
    console.log("Déchiffré :", decrypted);
} catch (error) {
    console.error("Erreur lors du déchiffrement :", error.message);
}
