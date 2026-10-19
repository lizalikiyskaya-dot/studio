"use client";

import { useState, useTransition, useRef } from "react";
import { uploadFile } from "@/lib/uploadFile";
import ToggleSwitch from "@/components/ToggleSwitch";
import { Button } from "@/components/ui/Button";
import {
  updateProfileName,
  updateProfileEmail,
  updateProfilePassword,
  updateProfileAvatar,
  updateEmailNotifications,
} from "./actions";

function getInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function ProfileForm({
  userId,
  initialName,
  initialEmail,
  initialAvatarUrl,
  initialEmailNotifications = true,
  isMentor = false,
}: {
  userId: string;
  initialName: string;
  initialEmail: string;
  initialAvatarUrl: string | null;
  initialEmailNotifications?: boolean;
  isMentor?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [notifications, setNotifications] = useState(initialEmailNotifications);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; ok: boolean } | null>(null);
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

  function handleToggleNotifications(next: boolean) {
    setNotifications(next);
    startTransition(async () => {
      await updateEmailNotifications(next);
      flash(next ? "Уведомления на почту включены" : "Уведомления на почту выключены", true);
    });
  }

  function handleSavePassword() {
    if (!currentPw || !newPw || !confirmPw) {
      setPasswordMsg({ text: "Заполните все поля", ok: false });
      return;
    }
    if (newPw.length < 8) {
      setPasswordMsg({ text: "Пароль должен быть не короче 8 символов", ok: false });
      return;
    }
    if (newPw !== confirmPw) {
      setPasswordMsg({ text: "Новый пароль и повтор не совпадают", ok: false });
      return;
    }
    if (newPw === currentPw) {
      setPasswordMsg({ text: "Новый пароль должен отличаться от текущего", ok: false });
      return;
    }

    setSavingPw(true);
    startTransition(async () => {
      try {
        const res = await updateProfilePassword(currentPw, newPw, confirmPw);
        if ("error" in res) {
          setPasswordMsg({ text: res.error ?? "Не удалось сменить пароль", ok: false });
        } else {
          setPasswordMsg({
            text: "Пароль изменён. Остальные сессии завершены, эта остаётся активной.",
            ok: true,
          });
          setCurrentPw("");
          setNewPw("");
          setConfirmPw("");
        }
      } catch {
        setPasswordMsg({ text: "Не удалось сменить пароль. Попробуйте ещё раз.", ok: false });
      } finally {
        setSavingPw(false);
      }
    });
  }

  const fieldCls = "fld !h-11";
  const fieldStyle = { color: "var(--ink)" };
  const labelCls = "block text-[12px] mb-1.5 font-medium";
  const labelStyle = { color: "var(--ink-soft)" };
  const sectionCls = "mb-7";

  return (
    <div className="max-w-[480px]">
      {msg && (
        <div
          className="mb-5 px-4 py-2.5 rounded-[14px] text-[13px]"
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
          <Button type="button" variant="primary" size="sm" pill onClick={handleSaveName} className="flex-shrink-0">
            Сохранить
          </Button>
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
          <Button type="button" variant="primary" size="sm" pill onClick={handleSaveEmail} className="flex-shrink-0">
            Сохранить
          </Button>
        </div>
      </div>

      {/* Email notifications */}
      <div className={sectionCls}>
        <div className="text-[14px] font-semibold mb-3" style={{ color: "var(--ink)" }}>Уведомления на почту</div>
        <div className="rounded-[14px] border px-3.5 py-3" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          <ToggleSwitch
            checked={notifications}
            onChange={handleToggleNotifications}
            label={isMentor ? "Письма об изменениях у учеников" : "Письма о правках наставника"}
          />
        </div>
      </div>

      {/* Password */}
      <form
        className={sectionCls}
        onSubmit={(e) => {
          e.preventDefault();
          if (!savingPw) handleSavePassword();
        }}
      >
        <div className="text-[14px] font-semibold mb-3" style={{ color: "var(--ink)" }}>Пароль</div>
        {passwordMsg && (
          <div
            className="mb-3 px-4 py-2.5 rounded-[14px] text-[13px]"
            style={{
              background: passwordMsg.ok ? "var(--sage-soft)" : "var(--accent-soft)",
              color: passwordMsg.ok ? "var(--sage)" : "var(--accent)",
            }}
          >
            {passwordMsg.text}
          </div>
        )}
        <label htmlFor="current-password" className={labelCls} style={labelStyle}>Текущий пароль</label>
        <input
          id="current-password"
          name="currentPassword"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          type="password"
          autoComplete="current-password"
          className={`${fieldCls} mb-3`}
          style={fieldStyle}
        />
        <label htmlFor="new-password" className={labelCls} style={labelStyle}>Новый пароль</label>
        <input
          id="new-password"
          name="newPassword"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          type="password"
          autoComplete="new-password"
          minLength={8}
          className={`${fieldCls} mb-3`}
          style={fieldStyle}
        />
        <label htmlFor="confirm-password" className={labelCls} style={labelStyle}>Повторите новый пароль</label>
        <input
          id="confirm-password"
          name="confirmPassword"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          type="password"
          autoComplete="new-password"
          minLength={8}
          className={`${fieldCls} mb-3`}
          style={fieldStyle}
        />
        <button
          type="submit"
          disabled={savingPw}
          className="px-5 py-2 rounded-full text-[13px] font-medium disabled:opacity-60"
          style={{ background: "var(--y)", color: "var(--ink)", border: "none" }}
        >
          {savingPw ? "Меняем..." : "Сменить"}
        </button>
      </form>
    </div>
  );
}
