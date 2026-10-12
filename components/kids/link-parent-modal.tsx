"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import type { Kid } from "@/types/kid";
import { sendInvitation } from "@/utils/actions/invitations";
import { CloseIcon, InfoIcon, SendIcon } from "@/components/shared/icons";

export type ParentRelation = "Mamá" | "Papá" | "Tutor/a";

export interface LinkParentFormValues {
  name: string;
  email: string;
  relation: ParentRelation;
}

const relations: readonly ParentRelation[] = ["Mamá", "Papá", "Tutor/a"];

const relationToEnum: Record<ParentRelation, "father" | "mother" | "guardian"> = {
  Mamá: "mother",
  Papá: "father",
  "Tutor/a": "guardian",
};

const inputClassName =
  "w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[13px] text-[15px] text-ink outline-none placeholder:text-[#B6A99B]";

const inputBorder = "border-[#EADFD0]";
const inputBorderError = "border-[#D9583C]";

const labelClassName =
  "mb-2 block text-[12px] font-extrabold tracking-[.7px] text-ink-soft";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LinkParentModal({
  kid,
  onClose,
  onSuccess,
}: {
  kid: Kid;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relation, setRelation] = useState<ParentRelation>("Mamá");
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const [actionState, formAction, pending] = useActionState(sendInvitation, {
    error: null,
    code: null,
  });

  const sent = actionState.code !== null && !actionState.error;

  const nameInputRef = useRef<HTMLInputElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (sent) {
      successHeadingRef.current?.focus();
    }
  }, [sent]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const canSend =
    name.trim().length > 0 && isValidEmail(email.trim()) && relation.length > 0;

  const emailValue = email.trim();
  const nameInvalid = nameTouched && name.trim().length === 0;
  const emailEmptyInvalid = emailTouched && emailValue.length === 0;
  const emailFormatInvalid =
    emailTouched && emailValue.length > 0 && !isValidEmail(emailValue);

  const kidFirstName = kid.name.split(" ")[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vincular padre"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(63,54,46,.45)] px-6 py-10"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[480px] overflow-hidden rounded-[24px] border border-border bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,.35)]">
        <div className="flex items-center justify-between border-b border-border px-[26px] py-5">
          <div>
            <div className="font-heading text-[18px] font-semibold text-ink">
              Vincular padre
            </div>
            <div className="text-[13px] text-ink-muted">a {kid.name}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-[34px] w-[34px] flex-none cursor-pointer items-center justify-center rounded-[10px] bg-border-soft text-ink-soft"
          >
            <CloseIcon className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>
        </div>

        <div className="px-[26px] py-[22px]">
          {sent ? (
            <div role="status" className="text-center">
              <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#DFF2E3]">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2E7D4F"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3
                ref={successHeadingRef}
                tabIndex={-1}
                className="m-0 font-heading text-[20px] font-semibold text-ink outline-none"
              >
                Invitación enviada a {emailValue}
              </h3>
              <p className="mx-0 mb-5 mt-2 text-[14px] leading-[1.5] text-ink-soft">
                Le llegará un correo con el código para activar su cuenta y
                vincularse con {kidFirstName}.
              </p>
              <div className="mb-5 rounded-[16px] border-[1.5px] border-dashed border-[#E6D08A] bg-[#FBF1D6] px-[18px] py-[18px]">
                <div className="mb-2 text-[12px] font-extrabold tracking-[.7px] text-[#A88526]">
                  CÓDIGO DE INVITACIÓN
                </div>
                <div className="font-heading text-[34px] font-semibold tracking-[7px] text-[#8A7234]">
                  {actionState.code}
                </div>
                <div className="mt-[6px] text-[13px] text-[#A88526]">
                  Vence en 7 días
                </div>
              </div>
              <button
                type="button"
                onClick={onSuccess}
                className="w-full cursor-pointer rounded-[14px] bg-gradient-to-b from-btn-start to-btn-end py-[14px] text-[15.5px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)]"
              >
                Listo
              </button>
            </div>
          ) : (
            <form action={formAction}>
              <input type="hidden" name="child_id" value={kid.id} readOnly />
              <input type="hidden" name="full_name" value={name} readOnly />
              <input type="hidden" name="email" value={email} readOnly />
              <input type="hidden" name="relationship" value={relationToEnum[relation]} readOnly />

              <div className="mb-5 flex gap-[11px] rounded-[14px] bg-[#E3ECFB] px-4 py-[13px]">
                <InfoIcon
                  className="mt-px h-5 w-5 flex-none text-[#4E72C8]"
                  strokeWidth={2}
                />
                <span className="text-[13.5px] leading-[1.45] text-[#3F5694]">
                  Le enviaremos un correo con un código para que active su cuenta.
                  Solo verá el feed de {kidFirstName}.
                </span>
              </div>

              <label htmlFor="link-parent-name" className={labelClassName}>
                NOMBRE DEL PADRE/MADRE <span className="text-accent-strong">*</span>
              </label>
              <input
                ref={nameInputRef}
                id="link-parent-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => setNameTouched(true)}
                placeholder="Ej. Diego Fernández"
                required
                aria-required="true"
                aria-invalid={nameInvalid}
                aria-describedby={nameInvalid ? "link-parent-name-error" : undefined}
                className={`${inputClassName} ${
                  nameInvalid ? inputBorderError : inputBorder
                } ${nameInvalid ? "mb-1" : "mb-[18px]"}`}
              />
              {nameInvalid && (
                <p id="link-parent-name-error" className="m-0 mb-[18px] text-[12px] text-accent-strong">
                  Campo obligatorio
                </p>
              )}

              <label htmlFor="link-parent-email" className={labelClassName}>
                EMAIL <span className="text-accent-strong">*</span>
              </label>
              <input
                id="link-parent-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="correo@ejemplo.com"
                required
                aria-required="true"
                aria-invalid={emailEmptyInvalid || emailFormatInvalid}
                aria-describedby={
                  emailEmptyInvalid || emailFormatInvalid
                    ? "link-parent-email-error"
                    : undefined
                }
                className={`${inputClassName} ${
                  emailEmptyInvalid || emailFormatInvalid
                    ? inputBorderError
                    : inputBorder
                } ${emailEmptyInvalid || emailFormatInvalid ? "mb-1" : "mb-[18px]"}`}
              />
              {(emailEmptyInvalid || emailFormatInvalid) && (
                <p id="link-parent-email-error" className="m-0 mb-[18px] text-[12px] text-accent-strong">
                  {emailEmptyInvalid ? "Campo obligatorio" : "Email no válido"}
                </p>
              )}

              <div className="mb-[10px] text-[12px] font-extrabold tracking-[.7px] text-ink-soft">
                PARENTESCO
              </div>
              <div className="mb-5 flex gap-[9px]">
                {relations.map((option) => {
                  const active = relation === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRelation(option)}
                      aria-pressed={active}
                      className={`flex-1 cursor-pointer rounded-full border-[1.5px] px-[11px] py-[11px] text-[14px] font-extrabold ${
                        active
                          ? "border-[#9FB8EC] bg-[#CCD8F4] text-[#4E72C8]"
                          : "border-border bg-surface text-nav-inactive"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              <div className="mb-5 rounded-[16px] border-[1.5px] border-dashed border-[#E6D08A] bg-[#FBF1D6] px-[18px] py-[18px] text-center">
                <div className="mb-2 text-[12px] font-extrabold tracking-[.7px] text-[#A88526]">
                  CÓDIGO DE INVITACIÓN
                </div>
                <div className="text-[13px] leading-[1.5] text-[#A88526]">
                  Se generará automáticamente y llegará por correo. También lo
                  verás aquí tras enviar.
                </div>
              </div>

              {actionState.error && (
                <div
                  role="alert"
                  className="mb-5 rounded-[12px] border border-[#D9583C] bg-[#FDEAE8] px-4 py-3 text-center"
                >
                  <p className="m-0 text-[13px] text-[#D9583C]">{actionState.error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSend || pending}
                className="flex w-full cursor-pointer items-center justify-center gap-[9px] rounded-[14px] bg-gradient-to-b from-btn-start to-btn-end py-[14px] text-[15.5px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SendIcon className="h-[19px] w-[19px]" strokeWidth={2} />
                {pending ? "Enviando…" : "Enviar invitación"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
