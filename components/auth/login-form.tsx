"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { signIn } from "@/utils/actions/auth";
import { useGlobalLoader } from "@/components/loader/LoaderContext";

export default function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signIn, { error: null });
  const { show, hide } = useGlobalLoader();

  // Server Actions have no client-side promise to wrap: bridge `pending`
  // into the global loader so the top bar appears while signing in.
  useEffect(() => {
    if (!pending) return;
    show("Ingresando…");
    return () => hide();
  }, [pending, show, hide]);

  return (
    <div className="flex items-center justify-center p-10">
      <div className="w-full max-w-[392px]">
        <h2 className="m-0 mb-[6px] font-heading text-[30px] font-semibold text-ink">
          Iniciar sesión
        </h2>
        <p className="m-0 mb-7 text-[15px] text-ink-soft">
          Ingresa para ver el día de hoy.
        </p>

        <form action={formAction}>
          <input type="hidden" name="next" value={next ?? ""} />

          <div className="mb-2 text-[12px] font-bold tracking-[.7px] text-ink-soft">
            EMAIL
          </div>
          <input
            type="email"
            name="email"
            required
            placeholder="caro@opendaycare.com"
            className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] text-[15px] text-ink outline-none placeholder:text-[#B6A99B]"
          />

          <div className="mb-2 text-[12px] font-bold tracking-[.7px] text-ink-soft">
            CONTRASEÑA
          </div>
          <input
            type="password"
            name="password"
            required
            placeholder="••••••••"
            className="mb-[10px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] text-[15px] text-ink outline-none placeholder:text-[#B6A99B]"
          />

          {state.error && (
            <p className="m-0 mb-[10px] text-[13.5px] font-semibold text-[#C0392B]">
              {state.error}
            </p>
          )}

          <div className="mb-5 text-right">
            <span className="cursor-default text-[13.5px] font-bold text-accent-link">
              ¿Olvidaste tu contraseña?
            </span>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="block w-full cursor-pointer rounded-[15px] border-none bg-gradient-to-b from-btn-start to-btn-end py-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] disabled:cursor-default disabled:opacity-70"
          >
            {pending ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="m-0 mt-6 text-center text-[14.5px] text-ink-soft">
          ¿Te invitó la guardería?{" "}
          <Link href="/activate-account" className="font-extrabold text-accent-link">
            Activa tu cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
