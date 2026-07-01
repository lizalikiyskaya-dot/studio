"use client";

import { useState, useTransition, useRef } from "react";
import { uploadFile } from "@/lib/uploadFile";
import { updateProfileName, updateProfileEmail, updateProfilePassword, updateProfileAvatar } from "./actions";

function getInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function ProfileForm({
  userId,
  initialName,
  initialEmail,
  initialAvatarUrl,
}: {
  userId: string;
  initialName: string;
  initialEmail: string;
  initialAvatarUrl: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [, startTransition] = useTransition();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  }

  function handleAvatarFile(file: File) {
    startTransition(async () => {
      const { dataUrl } = await uploadFile("avatar", userId, "avatarUrl", file);
      setAvatarUrl(dataUrl);
      await updateProfileAvatar(dataUrl);
      flash("Аватарка обновлена", true);
    });
  }

  function handleSaveName() {
    startTransition(async () => {
      const res = await updateProfileName(name);
      if ("error" in res) flash(res.error ?? "Ошибка", false);
      else flash("Имя сохранено", true);
    });
  }

  function handleSaveEmail() {
    startTransition(async () => {
      const res = await updateProfileEmail(email);
      if ("error" in res) flash(res.error ?? "Ошибка", false);
      else flash("Email сохранён", true);
    });
  }

  function handleSavePassword() {
    startTransition(async () => {
      const res = await updateProfilePassword(currentPw, newPw);
      if ("error" in res) flash(res.error ?? "Ошибка", false);
      else {
        flash("Пароль изменён", true);
        setCurrentPw("");
        setNewPw("");
      }
    });
  }

  const fieldCls = "w-full border rounded-[9px] px-3 py-2 text-[13.5px] outline-none";
  const fieldStyle = { borderColor: "var(--border)", background: "var(--bg-card)", color: "var(--ink)" };
  const labelCls = "block text-[12px] mb-1.5 font-medium";
  const labelStyle = { color: "var(--ink-soft)" };
  const sectionCls = "mb-7";

  return (
    <div className="max-w-[480px]">
      {msg && (
        <div
          className="mb-5 px-4 py-2.5 rounded-[9px] text-[13px]"
          style={{ background: msg.ok ? "var(--sage-soft)" : "var(--accent-soft)", color: msg.ok ? "var(--sage)" : "var(--accent)" }}
        >
          {msg.text}
        </div>
      )}

      {/* Avatar */}
      <div className={sectionCls}>
        <div className="text-[14px] font-semibold mb-3" style={{ color: "var(--ink)" }}>Фото профиля</div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="rounded-full flex-shrink-0 overflow-hidden"
            style={{ width: 64, height: 64, background: "var(--accent-soft)", position: "relative" }}
            title="Нажми для загрузки фото"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                {getInitials(name)}
              </span>
            )}
          </button>
          <div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="text-[13px] underline underline-offset-2"
              style={{ color: "var(--accent)" }}
            >
              Загрузить фото
            </button>
            {avatarUrl && (
              <button
                onClick={() => {
                  setAvatarUrl("");
                  startTransition(async () => { await updateProfileAvatar(""); });
                }}
                className="block mt-1 text-[12px]"
                style={{ color: "var(--ink-faint)" }}
              >
                Удалить фото
              </button>
            )}
          </div>
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); }}
        />
      </div>

      {/* Name */}
      <div className={sectionCls}>
        <div className="text-[14px] font-semibold mb-3" style={{ color: "var(--ink)" }}>Имя</div>
        <label className={labelCls} style={labelStyle}>Как тебя зовут</label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldCls}
            style={fieldStyle}
          />
          <button
            onClick={handleSaveName}
            className="px-4 py-2 rounded-[9px] text-[13px] font-medium flex-shrink-0"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Сохранить
          </button>
        </div>
      </div>

      {/* Email */}
      <div className={sectionCls}>
        <div className="text-[14px] font-semibold mb-3" style={{ color: "var(--ink)" }}>Email</div>
        <label className={labelCls} style={labelStyle}>Адрес электронной почты</label>
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className={fieldCls}
            style={fieldStyle}
          />
          <button
            onClick={handleSaveEmail}
            className="px-4 py-2 rounded-[9px] text-[13px] font-medium flex-shrink-0"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Сохранить
          </button>
        </div>
      </div>

      {/* Password */}
      <div className={sectionCls}>
        <div className="text-[14px] font-semibold mb-3" style={{ color: "var(--ink)" }}>Пароль</div>
        <label className={labelCls} style={labelStyle}>Текущий пароль</label>
        <input
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          type="password"
          className={`${fieldCls} mb-3`}
          style={fieldStyle}
        />
        <label className={labelCls} style={labelStyle}>Новый пароль</label>
        <div className="flex gap-2">
          <input
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            type="password"
            className={fieldCls}
            style={fieldStyle}
          />
          <button
            onClick={handleSavePassword}
            className="px-4 py-2 rounded-[9px] text-[13px] font-medium flex-shrink-0"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Сменить
          </button>
        </div>
      </div>
    </div>
  );
}
