

import { corsHeaders, errorResponse, internalError, newRequestId } from "../_shared/errors.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = newRequestId();

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const { title, job_type, location, experience, brief_description } = await req.json();
    if (!brief_description) throw new Error("brief_description is required");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert HR professional and technical recruiter. Generate professional, detailed job descriptions." },
          {
            role: "user",
            content: `Generate a complete job description based on this brief:
Title: ${title || "Not specified"}
Type: ${job_type || "Full-time"}
Location: ${location || "Not specified"}
Experience: ${experience || "Not specified"}
Brief: ${brief_description}

Create a comprehensive, professional job description.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_job_description",
              description: "Return a structured job description",
              parameters: {
                type: "object",
                properties: {
                  description: { type: "string", description: "Full job description with responsibilities, requirements, and benefits. Use markdown formatting." },
                  required_skills: { type: "array", items: { type: "string" }, description: "5-10 required technical skills" },
                  preferred_skills: { type: "array", items: { type: "string" }, description: "3-5 preferred/nice-to-have skills" },
                  salary_suggestion: { type: "string", description: "Suggested salary range based on role and market" },
                  suggested_title: { type: "string", description: "Professional job title suggestion" },
                },
                required: ["description", "required_skills", "preferred_skills", "salary_suggestion", "suggested_title"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_job_description" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return errorResponse({ fn: "generate-jd", code: "rate_limited", message: "Rate limit exceeded.", requestId });
      if (status === 402) return errorResponse({ fn: "generate-jd", code: "payment_required", message: "AI credits exhausted.", requestId });
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("AI did not return structured output");

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return internalError("generate-jd", e, "Failed to generate job description", requestId);
  }
});
