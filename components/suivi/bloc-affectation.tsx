"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { ChoixDateEffet } from "@/components/suivi/choix-date-effet";
import { vibre } from "@/components/suivi/bouton-encaissement";
import { Button } from "@/components/ui/button";
import {
  ajouteBoxAuLocataire,
  creeLocataireAvecContrat,
  rattacheBoxAuContrat,
} from "@/lib/actions/suivi";
import {
  ecartRepartition,
  libelleEcart,
  loyerPropose,
  totalActuel,
  type Repartition,
} from "@/lib/suivi/affectation";
import { periodeCourante } from "@/lib/suivi/period";
import type { BoxListe, CandidatAffectation } from "@/lib/suivi/types";
import { cn } from "@/lib/utils";

/**
 * Affecter un box à un locataire, dans le sens box → locataire — celui dans
 * lequel l'exploitant raisonne quand il identifie un box sur le terrain.
 *
 * Deux chemins, selon le locataire choisi :
 *
 *  - **il attend un box** : on rattache son contrat, avec sa date d'effet ;
 *  - **il est déjà logé** : il faut un second contrat, avec son propre loyer,
 *    puisqu'un contrat ne porte qu'un box. C'est ce chemin qui manquait, et
 *    son absence laissait les baux à deux box repliés sur un montant global,
 *    faussant le loyer affiché sur chaque box.
 *
 * Dans le second cas, l'écran propose de **répartir** le loyer existant plutôt
 * que de l'ajouter. Le total du locataire est affiché avant validation : les
 * deux gestes se ressemblent à l'écran et n'ont rien à voir dans les comptes.
 */
export function BlocAffectation({
  box,
  candidats,
  onFermer,
}: {
  box: BoxListe;
  candidats: CandidatAffectation[];
  onFermer: () => void;
}) {
  const router = useRouter();
  const [enCours, demarreTransition] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [candidat, setCandidat] = useState<CandidatAffectation | null>(null);

  const [periodeEffet, setPeriodeEffet] = useState<string | null>(null);
  const [loyer, setLoyer] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [loyerSource, setLoyerSource] = useState("");
  // Tant que l'exploitant n'a pas touché au loyer restant, celui-ci se déduit
  // du loyer saisi pour le nouveau box, de sorte que le total reste inchangé —
  // la correction visée. Dès qu'il y touche, sa valeur prime.
  const [sourceModifiee, setSourceModifiee] = useState(false);

  // Création d'un locataire absent du carnet : le seul chemin, jusqu'ici,
  // passait par le back-office ou par un nouvel import.
  const [creationLocataire, setCreationLocataire] = useState(false);
  const [nouveau, setNouveau] = useState({
    nom: "",
    societe: "",
    telephone: "",
    email: "",
  });

  const visibles = useMemo(() => {
    const terme = recherche.trim().toLocaleLowerCase("fr");
    if (!terme) return candidats;
    return candidats.filter((c) =>
      `${c.nom} ${c.societe ?? ""}`.toLocaleLowerCase("fr").includes(terme)
    );
  }, [candidats, recherche]);

  const reinitialise = () => {
    setCandidat(null);
    setCreationLocataire(false);
    setNouveau({ nom: "", societe: "", telephone: "", email: "" });
    setSourceId(null);
    setLoyerSource("");
    setSourceModifiee(false);
    setLoyer("");
    setPeriodeEffet(null);
  };

  const choisit = (c: CandidatAffectation) => {
    setCandidat(c);
    setPeriodeEffet(c.contrat_libre?.date_debut ? null : periodeCourante());
    setLoyer(loyerPropose(box.tarif_indicatif_eur));
    setSourceId(null);
    setLoyerSource("");
    setSourceModifiee(false);
  };

  // Dérivé, pas stocké : « loyer restant sur le contrat d'origine » se déduit
  // du loyer saisi pour le nouveau box tant que l'exploitant n'y a pas touché,
  // de sorte que le total retombe sur ses pieds sans qu'il fasse la
  // soustraction. Dès qu'il édite le champ, sa valeur prime.
  const montantNouveau = Number(loyer.replace(",", "."));
  const loyerValide = Number.isFinite(montantNouveau) && montantNouveau > 0;

  const contratSource =
    candidat?.contrats_loges.find((c) => c.contrat_id === sourceId) ?? null;

  const loyerSourceAffiche =
    sourceModifiee || !contratSource
      ? loyerSource
      : String(
          Math.max(
            0,
            contratSource.loyer_mensuel_eur - (loyerValide ? Math.round(montantNouveau) : 0)
          )
        );

  const montantSource = Number(loyerSourceAffiche.replace(",", "."));
  const sourceValide = sourceId === null || (Number.isFinite(montantSource) && montantSource >= 0);

  const termine = (message: string) => {
    vibre();
    toast.success(message);
    reinitialise();
    setOuvert(false);
    onFermer();
    router.refresh();
  };

  const rattache = () => {
    if (!candidat?.contrat_libre) return;
    const contratId = candidat.contrat_libre.contrat_id;
    demarreTransition(async () => {
      const resultat = await rattacheBoxAuContrat(contratId, box.id, periodeEffet);
      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Affectation impossible.");
        return;
      }
      termine(`${candidat.nom} rattaché au box ${box.numero}.`);
    });
  };

  const ajoute = () => {
    if (!candidat) return;
    demarreTransition(async () => {
      const resultat = await ajouteBoxAuLocataire({
        locataireId: candidat.locataire_id,
        boxId: box.id,
        loyer: Math.round(montantNouveau),
        periodeEffet: periodeEffet ?? periodeCourante(),
        source: sourceId
          ? { contratId: sourceId, loyerNouveau: Math.round(montantSource) }
          : null,
      });
      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Affectation impossible.");
        return;
      }
      termine(`Box ${box.numero} ajouté à ${candidat.nom}.`);
    });
  };

  const cree = () => {
    demarreTransition(async () => {
      const resultat = await creeLocataireAvecContrat({
        nom: nouveau.nom,
        societe: nouveau.societe || null,
        telephone: nouveau.telephone || null,
        email: nouveau.email || null,
        loyer: Math.round(montantNouveau),
        periodeEffet: periodeEffet ?? periodeCourante(),
        boxId: box.id,
      });
      if (!resultat.success) {
        vibre(60);
        toast.error(resultat.error ?? "Création impossible.");
        return;
      }
      termine(`${nouveau.nom.trim()} créé et rattaché au box ${box.numero}.`);
    });
  };

  // ---- Nouveau locataire : création du locataire et de son contrat --------
  if (creationLocataire) {
    return (
      <div className="mb-4 rounded-xl border border-border bg-secondary/40 p-3">
        <p className="mb-3 text-base">
          <strong>Nouveau locataire</strong>
          {` — box ${box.numero}`}
        </p>

        <Champ
          libelle="Nom"
          valeur={nouveau.nom}
          onChange={(v) => setNouveau({ ...nouveau, nom: v })}
          placeholder="NOM Prénom"
        />
        <Champ
          libelle="Société (facultatif)"
          valeur={nouveau.societe}
          onChange={(v) => setNouveau({ ...nouveau, societe: v })}
        />
        <Champ
          libelle="Téléphone (facultatif)"
          type="tel"
          valeur={nouveau.telephone}
          onChange={(v) => setNouveau({ ...nouveau, telephone: v })}
          placeholder="+336…"
        />
        <Champ
          libelle="E-mail (facultatif)"
          type="email"
          valeur={nouveau.email}
          onChange={(v) => setNouveau({ ...nouveau, email: v })}
          aide="Nécessaire pour recevoir ses factures par mail."
        />
        <Champ
          libelle="Loyer mensuel (€)"
          type="number"
          valeur={loyer}
          onChange={setLoyer}
          placeholder={box.tarif_indicatif_eur != null ? "" : "à définir"}
          aide={
            box.tarif_indicatif_eur != null
              ? `Proposé d'après le tarif indicatif du box (${box.tarif_indicatif_eur} €).`
              : undefined
          }
        />

        <ChoixDateEffet
          dateDebutActuelle={null}
          valeur={periodeEffet}
          onChange={setPeriodeEffet}
          desactive={enCours}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1"
            disabled={enCours}
            onClick={reinitialise}
          >
            Retour
          </Button>
          <Button
            type="button"
            className="h-12 flex-1"
            disabled={enCours || nouveau.nom.trim() === "" || !loyerValide}
            onClick={cree}
          >
            Créer
          </Button>
        </div>
      </div>
    );
  }

  // ---- Étape 3 : locataire déjà logé, on crée un second contrat -----------
  if (candidat && !candidat.contrat_libre) {
    const repartition: Repartition = {
      loyerNouveau: loyerValide ? Math.round(montantNouveau) : 0,
      source:
        sourceId && sourceValide
          ? { contrat_id: sourceId, loyerNouveau: Math.round(montantSource) }
          : null,
    };
    const ecart = ecartRepartition(candidat.contrats_loges, repartition);

    return (
      <div className="mb-4 rounded-xl border border-border bg-secondary/40 p-3">
        <p className="mb-1 text-base">
          <strong>{candidat.nom}</strong>
          {` loue déjà ${candidat.contrats_loges.length} box.`}
        </p>
        <p className="mb-3 text-sm text-[var(--suivi-gris)]">
          {`Le box ${box.numero} fera l'objet d'un second contrat, avec son propre loyer.`}
        </p>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--suivi-gris)]">
          {`Loyer du box ${box.numero} (€ / mois)`}
        </label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step="1"
          value={loyer}
          onChange={(e) => setLoyer(e.target.value)}
          placeholder={box.tarif_indicatif_eur != null ? "" : "à définir"}
          className="mb-1 h-14 w-full rounded-xl border border-input bg-background px-4 text-lg tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {box.tarif_indicatif_eur != null && (
          <p className="mb-3 text-xs text-[var(--suivi-gris)]">
            {`Proposé d'après le tarif indicatif du box (${box.tarif_indicatif_eur} €). Modifiable.`}
          </p>
        )}

        {/* Répartition : le cas de correction courant, quand le montant global
            couvrait déjà les deux box. */}
        <span className="mb-1 mt-2 block text-xs font-semibold uppercase tracking-wide text-[var(--suivi-gris)]">
          D&apos;où vient ce loyer ?
        </span>
        <div className="mb-2 space-y-2">
          <OptionSource
            actif={sourceId === null}
            titre="Loyer supplémentaire"
            detail="le locataire paiera davantage"
            onClick={() => {
              setSourceId(null);
              setSourceModifiee(false);
              setLoyerSource("");
            }}
          />
          {candidat.contrats_loges.map((c) => (
            <OptionSource
              key={c.contrat_id}
              actif={sourceId === c.contrat_id}
              titre={`Réparti depuis le box ${c.box_numero ?? "?"}`}
              detail={`${c.loyer_mensuel_eur} € aujourd'hui`}
              onClick={() => {
                setSourceId(c.contrat_id);
                setSourceModifiee(false);
                setLoyerSource("");
              }}
            />
          ))}
        </div>

        {sourceId && (
          <>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--suivi-gris)]">
              Loyer restant sur ce contrat (€ / mois)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step="1"
              value={loyerSourceAffiche}
              onChange={(e) => {
                setSourceModifiee(true);
                setLoyerSource(e.target.value);
              }}
              className="mb-2 h-14 w-full rounded-xl border border-input bg-background px-4 text-lg tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </>
        )}

        <p
          className="mb-3 rounded-xl border p-2 text-sm font-medium"
          style={{
            borderColor: !loyerValide || ecart === 0 ? "var(--border)" : "var(--suivi-orange)",
            color: !loyerValide || ecart === 0 ? "var(--suivi-gris)" : "var(--suivi-orange)",
          }}
        >
          {loyerValide
            ? `Total ${candidat.nom} : ${totalActuel(candidat.contrats_loges)} € → ${
                totalActuel(candidat.contrats_loges) + ecart
              } €. ${libelleEcart(ecart)}`
            : `Indiquez le loyer du box ${box.numero} pour voir le total.`}
        </p>

        <ChoixDateEffet
          dateDebutActuelle={null}
          valeur={periodeEffet}
          onChange={setPeriodeEffet}
          desactive={enCours}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1"
            disabled={enCours}
            onClick={reinitialise}
          >
            Retour
          </Button>
          <Button
            type="button"
            className="h-12 flex-1"
            disabled={enCours || !loyerValide || !sourceValide}
            onClick={ajoute}
          >
            Créer le contrat
          </Button>
        </div>
      </div>
    );
  }

  // ---- Étape 2 : locataire en attente, on rattache son contrat ------------
  if (candidat) {
    return (
      <div className="mb-4 rounded-xl border border-border bg-secondary/40 p-3">
        <p className="mb-2 text-base">
          <strong>{candidat.nom}</strong>
          {` — box ${box.numero} · ${candidat.contrat_libre!.loyer_mensuel_eur} €`}
        </p>

        <ChoixDateEffet
          dateDebutActuelle={candidat.contrat_libre!.date_debut}
          valeur={periodeEffet}
          onChange={setPeriodeEffet}
          desactive={enCours}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1"
            disabled={enCours}
            onClick={reinitialise}
          >
            Retour
          </Button>
          <Button type="button" className="h-12 flex-1" disabled={enCours} onClick={rattache}>
            Affecter
          </Button>
        </div>
      </div>
    );
  }

  // ---- Étape 1 : choisir le locataire ------------------------------------
  return (
    <div className="mb-4 rounded-xl border border-border bg-secondary/40 p-3">
      <span className="mb-1 block text-sm font-medium">Locataire</span>

      {ouvert ? (
        <>
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom du locataire"
            aria-label="Rechercher un locataire"
            className="mb-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="max-h-64 overflow-y-auto">
            {visibles.map((c) => (
              <button
                key={c.locataire_id}
                type="button"
                disabled={enCours}
                onClick={() => choisit(c)}
                className="suivi-tap flex min-h-14 w-full items-center justify-between gap-2 border-b border-border/70 px-1 text-left last:border-0 active:bg-secondary"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{c.nom}</span>
                  {c.societe && (
                    <span className="block truncate text-sm text-[var(--suivi-gris)]">
                      {c.societe}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right text-sm">
                  {c.contrat_libre ? (
                    <>
                      <span className="block font-semibold tabular-nums">
                        {c.contrat_libre.loyer_mensuel_eur} €
                      </span>
                      <span className="block text-xs text-[var(--suivi-gris)]">en attente</span>
                    </>
                  ) : (
                    <>
                      <span className="block font-semibold tabular-nums">
                        {totalActuel(c.contrats_loges)} €
                      </span>
                      <span className="block text-xs text-[var(--suivi-gris)]">
                        {`box ${c.contrats_loges.map((l) => l.box_numero ?? "?").join(", ")}`}
                      </span>
                    </>
                  )}
                </span>
              </button>
            ))}

            {visibles.length === 0 && (
              <p className="py-3 text-center text-sm text-[var(--suivi-gris)]">
                {recherche ? `Aucun locataire ne correspond à « ${recherche} ».` : "Aucun locataire."}
              </p>
            )}
          </div>

          {/* Un arrivant n'est dans aucune liste : il faut pouvoir le créer
              d'ici, sinon le box reste libre en attendant le back-office. */}
          <button
            type="button"
            disabled={enCours}
            onClick={() => {
              setCreationLocataire(true);
              setNouveau({ nom: recherche.trim(), societe: "", telephone: "", email: "" });
              setLoyer(loyerPropose(box.tarif_indicatif_eur));
              setPeriodeEffet(periodeCourante());
            }}
            className="suivi-tap mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background text-sm font-semibold active:bg-secondary"
          >
            <UserPlus className="size-4" aria-hidden />
            {recherche.trim() ? `Créer « ${recherche.trim()} »` : "Nouveau locataire"}
          </button>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full text-base"
          disabled={candidats.length === 0}
          onClick={() => setOuvert(true)}
        >
          {candidats.length === 0 ? "Aucun locataire" : "Affecter un locataire"}
        </Button>
      )}
    </div>
  );
}

function OptionSource({
  actif,
  titre,
  detail,
  onClick,
}: {
  actif: boolean;
  titre: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={cn(
        "suivi-tap flex min-h-12 w-full items-center justify-between rounded-xl border px-3 text-left",
        actif ? "border-primary bg-primary/10" : "border-border bg-background active:bg-secondary"
      )}
    >
      <span className="text-sm font-semibold">{titre}</span>
      <span className="text-xs text-[var(--suivi-gris)]">{detail}</span>
    </button>
  );
}

function Champ({
  libelle,
  valeur,
  onChange,
  type = "text",
  placeholder,
  aide,
}: {
  libelle: string;
  valeur: string;
  onChange: (valeur: string) => void;
  type?: string;
  placeholder?: string;
  aide?: string;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--suivi-gris)]">
        {libelle}
      </span>
      <input
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoCapitalize={type === "email" ? "none" : undefined}
        autoCorrect="off"
        className="h-12 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {aide && <span className="mt-1 block text-xs text-[var(--suivi-gris)]">{aide}</span>}
    </label>
  );
}
