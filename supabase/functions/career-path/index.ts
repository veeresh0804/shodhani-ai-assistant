import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Try to get user from auth header
    let userId: string | null = null;
    if (authHeader && authHeader !== `Bearer ${supabaseKey}`) {
      const userClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      userId = data?.user?.id ?? null;
    }

    const { target_role } = await req.json();
    if (!target_role) throw new Error("target_role is required");

    // Get student data
    let student;
    if (userId) {
      const { data } = await adminClient.from("students").select("*").eq("user_id", userId).maybeSingle();
      student = data;
    }
    if (!student) {
      const { data } = await adminClient.from("students").select("*").limit(1).maybeSingle();
      student = data;
    }
    if (!student) throw new Error("Student profile not found");

    const { data: profile } = await adminClient.from("student_profiles").select("*").eq("student_id", student.id).maybeSingle();

    const studentContext = {
      name: student.name,
      degree: student.degree,
      branch: student.branch,
      institution: student.institution,
      graduation_year: student.graduation_year,
      gemini_analysis: profile?.gemini_analysis || null,
      resume_skills: profile?.resume_skills || null,
      github_data: profile?.github_data || null,
      leetcode_data: profile?.leetcode_data || null,
    };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert career advisor and tech mentor. Create personalized, actionable career roadmaps." },
          {
            role: "user",
            content: `Create a detailed career path for this student targeting the role: "${target_role}"

Student Profile:
${JSON.stringify(studentContext, null, 2)}

Create a personalized 6-month roadmap with specific monthly goals, resources, and milestones.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_career_path",
              description: "Return a structured career roadmap",
              parameters: {
                type: "object",
                properties: {
                  target_role: { type: "string" },
                  current_level: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                  readiness_score: { type: "number", description: "0-100 how ready the student is for this role" },
                  summary: { type: "string", description: "2-3 sentence assessment of their current position relative to the target role" },
                  skill_gaps: { type: "array", items: { type: "string" }, description: "Skills they need to develop" },
                  existing_strengths: { type: "array", items: { type: "string" }, description: "Skills they already have that are relevant" },
                  monthly_plan: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        month: { type: "integer" },
                        title: { type: "string" },
                        goals: { type: "array", items: { type: "string" } },
                        resources: { type: "array", items: { type: "string" } },
                        project_idea: { type: "string" },
                      },
                      required: ["month", "title", "goals", "resources", "project_idea"],
                      additionalProperties: false,
                    },
                  },
                  recommended_certifications: { type: "array", items: { type: "string" } },
                  interview_tips: { type: "array", items: { type: "string" } },
                },
                required: ["target_role", "current_level", "readiness_score", "summary", "skill_gaps", "existing_strengths", "monthly_plan", "recommended_certifications", "interview_tips"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_career_path" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("AI did not return structured output");

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("career-path error:", e);
    return new Response(JSON.stringify({ error: "Failed to generate career path" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
