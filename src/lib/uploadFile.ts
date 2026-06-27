export async function uploadFile(
  target:
    | "material"
    | "draft"
    | "book-cover"
    | "character-photo"
    | "popArc-photo"
    | "world-entry-photo"
    | "cycle-cover"
    | "cycle-character-photo"
    | "story-character-photo"
    | "cycle-world-entry-photo"
    | "story-world-entry-photo"
    | "belief-photo"
    | "storycircle-photo"
    | "setting-photo"
    | "cycle-setting-photo",
  id: string,
  field: string,
  file: File
): Promise<{ fileName: string; dataUrl: string }> {
  const formData = new FormData();
  formData.set("target", target);
  formData.set("id", id);
  formData.set("field", field);
  formData.set("file", file);

  const res = await fetch("/api/file-upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Ошибка загрузки файла");
  return data;
}

export async function deletePhoto(
  target:
    | "book-cover"
    | "character-photo"
    | "popArc-photo"
    | "world-entry-photo"
    | "cycle-cover"
    | "cycle-character-photo"
    | "story-character-photo"
    | "cycle-world-entry-photo"
    | "story-world-entry-photo"
    | "belief-photo"
    | "storycircle-photo"
    | "setting-photo"
    | "cycle-setting-photo",
  id: string,
  field: string
): Promise<void> {
  const res = await fetch("/api/file-upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, id, field }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Ошибка удаления фото");
  }
}
