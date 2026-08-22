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

    const old_day_off = String(body.old_day_off || "").trim();
    const new_day_off = String(body.new_day_off || "").trim();
    const reason = String(body.reason || "").trim();

    if (!old_day_off || !new_day_off || !reason) {
      return NextResponse.json(
        { ok: false, message: "กรุณากรอกข้อมูลให้ครบ" },
        { status: 400 }
      );
    }

    const { data: employee, error: employeeError } = await supabaseAdmin
      .from("employees")
      .select("employee_code, full_name")
      .eq("id", employeeId)
      .eq("active", true)
      .maybeSingle();

    if (employeeError || !employee) {
      return NextResponse.json(
        { ok: false, message: "ไม่พบข้อมูลพนักงาน" },
        { status: 404 }
      );
    }

    const { data: insertedRequest, error: insertError } = await supabaseAdmin
      .from("day_off_change_requests")
      .insert([
        {
          employee_code: employee.employee_code,
          old_day_off,
          new_day_off,
          reason,
          status: "pending",
        },
      ])
      .select("request_id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { ok: false, message: insertError.message },
        { status: 500 }
      );
    }

    try {
      await supabaseAdmin.from("activity_log").insert([
        {
          request_type: "dayoff",
          request_id: insertedRequest.request_id,
          employee_code: employee.employee_code,
          actor_name: employee.full_name || employee.employee_code,
          actor_role: "employee",
          action_label: "ยื่นคำขอเปลี่ยนวันหยุด",
        },
      ]);
    } catch (logError) {
      console.error("Insert activity log error:", logError);
    }

    return NextResponse.json({
      ok: true,
      message: "ส่งคำขอเปลี่ยนวันหยุดสำเร็จแล้ว",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "เกิดข้อผิดพลาดในการบันทึกคำขอ",
      },
      { status: 500 }
    );
  }
}