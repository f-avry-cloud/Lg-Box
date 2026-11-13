-- 022 — Site public : la grille tarifaire par niveau, et les disponibilités
-- lisibles sans connexion.
--
-- Le site vitrine (lg-box.fr) affiche deux choses qui vivent dans cette base :
-- les tarifs (pricing_grid, modifiables dans Paramètres) et les box à louer
-- (sr_box.libre, déclarés depuis /suivi). Rien n'est recopié : le site lit ici.

-- ----------------------------------------------------------------------------
-- 1. La grille distingue le rez-de-chaussée de l'étage.
-- ----------------------------------------------------------------------------
-- Le même 5 m² ne vaut pas le même prix selon qu'on y accède de plain-pied ou
-- par l'escalier. `taille_libelle` reste unique et porte le niveau en clair
-- (« 5 m² », « 5 m² à l'étage ») : c'est ce libellé que le formulaire de
-- réservation enregistre dans la demande.
alter table pricing_grid
  add column if not exists niveau text not null default 'rdc';

alter table pricing_grid
  add column if not exists surface_m2 numeric(6, 2);

alter table pricing_grid
  drop constraint if exists pricing_grid_niveau_check;

alter table pricing_grid
  add constraint pricing_grid_niveau_check check (niveau in ('rdc', 'etage'));

comment on column pricing_grid.niveau is
  'rdc = rez-de-chaussée (accès de plain-pied) ; etage = accès par escalier.';
comment on column pricing_grid.surface_m2 is
  'Surface en m², pour trier la grille et la rapprocher des box libres.';

-- Les cinq lignes du jeu de démonstration (39/69/119/159/199 €) n'ont jamais
-- été les tarifs du centre. On ne les retire que si elles sont intactes : une
-- ligne dont le prix a été retouché à la main est conservée.
delete from pricing_grid
where (taille_libelle, prix_mensuel) in (
  ('2m²', 39), ('5m²', 69), ('10m²', 119), ('15m²', 159), ('20m²', 199)
);

-- Grille en vigueur sur lg-box.fr (tarifs mensuels 2026).
insert into pricing_grid (taille_libelle, prix_mensuel, niveau, surface_m2) values
  ('2 m²', 45, 'rdc', 2),
  ('5 m²', 100, 'rdc', 5),
  ('8 m²', 120, 'rdc', 8),
  ('12 m²', 140, 'rdc', 12),
  ('15 m²', 160, 'rdc', 15),
  ('18 m²', 180, 'rdc', 18),
  ('20 m²', 200, 'rdc', 20),
  ('5 m² à l''étage', 90, 'etage', 5),
  ('8 m² à l''étage', 110, 'etage', 8),
  ('12 m² à l''étage', 130, 'etage', 12),
  ('18 m² à l''étage', 170, 'etage', 18)
on conflict (taille_libelle) do nothing;

-- ----------------------------------------------------------------------------
-- 2. Les disponibilités, sans ouvrir sr_box au public.
-- ----------------------------------------------------------------------------
-- sr_box et sr_contrats restent réservés au personnel. Cette fonction n'en
-- laisse sortir qu'un décompte : combien de box sont à louer, par surface et
-- par niveau. Ni numéro de box, ni nom, ni date.
--
-- « À louer » suit la règle de /suivi (lib/suivi/disponibilite.ts) : le box
-- est déclaré libre par l'exploitant, et aucun bail à venir ne l'a déjà promis.
create or replace function public.disponibilites_publiques()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with a_louer as (
    select
      b.surface_m2,
      case when b.batiment = 'Étage' then 'etage' else 'rdc' end as niveau,
      b.tarif_indicatif_eur
    from sr_box b
    where b.libre
      and not exists (
        select 1
        from sr_contrats c
        where c.box_id = b.id
          and c.date_debut is not null
          and c.date_debut > current_date
          and (c.date_fin is null or c.date_fin >= c.date_debut)
      )
  ),
  groupes as (
    select surface_m2, niveau, count(*)::int as nombre, min(tarif_indicatif_eur) as tarif_eur
    from a_louer
    group by surface_m2, niveau
  )
  select jsonb_build_object(
    'total_box', (select count(*) from sr_box),
    'total_libres', (select count(*) from a_louer),
    'libres', coalesce(
      (select jsonb_agg(to_jsonb(g) order by g.surface_m2 nulls last, g.niveau) from groupes g),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.disponibilites_publiques() from public;
grant execute on function public.disponibilites_publiques() to anon, authenticated;

comment on function public.disponibilites_publiques() is
  'Décompte des box à louer par surface et niveau, pour le site public. N''expose aucune donnée nominative.';
