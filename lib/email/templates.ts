// Modèles d'emails de relance, éditables ici. Variables disponibles :
// {{prenom}}, {{montant}}, {{numero_facture}}, {{date_echeance}}.

export type ReminderStage = "j-3" | "j0" | "j+7" | "j+15";

const TEMPLATES: Record<ReminderStage, { subject: string; body: string }> = {
  "j-3": {
    subject: "Rappel — votre facture {{numero_facture}} arrive à échéance",
    body: `Bonjour {{prenom}},

Petit rappel amical : votre facture {{numero_facture}} d'un montant de {{montant}} arrive à échéance le {{date_echeance}}.

Merci de bien vouloir procéder au règlement d'ici cette date.

Bien cordialement,
L'équipe LG BOX`,
  },
  "j0": {
    subject: "Votre facture {{numero_facture}} est due aujourd'hui",
    body: `Bonjour {{prenom}},

Votre facture {{numero_facture}} d'un montant de {{montant}} est due aujourd'hui ({{date_echeance}}).

Merci de procéder au règlement dans les meilleurs délais.

Bien cordialement,
L'équipe LG BOX`,
  },
  "j+7": {
    subject: "Facture {{numero_facture}} impayée — 7 jours de retard",
    body: `Bonjour {{prenom}},

Nous constatons que votre facture {{numero_facture}} d'un montant de {{montant}}, échue le {{date_echeance}}, est toujours impayée à ce jour.

Merci de régulariser votre situation rapidement. Sans nouvelle de votre part, nous serons contraints d'appliquer les pénalités de retard prévues au contrat.

Bien cordialement,
L'équipe LG BOX`,
  },
  "j+15": {
    subject: "Mise en demeure — facture {{numero_facture}} impayée depuis 15 jours",
    body: `Bonjour {{prenom}},

Malgré nos précédentes relances, votre facture {{numero_facture}} d'un montant de {{montant}}, échue le {{date_echeance}}, demeure impayée.

Nous vous demandons de régulariser cette situation sous 48h. À défaut, nous nous réservons le droit d'engager une procédure de recouvrement et de suspendre l'accès à votre box.

Bien cordialement,
L'équipe LG BOX`,
  },
};

export function renderReminderEmail(
  stage: ReminderStage,
  vars: { prenom: string; montant: string; numero_facture: string; date_echeance: string }
): { subject: string; text: string } {
  const template = TEMPLATES[stage];
  const interpolate = (input: string) =>
    input
      .replaceAll("{{prenom}}", vars.prenom)
      .replaceAll("{{montant}}", vars.montant)
      .replaceAll("{{numero_facture}}", vars.numero_facture)
      .replaceAll("{{date_echeance}}", vars.date_echeance);

  return { subject: interpolate(template.subject), text: interpolate(template.body) };
}
