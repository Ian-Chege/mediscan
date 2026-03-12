import { v } from "convex/values";
import { action } from "./_generated/server";

const FDA_API_BASE = "https://api.fda.gov/drug";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Direct fetch helper — avoids the openai npm package which causes Windows
// path bundling issues with Convex's esbuild (c:\ paths in ESM bundles).
async function chatCompletion(
  model: string,
  messages: any[],
  maxTokens: number,
  jsonMode = true,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const body: any = { model, messages, max_tokens: maxTokens };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const data: any = await res.json();
  return data.choices[0].message.content as string;
}

// Vision variant — supports image_url message content
async function chatCompletionVision(
  model: string,
  messages: any[],
  maxTokens: number,
): Promise<string> {
  return chatCompletion(model, messages, maxTokens, true);
}

function determineSeverity(text: string): string {
  const t = text.toLowerCase();
  if (
    t.includes("contraindicated") ||
    t.includes("do not") ||
    t.includes("fatal")
  )
    return "high";
  if (
    t.includes("caution") ||
    t.includes("monitor") ||
    t.includes("may increase")
  )
    return "moderate";
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

async function checkPair(drug1: string, drug2: string) {
  try {
    const res = await fetch(
      `${FDA_API_BASE}/label.json?search=drug_interactions:"${encodeURIComponent(drug1)}"+"${encodeURIComponent(drug2)}"&limit=1`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results?.length) return null;
    const interactionText = data.results[0].drug_interactions?.[0] || "";
    if (!interactionText.toLowerCase().includes(drug2.toLowerCase()))
      return null;
    return {
      drug1,
      drug2,
      severity: determineSeverity(interactionText),
      description: extractRelevantText(interactionText, drug1, drug2),
    };
  } catch {
    return null;
  }
}

// Combined action: extract → check interactions (parallel) → explain — ONE round trip
export const processScan = action({
  args: {
    imageBase64: v.optional(v.string()),
    prescriptionText: v.optional(v.string()),
    existingMedications: v.array(v.string()),
  },
  handler: async (
    _ctx,
    { imageBase64, prescriptionText, existingMedications },
  ) => {
    let extracted: any;
    if (imageBase64) {
      const content = await chatCompletionVision(
        "gpt-4o",
        [
          {
            role: "system",
            content: `You are a medical prescription reader. Extract ALL medications from the image.
Return ONLY valid JSON: { "medications": [{ "name": "...", "dosage": "...", "frequency": "...", "confidence": "high|medium|low" }], "notes": "..." }
If not a prescription: { "medications": [], "error": "Not a prescription" }`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all medications from this prescription:",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: "auto",
                },
              },
            ],
          },
        ],
        800,
      );
      extracted = JSON.parse(content);
    } else {
      const content = await chatCompletion(
        "gpt-4o-mini",
        [
          {
            role: "system",
            content: `You are a prescription parser. Parse shorthand like "Bruffen 1x3" into structured medication data.
Return ONLY valid JSON: { "medications": [{ "name": "...", "dosage": "...", "frequency": "...", "confidence": "high|medium|low" }], "notes": "..." }
If not a medication: { "medications": [], "error": "Could not identify any medications" }`,
          },
          {
            role: "user",
            content: `Parse this prescription: ${prescriptionText}`,
          },
        ],
        800,
      );
      extracted = JSON.parse(content);
    }

    if (extracted.error || !extracted.medications?.length) {
      return { ...extracted, interactions: [], explanation: null };
    }

    const allMeds = [
      ...extracted.medications.map((m: any) => m.name),
      ...existingMedications,
    ];
    const pairs: [string, string][] = [];
    for (let i = 0; i < allMeds.length; i++) {
      for (let j = i + 1; j < allMeds.length; j++) {
        pairs.push([allMeds[i], allMeds[j]]);
      }
    }
    const interactions = (
      await Promise.all(pairs.map(([d1, d2]) => checkPair(d1, d2)))
    ).filter(Boolean);

    const explanationContent = await chatCompletion(
      "gpt-4o-mini",
      [
        {
          role: "system",
          content: `You are a friendly pharmacist. Explain medications in simple language with practical tips. Use bullet points. Be concise.`,
        },
        {
          role: "user",
          content: `Explain these medications:\n${extracted.medications.map((m: any) => `- ${m.name} (${m.dosage}, ${m.frequency})`).join("\n")}\n\nInteractions:\n${interactions.length > 0 ? interactions.map((i: any) => `- ${i.drug1} + ${i.drug2}: ${i.description} (${i.severity})`).join("\n") : "None found"}`,
        },
      ],
      800,
      false,
    );

    return {
      medications: extracted.medications,
      notes: extracted.notes,
      interactions,
      explanation: explanationContent,
    };
  },
});

export const extractMedications = action({
  args: {
    imageBase64: v.string(),
  },
  handler: async (_ctx, { imageBase64 }) => {
    const content = await chatCompletionVision(
      "gpt-4o",
      [
        {
          role: "system",
          content: `You are a medical prescription reader assistant. Your job is to:
1. Extract ALL medication names from the prescription image
2. Identify dosage amounts (e.g., "500mg", "10ml")
3. Identify frequency (e.g., "twice daily", "every 8 hours")
4. Rate your confidence for unclear handwriting

Return ONLY valid JSON in this exact format:
{
  "medications": [
    {
      "name": "Amoxicillin",
      "dosage": "500mg",
      "frequency": "3 times daily",
      "confidence": "high"
    }
  ],
  "notes": "Any additional notes from the prescription"
}

If you cannot read something, make your best guess and mark confidence as "low".
If the image is not a prescription, return: { "medications": [], "error": "Not a prescription" }`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all medications from this prescription image:",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "auto",
              },
            },
          ],
        },
      ],
      1000,
    );
    return JSON.parse(content);
  },
});

export const extractFromText = action({
  args: {
    prescriptionText: v.string(),
  },
  handler: async (_ctx, { prescriptionText }) => {
    const content = await chatCompletion(
      "gpt-4o",
      [
        {
          role: "system",
          content: `You are a medical prescription parser and pharmacist assistant. Users will type shorthand prescriptions like "Bruffen 1x3" or "Amoxicillin 500mg twice daily".

Your job is to:
1. Identify the medication (use the correct generic/brand name)
2. Parse the dosage — "1x3" means "1 tablet, 3 times daily"
3. Determine the standard dosage form if not specified (e.g., Brufen is typically 400mg or 600mg tablets)
4. Rate confidence based on how clear the input is

Return ONLY valid JSON in this exact format:
{
  "medications": [
    {
      "name": "Ibuprofen (Brufen)",
      "dosage": "400mg",
      "frequency": "3 times daily",
      "confidence": "high"
    }
  ],
  "notes": "Any helpful notes about the interpretation"
}

If the input doesn't look like a medication, return: { "medications": [], "error": "Could not identify any medications" }`,
        },
        {
          role: "user",
          content: `Parse this prescription: ${prescriptionText}`,
        },
      ],
      1000,
    );
    return JSON.parse(content);
  },
});

export const suggestForCondition = action({
  args: {
    condition: v.string(),
  },
  handler: async (_ctx, { condition }) => {
    const content = await chatCompletion(
      "gpt-4o-mini",
      [
        {
          role: "system",
          content: `You are a knowledgeable pharmacist assistant. A patient will describe their condition or symptoms. Suggest commonly used medications for that condition.

IMPORTANT RULES:
- Suggest 2-5 medications that are commonly used for this condition
- Include both brand name and generic name where applicable
- Include standard adult dosages and typical frequency
- Focus on commonly available, well-known medications (OTC first, then common prescription)
- Set confidence to "medium" for all suggestions (since these are general recommendations, not a prescription)
- DO NOT suggest controlled substances or high-risk medications
- Always include a note reminding the patient to consult a doctor

Return ONLY valid JSON in this exact format:
{
  "medications": [
    {
      "name": "Ibuprofen (Advil/Brufen)",
      "dosage": "400mg",
      "frequency": "every 6-8 hours as needed",
      "confidence": "medium"
    }
  ],
  "notes": "These are common suggestions for [condition]. Always consult your doctor before taking any medication."
}

If the input doesn't describe a medical condition, return: { "medications": [], "error": "Please describe a medical condition or symptoms" }`,
        },
        {
          role: "user",
          content: `Suggest medications for this condition: ${condition}`,
        },
      ],
      1000,
    );
    return JSON.parse(content);
  },
});

export const generateExplanation = action({
  args: {
    medications: v.array(
      v.object({
        name: v.string(),
        dosage: v.string(),
        frequency: v.string(),
      }),
    ),
    interactions: v.array(
      v.object({
        drug1: v.string(),
        drug2: v.string(),
        severity: v.string(),
        description: v.string(),
      }),
    ),
    condition: v.optional(v.string()),
    conditionData: v.optional(
      v.array(
        v.object({
          drug: v.string(),
          indications: v.union(v.string(), v.null()),
          warnings: v.union(v.string(), v.null()),
        }),
      ),
    ),
    age: v.optional(v.string()),
    allergies: v.optional(v.string()),
  },
  handler: async (
    _ctx,
    { medications, interactions, condition, conditionData, age, allergies },
  ) => {
    let conditionSection = "";
    if (condition && conditionData) {
      conditionSection = `

PATIENT'S CONDITION: ${condition}

FDA INDICATION DATA FOR EACH MEDICATION:
${conditionData.map((d) => `- ${d.drug}: ${d.indications || "No FDA indication data available"}`).join("\n")}

IMPORTANT: Based on the patient's stated condition and the FDA indication data above:
1. For each medication, state whether it is commonly used to treat "${condition}"
2. If a medication does NOT seem appropriate for this condition, clearly flag it as a concern
3. If a medication has warnings relevant to this condition, mention them
4. Add a section titled "## Condition Safety Check" with your assessment`;
    }

    const patientProfile =
      age || allergies
        ? `\n\nPATIENT PROFILE:${age ? `\n- Age: ${age}` : ""}${allergies ? `\n- Known allergies: ${allergies}` : ""}`
        : "";

    const safetyRules =
      age || allergies
        ? `
For ageRestrictions:
${
  age
    ? `- The patient is ${age}. ALWAYS include exactly one entry in ageRestrictions for EACH medication.
  - If there is a real concern for this age: use "high" (absolute contraindication) or "moderate" (caution needed).
  - If this age is safe for this medication: use "safe" severity with a short reassuring message like "Safe for a [age]-year-old at standard dosage."
  - Never leave ageRestrictions empty when age is provided.`
    : `- No age provided → set ageRestrictions to [] for all medications.`
}

For allergyRestrictions:
${
  allergies
    ? `- The patient's known allergies: "${allergies}". ALWAYS include exactly one entry in allergyRestrictions for EACH medication.
  - If the medication or a cross-reactive substance could trigger their allergy: use "high" severity with a clear warning.
  - If the medication is safe for someone with these allergies: use "safe" severity with a short reassuring message like "No known cross-reactivity with [allergy]."
  - Never leave allergyRestrictions empty when allergies are provided.`
    : `- No allergies provided → set allergyRestrictions to [] for all medications.`
}`
        : `For ageRestrictions: No age provided → set ageRestrictions to [] for all medications.
For allergyRestrictions: No allergies provided → set allergyRestrictions to [] for all medications.`;

    const content = await chatCompletion(
      "gpt-4o-mini",
      [
        {
          role: "system",
          content: `You are a friendly pharmacist assistant. Explain medications in very simple, everyday language.

Return ONLY valid JSON with this exact structure:
{
  "en": "English markdown explanation here",
  "sw": "Swahili markdown explanation here",
  "conditionMatches": [
    { "drug": "DrugName", "match": "yes|no|partial", "reason_en": "Short reason in English", "reason_sw": "Short reason in Swahili" }
  ],
  "medicationSafety": [
    {
      "index": 0,
      "ageRestrictions": [
        { "severity": "high|moderate|low", "text_en": "Concern for this patient's age — [reason]", "text_sw": "Swahili translation" }
      ],
      "allergyRestrictions": [
        { "allergen": "specific allergen matched", "text_en": "Warning based on patient's allergy to [X]. [Details]", "text_sw": "Swahili translation" }
      ]
    }
  ]
}

IMPORTANT: medicationSafety must have one entry per medication, in the SAME ORDER as the MEDICATIONS list. index 0 = first medication, index 1 = second, etc.

${safetyRules}

Guidelines for en/sw explanations:
- Use very simple, short sentences a patient can understand
- For each medication: what it does (1 sentence), how to take it (1 sentence), one key tip
- If there are interactions, add a simple warning
- NO nested bullet points — keep it flat and scannable
- Use **bold** for medication names and key warnings only
- Max 3-4 bullet points per medication
- Be warm and reassuring
- The Swahili version should be a natural translation, not word-for-word`,
        },
        {
          role: "user",
          content: `Explain simply for a patient:

MEDICATIONS:
${medications.map((m) => `- ${m.name} (${m.dosage}, ${m.frequency})`).join("\n")}

INTERACTIONS:
${
  interactions.length > 0
    ? interactions
        .map(
          (i) =>
            `- ${i.drug1} + ${i.drug2}: ${i.description} (${i.severity} severity)`,
        )
        .join("\n")
    : "None found"
}${conditionSection}${patientProfile}`,
        },
      ],
      4000,
    );

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Response was truncated — strip trailing incomplete data and try again
      const lastBrace = content.lastIndexOf('"}');
      const trimmed =
        lastBrace !== -1 ? content.substring(0, lastBrace + 2) + "]}]}" : null;
      try {
        parsed = trimmed ? JSON.parse(trimmed) : null;
      } catch {
        parsed = null;
      }
    }

    return JSON.stringify({
      en: parsed?.en ?? "Could not generate explanation. Please try again.",
      sw: parsed?.sw ?? "Haikuweza kutoa maelezo. Tafadhali jaribu tena.",
      conditionMatches: parsed?.conditionMatches || [],
      medicationSafety: parsed?.medicationSafety || [],
    });
  },
});
