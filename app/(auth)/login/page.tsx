import { Suspense } from "react";
import LoginPanel from "@/components/auth/login-panel";
import LoginForm from "@/components/auth/login-form";

async function LoginFormSection({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <LoginForm next={next} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-page lg:grid-cols-[1.05fr_1fr]">
      <LoginPanel />
      <Suspense fallback={null}>
        <LoginFormSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
