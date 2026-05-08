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

    const { data: currentUser } = await supabaseAdmin
      .from("employees")
      .select("role")
      .eq("id", employeeId)
      .eq("active", true)
      .maybeSingle();

    if (String(currentUser?.role || "").trim().toLowerCase() !== "hr") {
      return NextResponse.json(
        { ok: false, message: "เฉพาะ HR เท่านั้น" },
        { status: 403 }
      );
    }

    const employee_code = String(body.employee_code || "").trim().toUpperCase();
    const full_name = String(body.full_name || "").trim();
    const position = String(body.position || "").trim();
    const role = String(body.role || "employee").trim().toLowerCase();
    const pincode = String(body.pincode || "").trim();

    if (!employee_code || !full_name || !role || !pincode) {
      return NextResponse.json(
        { ok: false, message: "กรุณากรอกข้อมูลให้ครบ" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("employees").insert([
      {
        employee_code,
        full_name,
        position,
        role,
        pincode,
        active: true,
      },
    ]);

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "เพิ่มพนักงานสำเร็จ",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}