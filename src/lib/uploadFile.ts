export async function uploadFile(
  target: "material" | "draft",
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
