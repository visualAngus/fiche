const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cookieParser());

const saltRounds = 10;
const SECRET_KEY = "rsdquhkdhv,;d620aqc2dqs65azckjej:ùmm^fùs^fsdù:sfq*ùdf:s";

app.get('/', (req, res) => {
    // Envoie 'index.html' situé dans le dossier home vers le client
    res.sendFile(path.join(__dirname, './connexion/connexion.html'));

});
app.get('/connexion', (req, res) => {
    // Envoie 'index.html' situé dans le dossier home vers le client
    res.sendFile(path.join(__dirname, './connexion/connexion.html'));

});


// Configuration MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fiche'
});

connection.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log('connected as id ' + connection.threadId);
});

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
        await connection.query(createFichesMetaTable);
        await connection.query(createUserFichesTable);
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
            commentaire VARCHAR(255)
        )
    `;
    
    return new Promise((resolve, reject) => {
        connection.query(createTableQuery, (error) => {
            if (error) reject(error);
            resolve();
        });
    });
};

// Route pour créer une nouvelle fiche
app.post('/createFiche', async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    
    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    const { titre } = req.body;
    
    try {
        const createFicheResult = await new Promise((resolve, reject) => {
            const tableName = `fiche_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            connection.query(
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
            connection.query(
                `INSERT INTO ${createFicheResult.tableName} (inner_html, local_storage, commentaire) VALUES (?, ?, ?)`,
                ['', '', 'Version initiale'],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });

        // Créer la liaison utilisateur-fiche
        await new Promise((resolve, reject) => {
            connection.query(
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
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    
    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    // si le token est bon, mettre à jourt le token chez le client pour une durée de 1h
    res.cookie('token', token, { maxAge: 3600000, sameSite: 'Lax' });

    const { id, inner_html, local_storage, commentaire = 'Mise à jour' } = req.body;

    try {
        // Récupérer le nom de la table
        const tableInfo = await new Promise((resolve, reject) => {
            connection.query(
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
            connection.query(
                `INSERT INTO ${tableInfo[0].table_name} (inner_html, local_storage, commentaire) VALUES (?, ?, ?)`,
                [inner_html, local_storage, commentaire],
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });
        const ficheDate = await new Promise((resolve, reject) => {
            connection.query(
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
    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    
    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    const { id } = req.body;
    console.log(id);
    console.log(userData.userID);
    try {
        // Récupérer le nom de la table
        const tableInfo = await new Promise((resolve, reject) => {
            connection.query(
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
            return res.status(404).json({ error: 'Fiche non trouvée' });
        }
        console.log(tableInfo[0].table_name);
        // Récupérer la dernière version
        const ficheData = await new Promise((resolve, reject) => {
            connection.query(
                `SELECT * FROM ${tableInfo[0].table_name} ORDER BY version_id DESC LIMIT 1`,
                (error, results) => {
                    if (error) reject(error);
                    resolve(results);
                }
            );
        });

        res.json({ success: true, data: ficheData });
    } catch (error) {
        console.error('Erreur lors de la récupération:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
});

// Route pour récupérer l'historique d'une fiche
app.post('/getHistory', async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    
    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }

    const { id } = req.body;

    try {
        // Récupérer le nom de la table
        const tableInfo = await new Promise((resolve, reject) => {
            connection.query(
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
            connection.query(
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
    if (!token) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    
    const userData = verifyToken(token);
    if (!userData) {
        return res.status(401).json({ error: 'Token invalide' });
    }
    
    try {
        // D'abord, récupérer les informations de base des fiches
        const tablesInfo = await new Promise((resolve, reject) => {
            connection.query(
                `SELECT fiches_meta.table_name, user_fiches.fiche_id, fiches_meta.titre
                 FROM user_fiches 
                 LEFT JOIN fiches_meta ON user_fiches.fiche_id = fiches_meta.id_fiche
                 WHERE user_fiches.user_id = ?`,
                [userData.userID],
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
                    connection.query(
                        `SELECT inner_html, local_storage 
                         FROM ${fiche.table_name} 
                         ORDER BY version_id DESC 
                         LIMIT 1`,
                        (error, results) => {
                            if (error) reject(error);
                            resolve(results[0] || { inner_html: '', local_storage: '' });
                        }
                    );
                });

                return {
                    ...fiche,
                    inner_html: content.inner_html,
                    local_storage: content.local_storage
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

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    console.log(password);
    const hash = await hashPassword(password);
    console.log(hash);
    connection.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], function (error, results, fields) {
        if (error) throw error;
        res.json({ success: true });
    });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    // Vérifie si le token est déjà présent
    const token = req.cookies.token;
    if (token) {
        const data = verifyToken(token);
        if (data) {
            // Si le token est valide, redirige l'utilisateur vers la page d'accueil
            return res.sendFile(path.join(__dirname, './home/home.html'));
        }
    }

    try {
        // Récupère l'utilisateur depuis la base de données
        const results = await new Promise((resolve, reject) => {
            connection.query('SELECT * FROM users WHERE BINARY username = ?', [username], (error, results) => {
                if (error) return reject(error);
                resolve(results);
            });
        });

        if (results.length > 0) {
            const { id, password: hash } = results[0];
            const isPasswordValid = await verifyPassword(password, hash);
            if (isPasswordValid) {
                const token = generateToken(username, id);
                // Mettre le token dans un cookie HTTP
                res.cookie('token', token, { maxAge: 3600000, sameSite: 'Lax' });
                res.cookie('username', username, { maxAge: 36000000, sameSite: 'Lax' });

                // Redirige l'utilisateur vers la page d'accueil
                return res.sendFile(path.join(__dirname, './home/home.html'));
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/editor', (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).sendFile(path.join(__dirname, './connexion/connexion.html'));
    }
    const data = verifyToken(token);
    if (!data) {
        return res.status(401).sendFile(path.join(__dirname, './connexion/connexion.html'));
    }
    // Renvoyer la page editor.html avec les données de la fiche
    res.cookie('token', token, { maxAge: 3600000, sameSite: 'Lax' });

    res.sendFile(path.join(__dirname, './fiche_editor/editor.html'));
});

async function hashPassword(password) {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
}

async function verifyPassword(password, hash) {
    const match = await bcrypt.compare(password, hash);
    return match;
}

// Fonction pour générer un token JWT
function generateToken(name, id) {
    const payload = {
        username: name,
        userID: id,
        role: "admin"
    };
    const options = { expiresIn: '1h' };
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

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});