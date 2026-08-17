import { ListeBox } from "@/components/suivi/liste-box";
import {
  batimentsConnus,
  boxModifiables,
  contratsSansBox,
  listeBox,
  planParBatiment,
} from "@/lib/suivi/repository";

export const dynamic = "force-dynamic";

export default async function BoxPage() {
  const [groupes, batiments, enAttente, plan] = await Promise.all([
    listeBox(),
    batimentsConnus(),
    contratsSansBox(),
    planParBatiment(),
  ]);

  return (
    <ListeBox
      groupes={groupes}
      modifiable={boxModifiables()}
      batiments={batiments}
      contratsSansBox={enAttente}
      plan={plan}
    />
  );
}
