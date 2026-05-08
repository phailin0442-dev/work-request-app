import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function toCsvValue(value: any) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const employeeId = cookieStore.get("employee_session")?.value;

  if (!employeeId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("role")
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  const role = String(employee?.role || "").trim().toLowerCase();

  if (role !== "hr") {
    return NextResponse.json(
      { ok: false, message: "เฉพาะ HR เท่านั้น" },
      { status: 403 }
    );
  }

  const url = new URL(req.url);

  const type = url.searchParams.get("type") || "all";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";

  function applyDateFilter(query: any) {
    if (from) {
      query = query.gte("created_at", `${from}T00:00:00`);
    }

    if (to) {
      query = query.lte("created_at", `${to}T23:59:59`);
    }

    return query;
  }

  const rows: any[][] = [
    [
      "ประเภท",
      "รหัสพนักงาน",
      "รายละเอียด",
      "เหตุผล",
      "สถานะ",
      "วันที่สร้าง",
    ],
  ];

  if (type === "all" || type === "ot") {
    const query = applyDateFilter(
      supabaseAdmin
        .from("ot_requests")
        .select("*")
        .order("created_at", { ascending: false })
    );

    const { data } = await query;

    rows.push(
      ...(data || []).map((x: any) => [
        "OT",
        x.employee_code,
        `${x.ot_date} ${x.start_time}-${x.end_time}`,
        x.reason,
        x.status,
        x.created_at,
      ])
    );
  }

  if (type === "all" || type === "shift") {
    const query = applyDateFilter(
      supabaseAdmin
        .from("shift_change_requests")
        .select("*")
        .order("created_at", { ascending: false })
    );

    const { data } = await query;

    rows.push(
      ...(data || []).map((x: any) => [
        "เปลี่ยนกะ",
        x.employee_code,
        `${x.shift_date} ${x.old_shift_code} ${x.old_shift_time} -> ${x.new_shift_code} ${x.new_shift_time}`,
        x.reason,
        x.status,
        x.created_at,
      ])
    );
  }

  if (type === "all" || type === "dayoff") {
    const query = applyDateFilter(
      supabaseAdmin
        .from("day_off_change_requests")
        .select("*")
        .order("created_at", { ascending: false })
    );

    const { data } = await query;

    rows.push(
      ...(data || []).map((x: any) => [
        "เปลี่ยนวันหยุด",
        x.employee_code,
        `${x.old_day_off} -> ${x.new_day_off}`,
        x.reason,
        x.status,
        x.created_at,
      ])
    );
  }

  if (type === "all" || type === "leave") {
    const query = applyDateFilter(
      supabaseAdmin
        .from("leave_form_requests")
        .select("*")
        .order("created_at", { ascending: false })
    );

    const { data } = await query;

    rows.push(
      ...(data || []).map((x: any) => [
        "ลา",
        x.employee_code,
        `${x.leave_day} ${x.leave_type}`,
        x.leave_reason,
        x.status,
        x.created_at,
      ])
    );
  }

  const csv =
    "\uFEFF" +
    rows
      .map((row) => row.map(toCsvValue).join(","))
      .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="requests-export-${type}.csv"`,
    },
  });
}