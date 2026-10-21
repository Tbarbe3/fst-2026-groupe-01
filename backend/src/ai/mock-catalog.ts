import type { Category, Difficulty, GeneratedScenario, Language, Locale } from './types.js'

interface IssueText {
  expected_issue: string
  why: string
  ideal_fix: string
}

/** Textes anglais du scénario ; le code du diff est commun aux deux langues. */
interface EnglishText {
  title: string
  ticket_context: string
  persona: { archetype: string; bio: string }
  issues: Record<string, IssueText>
}

export interface CatalogEntry {
  language: Language
  difficulty: Difficulty
  category: Category
  en: EnglishText
  scenario: GeneratedScenario
}

export function localizedScenario(entry: CatalogEntry, locale: Locale): GeneratedScenario {
  const scenario = structuredClone(entry.scenario)
  if (locale === 'fr') return scenario
  const { en } = entry
  return {
    ...scenario,
    title: en.title,
    ticket_context: en.ticket_context,
    persona: { ...scenario.persona, ...en.persona },
    issues: scenario.issues.map((issue) => ({ ...issue, ...en.issues[issue.id] })),
  }
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
    en: {
      title: 'PR #142: Receiving Stripe webhooks',
      ticket_context: '[PAY-218] When a customer completes a payment, Stripe sends us a checkout.session.completed event. We must listen to it to mark the order as paid and send the confirmation email.',
      persona: {
        archetype: 'rushed_junior',
        bio: 'Ships fast, tests the happy path with the Stripe tool and moves on.',
      },
      issues: {
        I1: {
          expected_issue: 'The Stripe webhook signature is not verified.',
          why: 'The endpoint is public: anyone can send a fake checkout.session.completed event and get an order marked as paid without paying.',
          ideal_fix: 'Read the raw body (express.raw) and call stripe.webhooks.constructEvent(rawBody, req.headers["stripe-signature"], endpointSecret) before any processing.',
        },
      },
    },
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
    en: {
      title: "PR #87: CSV export of the month's orders",
      ticket_context: "[DATA-54] Accounting wants a CSV export of the month's orders with, for each one, the customer name and the number of items. About 40,000 orders per month.",
      persona: {
        archetype: 'methodical_intermediate',
        bio: 'Clean, readable code, but tests on a ten-row development database.',
      },
      issues: {
        I1: {
          expected_issue: 'N+1 queries: two SQL queries per order inside the loop.',
          why: 'For 40,000 orders the loop runs 80,001 queries. The export will take minutes and load the database.',
          ideal_fix: 'Load the customer with select_related and count items with annotate(Count(...)) in the initial query.',
        },
        I2: {
          expected_issue: 'The whole CSV is built in memory before being returned.',
          why: 'The full file lives in the worker memory. A generator or a streaming response would avoid the memory spike.',
          ideal_fix: 'Write row by row into a StreamingHttpResponse through a generator.',
        },
      },
    },
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
    en: {
      title: 'PR #311: In-memory exchange rate cache',
      ticket_context: '[FX-12] The exchange rate API is slow and billed per call. Set up a 5-minute in-memory cache shared by all HTTP requests of the service.',
      persona: {
        archetype: 'confident_senior',
        bio: 'Experienced, writes idiomatic code quickly and sometimes skips the concurrency review.',
      },
      issues: {
        I1: {
          expected_issue: 'The map is read and written from several goroutines without a lock.',
          why: 'Each HTTP request runs in its own goroutine. Concurrent access to a Go map triggers "fatal error: concurrent map writes" and brings the whole service down.',
          ideal_fix: 'Protect the map with a sync.RWMutex (RLock to read, Lock to write), or use singleflight to also avoid duplicate calls.',
        },
      },
    },
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
    en: {
      title: 'PR #64: Promo codes on the cart',
      ticket_context: '[SHOP-97] Allow entering a promo code at checkout. A code has a discount percentage and a maximum number of uses. A customer can use only one code per order.',
      persona: {
        archetype: 'diligent_junior',
        bio: 'Follows the ticket to the letter and covers the happy path with unit tests.',
      },
      issues: {
        I1: {
          expected_issue: 'Nothing prevents applying several codes, or the same one several times, to a cart.',
          why: 'Each call lowers the total again. By calling the endpoint repeatedly, a customer drives the cart towards zero, breaking the "one code per order" rule.',
          ideal_fix: 'Reject if cart.getPromoCode() is already set, store the code on the cart and recompute the discount from the subtotal.',
        },
        I2: {
          expected_issue: 'The maximum number of uses of the code is never checked.',
          why: 'The counter is incremented but never compared with promo.getMaxUses(): a code limited to 100 uses stays valid forever.',
          ideal_fix: 'Check promo.getUses() < promo.getMaxUses() before applying the discount.',
        },
      },
    },
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
    en: {
      title: 'PR #12: Cart total with shipping fees',
      ticket_context: '[SHOP-31] The cart total must include €4.90 shipping when the items amount is below €50.',
      persona: {
        archetype: 'beginner_intern',
        bio: 'First internship, writes code in a text editor and pushes without compiling.',
      },
      issues: {
        I1: {
          expected_issue: 'The semicolon is missing at the end of the line.',
          why: 'In Java every statement ends with a semicolon: without it the file does not compile and the cart can no longer be computed.',
          ideal_fix: 'Add ";" at the end of the statement.',
        },
      },
    },
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
    en: {
      title: 'PR #8: Minimum password length',
      ticket_context: '[AUTH-9] On sign-up, reject passwords shorter than 12 characters with a clear message.',
      persona: {
        archetype: 'motivated_beginner',
        bio: 'Has been learning Python for a month, checks the logic but not always the syntax.',
      },
      issues: {
        I1: {
          expected_issue: 'The colon ":" is missing at the end of the if.',
          why: 'In Python an if must end with ":". Without it the module raises a SyntaxError on import and sign-up is broken.',
          ideal_fix: 'Add ":" after the condition.',
        },
      },
    },
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
    en: {
      title: "PR #27: Displaying participants' names",
      ticket_context: "[EVT-14] On an event page, display the list of participants' names in uppercase.",
      persona: {
        archetype: 'diligent_junior',
        bio: 'Writes clean code but only tests with an empty list.',
      },
      issues: {
        I1: {
          expected_issue: 'The loop goes one step too far: "<=" instead of "<".',
          why: 'On the last iteration i equals participants.length: participants[i] is undefined and reading .name throws a TypeError as soon as there is at least one participant.',
          ideal_fix: 'Use i < participants.length, or simply participants.map((p) => p.name.toUpperCase()).',
        },
      },
    },
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
