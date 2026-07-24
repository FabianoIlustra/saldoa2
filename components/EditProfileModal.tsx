import React, { useState, useEffect } from 'react';
import { X, Camera, Check, User as UserIcon, Trash2, Smile } from 'lucide-react';
import { User } from '../types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: User | null;
  onSave: (updates: Partial<User>) => void;
}

const EMOJI_OPTIONS = ['👤', '🦊', '🚀', '💎', '🦁', '👑', '🦄', '⚡', '🎨', '🌟', '💼', '🎯', '🐱', '🐼', '🔥', '🏆', '⚽', '🎸', '🏖️', '☕'];
const COLOR_OPTIONS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#06b6d4', '#64748b'];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSave
}) => {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [avatarEmoji, setAvatarEmoji] = useState<string | undefined>(undefined);
  const [avatarColor, setAvatarColor] = useState('#6366f1');

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setAvatarUrl(userProfile.avatarUrl);
      setAvatarEmoji(userProfile.avatarEmoji);
      setAvatarColor(userProfile.avatarColor || '#6366f1');
    }
  }, [userProfile, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Por favor escolha uma imagem menor que 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
      setAvatarEmoji(undefined); // Clear emoji if photo chosen
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(undefined);
  };

  const handleSelectEmoji = (emoji: string) => {
    setAvatarEmoji(emoji);
    setAvatarUrl(undefined); // Clear photo if emoji chosen
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      avatarUrl,
      avatarEmoji,
      avatarColor
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded-2xl flex items-center justify-center">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Editar Perfil</h3>
              <p className="text-xs font-medium text-slate-400">Personalize seu nome e avatar visual</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative group">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Avatar Preview" 
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-purple-500/30 shadow-md"
                />
              ) : avatarEmoji ? (
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-md ring-4 ring-purple-500/20"
                  style={{ backgroundColor: avatarColor }}
                >
                  {avatarEmoji}
                </div>
              ) : (
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-md ring-4 ring-purple-500/20"
                  style={{ backgroundColor: avatarColor }}
                >
                  {(name || 'U').charAt(0).toUpperCase()}
                </div>
              )}

              <label 
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full cursor-pointer shadow-md transition-transform active:scale-90"
                title="Alterar foto"
              >
                <Camera className="w-4 h-4" />
                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden"
                />
              </label>
            </div>

            {avatarUrl && (
              <button 
                type="button"
                onClick={handleRemovePhoto}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remover foto
              </button>
            )}
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Seu Nome
            </label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome"
              required
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          {/* Escolher Emoji ou Cor de Fundo */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Escolher Ícone ou Emoji
            </label>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/50">
              <button 
                type="button"
                onClick={() => setAvatarEmoji(undefined)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold transition-all ${
                  !avatarEmoji && !avatarUrl 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
                title="Iniciais padrão"
              >
                {name.charAt(0).toUpperCase() || 'Aa'}
              </button>
              {EMOJI_OPTIONS.map((emoji) => (
                <button 
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectEmoji(emoji)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                    avatarEmoji === emoji && !avatarUrl
                      ? 'bg-purple-600 text-white shadow-sm scale-110' 
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Palette de cores */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Cor do Fundo
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button 
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform flex items-center justify-center ${
                    avatarColor === color ? 'scale-110 ring-2 ring-offset-2 ring-purple-600 dark:ring-offset-slate-900' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {avatarColor === color && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-purple-200 dark:shadow-none active:scale-95"
            >
              Salvar Perfil
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
