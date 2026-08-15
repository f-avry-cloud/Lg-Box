import { ListeBox } from "@/components/suivi/liste-box";
import {
  batimentsConnus,
  boxModifiables,
  contratsSansBox,
  listeBox,
} from "@/lib/suivi/repository";

export const dynamic = "force-dynamic";

export default async function BoxPage() {
  const [groupes, batiments, enAttente] = await Promise.all([
    listeBox(),
    batimentsConnus(),
    contratsSansBox(),
  ]);

  return (
    <ListeBox
      groupes={groupes}
      modifiable={boxModifiables()}
      batiments={batiments}
      contratsSansBox={enAttente}
    />
  );
}
