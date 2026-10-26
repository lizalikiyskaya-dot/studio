import { prisma } from "@/lib/prisma";
import { guideByteSizes } from "@/lib/guides";
import { starAccount } from "@/features/stars/award";
import { shopOffers, type ShopGuide, type ShopOffer } from "./prices";

let ready: true | null = null;

export function forgetShopSchema() {
  ready = null;
}

function missing(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String((error as { code?: unknown }).code);
  return code === "P2021" || code === "P2022";
}

/** Колонка цены и вид траты GUIDE уже есть в базе. */
export async function shopSchemaReady(): Promise<boolean> {
  if (ready === true) return true;
  try {
    const rows = await prisma.$queryRaw<Array<{ ok: boolean | null }>>`
      SELECT (
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Guide' AND column_name = 'starPrice'
        )
        AND EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'StarKind' AND e.enumlabel = 'GUIDE'
        )
      ) AS ok
    `;
    if (rows[0]?.ok === true) {
      ready = true;
      return true;
    }
    return false;
  } catch (error) {
    console.error("[shop] не удалось проверить схему", error);
    return false;
  }
}

export async function loadShopGuides(studentId: string): Promise<ShopGuide[]> {
  const guides = await prisma.guide.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      starPrice: true,
      access: { where: { studentId }, select: { visible: true } },
    },
  });
  const sizes = await guideByteSizes(guides.map((guide) => guide.id));
  return guides.map((guide) => ({
    id: guide.id,
    title: guide.title,
    description: guide.description,
    starPrice: guide.starPrice,
    fileBytes: sizes.get(guide.id) ?? null,
    visible: guide.access[0]?.visible ?? false,
  }));
}

export type ShopModel = {
  ready: boolean;
  name: string;
  balance: number;
  earned: number;
  offers: ShopOffer[];
};

export async function loadShop(studentId: string): Promise<ShopModel> {
  const [user, account] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId }, select: { name: true } }),
    starAccount(studentId).catch((error: unknown) => {
      if (missing(error)) return { earned: 0, balance: 0, earns: [] };
      throw error;
    }),
  ]);
  const base = { name: user?.name ?? "", balance: account.balance, earned: account.earned, offers: [] as ShopOffer[] };
  if (!(await shopSchemaReady())) return { ready: false, ...base };
  try {
    const guides = await loadShopGuides(studentId);
    return { ready: true, ...base, offers: shopOffers(guides) };
  } catch (error) {
    if (missing(error)) {
      forgetShopSchema();
      return { ready: false, ...base };
    }
    throw error;
  }
}
