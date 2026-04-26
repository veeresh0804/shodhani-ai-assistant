

import { corsHeaders, errorResponse, internalError, newRequestId } from "../_shared/errors.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const requestId = newRequestId();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { job_description, job_title, required_skills } = await req.json();
    if (!job_description) throw new Error("job_description required");

    const prompt = `You are an AI Hiring Bias Detector. Analyze the following job posting for potential biases that could discourage diverse candidates.

Job Title: ${job_title || "Unknown"}
Required Skills: ${JSON.stringify(required_skills || [])}
Job Description:
${job_description}

Check for these bias categories:
1. Gender bias: Gendered language ("rockstar", "ninja", "manpower"), pronouns
2. Age bias: "Digital native", "young and dynamic", excessive years of experience
3. Cultural bias: Assumptions about background, "culture fit" language
4. Disability bias: Unnecessary physical requirements, "fast-paced" overuse
5. Education bias: Unnecessary degree requirements for skill-based roles
6. Socioeconomic bias: Unpaid internships, relocation without support

Return a JSON object with this EXACT structure:
{
  "bias_score": <number 0-100, where 0 is no bias and 100 is highly biased>,
  "overall_rating": "excellent" | "good" | "needs_improvement" | "problematic",
  "findings": [
    {
      "category": "gender" | "age" | "cultural" | "disability" | "education" | "socioeconomic",
      "severity": "low" | "medium" | "high",
      "problematic_text": "<the exact problematic text from the JD>",
      "explanation": "<why this is biased>",
      "suggestion": "<inclusive alternative>"
    }
  ],
  "inclusive_score": <number 0-100>,
  "summary": "<2-3 sentence summary>",
  "rewritten_sections": [
    {"original": "<problematic text>", "improved": "<inclusive version>"}
  ]
}

Return ONLY valid JSON, no markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return errorResponse({ fn: "bias-detect", code: "rate_limited", message: "Rate limited, try again later.", requestId });
      if (status === 402) return errorResponse({ fn: "bias-detect", code: "payment_required", message: "Payment required.", requestId });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return internalError("bias-detect", e, "Failed to analyze job description");
  }
});
