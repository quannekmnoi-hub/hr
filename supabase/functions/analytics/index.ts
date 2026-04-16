// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all candidates for this user
    const { data: candidates, error } = await supabase
      .from("candidates")
      .select("status, applied_position, created_at")
      .eq("user_id", user.id);

    if (error) throw error;

    const total = candidates?.length ?? 0;

    // --- Status Ratio ---
    const statusMap: Record<string, number> = {};
    candidates?.forEach((c) => {
      statusMap[c.status] = (statusMap[c.status] ?? 0) + 1;
    });
    const statusRatio = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
      ratio: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
    }));

    // --- Top 3 Positions ---
    const posMap: Record<string, number> = {};
    candidates?.forEach((c) => {
      const pos = c.applied_position || "Unknown";
      posMap[pos] = (posMap[pos] ?? 0) + 1;
    });
    const topPositions = Object.entries(posMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([position, count]) => ({ position, count }));

    // --- Recent (last 7 days) ---
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = candidates?.filter(
      (c) => new Date(c.created_at) >= sevenDaysAgo
    ).length ?? 0;

    return new Response(
      JSON.stringify({ total, statusRatio, topPositions, recentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
