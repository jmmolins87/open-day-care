import { redirect } from "next/navigation";
import { connection } from "next/server";
import FeedContent from "@/components/home/feed-content";
import { getCurrentProfile } from "@/utils/auth";

export const instant = false;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  await connection();
  const [{ create }, profile] = await Promise.all([
    searchParams,
    getCurrentProfile(),
  ]);
  if (!profile) redirect("/login");

  const name = profile.row?.full_name || profile.user.email.split("@")[0];

  return (
    <FeedContent
      openCreate={create === "1"}
      profile={{ name, initial: name.charAt(0).toUpperCase() }}
    />
  );
}
