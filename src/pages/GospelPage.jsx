import React from 'react';
import GospelContent from '@/components/GospelContent';

export default function GospelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <div className="w-full max-w-[120rem] mx-auto px-5 sm:px-8 lg:px-12 py-10">
        <GospelContent showSpanishGospelCard />
      </div>
    </div>
  );
}