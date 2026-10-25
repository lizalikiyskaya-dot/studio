"use client";

import { useState, useTransition } from "react";
import type { Comment } from "@/generated/prisma/client";
import { Button } from "@/components/ui/Button";
import { siteConfirm } from "@/components/SiteDialog";
import { addComment, deleteComment, type CommentableModel } from "@/features/comments/actions";

export default function MoveNote({
  model,
  recordId,
  field,
  comments,
}: {
  model: CommentableModel;
  recordId: string;
  field: string;
  comments: Comment[];
}) {
  const mine = comments.filter((comment) => comment.field === field);
  const [items, setItems] = useState(mine);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [, startTransition] = useTransition();

  function publish() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    setOpen(false);
    startTransition(async () => {
      const comment = await addComment(model, recordId, trimmed, field);
      setItems((prev) => [...prev, comment]);
    });
  }

  async function remove(id: string) {
    if (!(await siteConfirm("Удалить пометку?"))) return;
    setItems((prev) => prev.filter((comment) => comment.id !== id));
    startTransition(() => deleteComment(id));
  }

  return (
    <div className="mt-2">
      {items.map((comment) => (
        <p key={comment.id} className="mb-1 text-[13px] leading-snug" style={{ color: "var(--ink2)" }}>
          <b className="font-semibold" style={{ color: "var(--ink)" }}>{comment.author}.</b> {comment.text}{" "}
          <button type="button" className="lnk" onClick={() => remove(comment.id)}>
            удалить
          </button>
        </p>
      ))}
      {open ? (
        <div className="mt-1 flex items-end gap-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={2}
            placeholder="Пометка к этому ходу"
            className="fld min-h-0 flex-1 py-2"
            aria-label="Пометка к ходу"
          />
          <Button type="button" variant="primary" size="sm" pill onClick={publish}>
            Готово
          </Button>
        </div>
      ) : (
        <button type="button" className="lnk text-[13px]" onClick={() => setOpen(true)}>
          {items.length > 0 ? "ещё пометка" : "пометка"}
        </button>
      )}
    </div>
  );
}
