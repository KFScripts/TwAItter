export interface IContextPayload {
  dateTimeFormatted: string;
  trendingTopics: string[];
  recentEvents: string[];
}

export class NewsService {
  private static italianTrendingCategories = [
    {
      category: 'Videogiochi & Gaming',
      topics: [
        'Nuovi rumor su Nintendo Switch 2 e specifiche hardware',
        'Aspettative per Monster Hunter Wilds e framerate su console',
        'Discussioni su GTA 6 e la grandezza della mappa di Vice City',
        'Elden Ring DLC Shadow of the Erdtree e bilanciamento dei boss',
        'Gaming su PC vs Console: prezzi delle GPU e Steam Deck'
      ]
    },
    {
      category: 'Tecnologia & Web',
      topics: [
        'Nuovi modelli LLM open-source che girano localmente su PC',
        'Framework web moderni: dibattito tra complessità e performance',
        'Privacy online, browser indipendenti e blocco dei tracker',
        'Autonomia delle batterie nei nuovi smartphone e laptop'
      ]
    },
    {
      category: 'Cinema, Serie TV & Intrattenimento',
      topics: [
        'Film in arrivo e festival del cinema di Venezia',
        'Le migliori serie TV del momento e la qualità della scrittura',
        'Uscite anime stagionali e adattamenti live-action',
        'Concerti live, festival musicali estivi e costo dei biglietti'
      ]
    },
    {
      category: 'Attualità & Vita Quotidiana in Italia',
      topics: [
        'Inizio della nuova stagione di Serie A e ultime trattative di calciomercato',
        'Rientro dalle ferie di agosto e organizzazione del lavoro da remoto',
        'Ondate di calore estive e meteo nelle città italiane',
        'Cultura del caffè al bar, cibo regionale e ristoranti'
      ]
    }
  ];

  public static getCurrentContext(language: string = 'it'): IContextPayload {
    const now = new Date();

    const locale = language === 'it' ? 'it-IT' : 'en-US';
    const dateTimeFormatted = now.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const selectedEvents: string[] = [];
    const trendingTags: string[] = [];

    for (const cat of this.italianTrendingCategories) {
      const randomTopic = cat.topics[Math.floor(Math.random() * cat.topics.length)];
      selectedEvents.push(`[${cat.category}] ${randomTopic}`);
    }

    if (language === 'it') {
      trendingTags.push('#SerieA', '#GamingITA', '#Switch2', '#Cinema', '#TechITA', '#Calciomercato');
    } else {
      trendingTags.push('#Gaming', '#TechNews', '#Cinema', '#Hardware', '#OpenSource');
    }

    return {
      dateTimeFormatted,
      trendingTopics: trendingTags,
      recentEvents: selectedEvents
    };
  }
}
