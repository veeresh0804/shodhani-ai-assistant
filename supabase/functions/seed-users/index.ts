import { createClient } from "jsr:@supabase/supabase-js@2";

import { corsHeaders, errorResponse, internalError, newRequestId } from "../_shared/errors.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = newRequestId();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const demoPassword = "Demo@1234";

    const accounts = [
      // 3 Students
      { email: "aarav.kumar86@iit.ac.in", role: "student", table: "students", nameField: "name", nameMatch: "Aarav Kumar" },
      { email: "aditi.chatterjee85@iit.ac.in", role: "student", table: "students", nameField: "name", nameMatch: "Aditi Chatterjee" },
      { email: "aditya.patel24@iit.ac.in", role: "student", table: "students", nameField: "name", nameMatch: "Aditya Patel" },
      // 3 Recruiters
      { email: "priya.sharma@tcs.com", role: "recruiter", table: "recruiters", nameField: "recruiter_name", nameMatch: "Priya Sharma" },
      { email: "sneha.kapoor@zomato.com", role: "recruiter", table: "recruiters", nameField: "recruiter_name", nameMatch: "Sneha Kapoor" },
      { email: "rahul.verma@sudheeai.com", role: "recruiter", table: "recruiters", nameField: "recruiter_name", nameMatch: "Rahul Verma" },
      // 1 Admin
      { email: "admin@hirehub.com", role: "admin", table: null, nameField: null, nameMatch: null },
    ];

    const results = [];

    for (const acct of accounts) {
      const { data: userData, error: createError } = await admin.auth.admin.createUser({
        email: acct.email,
        password: demoPassword,
        email_confirm: true,
      });

      if (createError) {
        results.push({ email: acct.email, status: "skipped", error: createError.message });
        continue;
      }

      const userId = userData.user.id;

      // Assign role
      await admin.from("user_roles").insert({ user_id: userId, role: acct.role });

      // Link to existing profile record
      if (acct.table && acct.nameMatch && acct.nameField) {
        const { error: updateError } = await admin.from(acct.table)
          .update({ user_id: userId })
          .eq(acct.nameField, acct.nameMatch);
        
        if (updateError) {
          results.push({ email: acct.email, status: "created_no_link", userId, error: updateError.message });
          continue;
        }
      }

      results.push({ email: acct.email, status: "created", userId });
    }

    return new Response(JSON.stringify({ results, password: demoPassword }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return internalError("seed-users", e, "Failed to seed users", requestId);
  }
});
