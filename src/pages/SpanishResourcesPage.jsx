import React from 'react';
import { ExternalLink, Globe, FileText, CheckCircle, PlayCircle, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import CopyButton from '@/components/defence/CopyButton';
import CollapsibleCard from '@/components/landing/CollapsibleCard';
import VideoListCard from '@/components/spanish/VideoListCard';

const LINKS = [
  {
    title: 'La Iglesia de la Nube',
    desc: 'Sitio Web de Evangelista Misionero Roberto Breaker',
    url: 'https://laiglesiadelanube.com/',
  },
  {
    title: 'Spanish Bible Issue',
    desc: 'Estudios sobre la controversia de las versiones de la Biblia en español.',
    url: 'https://spanishbibleissue.com/',
  },
];

const GOSPEL_VIDEO_ID = 'UmJcHODdUGY';

const MORE_VIDEOS_ES = [
  { id: 'RiMaRkwD1qA', title: 'El Asunto de La Biblia en Español' },
  { id: 'Dfs9zos3dO4', title: 'La Controversia de la Biblia Española' },
];

const MORE_VIDEOS_EN = [
  { id: 'z6hQC193RXw', title: 'Which Bible in Spanish?' },
  { id: 'fugWELY6XvQ', title: 'My Testimony About the Spanish Bible Issue' },
  { id: 'NTcuL1h_Fyk', title: 'The Problems and Errors in the 1960 Spanish Bible' },
  { id: 'A24ZR2_jFVg', title: 'Spanish Bible Issue Introduction' },
  { id: '9lVy-rwVJPw', title: 'The Truth about the 1909 Spanish Bible' },
  { id: 'x94ufvXm-wA', title: 'The Truth About the 1865 Spanish Bible' },
  { id: 'DpnThwT6Zn8', title: 'A Look at the Modern Gomez Bible and the Grievous Errors in Its First Edition' },
  { id: 'SKrXSayjdHQ', title: 'The 1865 Spanish Bible Contains Critical Texts' },
  { id: 'u4cv2uLVN1A', title: 'The 1865 Spanish Bible Reads with the Critical Texts!' },
  { id: 'USo1F9II0TI', title: 'The History of the Spanish Bible' },
  { id: 'ZTnRVsUfkEE', title: 'The History and Truth about the Spanish Bible Issue' },
  { id: 'MEYnVldg5Lg', title: 'The Spanish Bible Issue' },
  { id: 'WDxisN8QQt0', title: "Why I Don't Use the 1960 Spanish Bible!" },
  { id: 'DQtTV2P1n5Y', title: 'The Spanish Bible Issue Controversy: Which Bible in Spanish' },
  { id: 'DQ_Shf0uFpc', title: 'Part 5 King James Bible Seminar 2025: Spanish Bible History and Exhibition of Bibles' },
  { id: 'i-rsBO_KJb4', title: "The Spanish Bible Walkin' and A-Talkin'" },
];

export default function SpanishResourcesPage() {
  return (
    <div className="w-full max-w-[120rem] mx-auto px-5 sm:px-8 lg:px-12 py-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary mb-4">
          <FileText className="w-7 h-7 text-accent" />
        </div>
        <h1 className="font-serif text-4xl font-bold text-foreground mb-3">Recursos en Español</h1>
        <p className="font-sans text-muted-foreground max-w-lg mx-auto">
          Recursos y estudios de la Biblia en español.
        </p>
        <div className="mt-4 w-16 h-px bg-accent mx-auto" />
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Gospel video */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <PlayCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <h2 className="font-serif text-lg font-semibold text-foreground">El Evangelio en Español</h2>
          </div>
          <div className="rounded-xl overflow-hidden border border-border">
            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${GOSPEL_VIDEO_ID}?rel=0&modestbranding=1&playsinline=1`}
                title="El Evangelio en Español"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                loading="lazy"
                className="w-full h-full"
              />
            </div>
          </div>
          <a
            href={`https://youtu.be/${GOSPEL_VIDEO_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-accent hover:underline mt-3"
          >
            Ver en YouTube <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <Link
            to="/espanol-evangelio"
            className="flex items-center gap-3 p-4 mt-3 rounded-xl bg-secondary/40 border border-border hover:border-accent/50 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] group"
          >
            <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-white shadow-sm bg-gradient-to-br from-sky-500 to-blue-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">Leer el Evangelio de Salvación</p>
              <p className="font-sans text-xs text-muted-foreground">El artículo completo con videos adicionales</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0" />
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="notranslate font-serif text-lg font-semibold text-foreground" translate="no">Robert Breaker</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700/60 text-green-600 dark:text-green-400">
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-sans text-xs font-medium">Verified Preacher</span>
            </span>
          </div>

          <div className="space-y-3">
            {LINKS.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-secondary/40 border border-border rounded-xl p-4 hover:border-accent/50 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-white shadow-sm bg-gradient-to-br from-sky-500 to-blue-600">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="notranslate font-serif text-base font-semibold text-foreground group-hover:text-accent transition-colors" translate="no">
                      {item.title}
                    </h3>
                    <p className="font-sans text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                    <CopyButton text={item.url} className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors" />
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* More gospel videos, collapsible — Spanish first, then English */}
        <div className="mt-6 space-y-4">
          <CollapsibleCard
            icon={<PlayCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
            title="La Cuestión de la Biblia en Español - Robert Breaker (Español)"
          >
            <VideoListCard videos={MORE_VIDEOS_ES} />
          </CollapsibleCard>

          <CollapsibleCard
            icon={<PlayCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
            title="La Cuestión de la Biblia en Español - Robert Breaker (English)"
          >
            <VideoListCard videos={MORE_VIDEOS_EN} />
          </CollapsibleCard>
        </div>
      </div>
    </div>
  );
}