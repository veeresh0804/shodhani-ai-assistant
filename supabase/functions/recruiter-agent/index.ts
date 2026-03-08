import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { messages, recruiter_context } = await req.json();
    if (!messages) throw new Error("messages required");

    const systemPrompt = `You are an autonomous AI recruiting assistant for SudheeAI platform. You help recruiters with hiring decisions.

Recruiter Context:
${JSON.stringify(recruiter_context || {})}

You can help with:
1. **Candidate Analysis**: Evaluate candidate profiles, compare strengths
2. **Job Description Writing**: Draft compelling, inclusive job posts
3. **Interview Planning**: Suggest interview questions for specific roles
4. **Pipeline Strategy**: Advise on hiring funnel optimization
5. **Talent Insights**: Analyze talent pool trends and recommendations
6. **Outreach Templates**: Draft candidate outreach messages
7. **Offer Negotiation**: Suggest competitive compensation packages

Rules:
- Be concise and actionable
- Use data from the recruiter's context when available
- Provide specific, implementable suggestions
- Format responses with markdown for readability
- When asked about candidates, provide structured comparisons
- Proactively suggest next steps`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("recruiter-agent error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
