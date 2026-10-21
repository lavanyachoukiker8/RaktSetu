import { Link } from 'react-router-dom';
import { LogoMark } from '../components/Logo';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <LogoMark size={72} />
      <p className="mt-4 text-6xl font-extrabold text-red-600">404</p>
      <h1 className="mt-2 text-2xl font-bold">This bridge leads nowhere</h1>
      <p className="muted mt-1 max-w-md">The page you are looking for does not exist or has moved. Let us get you back on track.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">Go to home</Link>
        <Link to="/emergency" className="btn-outline">Emergency request</Link>
      </div>
    </div>
  );
}
