import React, { useState } from 'react';
import { Home, Compass, MessageSquare, Users, ShieldAlert, Settings as SettingsIcon, Feather, MoreHorizontal, LogIn, LogOut, User as UserIcon, Bell } from 'lucide-react';
import { IUser } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { Avatar } from './Avatar';

interface SidebarProps {
  currentTab: 'feed' | 'explore' | 'notifications' | 'dms' | 'agents' | 'moderation' | 'settings';
  setCurrentTab: (tab: 'feed' | 'explore' | 'notifications' | 'dms' | 'agents' | 'moderation' | 'settings') => void;
  pendingTicketsCount: number;
  unreadNotificationsCount?: number;
  onOpenCompose: () => void;
  currentUser: IUser | null;
  savedAccounts: IUser[];
  onOpenAuth: () => void;
  onOpenProfile: (username: string) => void;
  onLogout: () => void;
  onSwitchAccount: (account: IUser) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  pendingTicketsCount,
  unreadNotificationsCount = 0,
  onOpenCompose,
  currentUser,
  savedAccounts = [],
  onOpenAuth,
  onOpenProfile,
  onLogout,
  onSwitchAccount
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { id: 'feed', label: 'Home', icon: Home },
    { id: 'explore', label: 'Esplora', icon: Compass },
    {
      id: 'notifications',
      label: 'Notifiche',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined
    },
    { id: 'dms', label: 'Messaggi', icon: MessageSquare },
    { id: 'agents', label: 'Profili', icon: Users },
    {
      id: 'moderation',
      label: 'Moderazione',
      icon: ShieldAlert,
      badge: pendingTicketsCount > 0 ? pendingTicketsCount : undefined
    },
    { id: 'settings', label: 'Impostazioni', icon: SettingsIcon }
  ];

  const otherAccounts = savedAccounts.filter((a) => a.username !== currentUser?.username);

  return (
    <aside className="w-64 border-r border-twitter-border flex flex-col justify-between p-3 h-screen sticky top-0 bg-black select-none">
      <div className="flex flex-col gap-3">
        {/* Logo */}
        <div
          className="w-12 h-12 rounded-full hover:bg-[#181818] flex items-center justify-center cursor-pointer transition ml-2"
          onClick={() => setCurrentTab('feed')}
        >
          <span className="font-extrabold text-white text-2xl tracking-tighter">𝕏</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id as any)}
                className={`flex items-center justify-between px-4 py-3 rounded-full text-xl transition-all duration-150 ${
                  isActive
                    ? 'font-bold text-white bg-[#181818]'
                    : 'text-[#e7e9ea] hover:bg-[#16181c] font-normal'
                }`}
              >
                <div className="flex items-center gap-4">
                  <Icon className={`w-7 h-7 ${isActive ? 'text-white' : 'text-[#e7e9ea]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-twitter-danger text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Post Button */}
        <button
          onClick={onOpenCompose}
          className="w-full bg-twitter-blue hover:bg-twitter-hover text-white font-bold py-3.5 px-4 rounded-full shadow transition duration-200 flex items-center justify-center gap-2 text-base mt-2"
        >
          <Feather className="w-5 h-5 md:hidden" />
          <span className="hidden md:inline">Pubblica</span>
        </button>
      </div>

      {/* User Bottom Area */}
      <div className="relative">
        {currentUser ? (
          <div>
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center justify-between p-3 rounded-full hover:bg-[#181818] cursor-pointer transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName}
                  className="w-10 h-10 flex-shrink-0"
                />
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-bold text-sm text-white truncate flex items-center gap-1">
                    {currentUser.displayName}
                    <VerifiedBadge type={currentUser.verificationBadge || 'none'} size={14} />
                  </span>
                  <span className="text-xs text-twitter-muted font-mono truncate">@{currentUser.username}</span>
                </div>
              </div>
              <MoreHorizontal className="w-4 h-4 text-twitter-muted flex-shrink-0" />
            </div>

            {showUserMenu && (
              <div className="absolute bottom-16 left-0 w-72 bg-black border border-twitter-border rounded-2xl shadow-2xl p-2 z-30 space-y-1.5 divide-y divide-twitter-border/40">
                {/* Active Account Info */}
                <div className="p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar src={currentUser.avatarUrl} alt={currentUser.displayName} className="w-8 h-8 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                        {currentUser.displayName}
                        <VerifiedBadge type={currentUser.verificationBadge || 'none'} size={12} />
                      </p>
                      <p className="text-[10px] text-twitter-muted font-mono truncate">@{currentUser.username}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-twitter-blue bg-twitter-blue/10 px-2 py-0.5 rounded-full">Attivo</span>
                </div>

                {/* Other Saved Accounts */}
                {otherAccounts.length > 0 && (
                  <div className="pt-1.5 space-y-1">
                    <p className="px-2 text-[10px] uppercase font-bold text-twitter-muted">Cambia Account:</p>
                    {otherAccounts.map((acc) => (
                      <button
                        key={acc.username}
                        onClick={() => {
                          onSwitchAccount(acc);
                          setShowUserMenu(false);
                        }}
                        className="w-full px-2.5 py-1.5 text-left rounded-xl hover:bg-[#181818] transition flex items-center gap-2.5"
                      >
                        <Avatar src={acc.avatarUrl} alt={acc.displayName} className="w-7 h-7 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                            {acc.displayName}
                            <VerifiedBadge type={acc.verificationBadge || 'none'} size={11} />
                          </p>
                          <p className="text-[10px] text-twitter-muted font-mono truncate">@{acc.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-1.5 space-y-1">
                  <button
                    onClick={() => {
                      onOpenAuth();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-white hover:bg-[#181818] rounded-xl flex items-center gap-2 transition"
                  >
                    <LogIn className="w-4 h-4 text-twitter-blue" />
                    <span>+ Aggiungi o Accedi con un altro account</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenProfile(currentUser.username);
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-white hover:bg-[#181818] rounded-xl flex items-center gap-2 transition"
                  >
                    <UserIcon className="w-4 h-4 text-twitter-blue" />
                    <span>Visualizza / Modifica Profilo</span>
                  </button>

                  <button
                    onClick={() => {
                      onLogout();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-red-400 hover:bg-[#181818] rounded-xl flex items-center gap-2 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Esci da @{currentUser.username}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-center gap-2 bg-[#1c1f23] hover:bg-[#25282d] text-white font-bold p-3 rounded-full border border-twitter-border transition text-sm shadow"
          >
            <LogIn className="w-4 h-4 text-twitter-blue" />
            <span>Accedi / Registrati</span>
          </button>
        )}
      </div>
    </aside>
  );
};
