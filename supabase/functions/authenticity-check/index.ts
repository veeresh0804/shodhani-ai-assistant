

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { student_profile } = await req.json();
    if (!student_profile) throw new Error("student_profile required");

    const prompt = `You are a resume authenticity detector. Analyze the following student profile data for signs of inflated or fake credentials.

Profile Data:
${JSON.stringify(student_profile, null, 2)}

Analyze these signals:
1. GitHub: Check if repos are mostly forks with minimal commits, low code activity relative to claimed skills, suspicious patterns
2. LeetCode: Check if problem count matches claimed skill level, activity timeline gaps
3. Resume Skills: Check if claimed skills are consistent with GitHub languages and project types
4. Overall consistency between platforms

Return a JSON object with this EXACT structure:
{
  "authenticity_score": <number 0-100>,
  "risk_level": "low" | "medium" | "high",
  "signals": [
    {"type": "positive" | "warning" | "suspicious", "category": "github" | "leetcode" | "resume" | "consistency", "message": "<description>"}
  ],
  "summary": "<2-3 sentence summary>",
  "recommendations": ["<recommendation1>", "<recommendation2>"]
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
    console.error("authenticity-check error:", e);
    return new Response(JSON.stringify({ error: "Failed to verify authenticity" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
