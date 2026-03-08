import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    // Auth check: verify the caller is authenticated
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Use service role to fetch all data
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { job_id } = await req.json();
    if (!job_id) throw new Error("job_id is required");

    // Verify recruiter owns this job
    const { data: recruiter } = await adminClient
      .from("recruiters")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!recruiter) throw new Error("Recruiter profile not found");

    const { data: job } = await adminClient
      .from("jobs")
      .select("*")
      .eq("id", job_id)
      .eq("recruiter_id", recruiter.id)
      .maybeSingle();
    if (!job) throw new Error("Job not found or unauthorized");

    // Fetch applications with student data
    const { data: applications } = await adminClient
      .from("applications")
      .select("id, status, student_id, match_analysis")
      .eq("job_id", job_id);

    if (!applications || applications.length === 0) {
      return new Response(JSON.stringify({ candidates: [], message: "No applications yet" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const studentIds = applications.map((a) => a.student_id);

    // Fetch student info and profiles in parallel
    const [studentsRes, profilesRes] = await Promise.all([
      adminClient.from("students").select("*").in("id", studentIds),
      adminClient.from("student_profiles").select("*").in("student_id", studentIds),
    ]);

    const students = studentsRes.data || [];
    const profiles = profilesRes.data || [];
    const profileMap = Object.fromEntries(profiles.map((p) => [p.student_id, p]));

    // Build candidate summaries for AI
    const candidateSummaries = applications.map((app) => {
      const student = students.find((s) => s.id === app.student_id);
      const profile = profileMap[app.student_id];
      return {
        application_id: app.id,
        student_id: app.student_id,
        name: student?.name || "Unknown",
        email: student?.email || "",
        institution: student?.institution || "",
        degree: student?.degree || "",
        branch: student?.branch || "",
        graduation_year: student?.graduation_year || 0,
        github_url: profile?.github_url || null,
        github_data: profile?.github_data || null,
        leetcode_url: profile?.leetcode_url || null,
        leetcode_data: profile?.leetcode_data || null,
        linkedin_url: profile?.linkedin_url || null,
        linkedin_data: profile?.linkedin_data || null,
        gemini_analysis: profile?.gemini_analysis || null,
        resume_skills: profile?.resume_skills || null,
      };
    });

    // Call Lovable AI for ranking
    const prompt = `You are an expert technical recruiter AI. Analyze and rank the following candidates for a job position.

JOB DETAILS:
- Title: ${job.title}
- Description: ${job.description}
- Required Skills: ${(job.required_skills || []).join(", ")}
- Preferred Skills: ${(job.preferred_skills || []).join(", ")}
- Experience Required: ${job.experience_required || "Not specified"}
- Job Type: ${job.job_type}

CANDIDATES:
${JSON.stringify(candidateSummaries, null, 2)}

Rank all candidates from best to worst fit. For each candidate provide:
- A score from 0-100
- Key strengths relevant to this job
- Potential gaps or concerns
- A brief recommendation

IMPORTANT RANKING CRITERIA:
1. Resume Skills (resume_skills field): If available, this contains AI-parsed skills directly from the candidate's resume — including technical_skills, skill_categories (languages, frameworks, databases, devops), certifications, projects, and experience level. Use this as a PRIMARY signal for skill matching against the job's required and preferred skills.
2. GitHub & LeetCode data: Use coding activity, languages, problem-solving stats as supporting evidence.
3. AI Profile Analysis (gemini_analysis): Use the overall score, skill level, and strengths as holistic context.
4. Education: Consider degree, branch, institution, and graduation year for relevance.

Candidates with resume_skills data that closely match the job's required_skills should rank significantly higher. Weight resume-extracted skills at ~40%, GitHub/LeetCode data at ~30%, AI profile analysis at ~20%, and education at ~10%.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert AI recruiter that ranks candidates objectively and provides actionable insights." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "rank_candidates",
              description: "Return ranked candidates with scores and analysis",
              parameters: {
                type: "object",
                properties: {
                  ranked_candidates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        application_id: { type: "string" },
                        student_id: { type: "string" },
                        name: { type: "string" },
                        score: { type: "number", description: "0-100 fit score" },
                        rank: { type: "integer" },
                        strengths: { type: "array", items: { type: "string" } },
                        gaps: { type: "array", items: { type: "string" } },
                        recommendation: { type: "string" },
                      },
                      required: ["application_id", "student_id", "name", "score", "rank", "strengths", "gaps", "recommendation"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string", description: "Overall hiring recommendation summary" },
                },
                required: ["ranked_candidates", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "rank_candidates" } },
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
    let ranking;
    if (toolCall?.function?.arguments) {
      ranking = JSON.parse(toolCall.function.arguments);
    } else {
      throw new Error("AI did not return structured ranking");
    }

    // Enrich with student details
    const enriched = ranking.ranked_candidates.map((rc: any) => {
      const student = students.find((s) => s.id === rc.student_id);
      const profile = profileMap[rc.student_id];
      return {
        ...rc,
        email: student?.email || "",
        institution: student?.institution || "",
        degree: student?.degree || "",
        branch: student?.branch || "",
        graduation_year: student?.graduation_year || 0,
        github_url: profile?.github_url || null,
        leetcode_url: profile?.leetcode_url || null,
        linkedin_url: profile?.linkedin_url || null,
      };
    });

    // Store analysis in applications
    for (const candidate of enriched) {
      await adminClient
        .from("applications")
        .update({ match_analysis: candidate })
        .eq("id", candidate.application_id);
    }

    return new Response(
      JSON.stringify({ candidates: enriched, summary: ranking.summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("rank-candidates error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
