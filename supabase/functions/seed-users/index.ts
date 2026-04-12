import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const demoPassword = "Demo@1234";

    // Demo accounts to create
    const accounts = [
      // Students
      { email: "aarav.sharma@iitd.ac.in", password: demoPassword, role: "student", table: "students", nameField: "name", nameMatch: "Aarav Sharma" },
      { email: "priya.patel@bits.ac.in", password: demoPassword, role: "student", table: "students", nameField: "name", nameMatch: "Priya Patel" },
      { email: "rohit.kumar@iiith.ac.in", password: demoPassword, role: "student", table: "students", nameField: "name", nameMatch: "Rohit Kumar" },
      // Recruiters
      { email: "recruiter@tcs.com", password: demoPassword, role: "recruiter", table: "recruiters", nameField: "recruiter_name", nameMatch: "Rajesh Iyer" },
      { email: "recruiter@zomato.com", password: demoPassword, role: "recruiter", table: "recruiters", nameField: "recruiter_name", nameMatch: "Ananya Desai" },
      { email: "recruiter@sudheeai.com", password: demoPassword, role: "recruiter", table: "recruiters", nameField: "recruiter_name", nameMatch: "Sudhee Mohan" },
      // Admin
      { email: "admin@hirehub.com", password: demoPassword, role: "admin", table: null, nameField: null, nameMatch: null },
    ];

    const results = [];

    for (const acct of accounts) {
      // Create auth user
      const { data: userData, error: createError } = await admin.auth.admin.createUser({
        email: acct.email,
        password: acct.password,
        email_confirm: true,
      });

      if (createError) {
        // User might already exist
        results.push({ email: acct.email, status: "skipped", error: createError.message });
        continue;
      }

      const userId = userData.user.id;

      // Assign role
      await admin.from("user_roles").insert({ user_id: userId, role: acct.role });

      // Link to existing record
      if (acct.table && acct.nameMatch) {
        await admin.from(acct.table).update({ user_id: userId, email: acct.email })
          .eq(acct.nameField!, acct.nameMatch);
        
        // If student, also update related records
        if (acct.table === "students") {
          const { data: student } = await admin.from("students").select("id").eq("user_id", userId).maybeSingle();
          if (student) {
            // Update applications, interviews, notifications
            await admin.from("student_profiles").update({ student_id: student.id }).eq("student_id", student.id);
          }
        }
      }

      results.push({ email: acct.email, status: "created", userId });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seed-users error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
