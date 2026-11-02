"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { formatChars } from "@/features/acts/chapterText";
import {
  commitManuscriptImport,
  previewManuscriptImport,
  type ImportedChapter,
} from "./importActions";

type Level = 1 | 2 | 3;

type Piece = {
  title: string;
  level: number;
  text: string;
  chars: number;
  checked: boolean;
};

const LEVELS: { id: Level; label: string }[] = [
  { id: 1, label: "Заголовок 1" },
  { id: 2, label: "Заголовок 2" },
  { id: 3, label: "Заголовок 3" },
];

function chapterCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} глава`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} главы`;
  return `${count} глав`;
}

function levelLabel(level: number) {
  if (level <= 0) return "До заголовка";
  return `Заголовок ${level}`;
}

export default function ManuscriptImport({
  bookId,
  onClose,
  onCreated,
}: {
  bookId: string;
  onClose: () => void;
  onCreated: (chapters: ImportedChapter[]) => void;
}) {
  const titleId = useId();
  const [level, setLevel] = useState<Level>(1);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [pieces, setPieces] = useState<Piece[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "save" | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function preview(nextLevel: Level) {
    if (busy) return;
    setBusy("preview");
    setError(null);
    const form = new FormData();
    form.set("bookId", bookId);
    form.set("level", String(nextLevel));
    if (file) form.set("file", file);
    else form.set("url", url.trim());
    const result = await previewManuscriptImport(form);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPieces(result.pieces);
    setNote(result.note);
  }

  async function commit() {
    if (!pieces || busy) return;
    const chosen = pieces.filter((piece) => piece.checked);
    if (chosen.length === 0) {
      setError("Отметьте хотя бы одну часть.");
      return;
    }
    setBusy("save");
    setError(null);
    const result = await commitManuscriptImport(
      bookId,
      chosen.map((piece) => ({ title: piece.title, text: piece.text })),
    );
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onCreated(result.chapters);
  }

  const chosen = pieces?.filter((piece) => piece.checked).length ?? 0;
  const dialog = (
    <div className="site-dialog-root">
      <button type="button" className="site-dialog-backdrop" aria-label="Закрыть" onClick={() => { if (!busy) onClose(); }} />
      <div className="site-dialog-card manuscript-import-card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="manuscript-import-title">Загрузить текст</h2>
        <p className="manuscript-import-lead">
          Файл .docx или ссылка на Google Документ, открытый по ссылке. Текст делится по заголовкам.
          Отмеченные части станут главами в рукописи и в трекере. План книги не меняется.
        </p>
        <div className="manuscript-import-level">
          <span>Делить по</span>
          <div className="manuscript-import-levels" role="group" aria-label="Уровень заголовка">
            {LEVELS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === level ? "is-on" : undefined}
                aria-pressed={item.id === level}
                disabled={busy !== null}
                onClick={() => {
                  setLevel(item.id);
                  if (pieces) void preview(item.id);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="manuscript-import-field">
          Файл .docx
          <label className="manuscript-import-pick">
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              aria-label="Файл .docx"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPieces(null);
              }}
            />
            <span>{file ? "Другой файл" : "Выбрать файл"}</span>
          </label>
        </div>
        <p className={file ? "manuscript-import-file" : "manuscript-import-note"}>{file ? file.name : "Файл не выбран"}</p>
        <label className="manuscript-import-field">
          Ссылка на Google Документ
          <input
            type="url"
            inputMode="url"
            placeholder="https://docs.google.com/document/…"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setPieces(null);
            }}
          />
        </label>
        {file && url.trim() ? <p className="manuscript-import-note">Будет разобран файл. Ссылка не понадобится.</p> : null}
        {pieces ? (
          <>
            {note ? <p className="manuscript-import-note">{note}</p> : null}
            <div className="manuscript-import-tools">
              <span>Отмечено: {chapterCount(chosen)}</span>
              <button type="button" disabled={busy !== null} onClick={() => setPieces(pieces.map((piece) => ({ ...piece, checked: true })))}>Отметить все</button>
              <button type="button" disabled={busy !== null} onClick={() => setPieces(pieces.map((piece) => ({ ...piece, checked: false })))}>Снять отметки</button>
            </div>
            <ul className="manuscript-import-list">
              {pieces.map((piece, index) => (
                <li key={`${piece.title}-${index}`}>
                  <label>
                    <input
                      type="checkbox"
                      checked={piece.checked}
                      disabled={busy !== null}
                      onChange={() => {
                        setPieces(pieces.map((item, itemIndex) => (
                          itemIndex === index ? { ...item, checked: !item.checked } : item
                        )));
                      }}
                    />
                    <span>
                      <strong>{piece.title}</strong>
                      <em>{levelLabel(piece.level)} · {formatChars(piece.chars)} знаков</em>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="site-dialog-actions">
          <button type="button" className="site-dialog-secondary" disabled={busy !== null} onClick={onClose}>
            Отмена
          </button>
          {pieces ? (
            <button type="button" className="site-dialog-primary" disabled={busy !== null || chosen === 0} onClick={() => void commit()}>
              {busy === "save" ? "Создаём…" : "Создать главы"}
            </button>
          ) : (
            <button type="button" className="site-dialog-primary" disabled={busy !== null} onClick={() => void preview(level)}>
              {busy === "preview" ? "Разбираем…" : "Разобрать"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(dialog, document.body);
}
