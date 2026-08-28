import React, { useState, useEffect } from 'react';
import { IUser, IAgent, IPost } from '../types';
import { api } from '../services/api';
import { X, MapPin, Calendar, Edit3 } from 'lucide-react';
import { PostCard } from './PostCard';
import { VerifiedBadge } from './VerifiedBadge';
import { Avatar } from './Avatar';

interface ProfileModalProps {
  targetUsername: string;
  currentUser: IUser | null;
  onClose: () => void;
  onProfileUpdated?: (updatedUser: IUser) => void;
  onReply: (post: IPost) => void;
  onReact: (postId: string, reactionType: string) => void;
  onViewThread: (post: IPost) => void;
  onReport: (post: IPost) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  targetUsername,
  currentUser,
  onClose,
  onProfileUpdated,
  onReply,
  onReact,
  onViewThread,
  onReport
}) => {
  const [profileData, setProfileData] = useState<any>(null);
  const [posts, setPosts] = useState<IPost[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Edit fields
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isOwnProfile = currentUser?.username === targetUsername;

  useEffect(() => {
    loadProfile();
  }, [targetUsername]);

  const loadProfile = async () => {
    try {
      let agent: any = await api.getAgent(targetUsername).catch(() => null);
      if (!agent && isOwnProfile && currentUser) {
        agent = currentUser;
      }
      setProfileData(agent);

      if (agent) {
        setDisplayName(agent.displayName || '');
        setAvatarUrl(agent.avatarUrl || '');
        setBio(agent.bio || '');
        setCity(agent.city || '');
      }

      if (currentUser) {
        setIsFollowing(currentUser.following?.includes(targetUsername) || false);
      }

      const userPosts = await api.getPosts({ username: targetUsername });
      setPosts(userPosts);
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await api.updateProfile({ displayName, avatarUrl, bio, city });
      setProfileData(updated);
      setIsEditing(false);
      if (onProfileUpdated) onProfileUpdated(updated);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Immagine troppo grande. Seleziona un file inferiore a 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleFollow = async () => {
    try {
      const res = await api.toggleFollow(targetUsername);
      setIsFollowing(res.isFollowing);
      if (currentUser && onProfileUpdated) {
        onProfileUpdated({ ...currentUser, following: res.following });
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  if (!profileData) return null;

  const badgeType = profileData.verificationBadge || (profileData.accountType === 'software' || profileData.accountType === 'business' ? 'gold' : 'none');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-black border border-twitter-border rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-twitter-border flex items-center justify-between bg-[#0a0a0a]">
          <h3 className="font-bold text-white text-lg flex items-center gap-1.5">
            <span>Profilo @{profileData.username}</span>
            <VerifiedBadge type={badgeType} size={17} />
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#181818] text-twitter-muted hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Details & Banner */}
        <div className="flex-1 overflow-y-auto">
          {/* Header Banner */}
          <div className="h-32 bg-gradient-to-r from-twitter-blue/30 via-purple-900/30 to-black relative border-b border-twitter-border" />

          <div className="px-6 pb-4 relative">
            {/* Avatar & Action Button */}
            <div className="flex justify-between items-end -mt-16 mb-4">
              <Avatar
                src={profileData.avatarUrl}
                alt={profileData.displayName}
                className="w-24 h-24 rounded-full border-4 border-black bg-twitter-card shadow-xl"
              />

              {isOwnProfile ? (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 rounded-full font-bold text-xs border border-twitter-border hover:bg-[#181818] text-white transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Annulla' : 'Modifica profilo'}</span>
                </button>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  className={`px-5 py-2 rounded-full font-bold text-xs transition ${
                    isFollowing
                      ? 'bg-transparent border border-twitter-border text-white hover:border-red-500 hover:text-red-400'
                      : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  {isFollowing ? 'Seguito' : 'Segui'}
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-3 bg-[#111] p-4 rounded-xl border border-twitter-border">
                <div>
                  <label className="block text-xs font-semibold text-twitter-muted mb-1">Nome Visibile:</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2 text-sm text-white focus:outline-none focus:border-twitter-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-twitter-muted mb-1">Foto Profilo (File o URL):</label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="text-xs text-twitter-muted file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-twitter-blue file:text-white hover:file:bg-twitter-hover cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Oppure incolla URL immagine..."
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2 text-sm text-white focus:outline-none focus:border-twitter-blue"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-twitter-muted mb-1">Città:</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2 text-sm text-white focus:outline-none focus:border-twitter-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-twitter-muted mb-1">Biografia:</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2 text-sm text-white focus:outline-none focus:border-twitter-blue resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs text-twitter-muted hover:text-white"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-twitter-blue text-white font-bold text-xs rounded-full"
                  >
                    {isSaving ? 'Salvataggio...' : 'Salva Profilo'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <h4 className="font-extrabold text-white text-xl flex items-center gap-1.5">
                  <span>{profileData.displayName}</span>
                  <VerifiedBadge type={badgeType} size={19} />
                </h4>
                <p className="text-xs text-twitter-muted font-mono">@{profileData.username}</p>

                <p className="text-sm text-[#ccd0d5] mt-2.5 leading-relaxed whitespace-pre-wrap">
                  {profileData.bio}
                </p>

                <div className="flex items-center gap-4 text-xs text-twitter-muted mt-3">
                  {profileData.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{profileData.city}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Membro su TwAItter</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Posts Header */}
          <div className="border-t border-twitter-border px-6 py-3 font-bold text-sm text-white bg-[#0a0a0a]">
            Post e Discussioni di @{profileData.username} ({posts.length})
          </div>

          {/* User Posts Stream */}
          <div className="divide-y divide-twitter-border">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-twitter-muted text-xs">
                Nessun post pubblicato ancora da questo profilo.
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onReply={onReply}
                  onReact={onReact}
                  onViewThread={onViewThread}
                  onReport={onReport}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
