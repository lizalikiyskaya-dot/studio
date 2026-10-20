import { Fragment } from "react";

type Block =
  | { kind: "h"; level: 3 | 4; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "p"; lines: string[] };

const HEADING = /^(#{1,3})\s+(\S.*)$/;
const BULLET = /^[-*•]\s+(\S.*)$/;
const ORDERED = /^\d+[.)]\s+(\S.*)$/;

/** Длинный текст: абзацы по пустой строке, заголовки с #, списки с «-» и «1.».
 *  Одиночный перенос строки остаётся переносом внутри абзаца. */
export function parseReading(source: string): Block[] {
  const chunks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const blocks: Block[] = [];
  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const content = lines.filter((line) => line.trim().length > 0);
    if (content.length === 0) continue;
    const headings = content.map((line) => line.match(HEADING));
    if (headings.every(Boolean)) {
      for (const match of headings) {
        if (!match) continue;
        blocks.push({ kind: "h", level: match[1].length > 1 ? 4 : 3, text: match[2] });
      }
      continue;
    }
    const bullets = content.map((line) => line.match(BULLET));
    if (bullets.every(Boolean)) {
      blocks.push({ kind: "ul", items: bullets.map((match) => match?.[1] ?? "") });
      continue;
    }
    const ordered = content.map((line) => line.match(ORDERED));
    if (ordered.every(Boolean)) {
      blocks.push({ kind: "ol", items: ordered.map((match) => match?.[1] ?? "") });
      continue;
    }
    blocks.push({ kind: "p", lines: content });
  }
  return blocks;
}

function Lines({ lines }: { lines: string[] }) {
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 ? <br /> : null}
      {line}
    </Fragment>
  ));
}

export default function ReadingText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseReading(text);
  if (blocks.length === 0) return null;
  return (
    <div className={`reading ${className}`.trim()}>
      {blocks.map((block, index) => {
        if (block.kind === "h") {
          return block.level === 3 ? <h3 key={index}>{block.text}</h3> : <h4 key={index}>{block.text}</h4>;
        }
        if (block.kind === "ul") {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
            </ul>
          );
        }
        if (block.kind === "ol") {
          return (
            <ol key={index}>
              {block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
            </ol>
          );
        }
        return <p key={index}><Lines lines={block.lines} /></p>;
      })}
    </div>
  );
}
