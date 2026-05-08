import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const cookieStore = await cookies();

  const employeeId =
    cookieStore.get("employee_session")?.value;

  if (!employeeId) {
    return NextResponse.json(
      { ok: false },
      { status: 401 }
    );
  }

  const { data: employee, error } = await supabaseAdmin
    .from("employees")
    .select(`
      id,
      employee_code,
      full_name,
      position,
      role,
      active
    `)
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  if (error || !employee) {
    return NextResponse.json(
      { ok: false },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    employee,
  });
}