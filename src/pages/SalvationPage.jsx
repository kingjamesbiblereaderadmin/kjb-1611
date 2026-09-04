import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft } from 'lucide-react';
import GospelContent from '@/components/GospelContent';

export default function SalvationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <div className="w-full max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 py-10 pb-24">
        <div className="text-center mb-6">
          <Link
            to="/landing"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-transparent border border-border text-foreground font-sans text-sm font-medium hover:border-accent transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Landing
          </Link>
        </div>

        <GospelContent showPreachers showSpanishGospelCard />
      </div>
    </div>
  );
}