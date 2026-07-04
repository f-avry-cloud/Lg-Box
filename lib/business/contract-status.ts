import type { ContractStatus, UnitStatus } from "@/types/database";

const ALLOWED_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  brouillon: ["actif", "resilie"],
  actif: ["en_preavis", "resilie"],
  en_preavis: ["actif", "resilie"],
  resilie: [],
};

export function canTransitionContract(from: ContractStatus, to: ContractStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

// Le statut du box suit automatiquement le statut du contrat.
export function unitStatusForContractStatus(status: ContractStatus): UnitStatus {
  switch (status) {
    case "brouillon":
      return "reserve";
    case "actif":
    case "en_preavis":
      return "loue";
    case "resilie":
      return "libre";
  }
}
