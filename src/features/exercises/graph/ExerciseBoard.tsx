"use client";

import { useRef, useState, useTransition } from "react";
import type { ArcType, Comment } from "@/generated/prisma/client";
import CardSaveButton from "@/components/CardSaveButton";
import ImageUploadBox from "@/components/ImageUploadBox";
import { siteConfirm } from "@/components/SiteDialog";
import { Button } from "@/components/ui/Button";
import CommentsBlock from "@/features/comments/CommentsBlock";
import { ARC_GROUPS } from "@/features/characters/fields";
import SuggestableField from "@/features/suggestions/SuggestableField";
import { deletePhoto, uploadFile } from "@/lib/uploadFile";
import { createBeliefCard, deleteBeliefCard } from "../belief/actions";
import { createPopArcCharacter, deletePopArcCharacter, updatePopArcType } from "../popArcs/actions";
import { createStoryCircleCard, deleteStoryCircleCard } from "../storyCircle/actions";
import { STORY_CIRCLE_STEPS } from "../storyCircle/steps";
import MoveNote from "./MoveNote";
import { CircleChart, PointChart } from "./Shapes";
import { arcMoveFilled, arcPositions, hasText } from "./moves";

const ARC_TYPES: ArcType[] = ["POSITIVE", "DISILLUSIONMENT", "FALL", "CORRUPTION", "FLAT"];
const ARC_LABEL: Record<ArcType, string> = {
  POSITIVE: "Позитивная",
  DISILLUSIONMENT: "Разочарование",
  FALL: "Падение",
  CORRUPTION: "Порча",
  FLAT: "Плоская",
};

export type ArcItem = {
  id: string;
  name: string;
  photoUrl: string | null;
  isExample: boolean;
  arcType: ArcType | null;
  data: Record<string, string>;
};

export type BeliefItem = {
  id: string;
  hero: string;
  photoUrl: string | null;
  isExample: boolean;
  startBelief: string;
  endBelief: string;
};

export type CircleItem = {
  id: string;
  hero: string;
  photoUrl: string | null;
  isExample: boolean;
  data: Record<string, string>;
};

type BoardProps = {
  studentId: string;
  isMentorViewer: boolean;
  arcs: ArcItem[];
  beliefs: BeliefItem[];
  circles: CircleItem[];
  arcComments: Record<string, Comment[]>;
  beliefComments: Record<string, Comment[]>;
  circleComments: Record<string, Comment[]>;
  arcSuggestions: Record<string, Record<string, string>>;
  beliefSuggestions: Record<string, Record<string, string>>;
  circleSuggestions: Record<string, Record<string, string>>;
};

function looseComments(comments: Comment[]) {
  return comments.filter((comment) => !comment.field);
}

function pickMove(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function Picker({
  labels,
  active,
  onPick,
}: {
  labels: string[];
  active: number;
  onPick: (index: number) => void;
}) {
  if (labels.length <= 1) return null;
  return (
    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
      {labels.map((label, index) => {
        const on = index === active;
        return (
          <button
            key={`${label}-${index}`}
            type="button"
            onClick={() => onPick(index)}
            className="h-8 shrink-0 rounded-full px-3.5 text-[13.5px] font-medium"
            style={{
              background: on ? "var(--ink)" : "#fff",
              color: on ? "#fff" : "var(--ink)",
              border: on ? "none" : "1px solid var(--border)",
            }}
          >
            {label || "Без имени"}
          </button>
        );
      })}
    </div>
  );
}

function Literary({
  readOnly,
  model,
  recordId,
  field,
  value,
  suggestion,
  placeholder,
  onSaved,
}: {
  readOnly: boolean;
  model: "PopArcCharacter" | "BeliefCard" | "StoryCircleCard";
  recordId: string;
  field: string;
  value: string;
  suggestion?: string;
  placeholder: string;
  onSaved?: (value: string) => void;
}) {
  if (readOnly) {
    return (
      <p className="field-literary text-[15.5px] leading-relaxed">
        {value.trim() ? value : <span style={{ color: "var(--faded)" }}>—</span>}
      </p>
    );
  }
  return (
    <SuggestableField
      model={model}
      recordId={recordId}
      field={field}
      value={value}
      suggestion={suggestion}
      placeholder={placeholder}
      onSaved={onSaved}
      resizable
      ariaLabel={placeholder}
      className="fld field-literary w-full"
    />
  );
}

function Sheet({
  title,
  hint,
  children,
  scopeRef,
  showSave,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
  scopeRef: React.RefObject<HTMLDivElement | null>;
  showSave: boolean;
}) {
  return (
    <section ref={scopeRef} className="rounded-[18px] p-4" style={{ border: "1px solid var(--border)", background: "#fff" }}>
      <h2 className="heading text-[18px]">{title}</h2>
      <p className="mb-3 mt-1 text-[13.5px] leading-snug" style={{ color: "var(--ink2)" }}>{hint}</p>
      {children}
      {showSave ? (
        <div className="mt-3">
          <CardSaveButton scopeRef={scopeRef} />
        </div>
      ) : null}
    </section>
  );
}

export default function ExerciseBoard(props: BoardProps) {
  const [mode, setMode] = useState<"own" | "examples">("own");
  const own = mode === "own";
  const canEditExamples = props.isMentorViewer;
  const readOnly = !own && !canEditExamples;

  const arcs = props.arcs.filter((item) => item.isExample !== own);
  const beliefs = props.beliefs.filter((item) => item.isExample !== own);
  const circles = props.circles.filter((item) => item.isExample !== own);

  return (
    <div>
      <div className="seg mb-5">
        <button
          type="button"
          onClick={() => setMode("own")}
          className="rounded-full px-4 py-1.5 text-[14px]"
          style={{
            background: own ? "#fff" : "transparent",
            color: "var(--ink)",
            fontWeight: own ? 600 : 400,
            boxShadow: own ? "0 1px 2px rgba(0,0,0,.06)" : undefined,
          }}
        >
          Мои герои
        </button>
        <button
          type="button"
          onClick={() => setMode("examples")}
          className="rounded-full px-4 py-1.5 text-[14px]"
          style={{
            background: !own ? "#fff" : "transparent",
            color: "var(--ink)",
            fontWeight: !own ? 600 : 400,
            boxShadow: !own ? "0 1px 2px rgba(0,0,0,.06)" : undefined,
          }}
        >
          Примеры
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid items-start gap-4 min-[1000px]:grid-cols-2">
          <ArcSheet
            key={`arc-${mode}`}
            studentId={props.studentId}
            items={arcs}
            isExample={!own}
            readOnly={readOnly}
            canAdd={own || canEditExamples}
            comments={props.arcComments}
            suggestions={props.arcSuggestions}
          />
          <CircleSheet
            key={`circle-${mode}`}
            studentId={props.studentId}
            items={circles}
            isExample={!own}
            readOnly={readOnly}
            canAdd={own || canEditExamples}
            comments={props.circleComments}
            suggestions={props.circleSuggestions}
          />
        </div>
        <BeliefSheet
          key={`belief-${mode}`}
          studentId={props.studentId}
          items={beliefs}
          isExample={!own}
          readOnly={readOnly}
          canAdd={own || canEditExamples}
          comments={props.beliefComments}
          suggestions={props.beliefSuggestions}
        />
      </div>
    </div>
  );
}

function BeliefSheet({
  studentId,
  items,
  isExample,
  readOnly,
  canAdd,
  comments,
  suggestions,
}: {
  studentId: string;
  items: BeliefItem[];
  isExample: boolean;
  readOnly: boolean;
  canAdd: boolean;
  comments: Record<string, Comment[]>;
  suggestions: Record<string, Record<string, string>>;
}) {
  const [list, setList] = useState(items);
  const [index, setIndex] = useState(0);
  const [, startTransition] = useTransition();
  const scopeRef = useRef<HTMLDivElement>(null);
  const card = list[index] ?? list[0];

  function add() {
    startTransition(async () => {
      const created = await createBeliefCard(studentId, isExample);
      setList((prev) => [...prev, { ...created, photoUrl: null, startBelief: created.startBelief, endBelief: created.endBelief }]);
      setIndex(list.length);
    });
  }

  async function remove(id: string) {
    if (!(await siteConfirm("Удалить эту карточку?"))) return;
    setList((prev) => prev.filter((item) => item.id !== id));
    setIndex(0);
    startTransition(() => deleteBeliefCard(id));
  }

  return (
    <Sheet
      scopeRef={scopeRef}
      title="Начало и конец"
      hint="Две точки пути. Жёлтая — мысль уже записана."
      showSave={!readOnly && !!card}
    >
      <Picker labels={list.map((item) => item.hero)} active={index} onPick={setIndex} />
      {card ? (
        <BeliefBody
          key={card.id}
          card={card}
          readOnly={readOnly}
          comments={comments[card.id] ?? []}
          suggestions={suggestions[card.id] ?? {}}
          onDelete={() => remove(card.id)}
        />
      ) : (
        <p className="text-[14px]" style={{ color: "var(--ink2)" }}>Пока нет карточки.</p>
      )}
      {canAdd ? (
        <div className="mt-3">
          <Button type="button" variant="dashed" size="sm" pill onClick={add}>+ герой</Button>
        </div>
      ) : null}
    </Sheet>
  );
}

function BeliefBody({
  card,
  readOnly,
  comments,
  suggestions,
  onDelete,
}: {
  card: BeliefItem;
  readOnly: boolean;
  comments: Comment[];
  suggestions: Record<string, string>;
  onDelete: () => void;
}) {
  const [hero, setHero] = useState(card.hero);
  const [start, setStart] = useState(card.startBelief);
  const [end, setEnd] = useState(card.endBelief);
  const [photoUrl, setPhotoUrl] = useState(card.photoUrl);
  const [active, setActive] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <ImageUploadBox
          value={photoUrl}
          shape="circle"
          readOnly={readOnly}
          placeholder="фото"
          className="shrink-0 rounded-full"
          style={{ width: 48, height: 48 }}
          onUpload={(file) => {
            setPhotoUrl(URL.createObjectURL(file));
            startTransition(() => { void uploadFile("belief-photo", card.id, "photoUrl", file); });
          }}
          onDelete={() => {
            setPhotoUrl(null);
            startTransition(() => { void deletePhoto("belief-photo", card.id, "photoUrl"); });
          }}
        />
        <div className="min-w-0 flex-1">
          <Literary
            readOnly={readOnly}
            model="BeliefCard"
            recordId={card.id}
            field="hero"
            value={hero}
            suggestion={suggestions.hero}
            placeholder="Имя героя"
            onSaved={setHero}
          />
        </div>
        {!readOnly ? (
          <Button type="button" variant="secondary" size="sm" pill onClick={onDelete}>удалить</Button>
        ) : null}
      </div>
      <PointChart
        points={[{ x: 18, y: 50 }, { x: 82, y: 50 }]}
        filled={[hasText(start), hasText(end)]}
        active={active}
        labels={["В начале", "В конце"]}
        height={72}
        onPick={(next) => {
          setActive(next);
          pickMove(`belief-${card.id}-${next}`);
        }}
      />
      <div className="mt-3 grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
        <Move
          id={`belief-${card.id}-0`}
          active={active === 0}
          label="1 · В начале думает"
          field={
            <Literary
              readOnly={readOnly}
              model="BeliefCard"
              recordId={card.id}
              field="startBelief"
              value={start}
              suggestion={suggestions.startBelief}
              placeholder="В начале истории герой думает, что…"
              onSaved={setStart}
            />
          }
          note={<MoveNote model="BeliefCard" recordId={card.id} field="startBelief" comments={comments} />}
        />
        <Move
          id={`belief-${card.id}-1`}
          active={active === 1}
          label="2 · В конце понимает"
          field={
            <Literary
              readOnly={readOnly}
              model="BeliefCard"
              recordId={card.id}
              field="endBelief"
              value={end}
              suggestion={suggestions.endBelief}
              placeholder="В конце истории понимает, что…"
              onSaved={setEnd}
            />
          }
          note={<MoveNote model="BeliefCard" recordId={card.id} field="endBelief" comments={comments} />}
        />
      </div>
      <CommentsBlock model="BeliefCard" recordId={card.id} initialComments={looseComments(comments)} />
    </div>
  );
}

function ArcSheet({
  studentId,
  items,
  isExample,
  readOnly,
  canAdd,
  comments,
  suggestions,
}: {
  studentId: string;
  items: ArcItem[];
  isExample: boolean;
  readOnly: boolean;
  canAdd: boolean;
  comments: Record<string, Comment[]>;
  suggestions: Record<string, Record<string, string>>;
}) {
  const [list, setList] = useState(items);
  const [index, setIndex] = useState(0);
  const [, startTransition] = useTransition();
  const scopeRef = useRef<HTMLDivElement>(null);
  const card = list[index] ?? list[0];

  function add() {
    startTransition(async () => {
      const created = await createPopArcCharacter(studentId, isExample);
      setList((prev) => [
        ...prev,
        { id: created.id, name: created.name, photoUrl: null, isExample: created.isExample, arcType: created.arcType, data: {} },
      ]);
      setIndex(list.length);
    });
  }

  async function remove(id: string) {
    if (!(await siteConfirm("Удалить этого героя?"))) return;
    setList((prev) => prev.filter((item) => item.id !== id));
    setIndex(0);
    startTransition(() => deletePopArcCharacter(id));
  }

  return (
    <Sheet
      scopeRef={scopeRef}
      title="Арка"
      hint="Кривая и все ходы сразу. Жёлтая точка — ход уже написан."
      showSave={!readOnly && !!card}
    >
      <Picker labels={list.map((item) => item.name)} active={index} onPick={setIndex} />
      {card ? (
        <ArcBody
          key={card.id}
          card={card}
          readOnly={readOnly}
          comments={comments[card.id] ?? []}
          suggestions={suggestions[card.id] ?? {}}
          onDelete={() => remove(card.id)}
        />
      ) : (
        <p className="text-[14px]" style={{ color: "var(--ink2)" }}>Пока нет арки.</p>
      )}
      {canAdd ? (
        <div className="mt-3">
          <Button type="button" variant="dashed" size="sm" pill onClick={add}>+ герой</Button>
        </div>
      ) : null}
    </Sheet>
  );
}

function ArcBody({
  card,
  readOnly,
  comments,
  suggestions,
  onDelete,
}: {
  card: ArcItem;
  readOnly: boolean;
  comments: Comment[];
  suggestions: Record<string, string>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(card.name);
  const [photoUrl, setPhotoUrl] = useState(card.photoUrl);
  const [arcType, setArcType] = useState(card.arcType);
  const [data, setData] = useState(card.data);
  const [active, setActive] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const group = arcType ? ARC_GROUPS[ARC_TYPES.indexOf(arcType)] : null;
  const fields = group?.fields ?? [];
  const filled = fields.map((field) => arcMoveFilled(data, field.key, field.sceneKey));

  function choose(type: ArcType) {
    if (readOnly) return;
    setArcType(type);
    setActive(null);
    startTransition(() => updatePopArcType(card.id, type));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <ImageUploadBox
          value={photoUrl}
          shape="circle"
          readOnly={readOnly}
          placeholder="фото"
          className="shrink-0 rounded-full"
          style={{ width: 48, height: 48 }}
          onUpload={(file) => {
            setPhotoUrl(URL.createObjectURL(file));
            startTransition(() => { void uploadFile("popArc-photo", card.id, "photoUrl", file); });
          }}
          onDelete={() => {
            setPhotoUrl(null);
            startTransition(() => { void deletePhoto("popArc-photo", card.id, "photoUrl"); });
          }}
        />
        <div className="min-w-0 flex-1">
          <Literary
            readOnly={readOnly}
            model="PopArcCharacter"
            recordId={card.id}
            field="name"
            value={name}
            suggestion={suggestions.name}
            placeholder="Имя героя"
            onSaved={setName}
          />
        </div>
        {!readOnly ? (
          <Button type="button" variant="secondary" size="sm" pill onClick={onDelete}>удалить</Button>
        ) : null}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {ARC_TYPES.map((type) => {
          const on = arcType === type;
          return (
            <button
              key={type}
              type="button"
              disabled={readOnly}
              onClick={() => choose(type)}
              className="rounded-full px-3 py-1.5 text-[13px]"
              style={{
                background: on ? "var(--y)" : "#fff",
                color: "var(--ink)",
                border: on ? "1.5px solid var(--y)" : "1px solid var(--border)",
                cursor: readOnly ? "default" : "pointer",
              }}
            >
              {ARC_LABEL[type]}
            </button>
          );
        })}
      </div>
      {fields.length > 0 ? (
        <>
          <PointChart
            points={arcPositions(fields.length)}
            filled={filled}
            active={active}
            labels={fields.map((field) => field.label)}
            onPick={(next) => {
              setActive(next);
              pickMove(`arc-${card.id}-${fields[next].key}`);
            }}
          />
          <div className="mt-4 flex flex-col gap-3">
            {fields.map((field, index) => (
              <Move
                key={field.key}
                id={`arc-${card.id}-${field.key}`}
                active={active === index}
                label={`${index + 1} · ${field.label}`}
                field={
                  <div className="flex flex-col gap-2">
                    <Literary
                      readOnly={readOnly}
                      model="PopArcCharacter"
                      recordId={card.id}
                      field={field.key}
                      value={data[field.key] ?? ""}
                      suggestion={suggestions[field.key]}
                      placeholder="Тезис"
                      onSaved={(value) => setData((prev) => ({ ...prev, [field.key]: value }))}
                    />
                    {field.sceneKey ? (
                      <Literary
                        readOnly={readOnly}
                        model="PopArcCharacter"
                        recordId={card.id}
                        field={field.sceneKey}
                        value={data[field.sceneKey] ?? ""}
                        suggestion={suggestions[field.sceneKey]}
                        placeholder="В какой сцене это видно"
                        onSaved={(value) => setData((prev) => ({ ...prev, [field.sceneKey!]: value }))}
                      />
                    ) : null}
                  </div>
                }
                note={<MoveNote model="PopArcCharacter" recordId={card.id} field={field.key} comments={comments} />}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="text-[14px]" style={{ color: "var(--ink2)" }}>
          {readOnly ? "Тип арки пока не выбран." : "Сначала выберите тип арки — ходы появятся все сразу."}
        </p>
      )}
      <CommentsBlock model="PopArcCharacter" recordId={card.id} initialComments={looseComments(comments)} />
    </div>
  );
}

function CircleSheet({
  studentId,
  items,
  isExample,
  readOnly,
  canAdd,
  comments,
  suggestions,
}: {
  studentId: string;
  items: CircleItem[];
  isExample: boolean;
  readOnly: boolean;
  canAdd: boolean;
  comments: Record<string, Comment[]>;
  suggestions: Record<string, Record<string, string>>;
}) {
  const [list, setList] = useState(items);
  const [index, setIndex] = useState(0);
  const [, startTransition] = useTransition();
  const scopeRef = useRef<HTMLDivElement>(null);
  const card = list[index] ?? list[0];

  function add() {
    startTransition(async () => {
      const created = await createStoryCircleCard(studentId, isExample);
      setList((prev) => [
        ...prev,
        { id: created.id, hero: created.hero, photoUrl: null, isExample: created.isExample, data: {} },
      ]);
      setIndex(list.length);
    });
  }

  async function remove(id: string) {
    if (!(await siteConfirm("Удалить этот круг?"))) return;
    setList((prev) => prev.filter((item) => item.id !== id));
    setIndex(0);
    startTransition(() => deleteStoryCircleCard(id));
  }

  return (
    <Sheet
      scopeRef={scopeRef}
      title="Круг Хармона"
      hint="Восемь точек. Подписи шагов — под кругом, не вокруг него."
      showSave={!readOnly && !!card}
    >
      <Picker labels={list.map((item) => item.hero)} active={index} onPick={setIndex} />
      {card ? (
        <CircleBody
          key={card.id}
          card={card}
          readOnly={readOnly}
          comments={comments[card.id] ?? []}
          suggestions={suggestions[card.id] ?? {}}
          onDelete={() => remove(card.id)}
        />
      ) : (
        <p className="text-[14px]" style={{ color: "var(--ink2)" }}>Пока нет круга.</p>
      )}
      {canAdd ? (
        <div className="mt-3">
          <Button type="button" variant="dashed" size="sm" pill onClick={add}>+ герой</Button>
        </div>
      ) : null}
    </Sheet>
  );
}

function CircleBody({
  card,
  readOnly,
  comments,
  suggestions,
  onDelete,
}: {
  card: CircleItem;
  readOnly: boolean;
  comments: Comment[];
  suggestions: Record<string, string>;
  onDelete: () => void;
}) {
  const [hero, setHero] = useState(card.hero);
  const [photoUrl, setPhotoUrl] = useState(card.photoUrl);
  const [data, setData] = useState(card.data);
  const [active, setActive] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const filled = STORY_CIRCLE_STEPS.map((step) => hasText(data[step.key]));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <ImageUploadBox
          value={photoUrl}
          shape="circle"
          readOnly={readOnly}
          placeholder="фото"
          className="shrink-0 rounded-full"
          style={{ width: 48, height: 48 }}
          onUpload={(file) => {
            setPhotoUrl(URL.createObjectURL(file));
            startTransition(() => { void uploadFile("storycircle-photo", card.id, "photoUrl", file); });
          }}
          onDelete={() => {
            setPhotoUrl(null);
            startTransition(() => { void deletePhoto("storycircle-photo", card.id, "photoUrl"); });
          }}
        />
        <div className="min-w-0 flex-1">
          <Literary
            readOnly={readOnly}
            model="StoryCircleCard"
            recordId={card.id}
            field="hero"
            value={hero}
            suggestion={suggestions.hero}
            placeholder="Герой или история"
            onSaved={setHero}
          />
        </div>
        {!readOnly ? (
          <Button type="button" variant="secondary" size="sm" pill onClick={onDelete}>удалить</Button>
        ) : null}
      </div>
      <CircleChart
        filled={filled}
        active={active}
        labels={STORY_CIRCLE_STEPS.map((step) => step.short)}
        onPick={(next) => {
          setActive(next);
          pickMove(`circle-${card.id}-${STORY_CIRCLE_STEPS[next].key}`);
        }}
      />
      <div className="mt-4 flex flex-col gap-3">
        {STORY_CIRCLE_STEPS.map((step, index) => (
          <Move
            key={step.key}
            id={`circle-${card.id}-${step.key}`}
            active={active === index}
            label={`${step.n} · ${step.short}`}
            detail={step.label}
            field={
              <Literary
                readOnly={readOnly}
                model="StoryCircleCard"
                recordId={card.id}
                field={step.key}
                value={data[step.key] ?? ""}
                suggestion={suggestions[step.key]}
                placeholder="Этот шаг"
                onSaved={(value) => setData((prev) => ({ ...prev, [step.key]: value }))}
              />
            }
            note={<MoveNote model="StoryCircleCard" recordId={card.id} field={step.key} comments={comments} />}
          />
        ))}
      </div>
      <CommentsBlock model="StoryCircleCard" recordId={card.id} initialComments={looseComments(comments)} />
    </div>
  );
}

function Move({
  id,
  active,
  label,
  detail,
  field,
  note,
}: {
  id: string;
  active: boolean;
  label: string;
  detail?: string;
  field: React.ReactNode;
  note: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="scroll-mt-24 rounded-[14px] p-3"
      style={{ border: `1px solid ${active ? "var(--ink)" : "var(--border)"}`, background: active ? "var(--soft)" : "#fff" }}
    >
      <div className="mb-1 text-[13.5px] font-semibold">{label}</div>
      {detail ? <p className="mb-2 text-[12.5px] leading-snug" style={{ color: "var(--muted)" }}>{detail}</p> : null}
      {field}
      {note}
    </div>
  );
}
