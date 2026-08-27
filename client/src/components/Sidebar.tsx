import React, { useState } from 'react';
import { Home, Compass, MessageSquare, Users, ShieldAlert, Settings as SettingsIcon, Feather, MoreHorizontal, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { IUser } from '../types';
import { VerifiedBadge } from './VerifiedBadge';

interface SidebarProps {
  currentTab: 'feed' | 'explore' | 'dms' | 'agents' | 'moderation' | 'settings';
  setCurrentTab: (tab: 'feed' | 'explore' | 'dms' | 'agents' | 'moderation' | 'settings') => void;
  pendingTicketsCount: number;
  onOpenCompose: () => void;
  currentUser: IUser | null;
  onOpenAuth: () => void;
  onOpenProfile: (username: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  pendingTicketsCount,
  onOpenCompose,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onLogout
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { id: 'feed', label: 'Home', icon: Home },
    { id: 'explore', label: 'Esplora', icon: Compass },
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
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName}
                  className="w-10 h-10 rounded-full border border-twitter-border object-cover flex-shrink-0"
                />
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-bold text-sm text-white truncate flex items-center gap-1">
                    {currentUser.displayName}
                    <VerifiedBadge type={currentUser.verificationBadge || 'blue'} size={14} />
                  </span>
                  <span className="text-xs text-twitter-muted font-mono truncate">@{currentUser.username}</span>
                </div>
              </div>
              <MoreHorizontal className="w-4 h-4 text-twitter-muted flex-shrink-0" />
            </div>

            {showUserMenu && (
              <div className="absolute bottom-16 left-0 w-full bg-black border border-twitter-border rounded-2xl shadow-2xl p-1.5 z-30 space-y-1">
                <button
                  onClick={() => {
                    onOpenProfile(currentUser.username);
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-white hover:bg-[#181818] rounded-xl flex items-center gap-2 transition"
                >
                  <UserIcon className="w-4 h-4 text-twitter-blue" />
                  <span>Visualizza / Modifica Profilo</span>
                </button>
                <button
                  onClick={() => {
                    onLogout();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-400 hover:bg-[#181818] rounded-xl flex items-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Esci dall’account</span>
                </button>
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
