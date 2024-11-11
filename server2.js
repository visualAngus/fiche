const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cookieParser());

const saltRounds = 10;
const SECRET_KEY = fs.readFileSync(path.join(__dirname, './certs/server.key'), 'utf8').trim();
// Configuration MySQL
const connection_fiches = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fiche'
});
connection_fiches.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log('connected as id ' + connection_fiches.threadId);
});

connection_agenda = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'agenda'
});
connection_agenda.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log('connected as id ' + connection_agenda.threadId);
}
);

// Création des tables principales
const initDatabase = async () => {
    // Table pour stocker les métadonnées des fiches
    const createFichesMetaTable = `
        CREATE TABLE IF NOT EXISTS fiches_meta (
            id_fiche INT PRIMARY KEY AUTO_INCREMENT,
            titre VARCHAR(255) NOT NULL,
            table_name VARCHAR(255) NOT NULL,
            date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // Table de liaison entre utilisateurs et fiches
    const createUserFichesTable = `
        CREATE TABLE IF NOT EXISTS user_fiches (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT,
            fiche_id INT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (fiche_id) REFERENCES fiches_meta(id_fiche),
            date_attribution TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    try {
        await connection_fiches.query(createFichesMetaTable);
        await connection_fiches.query(createUserFichesTable);
        console.log('Tables principales créées avec succès');
    } catch (error) {
        console.error('Erreur lors de la création des tables:', error);
    }
};
// Fonction pour créer une table spécifique pour une fiche
const createFicheTable = async (tableName) => {
    const createTableQuery = `
        CREATE TABLE ${tableName} (
            version_id INT PRIMARY KEY AUTO_INCREMENT,
            inner_html TEXT,
            local_storage TEXT,
            date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            commentaire VARCHAR(255),
            iv_inner VARCHAR(255),
            authTag_inner VARCHAR(255),
            iv_local VARCHAR(255),
            authTag_local VARCHAR(255)
        )
    `;

    return new Promise((resolve, reject) => {
        connection_fiches.query(createTableQuery, (error) => {
            if (error) reject(error);
            resolve();
        });
    });
};

// Importer un autre fichier JavaScript

app.get('/', (req, res) => {
    //verifie si le token est présent
    if (!verificationAll(req)) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }
    // Envoie 'index.html' situé dans le dossier home vers le client
    res.sendFile(path.join(__dirname, './home_fiche/home_fiche.html'));

});
app.get('/home%20fiche', (req, res) => {
    if (verificationAll(req) == false) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }
    // Envoie 'index.html' situé dans le dossier home vers le client
    res.sendFile(path.join(__dirname, './home_fiche/home_fiche.html'));

});
app.get('/connexion', (req, res) => {
    // Envoie 'index.html' situé dans le dossier home vers le client
    res.sendFile(path.join(__dirname, './connexion/connexion.html'));

});
app.get('/slider', (req, res) => {
    // Envoie 'index.html' situé dans le dossier home vers le client
    res.sendFile(path.join(__dirname, './slider/slider.html'));
});

//fiche -----------------------------------------------------------------------------
// Route pour créer une nouvelle fiche
app.post('/createFiche', async (req, res) => {
    const token = req.cookies.token;
    if (verificationAll(req) == false) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }

    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    const { titre } = req.body;

    try {
        const createFicheResult = await new Promise((resolve, reject) => {
            const tableName = `fiche_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            connection_fiches.query(
                'INSERT INTO fiches_meta (titre, table_name) VALUES (?, ?)',
                [titre, tableName],
                (error, results) => {
                    if (error) reject(error);
                    resolve({ results, tableName });
                }
            );
        });

        // Créer la table spécifique pour cette fiche
        await createFicheTable(createFicheResult.tableName);

        // Insérer la première version vide dans la table de la fiche
        await new Promise((resolve, reject) => {
            connection_fiches.query(
                `INSERT INTO ${createFicheResult.tableName} (inner_html, local_storage, commentaire,iv_inner,authTag_inner,iv_local,authTag_local) VALUES (?, ?, ?,?,?,?,?)`,
                ['', '', 'Version initiale', '', '', '', ''],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });

        // Créer la liaison utilisateur-fiche
        await new Promise((resolve, reject) => {
            connection_fiches.query(
                'INSERT INTO user_fiches (user_id, fiche_id) VALUES (?, ?)',
                [userData.userID, createFicheResult.results.insertId],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });

        res.json({
            success: true,
            ficheId: createFicheResult.results.insertId,
            message: 'Fiche créée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la création de la fiche:', error);
        res.status(500).json({ error: 'Erreur lors de la création de la fiche' });
    }
});
// Route modifiée pour sauvegarder une version de la fiche
app.post('/save', async (req, res) => {
    if (verificationAll(req) == false) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }
    const token = req.cookies.token;
    const secondaryKey = Buffer.from(req.cookies.secondaryKey, 'hex');
    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    // si le token est bon, mettre à jourt le token chez le client pour une durée de 1h
    res.cookie('token', token, { maxAge: 3600000, sameSite: 'Lax' });
    const { id, inner_html, local_storage, commentaire = 'Mise à jour' } = req.body;
    let encryptedInnerHtml = encryptWithSecondaryKey(inner_html, secondaryKey);
    let encryptedLocalStorage = encryptWithSecondaryKey(local_storage, secondaryKey);

    try {
        // Récupérer le nom de la table
        const tableInfo = await new Promise((resolve, reject) => {
            connection_fiches.query(
                `SELECT fiches_meta.table_name 
                 FROM user_fiches 
                 LEFT JOIN fiches_meta ON user_fiches.fiche_id = fiches_meta.id_fiche
                 WHERE user_fiches.user_id = ? AND user_fiches.fiche_id = ?`,
                [userData.userID, id],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });
        if (tableInfo.length === 0) {
            return res.status(404).json({ error: "Erreur lors de l'enregistrment" });
        }
        // Insérer la nouvelle version
        await new Promise((resolve, reject) => {
            connection_fiches.query(
                `INSERT INTO ${tableInfo[0].table_name} (inner_html, local_storage, commentaire,iv_inner,authTag_inner,iv_local,authTag_local) VALUES (?, ?, ?,?,?,?,?)`,
                [encryptedInnerHtml.encryptedData, encryptedLocalStorage.encryptedData, commentaire, encryptedInnerHtml.iv, encryptedInnerHtml.authTag, encryptedLocalStorage.iv, encryptedLocalStorage.authTag],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });
        const ficheDate = await new Promise((resolve, reject) => {
            connection_fiches.query(
                `SELECT date_modification FROM ${tableInfo[0].table_name} ORDER BY version_id DESC LIMIT 1`,
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });

        res.json({ success: true, date: ficheDate[0].date_modification });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});
// Route pour récupérer la dernière version d'une fiche
app.post('/getData', async (req, res) => {
    const token = req.cookies.token;
    if (verificationAll(req) == false) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }

    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    const { id } = req.body;
    try {
        // Récupérer le nom de la table
        const tableInfo = await new Promise((resolve, reject) => {
            connection_fiches.query(
                `SELECT fiches_meta.table_name ,fiches_meta.groupe_id
                 FROM user_fiches 
                 LEFT JOIN fiches_meta ON user_fiches.fiche_id = fiches_meta.id_fiche
                 WHERE user_fiches.user_id = ? AND user_fiches.fiche_id = ?`,
                [userData.userID, id],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });
        if (tableInfo.length === 0) {
            return res.status(404).json({ error: 'Fiche non trouvée' });
        }
        // Récupérer la dernière version
        const ficheData = await new Promise((resolve, reject) => {
            connection_fiches.query(
                `SELECT * FROM ${tableInfo[0].table_name} ORDER BY version_id DESC LIMIT 1`,
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });
        
        let decryptedInnerHtml = ficheData[0].inner_html;
        let decryptedLocalStorage = ficheData[0].local_storage;

        if (ficheData[0].iv_inner && ficheData[0].authTag_inner && ficheData[0].iv_local && ficheData[0].authTag_local) {
            decryptedInnerHtml = decryptWithSecondaryKey(ficheData[0].inner_html, Buffer.from(req.cookies.secondaryKey, 'hex'), ficheData[0].iv_inner, ficheData[0].authTag_inner);
            decryptedLocalStorage = decryptWithSecondaryKey(ficheData[0].local_storage, Buffer.from(req.cookies.secondaryKey, 'hex'), ficheData[0].iv_local, ficheData[0].authTag_local);
        }
        ficheData[0].inner_html = decryptedInnerHtml;
        ficheData[0].local_storage = decryptedLocalStorage;
        res.json({ success: true, data: ficheData, info: tableInfo[0] });
    } catch (error) {
        console.error('Erreur lors de la récupération:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
});
app.post('/UpdateGroupe', async (req, res) => {
    const token = req.cookies.token;
    if (verificationAll(req) == false) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }

    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    const { groupe_id, id___ } = req.body;
    try {
        // Récupérer le nom de la table
        const tableInfo = await new Promise((resolve, reject) => {
            connection_fiches.query(
                `SELECT fiches_meta.table_name ,fiches_meta.groupe_id
                 FROM user_fiches 
                 LEFT JOIN fiches_meta ON user_fiches.fiche_id = fiches_meta.id_fiche
                 WHERE user_fiches.user_id = ? AND user_fiches.fiche_id = ?`,
                [userData.userID, id___],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });
        if (tableInfo.length === 0) {
            return res.status(404).json({ error: 'Fiche non trouvée' });
        }
        // Récupérer la dernière version
        const ficheData = await new Promise((resolve, reject) => {
            connection_fiches.query(
                `UPDATE fiches_meta SET groupe_id = ? WHERE id_fiche = ?`,
                [groupe_id, id___],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });

        res.json({ success: true, data: ficheData, info: tableInfo[0] });
    } catch (error) {
        console.error('Erreur lors de la récupération:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
});
app.post('/AddGroupe', async (req, res) => {
    const token = req.cookies.token;
    if (verificationAll(req) == false) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }

    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    const { groupe_name } = req.body;
    try {
        // Récupérer le nom de la table
        const tableInfo = await new Promise((resolve, reject) => {
            connection_fiches.query(
                `INSERT INTO groupe (nom_groupe,user_id) VALUES (?,?)`,
                [groupe_name, userData.userID],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });
        res.json({ success: true, data: tableInfo });
    } catch (error) {
        console.error('Erreur lors de la récupération:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
});
// Route pour récupérer l'historique d'une fiche
app.post('/getHistory', async (req, res) => {
    const token = req.cookies.token;
    if (verificationAll(req) == false) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }

    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    const { id } = req.body;

    try {
        // Récupérer le nom de la table
        const tableInfo = await new Promise((resolve, reject) => {
            connection_fiches.query(
                'SELECT table_name FROM fiches_meta WHERE id_fiche = ?',
                [id],
                (error, results) => {
                    if (error) reject(error);
                    if (results.length === 0) reject(new Error('Fiche non trouvée'));
                    resolve(results[0]);
                }
            );
        });

        // Récupérer tout l'historique
        const history = await new Promise((resolve, reject) => {
            connection_fiches.query(
                `SELECT version_id, date_modification, commentaire FROM ${tableInfo.table_name} ORDER BY version_id DESC`,
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });

        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
    }
});
app.post('/getAllFicheByUser', async (req, res) => {
    const token = req.cookies.token;
    if (verificationAll(req) == false) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }

    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    try {
        // D'abord, récupérer les informations de base des fiches
        const tablesInfo = await new Promise((resolve, reject) => {
            connection_fiches.query(
                `SELECT fiches_meta.table_name, user_fiches.fiche_id, fiches_meta.titre, groupe.id_groupe, groupe.nom_groupe
                 FROM user_fiches 
                 LEFT JOIN fiches_meta ON user_fiches.fiche_id = fiches_meta.id_fiche
                 LEFT JOIN groupe ON fiches_meta.groupe_id = groupe.id_groupe AND groupe.user_id = ?
                 WHERE user_fiches.user_id = ?`,
                [userData.userID, userData.userID],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });

        // Pour chaque fiche, récupérer le dernier contenu
        const fichesWithContent = await Promise.all(tablesInfo.map(async (fiche) => {
            try {
                const content = await new Promise((resolve, reject) => {
                    connection_fiches.query(
                        `SELECT *
                         FROM ${fiche.table_name} 
                         ORDER BY version_id DESC 
                         LIMIT 1`,
                        (error, results) => {
                            if (error) reject(error);
                            resolve(results[0] || { inner_html: '', local_storage: '' });
                        }
                    );
                });
                let decryptedInnerHtml = content.inner_html;
                let decryptedLocalStorage = content.local_storage;

                if (content.iv_inner && content.authTag_inner && content.iv_local && content.authTag_local) {
                    decryptedInnerHtml = decryptWithSecondaryKey(content.inner_html, Buffer.from(req.cookies.secondaryKey, 'hex'), content.iv_inner, content.authTag_inner);
                    decryptedLocalStorage = decryptWithSecondaryKey(content.local_storage, Buffer.from(req.cookies.secondaryKey, 'hex'), content.iv_local, content.authTag_local);
                }
                return {
                    ...fiche,
                    inner_html: decryptedInnerHtml,
                    local_storage: decryptedLocalStorage
                };
            } catch (error) {
                console.error(`Erreur pour la table ${fiche.table_name}:`, error);
                return {
                    ...fiche,
                    inner_html: '',
                    local_storage: '',
                    error: 'Erreur lors de la récupération du contenu'
                };
            }
        }));

        res.json({
            success: true,
            data: fichesWithContent,
            message: fichesWithContent.length === 0 ? 'Aucune fiche trouvée pour cet utilisateur' : undefined
        });
    } catch (error) {
        console.error('Erreur lors de la récupération:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
});
app.post('/GetAllGroupeByUser', async (req, res) => {
    const token = req.cookies.token;
    if (verificationAll(req) == false) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }

    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    try {
        // D'abord, récupérer les informations de base des fiches
        const tablesInfo = await new Promise((resolve, reject) => {
            connection_fiches.query(
                `SELECT id_groupe, nom_groupe FROM groupe WHERE user_id = ?`,
                [userData.userID],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });

        res.json({
            success: true,
            data: tablesInfo,
            message: tablesInfo.length === 0 ? 'Aucun groupe trouvé pour cet utilisateur' : undefined
        });
    } catch (error) {
        console.error('Erreur lors de la récupération:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
});
app.post('/getFicheById', async (req, res) => {
    const token = req.cookies.token;
    if (verificationAll(req) == false) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }

    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    const { fiche_id } = req.body;
    try {
        // Récupérer les informations de base de la fiche
        const ficheInfo = await new Promise((resolve, reject) => {
            connection_fiches.query(
                `SELECT fiches_meta.table_name, fiches_meta.titre 
                 FROM user_fiches 
                 LEFT JOIN fiches_meta ON user_fiches.fiche_id = fiches_meta.id_fiche
                 WHERE user_fiches.user_id = ? AND user_fiches.fiche_id = ?`,
                [userData.userID, fiche_id],
                (error, results) => {
                    if (error) reject(error);
                    if (results.length === 0) reject(new Error('Fiche non trouvée'));
                    resolve(results[0]);
                }
            );
        });

        // Récupérer le contenu de la fiche
        const content = await new Promise((resolve, reject) => {
            connection_fiches.query(
                `SELECT *
                 FROM ${ficheInfo.table_name} 
                 ORDER BY version_id DESC 
                 LIMIT 1`,
                (error, results) => {
                    if (error) reject(error);
                    resolve(results[0] || { inner_html: '', local_storage: '' });
                }
            );
        });

        let decryptedInnerHtml = content.inner_html;
        let decryptedLocalStorage = content.local_storage;

        if (content.iv_inner && content.authTag_inner && content.iv_local && content.authTag_local) {
            decryptedInnerHtml = decryptWithSecondaryKey(content.inner_html, Buffer.from(req.cookies.secondaryKey, 'hex'), content.iv_inner, content.authTag_inner);
            decryptedLocalStorage = decryptWithSecondaryKey(content.local_storage, Buffer.from(req.cookies.secondaryKey, 'hex'), content.iv_local, content.authTag_local);
        }


        res.json({
            success: true,
            data: {
                ...ficheInfo,
                inner_html: decryptedInnerHtml,
                local_storage: decryptedLocalStorage
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
});
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hash = await hashPassword(password);
    connection_fiches.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], function (error, results, fields) {
        if (error) throw error;
        res.json({ success: true });
    });
});
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    // Vérifie si le token est déjà présent
    if (verificationAll(req)) {
        return res.sendFile(path.join(__dirname, './home_fiche/home_fiche.html'));
    }
    try {
        // Récupère l'utilisateur depuis la base de données
        const results = await new Promise((resolve, reject) => {
            connection_fiches.query('SELECT * FROM users WHERE BINARY username = ?', [username], (error, results) => {
                if (error) return reject(error);
                resolve(results);
            });
        });
        if (results.length > 0) {
            const { id, password: hash } = results[0];
            const isPasswordValid = await verifyPassword(password, hash);
            if (isPasswordValid) {
                const token = generateToken(username, id);
                //generate a secondary key
                const secondaryKey = generateSecondaryKey(SECRET_KEY, password);
                // Mettre le token dans un cookie HTTP
                res.cookie('token', token, { maxAge: 3600000, sameSite: 'Lax' });
                res.cookie('username', username, { maxAge: 36000000, sameSite: 'Lax' });
                res.cookie('secondaryKey', secondaryKey.toString('hex'), { maxAge: 36000000, sameSite: 'Lax' });

                // Redirige l'utilisateur vers la page d'accueil
                return res.sendFile(path.join(__dirname, './home_fiche/home_fiche.html'));
            } else {
                res.status(401).json({ error: 'Invalid credentials', message: 'Utilisateur ou mot de passe incorrect' });
            }
        } else {
            res.status(401).json({ error: 'Invalid credentials', message: 'Utilisateur ou mot de passe incorrect' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: 'Erreur lors de la connexion' });
    }
});
app.get('/editor', (req, res) => {
    const token = req.cookies.token;
    if (verificationAll(req) == false) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }
    const data = verifyToken(token);
    if (!data) {
        return res.status(401).sendFile(path.join(__dirname, './connexion/connexion.html'));
    }
    // Renvoyer la page editor.html avec les données de la fiche
    res.cookie('token', token, { maxAge: 3600000, sameSite: 'Lax' });

    res.sendFile(path.join(__dirname, './fiche_editor/editor.html'));
});
app.get('/viewer', (req, res) => {
    const token = req.cookies.token;
    if (verificationAll(req) == false) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }
    const data = verifyToken(token);
    if (!data) {
        return res.status(401).sendFile(path.join(__dirname, './connexion/connexion.html'));
    }
    // Renvoyer la page viewer.html avec les données de la fiche
    res.cookie('token', token, { maxAge: 3600000, sameSite: 'Lax' });

    res.sendFile(path.join(__dirname, './fiche_viewer/viewer.html'));
});
app.get('/header', (req, res) => {
    res.sendFile(path.join(__dirname, './header/header.html'));
});

//agenda --------------------------------------------------------------------------------

const createAgenda = async (tableName) => {
    const createTableQuery = `
        CREATE TABLE ${tableName} (
            event_id INT PRIMARY KEY AUTO_INCREMENT,
            nom TEXT,
            description TEXT,
            start_hour TEXT,
            end_hour TEXT,
            date TEXT,
            color VARCHAR(255),
            id_groupe_link INT,
            iv_inner VARCHAR(255),
            authTag_inner VARCHAR(255),
            iv_local VARCHAR(255),
            authTag_local VARCHAR(255)
        )
    `;

    return new Promise((resolve, reject) => {
        connection_agenda.query(createTableQuery, (error) => {
            if (error) reject(error);
            resolve();
        });
    });
};

app.post('/createEvent', async (req, res) => {
    const token = req.cookies.token;
    if (verificationAll(req) == false) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }

    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    const { titre, heure_debut, heure_fin, description, date,color,id_groupe } = req.body;

    try {
        // verifier si l'utilisateur n'a pas déjà un agenda
        const agendaInfo = await new Promise((resolve, reject) => {
            connection_agenda.query(
                `SELECT agenda_table_name FROM users_agenda WHERE user_id = ?`,
                [userData.userID],
                (error, results) => {
                    if (error) reject(error);   
                    resolve(results);
                }
            );
        });

        let tableName = '';
        if (agendaInfo.length === 0) {
            tableName = `agenda_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            await createAgenda(tableName);
            await new Promise((resolve, reject) => {
                connection_agenda.query(
                    'INSERT INTO users_agenda (user_id, agenda_table_name) VALUES (?, ?)',
                    [userData.userID, tableName],
                    (error, results) => {
                        if (error) reject(error);
                        resolve(results);
                    }
                );
            });
        }else{
            tableName = agendaInfo[0].agenda_table_name;
        }

        const addEventResult = await new Promise((resolve, reject) => {
            connection_agenda.query(
                `INSERT INTO ${tableName} (start_hour, end_hour, date, color,nom, description,id_groupe_link) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [heure_debut, heure_fin, date,color,titre,description,id_groupe],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });


    } catch (error) {
        console.error('Erreur lors de la création de l\'agenda:', error);
        res.status(500).json({ error: 'Erreur lors de la création de l\'agenda' });
    }

});

app.get('/getAllEvents', async (req, res) => {
    const token = req.cookies.token;
    if (verificationAll(req) == false) {
        return res.sendFile(path.join(__dirname, './connexion/connexion.html'));
    }

    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    try {
        // D'abord, récupérer les informations de base des fiches
        const tablesInfo = await new Promise((resolve, reject) => {
            connection_agenda.query(
                `SELECT agenda_table_name FROM users_agenda WHERE user_id = ?`,
                [userData.userID],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });

        // Pour chaque fiche, récupérer le dernier contenu
        const eventsWithContent = await Promise.all(tablesInfo.map(async (agenda) => {
            try {
                const content = await new Promise((resolve, reject) => {
                    connection_agenda.query(
                        `SELECT * FROM ${agenda.agenda_table_name}`,
                        (error, results) => {
                            if (error) reject(error);
                            resolve(results);
                        }
                    );
                });
                return {
                    events: content
                };
            } catch (error) {
                console.error(`Erreur pour la table ${agenda.agenda_table_name}:`, error);
                return {
                    events: [],
                    error: 'Erreur lors de la récupération du contenu'
                };
            }
        }));

        res.json({
            success: true,
            data: eventsWithContent,
            message: eventsWithContent.length === 0 ? 'Aucun événement trouvé pour cet utilisateur' : undefined
        });
    } catch (error) {
        console.error('Erreur lors de la récupération:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
});



// fonction de codaage et de décodage

async function hashPassword(password) {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
}

async function verifyPassword(password, hash) {
    const match = await bcrypt.compare(password, hash);
    return match;
}

function verificationAll(req) {
    // get le token 
    const token = req.cookies.token;
    //get la clé secondaire
    const secondaryKey = req.cookies.secondaryKey;

    if (!token) {
        return false;
    } else if (!secondaryKey) {
        return false;
    }

    const data = verifyToken(token);
    if (!data) {
        return false;
    }

    return true;
}

// Fonction pour générer un token JWT
function generateToken(name, id) {
    const payload = {
        username: name,
        userID: id,
        role: "admin"
    };
    const options = { expiresIn: '1h' };;
    return jwt.sign(payload, SECRET_KEY, options);
}

// Fonction pour vérifier et décoder un token JWT
function verifyToken(token) {
    try {
        return jwt.verify(token, SECRET_KEY); // Vérifie le token et retourne son contenu décodé si valide
    } catch (error) {
        return null; // Retourne null si le token est invalide ou expiré
    }
}

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


app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log("version 2 sécurisé");
});