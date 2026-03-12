"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { action } from "./_generated/server";

const FDA_API_BASE = "https://api.fda.gov/drug";

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
    const openai = getOpenAI();

    // Step 1: Extract medications (image or text)
    let extracted: any;
    if (imageBase64) {
      const res = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
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
        response_format: { type: "json_object" },
        max_tokens: 800,
      });
      extracted = JSON.parse(res.choices[0].message.content!);
    } else {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
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
        response_format: { type: "json_object" },
        max_tokens: 800,
      });
      extracted = JSON.parse(res.choices[0].message.content!);
    }

    if (extracted.error || !extracted.medications?.length) {
      return { ...extracted, interactions: [], explanation: null };
    }

    // Step 2: Check all drug pairs in PARALLEL (not sequential)
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

    // Step 3: Generate explanation with gpt-4o-mini (fast, cost-effective)
    const explanationRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a friendly pharmacist. Explain medications in simple language with practical tips. Use bullet points. Be concise.`,
        },
        {
          role: "user",
          content: `Explain these medications:\n${extracted.medications.map((m: any) => `- ${m.name} (${m.dosage}, ${m.frequency})`).join("\n")}\n\nInteractions:\n${interactions.length > 0 ? interactions.map((i: any) => `- ${i.drug1} + ${i.drug2}: ${i.description} (${i.severity})`).join("\n") : "None found"}`,
        },
      ],
      max_tokens: 800,
    });

    return {
      medications: extracted.medications,
      notes: extracted.notes,
      interactions,
      explanation: explanationRes.choices[0].message.content,
    };
  },
});

// Lazy init: Convex analyzes modules at deploy time, but process.env
// is only populated at runtime inside handlers. Initializing here would
// throw "Missing credentials" during static analysis.
function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export const extractMedications = action({
  args: {
    imageBase64: v.string(),
  },
  handler: async (_ctx, { imageBase64 }) => {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
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
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return result;
  },
});

export const extractFromText = action({
  args: {
    prescriptionText: v.string(),
  },
  handler: async (_ctx, { prescriptionText }) => {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
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
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return result;
  },
});

export const suggestForCondition = action({
  args: {
    condition: v.string(),
  },
  handler: async (_ctx, { condition }) => {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
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
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return result;
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
  },
  handler: async (_ctx, { medications, interactions, condition, conditionData }) => {
    const openai = getOpenAI();

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a friendly pharmacist assistant. Explain medications in very simple, everyday language.

Return ONLY valid JSON with this exact structure:
{
  "en": "English markdown explanation here",
  "sw": "Swahili markdown explanation here",
  "conditionMatches": [
    { "drug": "DrugName", "match": "yes|no|partial", "reason_en": "Short reason in English", "reason_sw": "Short reason in Swahili" }
  ]
}

RULES for conditionMatches:
- ONLY include this array if a patient condition is provided
- If no condition is given, set conditionMatches to an empty array []
- "yes" = this drug is commonly used to treat the stated condition
- "no" = this drug is NOT appropriate for the stated condition
- "partial" = it may help with some symptoms but is not the primary treatment
- Keep reasons to ONE short sentence

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
}${conditionSection}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const parsed = JSON.parse(response.choices[0].message.content!);
    // Store as JSON string so frontend can parse both languages + condition matches
    return JSON.stringify({ en: parsed.en, sw: parsed.sw, conditionMatches: parsed.conditionMatches || [] });
  },
});
