import React, { useState, useEffect } from 'react';
import { X, Camera, Check, User as UserIcon, Trash2, LogOut, Mail, Phone, CreditCard, MapPin, DollarSign, ShieldCheck, Loader2 } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: User | null;
  onSave: (updates: Partial<User>) => void;
  onLogout?: () => void;
}

const EMOJI_OPTIONS = ['👤', '🦊', '🚀', '💎', '🦁', '👑', '🦄', '⚡', '🎨', '🌟', '💼', '🎯', '🐱', '🐼', '🔥', '🏆', '⚽', '🎸', '🏖️', '☕'];
const COLOR_OPTIONS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#06b6d4', '#64748b'];

// Helper to compress/resize image to max 300x300 JPEG to avoid heavy uploads
const compressImage = (file: File, maxWidth = 300, maxHeight = 300, quality = 0.82): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Blob creation failed'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSave,
  onLogout
}) => {
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [spendingCeiling, setSpendingCeiling] = useState<string>('');
  
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [avatarEmoji, setAvatarEmoji] = useState<string | undefined>(undefined);
  const [avatarColor, setAvatarColor] = useState('#6366f1');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setFullName(userProfile.fullName || userProfile.name || '');
      setEmail(userProfile.email || '');
      setCpf(userProfile.cpf || '');
      setPhone(userProfile.phone || '');
      setAddress(userProfile.address || '');
      setSpendingCeiling(userProfile.spendingCeiling !== undefined && userProfile.spendingCeiling !== null ? String(userProfile.spendingCeiling) : '');
      setAvatarUrl(userProfile.avatarUrl);
      setAvatarEmoji(userProfile.avatarEmoji);
      setAvatarColor(userProfile.avatarColor || '#6366f1');
    }
  }, [userProfile, isOpen]);

  if (!isOpen) return null;

  // Format CPF helper: 000.000.000-00
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setCpf(value);
  };

  // Format Phone helper: (00) 00000-0000
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
    setPhone(value);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Por favor escolha uma imagem menor que 10MB.');
      return;
    }

    try {
      setIsUploading(true);
      // Compress image client-side to max 300x300 (~30KB)
      const compressedBlob = await compressImage(file, 300, 300, 0.82);
      const userId = userProfile?.id || 'avatar';
      const fileName = `${userId}-avatar.jpg`;
      const compressedFile = new File([compressedBlob], fileName, { type: 'image/jpeg' });

      // Clean up any old files for this user in the bucket to ensure only 1 image exists per user
      try {
        const { data: existingFiles } = await supabase.storage.from('avatars').list('', { search: userId });
        if (existingFiles && existingFiles.length > 0) {
          const filesToDelete = existingFiles.map(f => f.name);
          await supabase.storage.from('avatars').remove(filesToDelete);
        }
      } catch (cleanErr) {
        console.warn('Old avatars cleanup warning:', cleanErr);
      }

      // Try uploading to Supabase Storage 'avatars' bucket with fixed filename & upsert
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedFile, {
          cacheControl: '0',
          upsert: true
        });

      if (!error && data?.path) {
        const { data: publicData } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.path);

        if (publicData?.publicUrl) {
          // Append timestamp parameter to force browser/other devices to reload fresh image
          const freshUrl = `${publicData.publicUrl}?t=${Date.now()}`;
          setAvatarUrl(freshUrl);
          setAvatarEmoji(undefined);
          setIsUploading(false);
          return;
        }
      }

      // Fallback: If bucket is not created or permissions error, convert compressed blob to small Data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
        setAvatarEmoji(undefined);
        setIsUploading(false);
      };
      reader.readAsDataURL(compressedFile);

    } catch (err) {
      console.error('Erro ao processar avatar:', err);
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setAvatarUrl(undefined);
    const userId = userProfile?.id;
    if (userId) {
      try {
        const { data: existingFiles } = await supabase.storage.from('avatars').list('', { search: userId });
        if (existingFiles && existingFiles.length > 0) {
          await supabase.storage.from('avatars').remove(existingFiles.map(f => f.name));
        }
      } catch (err) {
        console.warn('Error removing avatar from storage:', err);
      }
    }
  };

  const handleSelectEmoji = async (emoji: string) => {
    setAvatarEmoji(emoji);
    setAvatarUrl(undefined); // Clear photo if emoji chosen
    const userId = userProfile?.id;
    if (userId) {
      try {
        const { data: existingFiles } = await supabase.storage.from('avatars').list('', { search: userId });
        if (existingFiles && existingFiles.length > 0) {
          await supabase.storage.from('avatars').remove(existingFiles.map(f => f.name));
        }
      } catch (err) {
        console.warn('Error removing avatar from storage on emoji select:', err);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const numericCeiling = spendingCeiling ? parseFloat(spendingCeiling.replace(',', '.')) : undefined;

    onSave({
      name: name.trim(),
      fullName: fullName.trim() || name.trim(),
      email: email.trim(),
      cpf: cpf.trim(),
      phone: phone.trim(),
      address: address.trim(),
      spendingCeiling: numericCeiling,
      avatarUrl: avatarUrl || null,
      avatarEmoji: avatarEmoji || null,
      avatarColor
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded-2xl flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Dados Cadastrais e Perfil</h3>
              <p className="text-xs font-medium text-slate-400">Atualize suas informações pessoais e visuais</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onLogout && (
              <button 
                type="button"
                onClick={() => {
                  if (confirm('Tem certeza que deseja sair da conta?')) {
                    onClose();
                    onLogout();
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-bold transition-all border border-rose-200/60 dark:border-rose-800/60 active:scale-95"
                title="Sair da Conta"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSave} className="overflow-y-auto space-y-5 py-4 pr-1 flex-1">
          
          {/* Avatar Preview & Selection */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Avatar Preview" 
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-purple-500/30 shadow-md"
                />
              ) : avatarEmoji ? (
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-md ring-4 ring-purple-500/20"
                  style={{ backgroundColor: avatarColor }}
                >
                  {avatarEmoji}
                </div>
              ) : (
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-md ring-4 ring-purple-500/20"
                  style={{ backgroundColor: avatarColor }}
                >
                  {(name || 'U').charAt(0).toUpperCase()}
                </div>
              )}

              <label 
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full cursor-pointer shadow-md transition-transform active:scale-90 flex items-center justify-center"
                title="Alterar foto"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Foto ou Avatar Visual</h4>
              <p className="text-[11px] text-slate-400">Envie uma foto de perfil ou escolha um emoji e cor personalizada abaixo.</p>
              {avatarUrl && (
                <button 
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 justify-center sm:justify-start hover:underline pt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remover foto
                </button>
              )}
            </div>
          </div>

          {/* Dados Pessoais / Cadastrais */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Dados Pessoais
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nome de Exibição */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Nome de Exibição *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Como deseja ser chamado"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
              </div>

              {/* Nome Completo */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
              </div>

              {/* CPF */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  CPF
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text"
                    value={cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
              </div>

              {/* Celular / WhatsApp */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Celular / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
              </div>

              {/* Teto de Gastos */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Teto de Gastos Mensal (R$)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="number"
                    step="0.01"
                    value={spendingCeiling}
                    onChange={(e) => setSpendingCeiling(e.target.value)}
                    placeholder="Ex: 3500.00"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
              </div>
            </div>

            {/* Endereço Completo */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Endereço Completo
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input 
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade - UF"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
            </div>
          </div>

          {/* Escolher Emoji ou Cor de Fundo */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Escolher Ícone ou Emoji
            </label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/50">
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
              Cor do Fundo do Avatar
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

          {/* Footer Actions inside form */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
            {onLogout ? (
              <button 
                type="button"
                onClick={() => {
                  if (confirm('Tem certeza que deseja sair da conta?')) {
                    onClose();
                    onLogout();
                  }
                }}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded-2xl text-xs font-bold transition-all border border-rose-200/60 dark:border-rose-800/60 active:scale-95 flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da Conta</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-purple-200 dark:shadow-none active:scale-95"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
