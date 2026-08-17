import { ListeBox } from "@/components/suivi/liste-box";
import {
  batimentsConnus,
  boxModifiables,
  candidatsAffectation,
  listeBox,
  planParBatiment,
} from "@/lib/suivi/repository";

export const dynamic = "force-dynamic";

export default async function BoxPage() {
  const [groupes, batiments, candidats, plan] = await Promise.all([
    listeBox(),
    batimentsConnus(),
    candidatsAffectation(),
    planParBatiment(),
  ]);

  return (
    <ListeBox
      groupes={groupes}
      modifiable={boxModifiables()}
      batiments={batiments}
      candidats={candidats}
      plan={plan}
    />
  );
}
