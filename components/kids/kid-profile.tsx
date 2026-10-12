import Link from "next/link";
import { alertStyles } from "@/data/mock/kids";
import type { Kid, KidParent } from "@/types/kid";
import { ChevronLeftIcon, PlusIcon, SunIcon, WarningIcon } from "@/components/shared/icons";

function parentStatusText(parent: KidParent): string {
  if (parent.status === "pending") return "invitación enviada";
  const relationLabels: Record<string, string> = {
    father: "activo",
    mother: "activa",
    guardian: "activo",
  };
  return relationLabels[parent.relation] ?? "activo";
}

function ParentBadge({ parent }: { parent: KidParent }) {
  if (parent.status === "pending") {
    return (
      <span className="flex-none rounded-full bg-[#F7E7A6] px-[9px] py-1 text-[10.5px] font-extrabold text-[#9A7B1E]">
        PENDIENTE
      </span>
    );
  }

  return (
    <span className="flex-none rounded-full bg-badge-achievement-bg px-[9px] py-1 text-[10.5px] font-extrabold text-badge-achievement-fg">
      ACTIVA
    </span>
  );
}

function AlertBox({ kid }: { kid: Kid }) {
  if (kid.alerts.length === 0 && !kid.notes) return null;

  const style =
    kid.alerts.length > 0
      ? alertStyles[kid.alerts[0] as keyof typeof alertStyles]
      : { label: "", bg: "#FBDAD6", text: "#C5413A" };
  const body =
    kid.notes ?? kid.alerts.map((alert) => alertStyles[alert as keyof typeof alertStyles].label).join(", ");

  return (
    <div
      className="flex gap-[14px] rounded-[16px] px-[18px] py-4"
      style={{ backgroundColor: style.bg }}
    >
      <span
        className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px]"
        style={{ backgroundColor: style.text }}
      >
        <WarningIcon className="h-[22px] w-[22px] text-white" strokeWidth={2.2} />
      </span>
      <div>
        <div
          className="mb-[2px] text-[15px] font-extrabold"
          style={{ color: style.text }}
        >
          Alergias y notas
        </div>
        <div className="text-[14.5px] leading-normal text-ink-body">{body}</div>
      </div>
    </div>
  );
}

function DetailsCard({ kid }: { kid: Kid }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
      <div className="flex justify-between border-b border-border-soft px-[18px] py-[15px]">
        <span className="text-[14.5px] text-ink-soft">Fecha de nacimiento</span>
        <span className="text-[14.5px] font-extrabold text-ink">{kid.birthDate}</span>
      </div>
      <div className="flex justify-between border-b border-border-soft px-[18px] py-[15px]">
        <span className="text-[14.5px] text-ink-soft">Sala</span>
        <span className="text-[14.5px] font-extrabold text-ink">{kid.room}</span>
      </div>
      <div className="flex justify-between px-[18px] py-[15px]">
        <span className="text-[14.5px] text-ink-soft">Ingreso</span>
        <span className="text-[14.5px] font-extrabold text-ink">{kid.joined}</span>
      </div>
    </div>
  );
}

function ParentsCard({
  parents,
  onLinkParent,
}: {
  parents: KidParent[];
  onLinkParent: () => void;
}) {
  return (
    <div className="rounded-[16px] border border-border bg-surface px-[18px] py-4">
      <div className="mb-[14px] text-[12.5px] font-extrabold tracking-[.8px] text-ink-section">
        PADRES VINCULADOS
      </div>
      <div className="flex flex-col gap-[14px]">
        {parents.map((parent) => (
          <div key={parent.id} className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 flex-none items-center justify-center rounded-full font-heading text-[16px] font-semibold text-white"
              style={{ backgroundColor: parent.avatarColor }}
            >
              {parent.initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-extrabold text-ink">
                {parent.name}
              </span>
              <span className="block text-[12.5px] text-ink-muted">
                {parent.relation} · {parentStatusText(parent)}
              </span>
            </span>
            <ParentBadge parent={parent} />
          </div>
        ))}
        <button
          type="button"
          onClick={onLinkParent}
          className="flex w-full cursor-pointer items-center gap-3 pt-2 text-left"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#D8CBBA] text-[#B0A290]">
            <PlusIcon className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </span>
          <span className="text-[14.5px] font-extrabold text-accent-link">
            Vincular otro padre
          </span>
        </button>
      </div>
    </div>
  );
}

export default function KidProfile({
  kid,
  parents,
  onLinkParent,
}: {
  kid: Kid;
  parents: KidParent[];
  onLinkParent: () => void;
}) {
  return (
    <div>
      <Link
        href="/kids"
        className="mb-5 inline-flex items-center gap-[7px] text-[14px] font-bold text-ink-soft"
      >
        <ChevronLeftIcon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        Volver a Niños
      </Link>

      <div className="flex flex-wrap items-start gap-[26px]">
        <div className="flex min-w-[300px] flex-1 flex-col gap-[18px]">
          <div className="flex items-center gap-[18px]">
            <span
              className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-full font-heading text-[34px] font-semibold"
              style={{ backgroundColor: kid.avatarColor, color: kid.avatarText }}
            >
              {kid.initial}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="m-0 font-heading text-[28px] font-semibold text-ink">
                {kid.name}
              </h1>
              <p className="m-0 mt-[3px] text-[15px] text-ink-soft">
                {kid.age} · Sala {kid.room}
              </p>
            </div>
            <Link
              href="/kids/new"
              className="flex-none rounded-[12px] border-[1.5px] border-border bg-surface px-4 py-[9px] text-[14px] font-bold text-nav-inactive"
            >
              Editar
            </Link>
          </div>

          <AlertBox kid={kid} />
          <DetailsCard kid={kid} />
        </div>

        <div className="flex w-full flex-col gap-[14px] sm:w-[300px] sm:flex-none">
          <Link
            href="/daily-summary"
            className="flex w-full items-center justify-center gap-[9px] rounded-[14px] bg-ink px-3 py-[13px] text-[15px] font-extrabold text-white"
          >
            <SunIcon className="h-[18px] w-[18px]" />
            Resumen del día
          </Link>
          <ParentsCard parents={parents} onLinkParent={onLinkParent} />
        </div>
      </div>
    </div>
  );
}
