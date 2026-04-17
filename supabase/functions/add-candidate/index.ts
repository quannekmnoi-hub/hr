// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      full_name,
      applied_position,
      resume_url,
      skills = [],
      notes = "",
      email = null,
      phone = null,
      gender = null,
      date_of_birth = null,
      location = null,
      linkedin_url = null,
      portfolio_url = null,
      ai_analysis = null,
      status = "New",
    } = body;

    // Validation
    const errors: string[] = [];
    if (!full_name?.trim()) errors.push("full_name is required");
    if (!applied_position?.trim()) errors.push("applied_position is required");
    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: errors.join(", ") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =============================================
    // Algorithm 5: Matching Score Calculation
    // score = (matching_skills / total_required) * 100
    // =============================================
    let matching_score = 0;
    if (skills.length > 0) {
      const { data: jobReq } = await supabase
        .from("job_requirements")
        .select("required_skills")
        .ilike("position_name", `%${applied_position.trim()}%`)
        .maybeSingle();

      if (jobReq?.required_skills) {
        const required = jobReq.required_skills as string[];
        const candidateSkillsLower = (skills as string[]).map((s: string) => s.toLowerCase());
        const matchCount = required.filter((r: string) =>
          candidateSkillsLower.includes(r.toLowerCase())
        ).length;
        matching_score = required.length > 0
          ? Math.round((matchCount / required.length) * 100)
          : 0;
      }
    }

    // Insert candidate record
    const { data, error } = await supabase
      .from("candidates")
      .insert({
        user_id: user.id,
        full_name: full_name.trim(),
        applied_position: applied_position.trim(),
        resume_url: resume_url || null,
        skills: Array.isArray(skills) ? skills : [],
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        gender: gender || null,
        date_of_birth: date_of_birth || null,
        location: location?.trim() || null,
        linkedin_url: linkedin_url?.trim() || null,
        portfolio_url: portfolio_url?.trim() || null,
        notes: notes?.trim() || null,
        ai_analysis,
        matching_score,
        status,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ data, matching_score }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
