import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function VideoListCard({ videos }) {
  return (
    <div className="space-y-2">
      {videos.map((v) => (
        <a
          key={v.id}
          href={`https://youtu.be/${v.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-secondary/40 border border-border rounded-lg hover:border-accent/50 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] group"
        >
          <img
            src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`}
            alt=""
            className="w-20 h-12 object-cover rounded-md flex-shrink-0"
          />
          <span className="font-sans text-sm font-medium text-foreground group-hover:text-accent transition-colors flex-1">
            {v.title}
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0" />
        </a>
      ))}
    </div>
  );
}