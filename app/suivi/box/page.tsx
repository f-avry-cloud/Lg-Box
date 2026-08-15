import { ListeBox } from "@/components/suivi/liste-box";
import { boxModifiables, listeBox } from "@/lib/suivi/repository";

export const dynamic = "force-dynamic";

export default async function BoxPage() {
  const groupes = await listeBox();
  return <ListeBox groupes={groupes} modifiable={boxModifiables()} />;
}
