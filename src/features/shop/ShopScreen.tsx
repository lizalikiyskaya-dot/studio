import PageHeader from "@/components/PageHeader";
import { loadShop } from "./load";
import ShopView from "./ShopView";

export default async function ShopScreen({
  studentId,
  canBuy,
}: {
  studentId: string;
  canBuy: boolean;
}) {
  const shop = await loadShop(studentId);
  if (!shop.ready) {
    return (
      <div>
        <PageHeader title="Магазин" />
        <div className="rounded-[24px] px-5 py-4" style={{ background: "var(--soft)" }}>
          <p className="text-[15px]" style={{ color: "var(--ink)" }}>
            Магазин ещё не подключен. Методички, которые уже открыты, на месте.
          </p>
          <p className="text-[14px] mt-2" style={{ color: "var(--ink2)" }}>
            Нужен файл docs/sql/2026-10-26-7-guide-shop.sql.
          </p>
        </div>
      </div>
    );
  }
  return <ShopView balance={shop.balance} earned={shop.earned} offers={shop.offers} canBuy={canBuy} />;
}
