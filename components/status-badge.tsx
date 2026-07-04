import { Badge } from "@/components/ui/badge";
import type {
  ContractStatus,
  InvoiceStatus,
  PaymentStatus,
  ReservationStatus,
  UnitStatus,
} from "@/types/database";

const UNIT_LABELS: Record<UnitStatus, { label: string; variant: "success" | "secondary" | "warning" | "muted" }> = {
  libre: { label: "Libre", variant: "success" },
  loue: { label: "Loué", variant: "secondary" },
  reserve: { label: "Réservé", variant: "warning" },
  hors_service: { label: "Hors service", variant: "muted" },
};

const CONTRACT_LABELS: Record<ContractStatus, { label: string; variant: "success" | "secondary" | "warning" | "muted" }> = {
  brouillon: { label: "Brouillon", variant: "muted" },
  actif: { label: "Actif", variant: "success" },
  en_preavis: { label: "En préavis", variant: "warning" },
  resilie: { label: "Résilié", variant: "muted" },
};

const INVOICE_LABELS: Record<InvoiceStatus, { label: string; variant: "success" | "secondary" | "warning" | "muted" | "destructive" }> = {
  brouillon: { label: "Brouillon", variant: "muted" },
  emise: { label: "Émise", variant: "secondary" },
  payee: { label: "Payée", variant: "success" },
  en_retard: { label: "En retard", variant: "destructive" },
  annulee: { label: "Annulée", variant: "muted" },
};

const PAYMENT_LABELS: Record<PaymentStatus, { label: string; variant: "success" | "warning" | "destructive" }> = {
  valide: { label: "Validé", variant: "success" },
  en_attente: { label: "En attente", variant: "warning" },
  echoue: { label: "Échoué", variant: "destructive" },
};

const RESERVATION_LABELS: Record<ReservationStatus, { label: string; variant: "secondary" | "warning" | "success" | "muted" }> = {
  nouvelle: { label: "Nouvelle", variant: "warning" },
  contactee: { label: "Contactée", variant: "secondary" },
  convertie: { label: "Convertie", variant: "success" },
  refusee: { label: "Refusée", variant: "muted" },
};

export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  const { label, variant } = UNIT_LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const { label, variant } = CONTRACT_LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, variant } = INVOICE_LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, variant } = PAYMENT_LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const { label, variant } = RESERVATION_LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export const UNIT_STATUS_OPTIONS = Object.entries(UNIT_LABELS) as [UnitStatus, { label: string }][];
