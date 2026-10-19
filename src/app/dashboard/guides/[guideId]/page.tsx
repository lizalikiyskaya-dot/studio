import { redirect } from "next/navigation";

export default function StudentGuideReaderPage() {
  redirect("/dashboard/materials?tab=handouts");
}
