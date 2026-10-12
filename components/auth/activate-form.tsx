"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { SunIcon } from "@/components/shared/icons";

interface ActivateFormProps {
  code: string;
  email: string;
  kidFirstName: string;
  roomName: string;
  kidInitial: string;
  avatarBg: string;
  avatarText: string;
}

function CheckIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

async function activateAccountAction(
  prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const { activateAccount } = await import("@/utils/actions/activate");
  return activateAccount(prevState, formData);
}

export default function ActivateForm({
  code,
  email,
  kidFirstName,
  roomName,
  kidInitial,
  avatarBg,
  avatarText,
}: ActivateFormProps) {
  const [consent, setConsent] = useState(true);
  const [password, setPassword] = useState("");

  const [actionState, formAction, pending] = useActionState(activateAccountAction, {
    error: null,
  });

  function handlePasswordChange(event: React.ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value);
  }

  function handleConsentChange() {
    setConsent((v) => !v);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-10">
      <div className="w-full max-w-[440px]">
        <form action={formAction}>
        <div className="mb-[22px] flex h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-[linear-gradient(155deg,#F8C3A8,#F2937A)] shadow-[0_12px_26px_-10px_rgba(238,129,100,.65)]">
          <SunIcon className="h-[30px] w-[30px] text-white" strokeWidth={2.2} />
        </div>

        <h1 className="m-0 mb-2 font-heading text-[32px] font-semibold leading-[1.15] text-ink">
          Bienvenida a OpenDayCare
        </h1>
        <p className="m-0 mb-[26px] text-[15.5px] leading-[1.55] text-ink-soft">
          Te invitaron a seguir el día de tu hijo. Crea tu contraseña para
          activar la cuenta.
        </p>

        <div className="mb-[22px] flex items-center gap-[14px] rounded-[16px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px]">
          <span
            className="flex h-[44px] w-[44px] flex-none items-center justify-center rounded-full font-heading text-[19px] font-semibold"
            style={{ backgroundColor: avatarBg, color: avatarText }}
          >
            {kidInitial}
          </span>
          <div>
            <div className="text-[13px] text-ink-soft">
              Te invitaron a seguir a
            </div>
            <div className="font-heading text-[17px] font-semibold text-ink">
              {kidFirstName} · Sala {roomName}
            </div>
          </div>
        </div>

        <div className="mb-2 text-[12px] font-bold tracking-[.7px] text-ink-soft">
          CÓDIGO DE INVITACIÓN
        </div>
        <input
          value={code}
          readOnly
          className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] font-heading text-[18px] font-bold tracking-[3px] text-ink outline-none"
        />
        <input type="hidden" name="code" value={code} />

        <div className="mb-2 text-[12px] font-bold tracking-[.7px] text-ink-soft">
          EMAIL
        </div>
        <input
          type="email"
          value={email}
          readOnly
          className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] text-[15px] text-ink outline-none"
        />
        <input type="hidden" name="email" value={email} />

        <div className="mb-2 text-[12px] font-bold tracking-[.7px] text-ink-soft">
          CREAR CONTRASEÑA
        </div>
        <input
          type="password"
          value={password}
          onChange={handlePasswordChange}
          className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-[#F2A78E] bg-white px-4 py-[14px] text-[15px] text-ink outline-none"
          required
          aria-required="true"
          minLength={8}
        />
        <input type="hidden" name="password" value={password} />

        <button
          type="button"
          onClick={handleConsentChange}
          className="mb-6 flex w-full cursor-pointer items-start gap-3 rounded-[14px] bg-[#FBF1D6] px-4 py-[14px] text-left"
        >
          <span
            className={`mt-px flex h-6 w-6 flex-none items-center justify-center rounded-lg transition-colors duration-150 ${
              consent ? "bg-[#5FB97E]" : "bg-[#D8CBBA]"
            }`}
          >
            {consent && <CheckIcon />}
          </span>
          <span className="text-[14px] leading-[1.45] text-[#8A7234]">
            Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro
            de la app.
          </span>
        </button>
        <input type="hidden" name="consent" value={consent ? "on" : "off"} />

        {actionState.error && (
          <div className="mb-5 rounded-[12px] border border-[#D9583C] bg-[#FDEAE8] px-4 py-3 text-center">
            <p className="m-0 text-[13px] text-[#D9583C]">{actionState.error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="block w-full rounded-[15px] bg-gradient-to-b from-btn-start to-btn-end py-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Activando…" : "Activar mi cuenta"}
        </button>

        <p className="m-0 mt-[22px] text-center text-[14.5px] text-ink-soft">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-extrabold text-accent-link">
            Iniciar sesión
          </Link>
        </p>
        </form>
      </div>
    </div>
  );
}