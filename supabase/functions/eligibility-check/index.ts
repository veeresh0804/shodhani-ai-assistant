import { createClient } from "jsr:@supabase/supabase-js@2";

import { corsHeaders, errorResponse, internalError, newRequestId } from "../_shared/errors.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const requestId = newRequestId();
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

    const { job_id } = await req.json();
    if (!job_id) throw new Error("job_id is required");

    // Fetch student profile
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

    // Fetch student_profiles (extracted data)
    const { data: profile } = await adminClient
      .from("student_profiles")
      .select("*")
      .eq("student_id", student.id)
      .maybeSingle();

    // Fetch job
    const { data: job } = await adminClient
      .from("jobs")
      .select("*")
      .eq("id", job_id)
      .maybeSingle();
    if (!job) throw new Error("Job not found");

    const studentSummary = {
      name: student.name,
      institution: student.institution,
      degree: student.degree,
      branch: student.branch,
      graduation_year: student.graduation_year,
      github_url: profile?.github_url || null,
      github_data: profile?.github_data || null,
      leetcode_url: profile?.leetcode_url || null,
      leetcode_data: profile?.leetcode_data || null,
      linkedin_url: profile?.linkedin_url || null,
      linkedin_data: profile?.linkedin_data || null,
    };

    const prompt = `You are an expert career advisor AI. Analyze how well this student matches the following job posting and provide a detailed eligibility analysis with a personalized learning roadmap.

JOB DETAILS:
- Title: ${job.title}
- Description: ${job.description}
- Required Skills: ${(job.required_skills || []).join(", ")}
- Preferred Skills: ${(job.preferred_skills || []).join(", ")}
- Experience Required: ${job.experience_required || "Not specified"}
- Job Type: ${job.job_type}

STUDENT PROFILE:
${JSON.stringify(studentSummary, null, 2)}

Provide:
1. An overall match percentage (0-100)
2. Skills the student already has that match
3. Skills the student is missing
4. A personalized learning roadmap with specific resources and timelines to fill skill gaps
5. A brief eligibility verdict`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert career advisor that helps students understand their job eligibility and provides actionable learning paths." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "eligibility_analysis",
              description: "Return structured eligibility analysis with match score and roadmap",
              parameters: {
                type: "object",
                properties: {
                  match_percentage: { type: "number", description: "0-100 overall match score" },
                  verdict: { type: "string", description: "Brief eligibility verdict (e.g., Strong Match, Moderate Match, Needs Development)" },
                  verdict_detail: { type: "string", description: "2-3 sentence explanation of the verdict" },
                  matched_skills: {
                    type: "array",
                    items: { type: "string" },
                    description: "Skills the student already has that match the job",
                  },
                  missing_skills: {
                    type: "array",
                    items: { type: "string" },
                    description: "Skills the student needs to develop",
                  },
                  roadmap: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        skill: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        timeline: { type: "string", description: "e.g., 2 weeks, 1 month" },
                        resources: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string" },
                              url: { type: "string" },
                              type: { type: "string", description: "e.g., Course, Tutorial, Documentation, Practice" },
                            },
                            required: ["title", "type"],
                            additionalProperties: false,
                          },
                        },
                        description: { type: "string", description: "Brief learning path description" },
                      },
                      required: ["skill", "priority", "timeline", "resources", "description"],
                      additionalProperties: false,
                    },
                  },
                  tips: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 actionable tips to improve candidacy",
                  },
                },
                required: ["match_percentage", "verdict", "verdict_detail", "matched_skills", "missing_skills", "roadmap", "tips"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "eligibility_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let analysis;
    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      throw new Error("AI did not return structured analysis");
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return internalError("eligibility-check", e, "Failed to check eligibility");
  }
});
