import { Github, BookOpen, Heart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* About */}
          <div className="md:col-span-1">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 text-base">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {t('footer.about')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed text-justify">
              {t('footer.description')}
            </p>
          </div>

          {/* Links */}
          <div className="md:col-span-1 flex flex-col items-center md:items-start">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-base">
              {t('footer.links')}
            </h3>
            <ul className="space-y-3 text-sm flex flex-col items-center md:items-start">
              <li>
                <a 
                  href="https://github.com/Triwalt/Viewterbi" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2 transition-colors group"
                >
                  <Github className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>{t('footer.github')}</span>
                </a>
              </li>
              <li>
                <a 
                  href="https://en.wikipedia.org/wiki/Viterbi_algorithm" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2 transition-colors group"
                >
                  <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>{t('footer.docs')}</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Technology Stack */}
          <div className="md:col-span-1">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-base">
              {t('footer.tech')}
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">React</span>
              <span className="px-3 py-1.5 text-xs font-medium bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 rounded-full">TailwindCSS</span>
              <span className="px-3 py-1.5 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">Vite</span>
              <span className="px-3 py-1.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">Lucide Icons</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-slate-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <span>{t('footer.madeWith')}</span>
              <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
              <span>{t('footer.forEducation')}</span>
            </div>
            <div className="text-center md:text-right">
              © 2025 Viewterbi. Presented by Triwalt. {t('footer.rights')}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
