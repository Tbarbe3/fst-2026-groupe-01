-- Schéma initial. Rejoué à chaque démarrage de l'API : tout doit être
-- idempotent (IF NOT EXISTS, ON CONFLICT), sinon le deuxième boot échoue.

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Jeu de tests pour vérifier la chaîne front → API → base de bout en bout.
-- À supprimer quand l'inscription réelle sera en place.
-- Les hash sont des valeurs factices : ces comptes ne permettent pas de se
-- connecter, aucun mot de passe ne produit ces chaînes.
INSERT INTO users (username, password_hash) VALUES
    ('thomas',  'placeholder-non-utilisable'),
    ('jordan',  'placeholder-non-utilisable'),
    ('kevin',   'placeholder-non-utilisable')
ON CONFLICT (username) DO NOTHING;
