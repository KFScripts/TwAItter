import { Notification } from '../models/Notification';
import { socketManager } from '../sockets/socketManager';
import { Agent } from '../models/Agent';
import { User } from '../models/User';

export class NotificationService {
  public static async createNotification(data: {
    recipientUsername: string;
    senderUsername: string;
    type: 'reply' | 'mention' | 'dm' | 'reaction';
    postId?: string | null;
    conversationId?: string | null;
    content: string;
  }) {
    if (!data.recipientUsername || !data.senderUsername || data.recipientUsername === data.senderUsername) {
      return null;
    }

    try {
      const notif = await Notification.create({
        recipientUsername: data.recipientUsername,
        senderUsername: data.senderUsername,
        type: data.type,
        postId: data.postId || null,
        conversationId: data.conversationId || null,
        content: data.content.slice(0, 180)
      });

      const [agent, user] = await Promise.all([
        Agent.findOne({ username: data.senderUsername }).select('username displayName avatarUrl verificationBadge').lean(),
        User.findOne({ username: data.senderUsername }).select('username displayName avatarUrl verificationBadge').lean()
      ]);

      const senderInfo = agent || user || {
        username: data.senderUsername,
        displayName: data.senderUsername,
        avatarUrl: ''
      };

      const populatedNotif = {
        ...notif.toObject(),
        sender: senderInfo
      };

      socketManager.broadcast('NEW_NOTIFICATION', {
        notification: populatedNotif,
        recipientUsername: data.recipientUsername
      });

      return notif;
    } catch (err: any) {
      console.error('[Notification Error] Failed to create notification:', err.message);
      return null;
    }
  }

  public static async handleMentionsInPost(post: { _id: any; authorUsername: string; content: string }) {
    const matches = post.content.match(/@[a-zA-Z0-9_]+/g);
    if (!matches || matches.length === 0) return;

    const uniqueMentions = [...new Set(matches.map((m) => m.replace('@', '')))];
    for (const username of uniqueMentions) {
      if (username !== post.authorUsername) {
        await this.createNotification({
          recipientUsername: username,
          senderUsername: post.authorUsername,
          type: 'mention',
          postId: post._id.toString(),
          content: post.content
        });
      }
    }
  }

  public static async handleMentionsInReply(reply: { _id: any; authorUsername: string; content: string }, postId: string) {
    const matches = reply.content.match(/@[a-zA-Z0-9_]+/g);
    if (!matches || matches.length === 0) return;

    const uniqueMentions = [...new Set(matches.map((m) => m.replace('@', '')))];
    for (const username of uniqueMentions) {
      if (username !== reply.authorUsername) {
        await this.createNotification({
          recipientUsername: username,
          senderUsername: reply.authorUsername,
          type: 'mention',
          postId,
          content: reply.content
        });
      }
    }
  }
}
