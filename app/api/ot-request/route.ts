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

    const employeeId =
      cookieStore.get("employee_session")?.value;

    if (!employeeId) {
      return NextResponse.json(
        {
          ok: false,
          message: "กรุณาเข้าสู่ระบบ",
        },
        { status: 401 }
      );
    }

    const ot_date = String(body.ot_date || "").trim();

    const start_time = String(body.start_time || "").trim();

    const end_time = String(body.end_time || "").trim();

    const reason = String(body.reason || "").trim();

    if (
      !ot_date ||
      !start_time ||
      !end_time ||
      !reason
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "กรุณากรอกข้อมูลให้ครบ",
        },
        { status: 400 }
      );
    }

    const { data: employee, error: employeeError } =
      await supabaseAdmin
        .from("employees")
        .select("employee_code")
        .eq("id", employeeId)
        .maybeSingle();

    if (employeeError || !employee) {
      return NextResponse.json(
        {
          ok: false,
          message: "ไม่พบข้อมูลพนักงาน",
        },
        { status: 404 }
      );
    }

    const { error: insertError } =
      await supabaseAdmin
        .from("ot_requests")
        .insert([
          {
            employee_code:
              employee.employee_code,
            ot_date,
            start_time,
            end_time,
            reason,
            status: "pending",
          },
        ]);

    if (insertError) {
      return NextResponse.json(
        {
          ok: false,
          message: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "ยื่น OT สำเร็จแล้ว",
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "เกิดข้อผิดพลาด",
      },
      { status: 500 }
    );
  }
}