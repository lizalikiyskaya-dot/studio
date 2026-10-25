import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ShopScreen from "@/features/shop/ShopScreen";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "MENTOR") redirect("/mentor");
  return <ShopScreen studentId={session.userId} canBuy />;
}
