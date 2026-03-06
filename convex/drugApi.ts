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

    // Build all pairs and check them in parallel
    const pairs: [string, string][] = [];
    for (let i = 0; i < allMeds.length; i++) {
      for (let j = i + 1; j < allMeds.length; j++) {
        pairs.push([allMeds[i], allMeds[j]]);
      }
    }

    const results = await Promise.all(
      pairs.map(async ([drug1, drug2]) => {
        try {
          const response = await fetch(
            `${FDA_API_BASE}/label.json?search=drug_interactions:"${encodeURIComponent(drug1)}"+"${encodeURIComponent(drug2)}"&limit=1`,
          );
          if (!response.ok) return null;
          const data = await response.json();
          if (!data.results?.length) return null;
          const interactionText = data.results[0].drug_interactions?.[0] || "";
          if (!interactionText.toLowerCase().includes(drug2.toLowerCase())) return null;
          return {
            drug1,
            drug2,
            severity: determineSeverity(interactionText),
            description: extractRelevantText(interactionText, drug1, drug2),
          };
        } catch (error) {
          console.error(`Error checking ${drug1} + ${drug2}:`, error);
          return null;
        }
      }),
    );

    return results.filter(Boolean) as Array<{ drug1: string; drug2: string; severity: string; description: string }>;
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

export const checkConditionSafety = action({
  args: {
    medications: v.array(v.string()),
    condition: v.string(),
  },
  handler: async (_ctx, { medications, condition }) => {
    const results = await Promise.all(
      medications.map(async (drugName) => {
        try {
          const res = await fetch(
            `${FDA_API_BASE}/label.json?search=openfda.brand_name:"${encodeURIComponent(drugName)}"+openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=1`,
          );
          if (!res.ok) return { drug: drugName, indications: null, warnings: null };
          const data = await res.json();
          if (!data.results?.length) return { drug: drugName, indications: null, warnings: null };

          const label = data.results[0];
          return {
            drug: drugName,
            indications: label.indications_and_usage?.[0]?.substring(0, 500) || null,
            warnings: label.warnings?.[0]?.substring(0, 300) || null,
          };
        } catch {
          return { drug: drugName, indications: null, warnings: null };
        }
      }),
    );

    return results;
  },
});
