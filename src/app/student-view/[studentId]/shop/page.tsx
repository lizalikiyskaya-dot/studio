import ShopScreen from "@/features/shop/ShopScreen";

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  return <ShopScreen studentId={studentId} canBuy={false} />;
}
