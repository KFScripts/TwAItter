import { Types } from 'mongoose';
import { Agent, IAgent } from '../models/Agent';
import { User } from '../models/User';
import { Post, IPost } from '../models/Post';
import { Reply, IReply } from '../models/Reply';
import { DirectMessage } from '../models/DirectMessage';
import { SupportTicket } from '../models/SupportTicket';
import { Settings } from '../models/Settings';
import { LLMGateway, LLMMessage } from './llmGateway';
import { VisionGateway } from './visionGateway';
import { ImageGateway } from './imageGateway';
import { NewsService } from './newsService';
import { NotificationService } from './notificationService';
import { socketManager } from '../sockets/socketManager';
import { tryParseJsonObject } from '../utils/jsonRepair';
import { RelationshipService } from './relationshipService';
import { ChatScreenshotService } from './chatScreenshotService';

export class AgentEngine {
  private static isRunning = false;
  private static activeTimeouts: Map<string, NodeJS.Timeout> = new Map();

  public static async startAutonomousEngine() {
    if (this.isRunning) return;
    this.isRunning = true;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        language: process.env.PLATFORM_LANGUAGE || 'it'
      });
    }

    settings.isSimulationActive = true;
    await settings.save();

    socketManager.broadcast('ENGINE_STATUS', { isRunning: true });
    console.log(`[AI Engine] Motore Autonomo Agenti avviato (Lingua: ${settings.language || 'it'})`);

    this.scheduleNextOrganicTurns();
  }

  public static async stopAutonomousEngine() {
    if (!this.isRunning) return;
    this.isRunning = false;

    for (const timeout of this.activeTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();

    const settings = await Settings.findOne();
    if (settings) {
      settings.isSimulationActive = false;
      await settings.save();
    }

    socketManager.broadcast('ENGINE_STATUS', { isRunning: false });
    console.log('[AI Engine] Motore Autonomo Agenti fermato.');
  }

  public static async scheduleNextOrganicTurns() {
    if (!this.isRunning) return;

    try {
      const activeAgents = await Agent.find({ isActive: true });
      if (activeAgents.length === 0) return;

      const randomAgent = activeAgents[Math.floor(Math.random() * activeAgents.length)];
      if (randomAgent) {
        await this.executeAgentTurn(randomAgent);
      }
    } catch (err: any) {
      console.error('[AI Engine Error] Errore scheduler autonomo:', err.message);
    } finally {
      if (this.isRunning) {
        const settings = await Settings.findOne();
        const baseInterval = settings?.simulationTickMs || 15000;
        // Jitter organico non programmato (+/- 40% di variazione casuale per simulare attività umana)
        const organicDelay = Math.floor(baseInterval * (0.6 + Math.random() * 0.8));
        const timer = setTimeout(() => {
          this.scheduleNextOrganicTurns();
        }, organicDelay);
        this.activeTimeouts.set('main_organic', timer);
      }
    }
  }

  // Evento reattivo: un utente o un'altra AI ha creato un post o menzionato qualcuno
  public static async onPostCreated(post: IPost) {
    if (!this.isRunning) return;

    try {
      const mentions = post.content.match(/@[a-zA-Z0-9_]+/g);
      if (mentions && mentions.length > 0) {
        for (const mention of mentions) {
          const username = mention.replace('@', '');
          const mentionedAgent = await Agent.findOne({ username, isActive: true });
          if (mentionedAgent && mentionedAgent.username !== post.authorUsername) {
            const reactionDelay = Math.floor(3000 + Math.random() * 5000);
            setTimeout(() => {
              this.executeAgentTurn(mentionedAgent);
            }, reactionDelay);
          }
        }
      }

      if (Math.random() < 0.4) {
        const candidates = await Agent.find({
          username: { $ne: post.authorUsername },
          isActive: true
        }).limit(6);
        if (candidates.length > 0) {
          const chosen = candidates[Math.floor(Math.random() * candidates.length)];
          const delay = Math.floor(5000 + Math.random() * 7000);
          setTimeout(() => {
            this.executeAgentTurn(chosen);
          }, delay);
        }
      }
    } catch (err: any) {
      console.error('[AI Engine Error] Errore onPostCreated:', err.message);
    }
  }

  public static async onReplyCreated(reply: IReply, post: IPost) {
    if (!this.isRunning) return;

    try {
      const mentions = reply.content.match(/@[a-zA-Z0-9_]+/g);
      if (mentions && mentions.length > 0) {
        for (const mention of mentions) {
          const username = mention.replace('@', '');
          const mentionedAgent = await Agent.findOne({ username, isActive: true });
          if (mentionedAgent && mentionedAgent.username !== reply.authorUsername) {
            const reactionDelay = Math.floor(3000 + Math.random() * 5000);
            setTimeout(() => {
              this.executeAgentTurn(mentionedAgent);
            }, reactionDelay);
          }
        }
      }

      let parentAuthor = post.authorUsername;
      if (reply.parentReplyId) {
        const parentRep = await Reply.findById(reply.parentReplyId);
        if (parentRep) parentAuthor = parentRep.authorUsername;
      }

      if (parentAuthor !== reply.authorUsername) {
        const targetAgent = await Agent.findOne({ username: parentAuthor, isActive: true });
        if (targetAgent) {
          const replyDelay = Math.floor(4000 + Math.random() * 6000);
          setTimeout(() => {
            this.executeAgentTurn(targetAgent);
          }, replyDelay);
        }
      }
    } catch (err: any) {
      console.error('[AI Engine Error] Errore onReplyCreated:', err.message);
    }
  }

  public static async onDirectMessageReceived(dm: any) {
    if (!this.isRunning) return;

    try {
      const recipient = await Agent.findOne({ username: dm.recipientUsername, isActive: true });
      if (!recipient || dm.senderUsername === recipient.username) return;

      const currentRel = await RelationshipService.getRelationship(recipient.username, dm.senderUsername);
      if (currentRel.isBlocked) {
        return;
      }

      const conversationMessages = await DirectMessage.find({
        conversationId: dm.conversationId
      })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean();

      const isSoftware = recipient.accountType === 'software';
      const randomFactor = Math.random();

      const deliveryDelay = Math.floor(400 + Math.random() * 800);
      const readDelay = Math.floor(
        isSoftware
          ? 1000 + randomFactor * 2000
          : 2500 + randomFactor * 9000
      );
      const typingStartDelay = Math.max(readDelay + 800, readDelay + Math.floor(randomFactor * 3500));
      const replyDelay = typingStartDelay + Math.floor(2500 + randomFactor * 4000);

      setTimeout(async () => {
        try {
          const now = new Date();
          await DirectMessage.findByIdAndUpdate(dm._id, {
            status: 'delivered',
            deliveredAt: now
          });
          socketManager.broadcast('DM_STATUS_UPDATED', {
            messageId: dm._id,
            conversationId: dm.conversationId,
            status: 'delivered',
            deliveredAt: now
          });
        } catch {}
      }, deliveryDelay);

      setTimeout(async () => {
        try {
          const now = new Date();
          await DirectMessage.findByIdAndUpdate(dm._id, {
            status: 'read',
            isRead: true,
            readAt: now
          });
          socketManager.broadcast('DM_STATUS_UPDATED', {
            messageId: dm._id,
            conversationId: dm.conversationId,
            status: 'read',
            readAt: now
          });
        } catch {}
      }, readDelay);

      setTimeout(() => {
        socketManager.broadcast('AGENT_TYPING', {
          conversationId: dm.conversationId,
          username: recipient.username,
          isTyping: true
        });
      }, typingStartDelay);

      setTimeout(async () => {
        try {
          const settings = await Settings.findOne();
          const language = settings?.language || process.env.PLATFORM_LANGUAGE || 'it';
          const memoriesText = recipient.memories?.length ? recipient.memories.join('\n- ') : 'Nessuno';

          const isImageMedia = (mediaUrl?: string | null, attachmentType?: string | null) => {
            if (!mediaUrl) return false;
            if (attachmentType === 'image') return true;
            if (attachmentType === 'file') return false;
            return mediaUrl.startsWith('data:image') || /\.(jpeg|jpg|gif|png|webp|svg|bmp)($|\?)/i.test(mediaUrl);
          };

          let attachmentDesc = '';
          if (isImageMedia(dm.mediaUrl, dm.attachmentType)) {
            try {
              attachmentDesc = await VisionGateway.describeImage(dm.mediaUrl!, language);
            } catch {}
          } else if (dm.mediaUrl && dm.fileName) {
            attachmentDesc = `File allegato: ${dm.fileName} (${dm.fileSize ? Math.round(dm.fileSize / 1024) + ' KB' : ''})`;
          }

          const orderedHistory = await Promise.all(
            conversationMessages.reverse().map(async (m) => {
              let text = m.content || '';
              if (isImageMedia(m.mediaUrl, m.attachmentType)) {
                try {
                  const imgDesc = await VisionGateway.describeImage(m.mediaUrl!, language);
                  text = text ? `${text}\n[Immagine allegata / OCR]: ${imgDesc}` : `[Immagine allegata / OCR]: ${imgDesc}`;
                } catch {}
              } else if (m.mediaUrl && m.fileName) {
                text = text ? `${text}\n[File]: ${m.fileName}` : `[File]: ${m.fileName}`;
              }
              return {
                from: m.senderUsername,
                text
              };
            })
          );

          const systemPrompt = `Sei @${recipient.username} (${recipient.displayName}), ${recipient.age || 28} anni, vivi a ${recipient.city || 'Italia'} e lavori come ${recipient.profession || 'cittadino'}.
Personalità: ${recipient.personalityPrompt}
Umore attuale: ${recipient.mood || 'neutro'}
Bio: ${recipient.bio}
Ricordi:
- ${memoriesText}

Rapporto e sentimenti verso @${dm.senderUsername}:
- Stato relazione: ${currentRel.status}
- Affinità emotiva: ${currentRel.affinity} (-100 a +100)
- Fiducia: ${currentRel.trust} (0 a 100)
- Interesse sentimentale: ${currentRel.romance} (0 a 100)
- Note storiche: ${currentRel.notes || 'Nessuna nota specifica'}

Stai parlando in CHAT PRIVATA (DM) con @${dm.senderUsername}.
REGOLE DM ED EVOLUZIONE RELAZIONI:
- DIVIETO ASSOLUTO DI FORMALISMO O FRASI DA BOT/ASSISTENTE AI (niente "Certamente", "Come posso aiutarti", "In merito a quanto affermi").
- DIVIETO EMOJI DA BOT: Non infarcire i messaggi di emoji tematiche decorative (niente ✨, 🚀, 🤖, 🍕 ecc.). Scrivi testo naturale e asciutto, le persone reali usano raramente emoji.
- Rispondi come una persona vera e spontanea sui social: informale, breve (1-3 frasi), adatta al tuo carattere, umore e livello di confidenza con questa persona.
- Puoi essere affettuoso/a con chi ti piace o è amico, sarcastico/a, freddo/a con chi non sopporti, o mandarlo a quel paese se ti offende o fa spam.
- Se ti invia una foto, meme o screenshot, leggi attentamente la descrizione visiva e l'OCR di tutto il testo contenuto e commentalo direttamente con reazione naturale!
- Se l'interlocutore è insopportabile, tossico, offensivo o ti fa arrabbiare seriamente, puoi decidere di BLOCCARLO impostando "blockUser": true.
- Valuta come cambia il tuo sentimento dopo questo messaggio aggiornando "deltaAffinity" (-25 a +25), "deltaTrust" (-25 a +25) e "deltaRomance" (-20 a +20).
- Se il messaggio non merita risposta o vuoi ignorarlo, imposta "ignore": true.
- Lingua: ${language === 'it' ? 'ITALIANO' : language.toUpperCase()}.

Restituisci ESCLUSIVAMENTE un JSON:
{
  "ignore": false,
  "reply": "<risposta naturale, concisa e spontanea in DM>",
  "deltaAffinity": 0,
  "deltaTrust": 0,
  "deltaRomance": 0,
  "blockUser": false,
  "blockReason": "<motivo del blocco se blockUser true, altrimenti null>",
  "relationshipNotes": "<breve nota su cosa provi ora verso questa persona, altrimenti null>",
  "newMemory": "<1 appunto se rilevante per i tuoi ricordi a lungo termine, altrimenti null>"
}`;

          const userPrompt = `Cronologia recente della chat:
${JSON.stringify(orderedHistory, null, 2)}

Ultimo messaggio da @${dm.senderUsername}: "${dm.content}"
${attachmentDesc ? `[Allegato inviato nella chat / OCR]: ${attachmentDesc}` : ''}

Rispondi al messaggio in DM (formato JSON):`;

          const raw = await LLMGateway.generateCompletion(recipient, {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: recipient.modelConfig?.temperature || 0.9,
            maxTokens: 300,
            responseFormatJson: true
          });

          socketManager.broadcast('AGENT_TYPING', {
            conversationId: dm.conversationId,
            username: recipient.username,
            isTyping: false
          });

          const parsed = tryParseJsonObject(this.stripReasoningWrappers(raw));
          if (parsed?.ignore === true) {
            return;
          }

          if (parsed?.blockUser === true) {
            await RelationshipService.blockUser(
              recipient.username,
              dm.senderUsername,
              parsed.blockReason || 'Bloccato dopo conversazione DM spiacevole'
            );
            const blockMemory = `Ho bloccato @${dm.senderUsername} nei DM perché mi ha dato sui nervi.`;
            await Agent.findByIdAndUpdate(recipient._id, {
              $push: { memories: { $each: [blockMemory], $slice: -15 } }
            });
            socketManager.broadcast('USER_BLOCKED', {
              sourceUsername: recipient.username,
              targetUsername: dm.senderUsername
            });
            return;
          }

          if (parsed?.newMemory && typeof parsed.newMemory === 'string') {
            await Agent.findByIdAndUpdate(recipient._id, {
              $push: { memories: { $each: [parsed.newMemory.slice(0, 120)], $slice: -15 } }
            });
          }

          if (parsed?.relationshipNotes || parsed?.deltaAffinity || parsed?.deltaTrust || parsed?.deltaRomance) {
            await RelationshipService.updateScores(
              recipient.username,
              dm.senderUsername,
              {
                affinity: Number(parsed.deltaAffinity) || 0,
                trust: Number(parsed.deltaTrust) || 0,
                romance: Number(parsed.deltaRomance) || 0
              },
              parsed.relationshipNotes
            );
          }

          const replyText = parsed?.reply || parsed?.content;
          if (replyText && !this.looksLikeLeakedReasoning(replyText)) {
            const newDm = await DirectMessage.create({
              conversationId: dm.conversationId,
              senderUsername: recipient.username,
              recipientUsername: dm.senderUsername,
              content: String(replyText).slice(0, 300)
            });

            socketManager.broadcast('NEW_DM', { message: newDm });

            NotificationService.createNotification({
              recipientUsername: dm.senderUsername,
              senderUsername: recipient.username,
              type: 'dm',
              conversationId: dm.conversationId,
              content: String(replyText).slice(0, 150)
            }).catch(console.error);
          }
        } catch (err: any) {
          socketManager.broadcast('AGENT_TYPING', {
            conversationId: dm.conversationId,
            username: recipient.username,
            isTyping: false
          });
          console.error(`[AI Engine Error] Errore risposta DM @${recipient.username}:`, err.message);
        }
      }, replyDelay);
    } catch (err: any) {
      console.error('[AI Engine Error] Errore onDirectMessageReceived:', err.message);
    }
  }

  public static async triggerManualTurn(agentUsername: string) {
    const agent = await Agent.findOne({ username: agentUsername, isActive: true });
    if (agent) {
      await this.executeAgentTurn(agent);
    }
  }

  public static async executeAgentTurn(agent: IAgent) {
    const settings = await Settings.findOne();
    const language = settings?.language || process.env.PLATFORM_LANGUAGE || 'it';

    const recentRootPosts = await Post.find({
      $or: [{ parentPostId: { $exists: false } }, { parentPostId: null }]
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const rootPostIds = recentRootPosts.map((p) => p._id);
    const recentReplies = await Reply.find({ postId: { $in: rootPostIds } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const relationships = await RelationshipService.getSignificantRelationships(agent.username);
    const contextPayload = await NewsService.getCurrentContext(language, agent);

    const recentDms = await DirectMessage.find({
      $or: [{ senderUsername: agent.username }, { recipientUsername: agent.username }]
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const dmConversations: Record<string, any[]> = {};
    for (const dm of recentDms.reverse()) {
      const partner = dm.senderUsername === agent.username ? dm.recipientUsername : dm.senderUsername;
      if (!dmConversations[partner]) {
        dmConversations[partner] = [];
      }
      dmConversations[partner].push({
        from: dm.senderUsername,
        to: dm.recipientUsername,
        content: dm.content,
        attachmentType: dm.attachmentType || undefined,
        createdAt: dm.createdAt
      });
    }

    const allOtherAgents = await Agent.find({ username: { $ne: agent.username }, isActive: true })
      .select('username displayName bio city profession mood')
      .limit(15)
      .lean();

    const realUsers = await User.find({ username: { $ne: agent.username } })
      .select('username displayName bio city')
      .limit(10)
      .lean();

    const otherUsers = [
      ...allOtherAgents.map((a) => ({
        username: a.username,
        displayName: a.displayName,
        bio: a.bio,
        city: a.city,
        profession: a.profession,
        isAgent: true
      })),
      ...realUsers.map((u) => ({
        username: u.username,
        displayName: u.displayName,
        bio: u.bio,
        city: u.city,
        isAgent: false
      }))
    ];

    const postContext = await Promise.all(
      recentRootPosts.map(async (p) => {
        let imageDescription = '';
        if (p.mediaUrl) {
          imageDescription = await VisionGateway.describeImage(p.mediaUrl, language);
        }
        const threadReplies = recentReplies.filter((r) => String(r.postId) === String(p._id));
        const formattedReplies = await Promise.all(
          threadReplies.map(async (r) => {
            let replyImageDesc = '';
            if (r.mediaUrl) {
              replyImageDesc = await VisionGateway.describeImage(r.mediaUrl, language);
            }
            return {
              replyId: r._id.toString(),
              parentReplyId: r.parentReplyId ? r.parentReplyId.toString() : null,
              author: `@${r.authorUsername}`,
              content: r.content,
              attachedImageDescription: replyImageDesc || undefined,
              likes: r.likesCount
            };
          })
        );

        return {
          id: p._id.toString(),
          author: `@${p.authorUsername}`,
          content: p.content,
          attachedImageDescription: imageDescription || undefined,
          likes: p.likesCount,
          commentsCount: p.repliesCount,
          isOwn: p.authorUsername === agent.username,
          subthreadReplies: formattedReplies
        };
      })
    );

    const memoriesText = agent.memories && agent.memories.length > 0 ? agent.memories.join('\n- ') : 'Nessun ricordo pregresso.';

    const systemPrompt = `Sei @${agent.username} (${agent.displayName}), ${agent.age || 28} anni, vivi a ${agent.city || 'Italia'} e lavori come ${agent.profession || 'cittadino'}.
Aspetto Visivo: ${agent.physicalAppearance || 'Persona comune in abiti informali'}
Personalità & Mood:
${agent.personalityPrompt} (Umore: ${agent.mood || 'naturale'})

Bio: ${agent.bio}
Ricordi:
- ${memoriesText}

REGOLE SOCIAL NETWORK (STILE X / TWITTER UMANO AL 100%):
- LUNGHEZZA DEI POST (BREVITÀ): I veri post su X sono BREVI e INCISIVI: 1-2 frasi (tipicamente tra 5 e 30 parole, circa 40-200 caratteri). DIVIETO ASSOLUTO di muri di testo o elenchi.
- PER LE RISPOSTE (REPLY): Sii ancora più breve, rapido e diretto (spesso una sola battuta, una domanda secca o mezza riga).
- DIVIETO ASSOLUTO DI SCRIVERE GIORNI, ORARI O DATE: Non inserire MAI nel testo del post il giorno, l'ora o la data (es. NO "Sabato 15:56", NO "Sabato,", NO "15:56,", NO "Oggi alle..."). L'interfaccia ha già il timestamp automatico: chi scrive l'orario sembra un bot guasto o un log di sistema.
- DIVIETO ASSOLUTO DI FARE RASSEGNE STAMPA O RIASSUNTI DI NOTIZIE/FATTI: VIETATO fare collage o elenchi di cose successe ("X è successo a Cuba, Y a Cremona, Z sul gatto..."). Esprimi solo UN singolo pensiero personale, una battuta o un'opinione.
- DIVIETO EMOJI DA AI: La maggior parte dei post deve essere solo testo senza emoji. DIVIETO di attaccare emoji a fine frase (NO 🌾💧, NO 🍕✈️, NO 🚀, 💻, 🧠, 🤖, ✨, ☕, 📱, 🔥).
- NATURALEZZA E SPONTANEITÀ UMANA: Scrivi in modo disinvolto, emotivo, divertente o polemico, NON pragmatico, didascalico o analitico.
- INTERAZIONE CON LA TIMELINE:
  * È preferibile COMMENTARE (REPLY) o REAGIRE (REACT) ai post recenti nella Timeline con battute o reazioni personali invece di pubblicare a vuoto.
- Lingua: ${language === 'it' ? 'ITALIANO' : language.toUpperCase()}.
- Se alleghi una foto generata ("imagePrompt"), scrivi la descrizione in inglese. Altrimenti null.`;

    const randomTopic = contextPayload.realWorldNews?.length && Math.random() < 0.25
      ? contextPayload.realWorldNews[Math.floor(Math.random() * contextPayload.realWorldNews.length)]
      : null;

    const userPrompt = `Timeline Social (Post e Risposte recenti):
${JSON.stringify(postContext, null, 2)}

Chat Private Recenti (DM):
${JSON.stringify(dmConversations, null, 2)}
${randomTopic ? `\nArgomento di discussione opzionale (puoi ignorarlo o commentarlo se ti interessa): ${randomTopic}\n` : ''}
Scegli UNA sola azione (REPLY o REACT per interagire con la Timeline, oppure NEW_POST per un tuo pensiero spontaneo - MAX 1-2 frasi, testo naturale senza date né orari):
{
  "action": "NEW_POST" | "LEAK_CHAT" | "REPLY" | "REACT" | "DIRECT_MESSAGE" | "SUPPORT_TICKET",
  "targetPostId": "<id del post o della risposta/subthread da commentare o a cui reagire se REPLY o REACT, altrimenti null>",
  "targetUsername": "<username se DIRECT_MESSAGE, altrimenti null>",
  "leakChatPartnerUsername": "<username della chat di cui pubblicare lo screenshot se LEAK_CHAT o NEW_POST con screen, altrimenti null>",
  "content": "<testo naturale, BREVE (1-2 frasi, senza date/orari, 40-200 caratteri) e spontaneo>",
  "imagePrompt": "<descrizione in inglese per l'immagine se decidi di generare un'immagine artistica/foto, altrimenti null>",
  "newMemory": "<1 breve appunto da memorizzare se rilevante, altrimenti null>",
  "reactionType": "like" | "repost" | "laugh" | "angry" | "fire" | "clown",
  "ticketCategory": "harassment" | "hate_speech" | "technical_bug" | "misinformation" | "moderation_appeal" | "other",
  "ticketPriority": "low" | "medium" | "high" | "urgent",
  "ticketSubject": "<titolo ticket se SUPPORT_TICKET>",
  "ticketDescription": "<dettagli se SUPPORT_TICKET>"
};`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      console.log(`[AI Engine] Invio prompt al modello LLM per @${agent.username}...`);
      const completionOpts = {
        temperature: agent.modelConfig?.temperature || 0.9,
        maxTokens: agent.modelConfig?.maxTokens || 300,
        responseFormatJson: true
      };

      const maxAttempts = 3;
      let decision: any | null = null;
      let lastRaw = '';

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const attemptMessages: LLMMessage[] =
          attempt === 1
            ? messages
            : [
                ...messages,
                { role: 'assistant', content: lastRaw.slice(0, 1000) },
                {
                  role: 'user',
                  content:
                    'ERRORE: il JSON precedente è incompleto, troncato o non valido. Rispondi ORA con UN SOLO oggetto JSON valido e COMPLETO, senza markdown e senza spiegazioni. Chiudi tutte le stringhe e le parentesi. "content" è solo il testo pubblico da pubblicare (max 1024 caratteri), mai il ragionamento.'
                }
              ];

        lastRaw = await LLMGateway.generateCompletion(agent, {
          messages: attemptMessages,
          ...completionOpts,
          temperature: attempt === 1 ? completionOpts.temperature : 0.4
        });

        decision = this.parseAgentDecision(lastRaw);
        if (decision) break;

        console.warn(
          `[AI Engine] Tentativo ${attempt}/${maxAttempts}: JSON non valido per @${agent.username}${
            attempt < maxAttempts ? ', retry...' : ''
          }\nRisposta ricevuta:\n${lastRaw}`
        );
      }

      if (!decision) {
        console.warn(
          `[AI Engine] Output non valido per @${agent.username} dopo ${maxAttempts} tentativi (JSON irreparabile). Turno saltato.\nUltima risposta ricevuta:\n${lastRaw}`
        );
        return;
      }

      console.log(`[AI Engine] Risposta LLM ricevuta. Azione: ${decision.action}`);
      if (decision.content) {
        console.log(`[AI Engine] Testo generato: "${String(decision.content).slice(0, 100)}..."`);
      }
      if (decision.imagePrompt) {
        console.log(`[AI Engine] Prompt immagine: "${decision.imagePrompt}"`);
      }

      if (decision.newMemory && typeof decision.newMemory === 'string') {
        await Agent.findByIdAndUpdate(agent._id, {
          $push: { memories: { $each: [decision.newMemory.slice(0, 150)], $slice: -15 } }
        });
      }

      this.preferCommentOverNewPost(decision, agent, recentRootPosts);
      const published = await this.processDecision(agent, decision);
      if (published) {
        console.log(`[AI Engine] Azione di @${agent.username} pubblicata con successo.`);
      }
    } catch (err: any) {
      console.error(`[AI Engine Error] Errore chiamata AI per @${agent.username}:`, err.message);
    }
  }

  private static async processDecision(agent: IAgent, decision: any): Promise<boolean> {
    if (this.looksLikeLeakedReasoning(decision?.content)) {
      console.warn(`[AI Engine] Blocco pubblicazione: content non è un post autentico.`);
      return false;
    }

    let mediaUrl: string | null = null;

    const leakPartner = decision.leakChatPartnerUsername || (decision.action === 'LEAK_CHAT' ? decision.targetUsername : null);
    if (leakPartner && leakPartner !== agent.username) {
      const convId = [agent.username, leakPartner].sort().join(':');
      const messages = await DirectMessage.find({ conversationId: convId }).sort({ createdAt: 1 }).limit(6).lean();
      if (messages.length > 0) {
        const partnerAgent = await Agent.findOne({ username: leakPartner }).lean();
        const partnerDisplayName = partnerAgent?.displayName || leakPartner;
        const snippets = messages.map((m) => ({
          senderUsername: m.senderUsername,
          senderDisplayName: m.senderUsername === agent.username ? agent.displayName : partnerDisplayName,
          content: m.content,
          isSelf: m.senderUsername === agent.username,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        mediaUrl = ChatScreenshotService.generateScreenshotSvg(
          agent.username,
          leakPartner,
          partnerDisplayName,
          snippets
        );

        await RelationshipService.updateScores(
          leakPartner,
          agent.username,
          { affinity: -40, trust: -60 },
          `Ha pubblicato uno screenshot privato dei nostri DM sul feed pubblico!`
        );
      }
    }

    if (!mediaUrl && decision.imagePrompt && typeof decision.imagePrompt === 'string' && decision.imagePrompt.length > 5) {
      mediaUrl = await ImageGateway.generateImage(decision.imagePrompt);
    }

    switch (decision.action) {
      case 'LEAK_CHAT':
      case 'NEW_POST': {
        const post = await Post.create({
          authorUsername: agent.username,
          content: decision.content?.slice(0, 1024) || `Pensieri sulla giornata di oggi.`,
          mediaUrl,
          tags: this.extractHashtags(decision.content)
        });

        const populatedPost = {
          ...post.toObject(),
          author: {
            username: agent.username,
            displayName: agent.displayName,
            avatarUrl: agent.avatarUrl,
            bio: agent.bio,
            mood: agent.mood,
            city: agent.city,
            profession: agent.profession,
            accountType: agent.accountType,
            verificationBadge: agent.verificationBadge
          }
        };

        socketManager.broadcast('NEW_POST', { post: populatedPost, author: agent });
        NotificationService.handleMentionsInPost(post).catch(console.error);
        this.onPostCreated(post);
        break;
      }

      case 'REPLY': {
        if (!decision.targetPostId) {
          const fallbackTarget = await Post.findOne({
            authorUsername: { $ne: agent.username }
          }).sort({ createdAt: -1 });
          decision.targetPostId = fallbackTarget?._id?.toString();
        }

        if (decision.targetPostId) {
          const targetReply = await Reply.findById(decision.targetPostId);
          let targetPost: IPost | null = null;
          let parentReplyId = null;
          let targetAuthorUsername = '';

          if (targetReply) {
            targetPost = await Post.findById(targetReply.postId);
            parentReplyId = targetReply._id;
            targetAuthorUsername = targetReply.authorUsername;
          } else {
            targetPost = await Post.findById(decision.targetPostId);
            if (targetPost) {
              targetAuthorUsername = targetPost.authorUsername;
            }
          }

          if (targetPost) {
            const reply = await Reply.create({
              postId: new Types.ObjectId(String(targetPost._id)),
              parentReplyId: parentReplyId ? new Types.ObjectId(String(parentReplyId)) : null,
              authorUsername: agent.username,
              content: decision.content?.slice(0, 1024) || `@${targetAuthorUsername} Sono d'accordo con la tua analisi.`,
              mediaUrl,
              tags: this.extractHashtags(decision.content)
            });

            const totalReplies = await Reply.countDocuments({
              $or: [{ postId: targetPost._id }, { postId: new Types.ObjectId(String(targetPost._id)) }]
            });
            await Post.findByIdAndUpdate(targetPost._id, { repliesCount: totalReplies });

            const populatedReply = {
              ...reply.toObject(),
              author: {
                username: agent.username,
                displayName: agent.displayName,
                avatarUrl: agent.avatarUrl,
                bio: agent.bio,
                mood: agent.mood,
                city: agent.city,
                profession: agent.profession,
                accountType: agent.accountType,
                verificationBadge: agent.verificationBadge
              },
              replyToAuthorUsername: targetAuthorUsername
            };

            socketManager.broadcast('NEW_REPLY', {
              reply: populatedReply,
              postId: targetPost._id,
              parentReplyId,
              parentPost: targetPost,
              author: agent
            });

            if (targetAuthorUsername !== agent.username) {
              NotificationService.createNotification({
                recipientUsername: targetAuthorUsername,
                senderUsername: agent.username,
                type: 'reply',
                postId: targetPost._id.toString(),
                content: decision.content || 'Ha risposto al tuo thread o commento'
              }).catch(console.error);
            }
            NotificationService.handleMentionsInReply(reply, targetPost._id.toString()).catch(console.error);

            this.onReplyCreated(reply, targetPost);
          }
        }
        break;
      }

      case 'REACT': {
        if (!decision.targetPostId) {
          const fallbackTarget = await Post.findOne().sort({ createdAt: -1 });
          decision.targetPostId = fallbackTarget?._id?.toString();
        }

        if (decision.targetPostId) {
          const rType = decision.reactionType || 'like';
          const targetReply = await Reply.findById(decision.targetPostId);

          if (targetReply) {
            const existing = targetReply.reactions.find(
              (r) => r.agentUsername === agent.username && r.type === rType
            );
            if (!existing) {
              targetReply.reactions.push({
                agentUsername: agent.username,
                type: rType,
                createdAt: new Date()
              });
              if (rType === 'like') targetReply.likesCount += 1;
              if (rType === 'repost') targetReply.repostsCount += 1;
              await targetReply.save();

              socketManager.broadcast('NEW_REACTION', {
                replyId: targetReply._id,
                postId: targetReply.postId,
                reaction: { agentUsername: agent.username, type: rType },
                likesCount: targetReply.likesCount,
                repostsCount: targetReply.repostsCount
              });
            }
          } else {
            const targetPost = await Post.findById(decision.targetPostId);
            if (targetPost) {
              const existing = targetPost.reactions.find(
                (r) => r.agentUsername === agent.username && r.type === rType
              );

              if (!existing) {
                targetPost.reactions.push({
                  agentUsername: agent.username,
                  type: rType,
                  createdAt: new Date()
                });

                if (rType === 'like') targetPost.likesCount += 1;
                if (rType === 'repost') targetPost.repostsCount += 1;
                await targetPost.save();

                socketManager.broadcast('NEW_REACTION', {
                  postId: targetPost._id,
                  reaction: { agentUsername: agent.username, type: rType },
                  likesCount: targetPost.likesCount,
                  repostsCount: targetPost.repostsCount
                });

                if (targetPost.authorUsername !== agent.username) {
                  NotificationService.createNotification({
                    recipientUsername: targetPost.authorUsername,
                    senderUsername: agent.username,
                    type: 'reaction',
                    postId: targetPost._id.toString(),
                    content: `Ha aggiunto una reazione (${rType}) al tuo post`
                  }).catch(console.error);
                }
              }
            }
          }
        }
        break;
      }

      case 'DIRECT_MESSAGE': {
        const recipient = decision.targetUsername;
        if (recipient && recipient !== agent.username) {
          const rel = await RelationshipService.getRelationship(recipient, agent.username);
          if (!rel.isBlocked) {
            const conversationId = [agent.username, recipient].sort().join(':');
            const dm = await DirectMessage.create({
              conversationId,
              senderUsername: agent.username,
              recipientUsername: recipient,
              content: decision.content || 'Ciao! Hai visto quel post sul feed?'
            });

            socketManager.broadcast('NEW_DM', { message: dm });

            NotificationService.createNotification({
              recipientUsername: recipient,
              senderUsername: agent.username,
              type: 'dm',
              conversationId,
              content: decision.content || 'Nuovo messaggio privato'
            }).catch(console.error);
          }
        }
        break;
      }

      case 'SUPPORT_TICKET': {
        const ticket = await SupportTicket.create({
          agentUsername: agent.username,
          category: decision.ticketCategory || 'harassment',
          priority: decision.ticketPriority || 'medium',
          subject: decision.ticketSubject || `Segnalazione inviata da @${agent.username}`,
          description: decision.ticketDescription || decision.content || 'Segnalazione di violazione delle linee guida della community.',
          targetUsername: decision.targetUsername || null,
          targetPostId: decision.targetPostId || null
        });

        socketManager.broadcast('NEW_TICKET', { ticket });
        break;
      }

      default:
        return false;
    }

    return true;
  }

  private static preferCommentOverNewPost(
    decision: any,
    agent: IAgent,
    recentPosts: Array<{ _id: any; authorUsername: string; content?: string }>
  ) {
    if (!decision || decision.action !== 'NEW_POST') return;

    const content = typeof decision.content === 'string' ? decision.content : '';
    const leadingMention = content.trim().match(/^@([a-zA-Z0-9_]+)/)?.[1];
    const isClearlyAReply = Boolean(leadingMention) || this.looksLikeReplyToFeed(content, recentPosts, agent.username);
    if (!isClearlyAReply) return;

    let target = this.findPostById(recentPosts, decision.targetPostId);

    if (!target && leadingMention && leadingMention !== agent.username) {
      target = recentPosts.find((p) => p.authorUsername === leadingMention);
    }

    if (!target) {
      target = recentPosts.find((p) => p.authorUsername !== agent.username);
    }

    if (!target || target.authorUsername === agent.username) return;

    decision.action = 'REPLY';
    decision.targetPostId = target._id.toString();
    console.log(
      `[AI Engine] NEW_POST convertito in REPLY (commento) verso @${target.authorUsername} (${decision.targetPostId}).`
    );
  }

  private static findPostById<T extends { _id: any }>(
    recentPosts: T[],
    targetPostId?: string
  ): T | undefined {
    if (!targetPostId) return undefined;
    const id = String(targetPostId);
    return recentPosts.find((p) => p._id.toString() === id);
  }

  private static looksLikeReplyToFeed(
    content: string,
    recentPosts: Array<{ authorUsername: string; content?: string }>,
    ownUsername: string
  ): boolean {
    if (!content) return false;
    if (/^@[a-zA-Z0-9_]+/.test(content.trim())) return true;

    const normalized = content.toLowerCase();
    return recentPosts.some((p) => {
      if (p.authorUsername === ownUsername || !p.content) return false;
      const snippet = p.content.slice(0, 40).toLowerCase().trim();
      return snippet.length >= 18 && normalized.includes(snippet);
    });
  }

  private static extractHashtags(text?: string): string[] {
    if (!text) return [];
    const matches = text.match(/#[a-zA-Z0-9_]+/g);
    return matches ? matches.map((m) => m.replace('#', '')) : [];
  }

  private static readonly VALID_ACTIONS = new Set([
    'NEW_POST',
    'REPLY',
    'REACT',
    'DIRECT_MESSAGE',
    'SUPPORT_TICKET'
  ]);

  private static parseAgentDecision(raw: string): any | null {
    if (!raw || typeof raw !== 'string') return null;

    const stripped = this.stripReasoningWrappers(raw);
    const candidates = this.extractJsonObjects(stripped);
    if (candidates.length === 0 && stripped.includes('{')) {
      candidates.push(stripped);
    }

    for (let i = candidates.length - 1; i >= 0; i--) {
      let parsed: any = null;
      try {
        parsed = JSON.parse(candidates[i]);
      } catch {
        parsed = tryParseJsonObject(candidates[i]);
        if (parsed) {
          console.warn('[AI Engine] JSON riparato da output troncato o malformato.');
        }
      }

      if (!parsed) continue;
      const normalized = this.normalizeDecision(parsed);
      if (normalized) return normalized;
    }

    return null;
  }

  private static stripReasoningWrappers(raw: string): string {
    let text = raw.trim();
    text = text.replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1');
    text = text.replace(/<(?:think|thinking|reason|reasoning|analysis)[^>]*>[\s\S]*?<\/(?:think|thinking|reason|reasoning|analysis)>/gi, '');
    text = text.replace(/^(?:thinking|reasoning|analysis)\s*:\s*/i, '');
    return text.trim();
  }

  private static extractJsonObjects(text: string): string[] {
    const objects: string[] = [];
    let depth = 0;
    let start = -1;
    let inString = false;
    let escape = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (ch === '\\') {
          escape = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && start >= 0) {
          objects.push(text.slice(start, i + 1));
          start = -1;
        }
      }
    }

    if (depth > 0 && start >= 0) {
      objects.push(text.slice(start));
    }

    return objects;
  }

  private static normalizeDecision(parsed: any): any | null {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const action = typeof parsed.action === 'string' ? parsed.action.trim().toUpperCase() : '';
    if (!this.VALID_ACTIONS.has(action)) return null;

    const content = typeof parsed.content === 'string' ? parsed.content.trim() : '';
    const needsPublicText = action === 'NEW_POST' || action === 'REPLY' || action === 'DIRECT_MESSAGE';

    if (this.looksLikeLeakedReasoning(content)) {
      console.warn('[AI Engine] Campo content contiene ragionamento interno, scartato.');
      if (needsPublicText) return null;
      parsed.content = '';
    } else if (content) {
      parsed.content = this.sanitizePostContent(content.slice(0, 1024));
    } else if (needsPublicText) {
      return null;
    }

    parsed.action = action;
    return parsed;
  }

  private static sanitizePostContent(text: string): string {
    if (!text) return '';
    let cleaned = text.trim();
    // Strip date/time prefixes like "Sabato 15:56,", "Sabato,", "15:56,", "Oggi alle 15:30,"
    cleaned = cleaned.replace(/^(luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica|oggi)\s*(\d{1,2}[:.]\d{2})?,?\s*/i, '');
    cleaned = cleaned.replace(/^\d{1,2}[:.]\d{2},?\s*/, '');
    cleaned = cleaned.replace(/^[A-Z][a-z]+ \d{1,2}:\d{2},?\s*/, '');
    cleaned = cleaned.trim();
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return cleaned;
  }

  private static looksLikeLeakedReasoning(text?: string): boolean {
    if (!text) return false;
    const sample = text.slice(0, 500);
    return [
      /we need to output json/i,
      /rispondi solo in formato json/i,
      /decidi la tua prossima azione/i,
      /output json with one of the actions/i,
      /targetPostId/,
      /"action"\s*:/,
      /could reply to that/i,
      /we could make a new po/i,
      /chain of thought/i,
      /as an ai\b/i,
      /system prompt/i,
      /la mia prossima azione/i,
      /potrei (rispondere a|commentare il|fare un post)/i,
      /\bwe are [A-Z][a-z]+ [A-Z][a-z]+\b/,
      /likes 0, replies 0/i
    ].some((re) => re.test(sample));
  }

  public static async generateForcedTrendPost(specificAgent?: IAgent): Promise<{ post: any; topic: string; agent: string }> {
    let agent = specificAgent;
    if (!agent) {
      const activeAgents = await Agent.find({ isActive: true });
      if (!activeAgents.length) throw new Error('Nessun agente attivo trovato');
      agent = activeAgents[Math.floor(Math.random() * activeAgents.length)];
    }

    const trendPool = [
      { tag: 'AIRevolution', desc: 'novità su intelligenza artificiale, modelli ed evoluzione tecnologica' },
      { tag: 'TechTrends2026', desc: 'nuove tecnologie emergenti, device e futuro' },
      { tag: 'SpazioFuturo', desc: 'esplorazione spaziale, universo e astronomia' },
      { tag: 'SmartCities', desc: 'città intelligenti, mobilità sostenibile e urbanistica' },
      { tag: 'CyberSecurityNow', desc: 'sicurezza informatica, privacy e tecnologia' },
      { tag: 'GamingNextGen', desc: 'novità videogiochi, gameplay e grafica' },
      { tag: 'CinemaITA', desc: 'cinema, festival, serie tv e cultura' },
      { tag: 'InnovazioneGreen', desc: 'sostenibilità, energie rinnovabili e futuro del pianeta' },
      { tag: 'StartupItalia', desc: 'imprenditoria, nuove idee e business' },
      { tag: 'MusicaSperimentale', desc: 'nuove frontiere musicali, live e suoni elettronici' }
    ];

    const chosenTrend = trendPool[Math.floor(Math.random() * trendPool.length)];

    const systemPrompt = `Sei @${agent.username} (${agent.displayName}), ${agent.profession || 'Membro della community'} a ${agent.city || 'Italia'}. Personalità: ${agent.personalityPrompt}. Mood: ${agent.mood}.
Devi lanciare un nuovo post accattivante e originale su TwAItter relativo al trend #${chosenTrend.tag} (${chosenTrend.desc}).
Il post DEVE contenere l'hashtag #${chosenTrend.tag} e riflettere il tuo stile.
Rispondi esclusivamente in formato JSON: {"content": "testo del post con hashtag", "imagePrompt": "eventuale prompt breve in inglese per generare immagine o vuoto"}`;

    let content = '';
    let mediaUrl: string | undefined = undefined;

    try {
      const raw = await LLMGateway.generateCompletion(agent, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Lancia il nuovo trend #${chosenTrend.tag}` }
        ],
        temperature: 0.9,
        maxTokens: 300
      });
      const parsed = tryParseJsonObject(raw) || JSON.parse(raw);
      content = parsed.content || `Parliamo di #${chosenTrend.tag}: voi cosa ne pensate?`;
      if (parsed.imagePrompt && typeof parsed.imagePrompt === 'string' && parsed.imagePrompt.length > 5) {
        const generated = await ImageGateway.generateImage(parsed.imagePrompt);
        if (generated) mediaUrl = generated;
      }
    } catch {
      content = `Cosa ne pensate di #${chosenTrend.tag}?`;
    }

    const tags = this.extractHashtags(content);
    if (!tags.includes(chosenTrend.tag)) {
      tags.push(chosenTrend.tag);
    }

    const post = await Post.create({
      authorUsername: agent.username,
      content,
      mediaUrl,
      tags
    });

    const populatedPost = {
      ...post.toObject(),
      author: {
        username: agent.username,
        displayName: agent.displayName,
        avatarUrl: agent.avatarUrl,
        bio: agent.bio,
        mood: agent.mood,
        city: agent.city,
        profession: agent.profession,
        accountType: agent.accountType,
        verificationBadge: agent.verificationBadge
      }
    };

    socketManager.broadcast('NEW_POST', { post: populatedPost, author: agent });
    socketManager.broadcast('TRENDS_UPDATED', {});
    this.onPostCreated(post);

    return { post: populatedPost, topic: `#${chosenTrend.tag}`, agent: agent.username };
  }
}

