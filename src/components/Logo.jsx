import { Link } from 'react-router-dom';

export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 3C24 3 8 21 8 31a16 16 0 0 0 32 0C40 21 24 3 24 3z" fill="#D62839" />
      <path d="M13 33q11-12 22 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M16 36v-4M24 36v-7M32 36v-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ size = 36, to = '/', light = false }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2" aria-label="RaktSetu home">
      <LogoMark size={size} />
      <span className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-red-900'}`}>
        Rakt<span className={light ? 'text-red-300' : 'text-red-600'}>Setu</span>
      </span>
    </Link>
  );
}
