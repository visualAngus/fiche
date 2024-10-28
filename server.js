// Import des modules nécessaires
const express = require('express'); // Framework web pour créer des routes HTTP
const jwt = require('jsonwebtoken'); // Librairie pour gérer les tokens JWT
const path = require('path'); // Module pour travailler avec les chemins de fichiers
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const e = require('express');


const app = express(); // Création de l'application Express
const PORT = process.env.PORT || 3000; // Définition du port (3000 par défaut si non spécifié)

// Middleware pour servir des fichiers statiques (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public'))); // Indique à Express où trouver les fichiers statiques

app.use(express.json()); // Permet de lire le JSON dans les requêtes HTTP POST, PUT, etc.

app.use(cookieParser());


app.get('/', (req, res) => {
    // Envoie 'index.html' situé dans le dossier home vers le client
    res.sendFile(path.join(__dirname, './connexion/connexion.html'));

});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`); // Affiche un message de confirmation dans la console
});

// requete mysql
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Fiche'
});
connection.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log('connected as id ' + connection.threadId);
});


const saltRounds = 10;
const SECRET_KEY = "rsdquhkdhv,;d620aqc2dqs65azckjej:ùmm^fùs^fsdù:sfq*ùdf:s"



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
                res.cookie('username', username, { maxAge: 3600000, sameSite: 'Lax' });

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

app.post('/getFiche', (req, res) => {
    // Vérifier le token
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).sendFile(path.join(__dirname, './connexion/connexion.html'));
    }
    const data = verifyToken(token);
    if (!data) {
        return res.status(401).sendFile(path.join(__dirname, './connexion/connexion.html'));
    }
    

    connection.query('SELECT * FROM fiche', (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Aucune fiche trouvée' });
        }

        // Envoie une seule réponse finale en JSON
        return res.json({ success: true, data: results });
    });

});


app.post('/getData', (req, res) => {
    // Vérifier le token
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).sendFile(path.join(__dirname, './connexion/connexion.html'));
    }
    const data = verifyToken(token);
    if (!data) {
        return res.status(401).sendFile(path.join(__dirname, './connexion/connexion.html'));
    }

    const { id } = req.body;
    console.log(id);
    connection.query('SELECT * FROM fiche WHERE id_fiche = ?', [id], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Aucune fiche trouvée' });
        }


        // Envoie une seule réponse finale en JSON
        return res.json({ success: true, data: results[0] });
    });
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
    res.sendFile(path.join(__dirname, './fiche_editor/editor.html'));
});

app.post('/save', (req, res) => {
    // Vérifier le token
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).sendFile(path.join(__dirname, './connexion/connexion.html'));
    }
    const data = verifyToken(token);
    if (!data) {
        return res.status(401).sendFile(path.join(__dirname, './connexion/connexion.html'));
    }

    const { id, inner_html, local_storage } = req.body;
    if (!id || !inner_html || !local_storage) {
        return res.status(400).json({ error: 'données manquantes' });
    }

    connection.query('UPDATE fiche SET inner_html = ?, local_storage = ? WHERE id_fiche = ?', [inner_html, local_storage, id], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ error: 'Erreur serveur' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'Fiche non trouvée' });
            }

            // Renvoyer la page editor.html avec les données de la fiche
            return res.json({ success: true });
    });
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