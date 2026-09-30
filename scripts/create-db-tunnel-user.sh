#!/usr/bin/env bash
#
# Crée sur le VPS un compte SSH dédié au tunnel vers PostgreSQL.
#
# Ce compte ne peut rien faire d'autre que forwarder le port 5432 :
# pas de shell, pas de terminal, pas de forwarding vers une autre
# destination. Il permet à un membre de l'équipe d'atteindre la base sans
# lui donner d'accès au serveur.
#
# Usage, en root sur le VPS :
#   sudo ./scripts/create-db-tunnel-user.sh "ssh-ed25519 AAAA... marie@portable"
#
set -euo pipefail

readonly USERNAME='dbtunnel'

if [[ $# -ne 1 ]]; then
  echo "Usage : $0 \"<clé publique SSH du développeur>\"" >&2
  echo "Exemple : $0 \"ssh-ed25519 AAAAC3Nza... marie@portable\"" >&2
  exit 1
fi

readonly PUBLIC_KEY="$1"

if [[ $EUID -ne 0 ]]; then
  echo "Ce script doit être lancé en root (sudo)." >&2
  exit 1
fi

# Refus des clés manifestement mal formées : une faute de copier-coller
# donnerait un compte inutilisable, découvert seulement à la connexion.
if [[ ! "$PUBLIC_KEY" =~ ^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp[0-9]+)[[:space:]] ]]; then
  echo "La clé ne ressemble pas à une clé publique SSH." >&2
  echo "Attendu : une ligne commençant par ssh-ed25519, ssh-rsa ou ecdsa-sha2-*" >&2
  exit 1
fi

# --no-create-home serait tentant, mais sshd a besoin du répertoire pour
# y lire authorized_keys.
if ! id -u "$USERNAME" >/dev/null 2>&1; then
  adduser --disabled-password --gecos '' --shell /usr/sbin/nologin "$USERNAME"
  echo "Compte $USERNAME créé."
else
  echo "Compte $USERNAME déjà existant, ajout de la clé."
fi

readonly SSH_DIR="/home/$USERNAME/.ssh"
readonly AUTH_KEYS="$SSH_DIR/authorized_keys"

mkdir -p "$SSH_DIR"

# Les options en préfixe sont la vraie protection :
#   command="/bin/false"      aucune commande exécutable
#   permitopen="..."          seules destinations autorisées pour un -L
#   no-pty                    pas de terminal interactif
#
# Les deux permitopen sont nécessaires : sshd compare des chaînes littérales
# sans résoudre les noms, donc `-L 5432:127.0.0.1:5432` est refusé si seul
# `localhost:5432` est autorisé — et réciproquement. Le message est alors
# « administratively prohibited », qui ne désigne pas sa cause.
readonly RESTRICTIONS='command="/bin/false",no-agent-forwarding,no-X11-forwarding,no-pty,permitopen="localhost:5432",permitopen="127.0.0.1:5432"'
readonly ENTRY="$RESTRICTIONS $PUBLIC_KEY"

touch "$AUTH_KEYS"

# Une clé déjà présente est réécrite plutôt qu'ignorée : c'est ce qui permet
# à une relance du script de corriger des restrictions devenues obsolètes.
if grep -qF "$PUBLIC_KEY" "$AUTH_KEYS"; then
  grep -vF "$PUBLIC_KEY" "$AUTH_KEYS" > "$AUTH_KEYS.tmp" || true
  mv "$AUTH_KEYS.tmp" "$AUTH_KEYS"
  echo "Clé déjà présente : entrée réécrite avec les restrictions à jour."
else
  echo "Clé ajoutée."
fi
echo "$ENTRY" >> "$AUTH_KEYS"

# sshd refuse de lire ces fichiers s'ils sont accessibles à d'autres.
chown -R "$USERNAME:$USERNAME" "$SSH_DIR"
chmod 700 "$SSH_DIR"
chmod 600 "$AUTH_KEYS"

cat <<EOF

Terminé. Le développeur peut maintenant ouvrir le tunnel depuis son poste,
en remplaçant <vps> par un domaine qui résout vers ce serveur (celui du
site fait l'affaire ; le nom d'hôte interne de la machine, lui, n'est pas
résolvable depuis l'extérieur) :

    ssh -N -L 5432:127.0.0.1:5432 $USERNAME@<vps>

Tunnel ouvert, sa base est accessible sur 127.0.0.1:5432 comme si elle
était locale. La session ne rend pas la main : c'est normal, -N demande
justement à ne rien exécuter.

127.0.0.1 plutôt que localhost : sous Windows, localhost résout d'abord en
::1, que le tunnel n'écoute pas, d'où un ECONNREFUSED trompeur.

Si la connexion réclame un mot de passe, l'authentification par clé a
échoué — ce compte n'en a aucun. Vérifier côté serveur :

    sudo journalctl -u ssh -f        # puis retenter, la cause s'affiche
EOF
