import { Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

const ARTICLE_HEADING = /^(article|chapitre)\s+\S+/i;

// Découpe un texte libre (CGV, modèle de contrat) en paragraphes séparés par
// une ligne vide. Si la première ligne d'un paragraphe ressemble à un titre
// d'article ("Article 1 - Objet"), elle est mise en gras séparément du reste
// du paragraphe plutôt que d'afficher tout le texte en un seul bloc uniforme.
export function FormattedLegalText({
  text,
  bodyStyle,
  headingStyle,
}: {
  text: string;
  bodyStyle: Style;
  headingStyle: Style;
}) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      {paragraphs.map((paragraph, i) => {
        const lines = paragraph.split("\n");
        const firstLine = lines[0].trim();

        if (ARTICLE_HEADING.test(firstLine)) {
          const rest = lines.slice(1).join("\n").trim();
          return (
            <View key={i} style={{ marginBottom: 8 }}>
              <Text style={headingStyle}>{firstLine}</Text>
              {rest && <Text style={bodyStyle}>{rest}</Text>}
            </View>
          );
        }

        return (
          <Text key={i} style={{ ...bodyStyle, marginBottom: 8 }}>
            {paragraph}
          </Text>
        );
      })}
    </>
  );
}
