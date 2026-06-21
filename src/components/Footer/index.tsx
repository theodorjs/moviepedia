import React from 'react';
import { Film } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-12 border-t border-white/5 bg-[#13151c]">
      <div className="container mx-auto flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple">
            <Film className="h-4 w-4 text-white" />
          </span>
          <span className="font-bold text-text-primary">Moviepedia</span>
        </div>
        <p className="max-w-md text-xs text-text-secondary">
          Data from{' '}
          <a
            className="text-accent-blue hover:underline"
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noreferrer"
          >
            TMDb
          </a>{' '}
          and{' '}
          <a
            className="text-accent-blue hover:underline"
            href="https://www.omdbapi.com/"
            target="_blank"
            rel="noreferrer"
          >
            OMDb
          </a>
          . This product uses the TMDb API but is not endorsed or certified by TMDb.
        </p>
        <p className="text-xs text-text-secondary">© {new Date().getFullYear()} Moviepedia</p>
      </div>
    </footer>
  );
};

export default Footer;
