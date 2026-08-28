import React, { useRef, useState } from 'react';
import { uploadImage } from '../utils/api';
import { Upload, Loader2, ImageOff } from 'lucide-react';

interface ImageUploadFieldProps {
  slug: string;
  token: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: 'square' | 'wide';
}

// Campo de upload de foto local: mostra a prévia da imagem atual, um botão pra
// escolher um arquivo do computador do restaurante, e envia pro backend
// (POST /api/:slug/upload). Ao terminar, preenche `value` com a URL retornada.
export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  slug,
  token,
  label,
  value,
  onChange,
  aspect = 'wide',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo depois
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadImage(slug, token, file);
      onChange(url);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar a foto.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block font-bold text-stone-700 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <div
          className={`relative shrink-0 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center ${
            aspect === 'square' ? 'w-16 h-16' : 'w-24 h-14'
          }`}
        >
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-cover" />
          ) : (
            <ImageOff className="w-5 h-5 text-stone-300" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? 'Enviando...' : value ? 'Trocar foto' : 'Enviar foto do computador'}</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {error && <p className="text-[11px] text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
};
