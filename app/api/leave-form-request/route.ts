import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const cookieStore = await cookies();
    const employeeId = cookieStore.get("employee_session")?.value;

    if (!employeeId) {
      return NextResponse.json(
        { ok: false, message: "กรุณาเข้าสู่ระบบใหม่" },
        { status: 401 }
      );
    }

    const leave_type = String(body.leave_type || "").trim();
    const leave_day = String(body.leave_day || "").trim();
    const leave_to_day = String(body.leave_to_day || "").trim();
    const leave_total_days = String(body.leave_total_days || "").trim();
    const leave_reason = String(body.leave_reason || "").trim();

    if (!leave_type || !leave_day || !leave_to_day || !leave_total_days || !leave_reason) {
      return NextResponse.json(
        { ok: false, message: "กรุณากรอกข้อมูลให้ครบ" },
        { status: 400 }
      );
    }

    const { data: employee, error: employeeError } = await supabaseAdmin
      .from("employees")
      .select("employee_code")
      .eq("id", employeeId)
      .eq("active", true)
      .maybeSingle();

    if (employeeError || !employee) {
      return NextResponse.json(
        { ok: false, message: "ไม่พบข้อมูลพนักงาน" },
        { status: 404 }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("leave_form_requests")
      .insert([
        {
          employee_code: employee.employee_code,
          leave_type,
          leave_day,
          leave_to_day,
          leave_total_days,
          leave_reason,
          status: "pending_sm",
        },
      ]);

    if (insertError) {
      return NextResponse.json(
        { ok: false, message: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "ส่งคำขอลาสำเร็จแล้ว",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}