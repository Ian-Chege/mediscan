"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

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
                detail: "high",
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
  },
  handler: async (_ctx, { medications, interactions }) => {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a friendly pharmacist assistant. Explain medications in simple, everyday language.

Guidelines:
- Use simple words, avoid medical jargon
- Explain what each medication is typically used for
- Include practical tips (take with food, avoid alcohol, etc.)
- If there are interactions, explain the risk clearly but don't cause panic
- Be encouraging and supportive
- Keep it concise but informative
- Use bullet points for clarity

Format your response as a helpful summary the patient can easily understand.`,
        },
        {
          role: "user",
          content: `Please explain these medications and any interactions:

MEDICATIONS:
${medications.map((m) => `- ${m.name} (${m.dosage}, ${m.frequency})`).join("\n")}

INTERACTIONS FOUND:
${
  interactions.length > 0
    ? interactions
        .map(
          (i) =>
            `- ${i.drug1} + ${i.drug2}: ${i.description} (${i.severity} severity)`,
        )
        .join("\n")
    : "No significant interactions found"
}

Provide a clear, friendly explanation.`,
        },
      ],
      max_tokens: 1000,
    });

    return response.choices[0].message.content;
  },
});
