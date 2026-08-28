import { Relationship, IRelationship, RelationshipStatus } from '../models/Relationship';
import { Agent, IAgent } from '../models/Agent';

export class RelationshipService {
  private static determineStatus(affinity: number, trust: number, romance: number, isBlocked: boolean): RelationshipStatus {
    if (isBlocked) return 'blocked';
    if (romance >= 70 && affinity >= 50) return 'partner';
    if (romance >= 40 && affinity >= 30) return 'crush';
    if (affinity <= -50 && trust <= 20) return 'enemy';
    if (affinity <= -20) return 'rival';
    if (affinity >= 70 && trust >= 70) return 'close_friend';
    if (affinity >= 30 && trust >= 40) return 'friend';
    if (affinity >= 10 || trust >= 40) return 'acquaintance';
    return 'stranger';
  }

  public static async getRelationship(sourceUsername: string, targetUsername: string): Promise<IRelationship> {
    let rel = await Relationship.findOne({ sourceUsername, targetUsername });
    if (!rel) {
      rel = await Relationship.create({
        sourceUsername,
        targetUsername,
        affinity: 0,
        trust: 50,
        romance: 0,
        status: 'stranger',
        isBlocked: false,
        lastInteraction: new Date()
      });
    }
    return rel;
  }

  public static async updateScores(
    sourceUsername: string,
    targetUsername: string,
    deltas: { affinity?: number; trust?: number; romance?: number },
    notes?: string
  ): Promise<IRelationship> {
    const rel = await this.getRelationship(sourceUsername, targetUsername);
    const newAffinity = Math.max(-100, Math.min(100, rel.affinity + (deltas.affinity || 0)));
    const newTrust = Math.max(0, Math.min(100, rel.trust + (deltas.trust || 0)));
    const newRomance = Math.max(0, Math.min(100, rel.romance + (deltas.romance || 0)));
    const newStatus = this.determineStatus(newAffinity, newTrust, newRomance, rel.isBlocked);

    rel.affinity = newAffinity;
    rel.trust = newTrust;
    rel.romance = newRomance;
    rel.status = newStatus;
    rel.lastInteraction = new Date();
    if (notes) {
      rel.notes = notes.slice(0, 300);
    }
    await rel.save();
    return rel;
  }

  public static async blockUser(sourceUsername: string, targetUsername: string, reason?: string): Promise<IRelationship> {
    const rel = await this.getRelationship(sourceUsername, targetUsername);
    rel.isBlocked = true;
    rel.status = 'blocked';
    rel.affinity = Math.min(rel.affinity, -30);
    rel.trust = Math.min(rel.trust, 10);
    rel.blockedReason = (reason || 'Bloccato').slice(0, 150);
    rel.lastInteraction = new Date();
    await rel.save();
    return rel;
  }

  public static async unblockUser(sourceUsername: string, targetUsername: string): Promise<IRelationship> {
    const rel = await this.getRelationship(sourceUsername, targetUsername);
    rel.isBlocked = false;
    rel.blockedReason = '';
    rel.affinity = Math.max(rel.affinity, 0);
    rel.trust = Math.max(rel.trust, 30);
    rel.status = this.determineStatus(rel.affinity, rel.trust, rel.romance, false);
    rel.lastInteraction = new Date();
    await rel.save();
    return rel;
  }

  public static async getBlockedUsernamesFor(username: string): Promise<string[]> {
    if (!username) return [];
    const [blockedByMe, blockingMe] = await Promise.all([
      Relationship.find({ sourceUsername: username, isBlocked: true }).select('targetUsername').lean(),
      Relationship.find({ targetUsername: username, isBlocked: true }).select('sourceUsername').lean()
    ]);
    const set = new Set<string>();
    blockedByMe.forEach((r) => set.add(r.targetUsername));
    blockingMe.forEach((r) => set.add(r.sourceUsername));
    return Array.from(set);
  }

  public static async getSignificantRelationships(username: string): Promise<any[]> {
    const relationships = await Relationship.find({
      sourceUsername: username,
      $or: [
        { isBlocked: true },
        { status: { $in: ['partner', 'crush', 'close_friend', 'friend', 'rival', 'enemy'] } },
        { affinity: { $gte: 25 } },
        { affinity: { $lte: -25 } }
      ]
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    return relationships.map((r) => ({
      username: r.targetUsername,
      status: r.status,
      affinity: r.affinity,
      trust: r.trust,
      romance: r.romance,
      isBlocked: r.isBlocked,
      notes: r.notes || undefined
    }));
  }

  public static async evaluateAutonomousUnblock(agent: IAgent): Promise<string | null> {
    const blockedRels = await Relationship.find({
      sourceUsername: agent.username,
      isBlocked: true
    }).lean();

    if (!blockedRels.length) return null;

    for (const rel of blockedRels) {
      const daysSince = (Date.now() - new Date(rel.lastInteraction).getTime()) / (1000 * 60 * 60 * 24);
      const forgivenessChance = Math.min(0.35, 0.05 + daysSince * 0.05);
      if (Math.random() < forgivenessChance) {
        await this.unblockUser(agent.username, rel.targetUsername);
        const unblockMemory = `Ho deciso di sbloccare @${rel.targetUsername}: il tempo passa e non vale la pena portare rancore.`;
        await Agent.findByIdAndUpdate(agent._id, {
          $push: { memories: { $each: [unblockMemory], $slice: -15 } }
        });
        return rel.targetUsername;
      }
    }
    return null;
  }
}
