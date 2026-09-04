import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';

export default function ExtensionLicensePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="w-full max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 py-10 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 mb-4">
            <Scale className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2">
            KJB Reader Extension — MIT License
          </h1>
          <p className="font-sans text-sm text-muted-foreground">Copyright (c) 2026 KJB Reader</p>
          <div className="mt-4 w-16 h-px bg-accent mx-auto" />
        </div>

        {/* Back to Extension link */}
        <div className="text-center mb-6">
          <Link
            to="/extension"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-transparent border border-border font-sans text-sm font-medium text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Extension
          </Link>
        </div>

        <div className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl p-6 sm:p-7 shadow-lg shadow-black/[0.03]">
          <div className="font-sans text-sm text-foreground/85 leading-relaxed space-y-4">
            <p>Copyright (c) 2026 KJB Reader</p>
            <p>
              Permission is hereby granted, free of charge, to any person obtaining a copy of this
              software and associated documentation files (the &ldquo;Software&rdquo;), to deal in
              the Software without restriction, including without limitation the rights to use,
              copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
              Software, and to permit persons to whom the Software is furnished to do so, subject
              to the following conditions:
            </p>
            <p>
              The above copyright notice and this permission notice shall be included in all
              copies or substantial portions of the Software.
            </p>
            <p>
              THE SOFTWARE IS PROVIDED &ldquo;AS IS&rdquo;, WITHOUT WARRANTY OF ANY KIND, EXPRESS
              OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
              FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
              COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
              ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
              SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link
            to="/extension"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-transparent border border-border font-sans text-sm font-medium text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Extension
          </Link>
        </div>
      </div>
    </div>
  );
}