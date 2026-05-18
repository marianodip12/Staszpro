import Link from 'next/link';
import { Trophy } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="card p-8 max-w-md text-center">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)' }}
        >
          <Trophy size={22} style={{ color: 'var(--amber-400)' }} />
        </div>
        <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
          Organización no encontrada
        </h1>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          O la URL es incorrecta, o no formás parte de esta organización.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110"
          style={{ background: 'var(--blue-600)', color: 'white' }}
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
