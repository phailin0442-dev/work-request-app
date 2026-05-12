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

  const { data: currentUser } = await supabaseAdmin
    .from("employees")
    .select("role")
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  const role = String(currentUser?.role || "").trim().toLowerCase();

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

  const { data: employees } = await supabaseAdmin
    .from("employees")
    .select(`
      employee_code,
      full_name,
      position,
      department_id,
      division_id
    `);

  const { data: departments } = await supabaseAdmin
    .from("departments")
    .select("id, name");

  const { data: divisions } = await supabaseAdmin
    .from("divisions")
    .select("id, name");

  const departmentMap = new Map(
    (departments || []).map((x: any) => [x.id, x.name])
  );

  const divisionMap = new Map(
    (divisions || []).map((x: any) => [x.id, x.name])
  );

  const employeeMap = new Map(
    (employees || []).map((emp: any) => [
      emp.employee_code,
      {
        full_name: emp.full_name || "",
        position: emp.position || "",
        department: departmentMap.get(emp.department_id) || "",
        division: divisionMap.get(emp.division_id) || "",
      },
    ])
  );

  function getEmployeeInfo(employeeCode: string) {
    return (
      employeeMap.get(employeeCode) || {
        full_name: "",
        position: "",
        department: "",
        division: "",
      }
    );
  }

  function applyCreatedAtFilter(query: any) {
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
      "ชื่อ-นามสกุล",
      "ตำแหน่ง",
      "แผนก",
      "ฝ่าย",
      "รายละเอียด",
      "เหตุผล",
      "สถานะ",
      "วันที่สร้าง",
    ],
  ];

  if (type === "all" || type === "ot") {
    const query = applyCreatedAtFilter(
      supabaseAdmin
        .from("ot_requests")
        .select("*")
        .order("created_at", { ascending: false })
    );

    const { data } = await query;

    rows.push(
      ...(data || []).map((x: any) => {
        const emp = getEmployeeInfo(x.employee_code);

        return [
          "OT",
          x.employee_code,
          emp.full_name,
          emp.position,
          emp.department,
          emp.division,
          `${x.ot_date || ""} ${x.start_time || ""}-${x.end_time || ""}`,
          x.reason,
          x.status,
          x.created_at,
        ];
      })
    );
  }

  if (type === "all" || type === "shift") {
    const query = applyCreatedAtFilter(
      supabaseAdmin
        .from("shift_change_requests")
        .select("*")
        .order("created_at", { ascending: false })
    );

    const { data } = await query;

    rows.push(
      ...(data || []).map((x: any) => {
        const emp = getEmployeeInfo(x.employee_code);

        return [
          "เปลี่ยนกะ",
          x.employee_code,
          emp.full_name,
          emp.position,
          emp.department,
          emp.division,
          `${x.shift_date || ""} ${x.old_shift_code || ""} ${
            x.old_shift_time || ""
          } -> ${x.new_shift_code || ""} ${x.new_shift_time || ""}`,
          x.reason,
          x.status,
          x.created_at,
        ];
      })
    );
  }

  if (type === "all" || type === "dayoff") {
    const query = applyCreatedAtFilter(
      supabaseAdmin
        .from("day_off_change_requests")
        .select("*")
        .order("created_at", { ascending: false })
    );

    const { data } = await query;

    rows.push(
      ...(data || []).map((x: any) => {
        const emp = getEmployeeInfo(x.employee_code);

        return [
          "เปลี่ยนวันหยุด",
          x.employee_code,
          emp.full_name,
          emp.position,
          emp.department,
          emp.division,
          `${x.old_day_off || ""} -> ${x.new_day_off || ""}`,
          x.reason,
          x.status,
          x.created_at,
        ];
      })
    );
  }

  if (type === "all" || type === "leave") {
    const query = applyCreatedAtFilter(
      supabaseAdmin
        .from("leave_form_requests")
        .select("*")
        .order("created_at", { ascending: false })
    );

    const { data } = await query;

    rows.push(
      ...(data || []).map((x: any) => {
        const emp = getEmployeeInfo(x.employee_code);

        return [
          "ลา",
          x.employee_code,
          emp.full_name,
          emp.position,
          emp.department,
          emp.division,
          `${x.leave_day || ""} ถึง ${x.leave_to_day || ""} จำนวน ${
            x.leave_total_days || ""
          } วัน / ${x.leave_type || ""}`,
          x.leave_reason,
          x.status,
          x.created_at,
        ];
      })
    );
  }

  const csv =
    "\uFEFF" +
    rows.map((row) => row.map(toCsvValue).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="requests-export-${type}.csv"`,
    },
  });
}