import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";

const MAX_SIZE = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const formData = await req.formData();
  const target = formData.get("target");
  const id = formData.get("id");
  const field = formData.get("field");
  const file = formData.get("file");

  if (
    typeof target !== "string" ||
    typeof id !== "string" ||
    typeof field !== "string" ||
    !(file instanceof File)
  ) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: "Файл слишком большой (максимум 8 МБ)" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type || "application/octet-stream"};base64,${buf.toString("base64")}`;

  if (target === "material") {
    const material = await prisma.material.findUniqueOrThrow({ where: { id } });
    await requireMentor(material.studentId);
    const data =
      field === "pdf"
        ? { pdfUrl: dataUrl, pdfName: file.name }
        : field === "epub"
          ? { epubUrl: dataUrl, epubName: file.name }
          : { fileUrl: dataUrl, fileName: file.name };
    await prisma.material.update({ where: { id }, data });
  } else if (target === "draft") {
    const draft = await prisma.draft.findUniqueOrThrow({ where: { id } });
    await requireCabinetAccess(draft.studentId);
    await prisma.draft.update({ where: { id }, data: { fileName: file.name, fileData: dataUrl } });
  } else {
    return Response.json({ error: "Unknown target" }, { status: 400 });
  }

  return Response.json({ ok: true, fileName: file.name, dataUrl });
}
