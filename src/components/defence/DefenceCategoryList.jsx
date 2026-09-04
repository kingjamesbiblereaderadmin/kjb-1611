import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ExternalLink, Pencil, Trash2, Plus, GripVertical } from 'lucide-react';
import CopyButton from './CopyButton';
import { renderProtectedText } from '@/lib/protectDefenceTerms';

// Renders the list of resource cards for one category. In admin mode the
// cards become drag-and-drop reorderable; the new order is persisted by the
// parent via onReorder(categoryName, reorderedItems).
export default function DefenceCategoryList({ cat, isAdmin, adminMode, onReorder, onEdit, onDelete, onAdd }) {
  const draggable = isAdmin && adminMode && !!onReorder;

  const card = (item, provided) => (
    <div
      ref={provided?.innerRef}
      {...(provided?.draggableProps || {})}
      className="bg-card border border-border rounded-xl p-5 group"
    >
      <div className="flex items-start gap-2">
        {draggable && (
          <span {...(provided?.dragHandleProps || {})} className="p-1 mt-1 text-muted-foreground/40 hover:text-muted-foreground cursor-grab touch-none">
            <GripVertical className="w-4 h-4" />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="notranslate font-serif text-lg font-semibold text-foreground" translate="no">{item.title}</h3>
          </div>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed">{renderProtectedText(item.desc)}</p>
          <a href={item.url} target={item.url.startsWith('mailto') ? '_self' : '_blank'} rel="noopener noreferrer" className="inline-block mt-3 text-xs font-sans font-medium text-accent underline underline-offset-2">
            {item.label || item.url} →
          </a>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          <CopyButton text={item.url} className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors" />
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors" title="Open">
            <ExternalLink className="w-4 h-4" />
          </a>
          {isAdmin && adminMode && (
            <>
              <button onClick={() => onEdit(item)} className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors" title="Edit">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(item)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const addBtn = isAdmin && adminMode && onAdd ? (
    <button onClick={onAdd} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent font-sans text-sm font-medium transition-all duration-200">
      <Plus className="w-4 h-4" /> Add to <span className="notranslate" translate="no">{cat.name}</span>
    </button>
  ) : null;

  if (!draggable) {
    return (
      <div className="p-4 space-y-3">
        {cat.items.map((item) => card(item))}
        {addBtn}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={(result) => {
      if (!result.destination || result.destination.index === result.source.index) return;
      const next = [...cat.items];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      onReorder(cat.name, next);
    }}>
      <Droppable droppableId={cat.name}>
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="p-4 space-y-3">
            {cat.items.map((item, index) => (
              <Draggable draggableId={item.id} index={index} key={item.id}>
                {(prov) => card(item, prov)}
              </Draggable>
            ))}
            {provided.placeholder}
            {addBtn}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}