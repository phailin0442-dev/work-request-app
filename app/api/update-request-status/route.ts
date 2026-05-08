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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const table = String(body.table || "").trim();
    const action = String(body.action || "").trim();

    const requestIds: string[] = (
      Array.isArray(body.request_ids)
        ? body.request_ids
        : [body.request_id]
    )
      .map((id: any) => String(id || "").trim())
      .filter((id: string) => id.length > 0);

    if (!allowedTables.includes(table)) {
      return NextResponse.json(
        { ok: false, message: "table ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { ok: false, message: "action ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (requestIds.length === 0) {
      return NextResponse.json(
        { ok: false, message: "ไม่พบรายการที่เลือก" },
        { status: 400 }
      );
    }

    const invalidId = requestIds.find((id) => !isUuid(id));

    if (invalidId) {
      return NextResponse.json(
        { ok: false, message: "request_id ไม่ถูกต้อง" },
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

    if (!approver) {
      return NextResponse.json(
        { ok: false, message: "ไม่พบข้อมูลผู้อนุมัติ" },
        { status: 404 }
      );
    }

    const role = String(approver.role || "").trim().toLowerCase();

    const { data: requests, error: readError } = await supabaseAdmin
      .from(table)
      .select("request_id, status")
      .in("request_id", requestIds);

    if (readError) {
      return NextResponse.json(
        { ok: false, message: readError.message },
        { status: 500 }
      );
    }

    let updated = 0;

    for (const item of requests || []) {
      const currentStatus =
        item.status === "pending" ? "pending_sm" : item.status;

      let nextStatus = "";

      if (action === "reject") {
        nextStatus = "rejected";
      }

      if (action === "approve") {
        if (role === "section_manager" && currentStatus === "pending_sm") {
          nextStatus = "approved_sm";
        }

        if (
          role === "general_manager" &&
          table === "ot_requests" &&
          currentStatus === "approved_sm"
        ) {
          nextStatus = "approved_gm";
        }

        if (
          role === "hr" &&
          table !== "ot_requests" &&
          currentStatus === "approved_sm"
        ) {
          nextStatus = "approved_hr";
        }
      }

      if (!nextStatus) continue;

      const { error: updateError } = await supabaseAdmin
        .from(table)
        .update({ status: nextStatus })
        .eq("request_id", item.request_id);

      if (!updateError) updated++;
    }

    return NextResponse.json({
      ok: true,
      message: `อัปเดตสำเร็จ ${updated} รายการ`,
      updated,
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