import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  city: string;
  following: string[];
  verificationBadge: 'none' | 'blue' | 'gold';
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: 'Nuovo utente su TwAItter 🚀' },
    city: { type: String, default: 'Italia' },
    following: [{ type: String }],
    verificationBadge: {
      type: String,
      enum: ['none', 'blue', 'gold'],
      default: 'blue'
    },
    isAdmin: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
