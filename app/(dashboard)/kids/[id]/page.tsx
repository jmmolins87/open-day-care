import { notFound } from "next/navigation";
import KidProfileContent from "@/components/kids/kid-profile-content";
import { getKidById } from "@/data/mock/kids";

export const instant = false;

export default async function KidProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  const kid = Number.isInteger(numericId) ? getKidById(numericId) : undefined;

  if (!kid) notFound();

  return (
    <div className="mx-auto w-full max-w-[820px] px-5 pb-20 pt-8 lg:px-10 lg:pt-[34px]">
      <KidProfileContent kid={kid} />
    </div>
  );
}
