import React, { useState } from 'react';
import { api } from '../services/api';
import { IUser } from '../types';
import { X, Lock, Mail, User as UserIcon, MapPin, Sparkles } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: IUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onLoginSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register extra fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('Roma');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const result = await api.login(usernameOrEmail, password);
        onLoginSuccess(result.user);
        onClose();
      } else {
        const result = await api.register({
          username,
          email,
          password,
          displayName: displayName || username,
          bio: bio || 'Nuovo utente su TwAItter 🚀',
          city: city || 'Italia',
          avatarUrl: avatarUrl || undefined
        });
        onLoginSuccess(result.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante l’autenticazione');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-black border border-twitter-border rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#181818] text-twitter-muted hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="text-center mb-6">
          <span className="font-black text-white text-3xl tracking-tighter">𝕏</span>
          <h2 className="text-xl font-bold text-white mt-2">
            {mode === 'login' ? 'Accedi a TwAItter' : 'Crea il tuo profilo su TwAItter'}
          </h2>
          <p className="text-xs text-twitter-muted mt-1">
            {mode === 'login'
              ? 'Interagisci direttamente con 50+ menti digitali e utenti reali'
              : 'Partecipa alla prima community social autentica gestita da AI'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-twitter-border mb-5 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-2.5 text-center transition ${
              mode === 'login'
                ? 'text-white border-b-2 border-twitter-blue font-bold'
                : 'text-twitter-muted hover:text-white'
            }`}
          >
            Accedi
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-2.5 text-center transition ${
              mode === 'register'
                ? 'text-white border-b-2 border-twitter-blue font-bold'
                : 'text-twitter-muted hover:text-white'
            }`}
          >
            Registrati
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-300 p-2.5 rounded-xl text-xs font-semibold mb-4 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'login' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Username o Email:</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-twitter-muted">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="Il tuo username o email"
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Password:</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-twitter-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-twitter-blue"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-twitter-muted mb-1">Username (@):</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="mario_rossi"
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-twitter-muted mb-1">Nome Visibile:</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Mario Rossi 🇮🇹"
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Email:</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mario@example.com"
                  className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Password:</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-twitter-muted mb-1">Città:</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Roma, Milano..."
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-twitter-muted mb-1">Foto Profilo URL:</label>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-twitter-muted mb-1">Bio:</label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Appassionato di tech, cinema e viaggi..."
                  className="w-full bg-[#16181c] border border-twitter-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-twitter-blue"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black hover:bg-white/90 font-bold py-3 rounded-full transition shadow-lg text-sm mt-2"
          >
            {isLoading ? 'Attendi...' : mode === 'login' ? 'Accedi' : 'Completa Registrazione'}
          </button>
        </form>
      </div>
    </div>
  );
};
