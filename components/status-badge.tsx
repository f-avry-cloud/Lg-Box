import { Badge } from "@/components/ui/badge";
import type {
  ContractStatus,
  InvoiceStatus,
  PaymentStatus,
  ReservationStatus,
  SecurityDepositStatus,
  SepaMandateStatus,
  SignatureStatus,
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

const SIGNATURE_LABELS: Record<SignatureStatus, { label: string; variant: "success" | "warning" | "muted" }> = {
  non_requise: { label: "Non requise", variant: "muted" },
  en_attente: { label: "En attente de signature", variant: "warning" },
  signe: { label: "Signé", variant: "success" },
};

const SEPA_MANDATE_LABELS: Record<SepaMandateStatus, { label: string; variant: "success" | "warning" | "muted" }> = {
  non_requis: { label: "Non requis", variant: "muted" },
  en_attente: { label: "En attente de signature", variant: "warning" },
  signe: { label: "Signé", variant: "success" },
};

const DEPOSIT_LABELS: Record<SecurityDepositStatus, { label: string; variant: "success" | "secondary" | "warning" | "muted" | "destructive" }> = {
  non_demande: { label: "Non demandé", variant: "muted" },
  demande: { label: "Demandé", variant: "warning" },
  recu: { label: "Reçu", variant: "success" },
  partiellement_rembourse: { label: "Partiellement remboursé", variant: "secondary" },
  rembourse: { label: "Remboursé", variant: "muted" },
  retenu: { label: "Retenu", variant: "destructive" },
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

export function SignatureStatusBadge({ status }: { status: SignatureStatus }) {
  const { label, variant } = SIGNATURE_LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function SecurityDepositStatusBadge({ status }: { status: SecurityDepositStatus }) {
  const { label, variant } = DEPOSIT_LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function SepaMandateStatusBadge({ status }: { status: SepaMandateStatus }) {
  const { label, variant } = SEPA_MANDATE_LABELS[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export const UNIT_STATUS_OPTIONS = Object.entries(UNIT_LABELS) as [UnitStatus, { label: string }][];
