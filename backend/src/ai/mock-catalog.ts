import type { Category, Difficulty, GeneratedScenario, Language } from './types.js'

export interface CatalogEntry {
  language: Language
  difficulty: Difficulty
  category: Category
  scenario: GeneratedScenario
}

/**
 * Scénarios écrits à la main, au format exact de la sortie du modèle. Ils
 * servent au mode `mock` (aucun jeton consommé) et de repli quand Gemini
 * échoue : ils passent donc par le même `buildScenario`.
 */
export const MOCK_CATALOG: CatalogEntry[] = [
  {
    language: 'typescript',
    difficulty: '3',
    category: 'security_owasp',
    scenario: {
      title: 'PR #142 : Réception des webhooks Stripe',
      ticket_context:
        '[PAY-218] Quand un client termine son paiement, Stripe nous envoie un événement checkout.session.completed. Il faut l’écouter pour passer la commande au statut « payée » et déclencher l’envoi du mail de confirmation.',
      persona: {
        name: 'Jordan',
        archetype: 'junior_pressé',
        bio: 'Livre vite, teste le cas nominal avec l’outil de Stripe et passe à la suite.',
      },
      files: [
        {
          path: 'src/routes/stripe-webhook.ts',
          hunks: [
            {
              start_line: 1,
              lines: [
                { kind: 'context', text: "import { Router } from 'express'" },
                { kind: 'add', text: "import { markOrderPaid } from '../services/orders'" },
                { kind: 'add', text: "import { sendConfirmation } from '../services/mailer'" },
                { kind: 'context', text: '' },
                { kind: 'context', text: 'export const stripeRouter = Router()' },
                { kind: 'context', text: '' },
                { kind: 'add', text: "stripeRouter.post('/webhooks/stripe', async (req, res) => {" },
                { kind: 'add', text: '  const event = req.body', issue_ref: 'I1' },
                { kind: 'add', text: '' },
                { kind: 'add', text: "  if (event.type === 'checkout.session.completed') {" },
                { kind: 'add', text: '    const session = event.data.object' },
                { kind: 'add', text: '    await markOrderPaid(session.metadata.orderId)' },
                { kind: 'add', text: '    await sendConfirmation(session.customer_email)' },
                { kind: 'add', text: '  }' },
                { kind: 'add', text: '' },
                { kind: 'add', text: '  res.json({ received: true })' },
                { kind: 'add', text: '})' },
              ],
            },
          ],
        },
        {
          path: 'src/app.ts',
          hunks: [
            {
              start_line: 12,
              lines: [
                { kind: 'context', text: 'app.use(express.json())' },
                { kind: 'add', text: "app.use('/api', stripeRouter)" },
                { kind: 'context', text: "app.use('/api', ordersRouter)" },
              ],
            },
          ],
        },
      ],
      issues: [
        {
          id: 'I1',
          type: 'security_owasp',
          severity: 'critical',
          expected_issue: 'La signature Stripe du webhook n’est pas vérifiée.',
          why: 'L’endpoint est public : n’importe qui peut envoyer un faux événement checkout.session.completed et faire passer une commande comme payée sans rien débourser.',
          ideal_fix:
            'Lire le corps brut (express.raw) et appeler stripe.webhooks.constructEvent(rawBody, req.headers["stripe-signature"], endpointSecret) avant tout traitement.',
          fixed_lines: [
            "  const signature = req.headers['stripe-signature'] as string",
            '  const event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret)',
          ],
        },
      ],
    },
  },
  {
    language: 'python',
    difficulty: '4',
    category: 'performance',
    scenario: {
      title: 'PR #87 : Export CSV des commandes du mois',
      ticket_context:
        '[DATA-54] La compta veut un export CSV des commandes du mois avec, pour chacune, le nom du client et le nombre d’articles. Environ 40 000 commandes par mois.',
      persona: {
        name: 'Inès',
        archetype: 'intermédiaire_méthodique',
        bio: 'Code propre et lisible, mais teste sur une base de développement de dix lignes.',
      },
      files: [
        {
          path: 'reports/orders_export.py',
          hunks: [
            {
              start_line: 1,
              lines: [
                { kind: 'context', text: 'import csv' },
                { kind: 'context', text: 'from io import StringIO' },
                { kind: 'add', text: 'from app.models import Order, Customer, OrderItem' },
                { kind: 'context', text: '' },
                { kind: 'context', text: '' },
                { kind: 'add', text: 'def export_month(year: int, month: int) -> str:' },
                { kind: 'add', text: '    buffer = StringIO()' },
                { kind: 'add', text: '    writer = csv.writer(buffer)' },
                { kind: 'add', text: "    writer.writerow(['commande', 'client', 'articles', 'total'])" },
                { kind: 'add', text: '' },
                { kind: 'add', text: '    orders = Order.objects.filter(created_at__year=year, created_at__month=month)' },
                { kind: 'add', text: '    for order in orders:' },
                { kind: 'add', text: '        customer = Customer.objects.get(id=order.customer_id)', issue_ref: 'I1' },
                { kind: 'add', text: '        items = OrderItem.objects.filter(order_id=order.id).count()', issue_ref: 'I1' },
                { kind: 'add', text: '        writer.writerow([order.id, customer.name, items, order.total])' },
                { kind: 'add', text: '' },
                { kind: 'add', text: '    return buffer.getvalue()', issue_ref: 'I2' },
              ],
            },
          ],
        },
      ],
      issues: [
        {
          id: 'I1',
          type: 'performance',
          severity: 'major',
          expected_issue: 'Requêtes N+1 : deux requêtes SQL par commande dans la boucle.',
          why: 'Pour 40 000 commandes, la boucle exécute 80 001 requêtes. L’export prendra plusieurs minutes et chargera la base.',
          ideal_fix:
            'Charger le client avec select_related et compter les articles via annotate(Count(...)) dans la requête initiale.',
          fixed_lines: [
            "    orders = (Order.objects.filter(created_at__year=year, created_at__month=month)",
            "              .select_related('customer').annotate(items=Count('orderitem')))",
            '    for order in orders:',
            '        writer.writerow([order.id, order.customer.name, order.items, order.total])',
          ],
        },
        {
          id: 'I2',
          type: 'performance',
          severity: 'minor',
          expected_issue: 'Tout le CSV est construit en mémoire avant d’être renvoyé.',
          why: 'Le fichier complet vit en mémoire dans le worker. Un générateur ou une réponse en streaming éviterait le pic mémoire.',
          ideal_fix: 'Écrire ligne par ligne dans une StreamingHttpResponse via un générateur.',
          fixed_lines: ['    return StreamingHttpResponse(rows(orders), content_type="text/csv")'],
        },
      ],
    },
  },
  {
    language: 'go',
    difficulty: '5',
    category: 'race_condition',
    scenario: {
      title: 'PR #311 : Cache mémoire des taux de change',
      ticket_context:
        '[FX-12] L’API des taux de change est lente et facturée à l’appel. Mettre en place un cache mémoire de 5 minutes partagé par toutes les requêtes HTTP du service.',
      persona: {
        name: 'Malik',
        archetype: 'senior_confiant',
        bio: 'Expérimenté, écrit vite du code idiomatique et saute parfois la relecture de la concurrence.',
      },
      files: [
        {
          path: 'internal/fx/cache.go',
          hunks: [
            {
              start_line: 1,
              lines: [
                { kind: 'context', text: 'package fx' },
                { kind: 'context', text: '' },
                { kind: 'add', text: 'import "time"' },
                { kind: 'add', text: '' },
                { kind: 'add', text: 'type entry struct {' },
                { kind: 'add', text: '\trate      float64' },
                { kind: 'add', text: '\tfetchedAt time.Time' },
                { kind: 'add', text: '}' },
                { kind: 'add', text: '' },
                { kind: 'add', text: 'type Cache struct {' },
                { kind: 'add', text: '\tclient  *Client' },
                { kind: 'add', text: '\tentries map[string]entry', issue_ref: 'I1' },
                { kind: 'add', text: '}' },
                { kind: 'add', text: '' },
                { kind: 'add', text: 'func (c *Cache) Rate(pair string) (float64, error) {' },
                { kind: 'add', text: '\tif e, ok := c.entries[pair]; ok && time.Since(e.fetchedAt) < 5*time.Minute {', issue_ref: 'I1' },
                { kind: 'add', text: '\t\treturn e.rate, nil' },
                { kind: 'add', text: '\t}' },
                { kind: 'add', text: '\trate, err := c.client.Fetch(pair)' },
                { kind: 'add', text: '\tif err != nil {' },
                { kind: 'add', text: '\t\treturn 0, err' },
                { kind: 'add', text: '\t}' },
                { kind: 'add', text: '\tc.entries[pair] = entry{rate: rate, fetchedAt: time.Now()}', issue_ref: 'I1' },
                { kind: 'add', text: '\treturn rate, nil' },
                { kind: 'add', text: '}' },
              ],
            },
          ],
        },
      ],
      issues: [
        {
          id: 'I1',
          type: 'race_condition',
          severity: 'critical',
          expected_issue: 'La map est lue et écrite depuis plusieurs goroutines sans verrou.',
          why: 'Chaque requête HTTP tourne dans sa propre goroutine. Un accès concurrent à une map Go provoque « fatal error: concurrent map writes » et fait tomber tout le service.',
          ideal_fix:
            'Protéger la map par un sync.RWMutex (RLock pour la lecture, Lock pour l’écriture), ou utiliser singleflight pour éviter aussi les appels en double.',
          fixed_lines: [
            '\tc.mu.RLock()',
            '\te, ok := c.entries[pair]',
            '\tc.mu.RUnlock()',
            '\tc.mu.Lock()',
            '\tc.entries[pair] = entry{rate: rate, fetchedAt: time.Now()}',
            '\tc.mu.Unlock()',
          ],
        },
      ],
    },
  },
  {
    language: 'java',
    difficulty: '4',
    category: 'business_logic',
    scenario: {
      title: 'PR #64 : Codes promo sur le panier',
      ticket_context:
        '[SHOP-97] Permettre de saisir un code promo au paiement. Un code a un pourcentage de réduction et un nombre maximal d’utilisations. Un client ne peut utiliser qu’un code par commande.',
      persona: {
        name: 'Camille',
        archetype: 'junior_appliquée',
        bio: 'Suit le ticket à la lettre et couvre le cas nominal par des tests unitaires.',
      },
      files: [
        {
          path: 'src/main/java/shop/cart/PromoService.java',
          hunks: [
            {
              start_line: 18,
              lines: [
                { kind: 'context', text: '    public Cart applyPromo(Cart cart, String code) {' },
                { kind: 'add', text: '        Promo promo = promoRepository.findByCode(code)' },
                { kind: 'add', text: '            .orElseThrow(() -> new PromoNotFoundException(code));' },
                { kind: 'add', text: '' },
                { kind: 'add', text: '        BigDecimal discount = cart.getTotal()' },
                { kind: 'add', text: '            .multiply(promo.getPercent())' },
                { kind: 'add', text: '            .divide(BigDecimal.valueOf(100));' },
                { kind: 'add', text: '        cart.setTotal(cart.getTotal().subtract(discount));', issue_ref: 'I1' },
                { kind: 'add', text: '' },
                { kind: 'add', text: '        promo.setUses(promo.getUses() + 1);', issue_ref: 'I2' },
                { kind: 'add', text: '        promoRepository.save(promo);' },
                { kind: 'context', text: '        return cartRepository.save(cart);' },
                { kind: 'context', text: '    }' },
              ],
            },
          ],
        },
      ],
      issues: [
        {
          id: 'I1',
          type: 'business_logic',
          severity: 'critical',
          expected_issue: 'Rien n’empêche d’appliquer plusieurs codes, ou le même plusieurs fois, sur un panier.',
          why: 'Chaque appel réduit encore le total. En rappelant l’endpoint, un client fait tendre son panier vers zéro, contrairement à la règle « un code par commande ».',
          ideal_fix:
            'Refuser si cart.getPromoCode() est déjà renseigné, mémoriser le code sur le panier et recalculer la remise depuis le sous-total.',
          fixed_lines: [
            '        if (cart.getPromoCode() != null) throw new PromoAlreadyAppliedException();',
            '        cart.setPromoCode(promo.getCode());',
          ],
        },
        {
          id: 'I2',
          type: 'business_logic',
          severity: 'major',
          expected_issue: 'Le nombre maximal d’utilisations du code n’est jamais vérifié.',
          why: 'Le compteur est incrémenté mais jamais comparé à promo.getMaxUses() : un code limité à 100 utilisations reste valable indéfiniment.',
          ideal_fix: 'Vérifier promo.getUses() < promo.getMaxUses() avant d’appliquer la remise.',
          fixed_lines: [
            '        if (promo.getUses() >= promo.getMaxUses()) throw new PromoExhaustedException(code);',
          ],
        },
      ],
    },
  },
  {
    language: 'java',
    difficulty: '1',
    category: 'business_logic',
    scenario: {
      title: 'PR #12 : Total du panier avec frais de port',
      ticket_context:
        '[SHOP-31] Le total du panier doit inclure 4,90 € de frais de port quand le montant des articles est inférieur à 50 €.',
      persona: {
        name: 'Lucas',
        archetype: 'stagiaire_débutant',
        bio: 'Premier stage, écrit son code dans le bloc-notes et pousse sans compiler.',
      },
      files: [
        {
          path: 'src/main/java/shop/Cart.java',
          hunks: [
            {
              start_line: 20,
              lines: [
                { kind: 'context', text: '    public double total() {' },
                { kind: 'add', text: '        double sum = 0;' },
                { kind: 'add', text: '        for (Item item : items) {' },
                { kind: 'add', text: '            sum += item.getPrice() * item.getQuantity()', issue_ref: 'I1' },
                { kind: 'add', text: '        }' },
                { kind: 'add', text: '        if (sum < 50) {' },
                { kind: 'add', text: '            sum += 4.90;' },
                { kind: 'add', text: '        }' },
                { kind: 'add', text: '        return sum;' },
                { kind: 'context', text: '    }' },
              ],
            },
          ],
        },
      ],
      issues: [
        {
          id: 'I1',
          type: 'business_logic',
          severity: 'major',
          expected_issue: 'Il manque le point-virgule à la fin de la ligne.',
          why: 'En Java, chaque instruction se termine par un point-virgule : sans lui, le fichier ne compile pas et le panier ne peut plus être calculé.',
          ideal_fix: 'Ajouter « ; » à la fin de l’instruction.',
          fixed_lines: ['            sum += item.getPrice() * item.getQuantity();'],
        },
      ],
    },
  },
  {
    language: 'python',
    difficulty: '1',
    category: 'security_owasp',
    scenario: {
      title: 'PR #8 : Longueur minimale du mot de passe',
      ticket_context:
        '[AUTH-9] À l’inscription, refuser les mots de passe de moins de 12 caractères avec un message clair.',
      persona: {
        name: 'Emma',
        archetype: 'débutante_motivée',
        bio: 'Apprend Python depuis un mois, relit sa logique mais pas toujours la syntaxe.',
      },
      files: [
        {
          path: 'app/validators.py',
          hunks: [
            {
              start_line: 1,
              lines: [
                { kind: 'add', text: 'MIN_LENGTH = 12' },
                { kind: 'add', text: '' },
                { kind: 'add', text: '' },
                { kind: 'add', text: 'def validate_password(password: str) -> None:' },
                { kind: 'add', text: '    if len(password) < MIN_LENGTH', issue_ref: 'I1' },
                { kind: 'add', text: '        raise ValueError("Le mot de passe doit faire au moins 12 caractères.")' },
              ],
            },
          ],
        },
      ],
      issues: [
        {
          id: 'I1',
          type: 'security_owasp',
          severity: 'major',
          expected_issue: 'Il manque les deux-points « : » à la fin du if.',
          why: 'En Python, un if doit se terminer par « : ». Sans eux, le module lève une SyntaxError à l’import et l’inscription est cassée.',
          ideal_fix: 'Ajouter « : » après la condition.',
          fixed_lines: ['    if len(password) < MIN_LENGTH:'],
        },
      ],
    },
  },
  {
    language: 'typescript',
    difficulty: '2',
    category: 'architecture',
    scenario: {
      title: 'PR #27 : Affichage des noms des participants',
      ticket_context:
        '[EVT-14] Sur la page d’un événement, afficher la liste des noms des participants, en majuscules.',
      persona: {
        name: 'Hugo',
        archetype: 'junior_appliqué',
        bio: 'Code proprement mais teste uniquement avec une liste vide.',
      },
      files: [
        {
          path: 'src/events/participants.ts',
          hunks: [
            {
              start_line: 1,
              lines: [
                { kind: 'add', text: 'export interface Participant {' },
                { kind: 'add', text: '  name: string' },
                { kind: 'add', text: '}' },
                { kind: 'add', text: '' },
                { kind: 'add', text: 'export function participantNames(participants: Participant[]): string[] {' },
                { kind: 'add', text: '  const names: string[] = []' },
                { kind: 'add', text: '  for (let i = 0; i <= participants.length; i++) {', issue_ref: 'I1' },
                { kind: 'add', text: '    names.push(participants[i].name.toUpperCase())' },
                { kind: 'add', text: '  }' },
                { kind: 'add', text: '  return names' },
                { kind: 'add', text: '}' },
              ],
            },
          ],
        },
      ],
      issues: [
        {
          id: 'I1',
          type: 'architecture',
          severity: 'major',
          expected_issue: 'La boucle va un tour trop loin : « <= » au lieu de « < ».',
          why: 'Au dernier tour, i vaut participants.length : participants[i] est undefined et l’accès à .name lève une TypeError, dès qu’il y a au moins un participant.',
          ideal_fix: 'Utiliser i < participants.length, ou plus simplement participants.map((p) => p.name.toUpperCase()).',
          fixed_lines: ['  for (let i = 0; i < participants.length; i++) {'],
        },
      ],
    },
  },
]

/** Entrée la plus proche des paramètres, à défaut de correspondance exacte. */
export function pickCatalogEntry(
  params: { language: Language; difficulty: Difficulty; category: Category },
  random: () => number = Math.random,
): CatalogEntry {
  // Le niveau prime : un débutant ne doit jamais recevoir un scénario de niveau 5.
  const sameLevel = MOCK_CATALOG.filter((e) => e.difficulty === params.difficulty)
  const tiers = [
    sameLevel.filter((e) => e.language === params.language && e.category === params.category),
    sameLevel.filter((e) => e.category === params.category),
    sameLevel.filter((e) => e.language === params.language),
    sameLevel,
    MOCK_CATALOG.filter(
      (e) => e.language === params.language && e.category === params.category,
    ),
    MOCK_CATALOG.filter((e) => e.category === params.category),
    MOCK_CATALOG.filter((e) => e.language === params.language),
    MOCK_CATALOG,
  ]
  const pool = tiers.find((t) => t.length > 0)!
  return pool[Math.floor(random() * pool.length)]!
}
