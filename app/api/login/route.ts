import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const employee_code = String(body.employee_code || "")
      .trim()
      .toUpperCase();

    const pincode = String(body.pincode || "").trim();

    if (!employee_code || !pincode) {
      return NextResponse.json(
        {
          ok: false,
          message: "กรุณากรอกรหัสพนักงานและ PIN",
        },
        { status: 400 }
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
      .eq("employee_code", employee_code)
      .eq("pincode", pincode)
      .eq("active", true)
      .maybeSingle();

    if (error || !employee) {
      return NextResponse.json(
        {
          ok: false,
          message: "รหัสพนักงานหรือ PIN ไม่ถูกต้อง",
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      employee,
    });

    response.cookies.set("employee_session", String(employee.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
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