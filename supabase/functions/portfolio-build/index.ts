

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { student_data, profile_data, target_role } = await req.json();
    if (!student_data) throw new Error("student_data required");

    const prompt = `You are an AI Portfolio Builder. Generate a professional portfolio summary for this student based on their data.

Student Info:
${JSON.stringify(student_data, null, 2)}

Profile Data (GitHub, LeetCode, Skills):
${JSON.stringify(profile_data || {}, null, 2)}

Target Role: ${target_role || "Software Engineer"}

Generate a compelling portfolio with:
1. A professional headline and bio
2. Key skills organized by category
3. Notable projects with descriptions (from GitHub data)
4. Achievements and metrics
5. A professional summary paragraph

Return a JSON object with this EXACT structure:
{
  "headline": "<catchy professional headline>",
  "bio": "<2-3 sentence professional bio>",
  "skills": {
    "languages": ["<skill1>"],
    "frameworks": ["<skill1>"],
    "tools": ["<skill1>"],
    "soft_skills": ["<skill1>"]
  },
  "projects": [
    {
      "name": "<project name>",
      "description": "<compelling 1-2 sentence description>",
      "technologies": ["<tech1>"],
      "highlights": ["<key achievement>"],
      "url": "<github url if available>"
    }
  ],
  "achievements": [
    {"icon": "trophy" | "code" | "star" | "chart", "title": "<achievement>", "detail": "<detail>"}
  ],
  "summary": "<professional summary paragraph for recruiters>",
  "suggested_roles": ["<role1>", "<role2>"],
  "strength_areas": ["<area1>", "<area2>"]
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
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    console.error("portfolio-build error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
