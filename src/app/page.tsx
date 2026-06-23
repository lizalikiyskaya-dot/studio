import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();

  if (!session) redirect("/login");
  if (session.role === "MENTOR") redirect("/mentor");
  if (session.status !== "APPROVED") redirect("/pending");
  redirect("/dashboard/tasks");
}
