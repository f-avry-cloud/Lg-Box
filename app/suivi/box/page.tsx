import { ListeBox } from "@/components/suivi/liste-box";
import { batimentsConnus, boxModifiables, listeBox } from "@/lib/suivi/repository";

export const dynamic = "force-dynamic";

export default async function BoxPage() {
  const [groupes, batiments] = await Promise.all([listeBox(), batimentsConnus()]);
  return <ListeBox groupes={groupes} modifiable={boxModifiables()} batiments={batiments} />;
}
