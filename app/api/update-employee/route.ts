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

    const role = String(currentUser?.role || "")
      .trim()
      .toLowerCase();

    if (role !== "hr") {
      return NextResponse.json(
        { ok: false, message: "เฉพาะ HR เท่านั้น" },
        { status: 403 }
      );
    }

    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "ไม่พบรหัสพนักงาน" },
        { status: 400 }
      );
    }

    const updateData = {
      employee_code: String(body.employee_code || "")
        .trim()
        .toUpperCase(),

      full_name: String(body.full_name || "").trim(),

      department_name: String(
        body.department_name || ""
      ).trim(),

      position: String(body.position || "").trim(),

      role: String(body.role || "")
        .trim()
        .toLowerCase(),

      pincode: String(body.pincode || "").trim(),

      active: Boolean(body.active),
    };

    if (
      !updateData.employee_code ||
      !updateData.full_name ||
      !updateData.role
    ) {
      return NextResponse.json(
        { ok: false, message: "กรุณากรอกข้อมูลให้ครบ" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("employees")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "แก้ไขข้อมูลพนักงานสำเร็จ",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "เกิดข้อผิดพลาด",
      },
      { status: 500 }
    );
  }
}