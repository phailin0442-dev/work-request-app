import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const allowedTables = [
  "ot_requests",
  "shift_change_requests",
  "day_off_change_requests",
  "leave_form_requests",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const table = String(body.table || "");
    const type = String(body.type || "");
    const request_id = String(body.request_id || "");
    const data = body.data || {};

    if (!allowedTables.includes(table)) {
      return NextResponse.json(
        { ok: false, message: "table ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (!request_id) {
      return NextResponse.json(
        { ok: false, message: "ไม่พบ request_id" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const employeeId = cookieStore.get("employee_session")?.value;

    if (!employeeId) {
      return NextResponse.json(
        { ok: false, message: "กรุณาเข้าสู่ระบบใหม่" },
        { status: 401 }
      );
    }

    const { data: approver } = await supabaseAdmin
      .from("employees")
      .select("role")
      .eq("id", employeeId)
      .eq("active", true)
      .maybeSingle();

    const role = String(approver?.role || "").trim().toLowerCase();

    if (role !== "hr") {
      return NextResponse.json(
        { ok: false, message: "เฉพาะ HR เท่านั้นที่แก้ไขได้" },
        { status: 403 }
      );
    }

    let updateData: any = {};

    if (type === "ot") {
      updateData = {
        ot_date: String(data.ot_date || "").trim(),
        start_time: String(data.start_time || "").trim(),
        end_time: String(data.end_time || "").trim(),
        reason: String(data.reason || "").trim(),
        status: String(data.status || "").trim(),
      };
    }

    if (type === "shift") {
      updateData = {
        shift_date: String(data.shift_date || "").trim(),
        old_shift_code: String(data.old_shift_code || "").trim(),
        old_shift_time: String(data.old_shift_time || "").trim(),
        new_shift_code: String(data.new_shift_code || "").trim(),
        new_shift_time: String(data.new_shift_time || "").trim(),
        reason: String(data.reason || "").trim(),
        status: String(data.status || "").trim(),
      };
    }

    if (type === "dayoff") {
      updateData = {
        old_day_off: String(data.old_day_off || "").trim(),
        new_day_off: String(data.new_day_off || "").trim(),
        reason: String(data.reason || "").trim(),
        status: String(data.status || "").trim(),
      };
    }

    if (type === "leave") {
      updateData = {
        leave_type: String(data.leave_type || "").trim(),
        leave_day: String(data.leave_day || "").trim(),
        leave_reason: String(data.leave_reason || "").trim(),
        status: String(data.status || "").trim(),
      };
    }

    const { error } = await supabaseAdmin
      .from(table)
      .update(updateData)
      .eq("request_id", request_id);

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "แก้ไขข้อมูลสำเร็จ",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}