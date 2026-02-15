"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const FDA_API_BASE = "https://api.fda.gov/drug";

export const checkInteractions = action({
  args: {
    medications: v.array(v.string()),
    existingMedications: v.array(v.string()),
  },
  handler: async (_ctx, { medications, existingMedications }) => {
    const allMeds = [...medications, ...existingMedications];
    const interactions: Array<{
      drug1: string;
      drug2: string;
      severity: string;
      description: string;
    }> = [];

    for (let i = 0; i < allMeds.length; i++) {
      for (let j = i + 1; j < allMeds.length; j++) {
        const drug1 = allMeds[i];
        const drug2 = allMeds[j];

        try {
          const response = await fetch(
            `${FDA_API_BASE}/label.json?search=drug_interactions:"${encodeURIComponent(drug1)}"+"${encodeURIComponent(drug2)}"&limit=1`,
          );

          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              const interactionText =
                data.results[0].drug_interactions?.[0] || "";

              if (interactionText.toLowerCase().includes(drug2.toLowerCase())) {
                interactions.push({
                  drug1,
                  drug2,
                  severity: determineSeverity(interactionText),
                  description: extractRelevantText(
                    interactionText,
                    drug1,
                    drug2,
                  ),
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error checking ${drug1} + ${drug2}:`, error);
        }
      }
    }

    return interactions;
  },
});

function determineSeverity(text: string): string {
  const lowerText = text.toLowerCase();
  if (
    lowerText.includes("contraindicated") ||
    lowerText.includes("do not") ||
    lowerText.includes("fatal")
  ) {
    return "high";
  }
  if (
    lowerText.includes("caution") ||
    lowerText.includes("monitor") ||
    lowerText.includes("may increase")
  ) {
    return "moderate";
  }
  return "low";
}

function extractRelevantText(
  text: string,
  drug1: string,
  drug2: string,
): string {
  const sentences = text.split(/[.!?]+/);
  const relevant = sentences.find(
    (s) =>
      s.toLowerCase().includes(drug1.toLowerCase()) ||
      s.toLowerCase().includes(drug2.toLowerCase()),
  );
  return relevant?.trim().substring(0, 200) || text.substring(0, 200);
}
