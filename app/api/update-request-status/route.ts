import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const allowedTables = [
  "ot_requests",
  "shift_change_requests",
  "day_off_change_requests",
  "leave_form_requests",
] as const;

type AllowedTable = (typeof allowedTables)[number];
type Action = "approve" | "reject";
type Role = "section_manager" | "general_manager" | "hr";

type RequestRow = {
  request_id: string;
  employee_code: string | null;
  status: string | null;
};

type ManagerDepartmentRow = {
  department_id: string | null;
};

type ManagedEmployeeRow = {
  employee_code: string | null;
};

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeStatus(status: unknown): string {
  const value = cleanString(status);
  return value === "pending" ? "pending_sm" : value;
}

function getNextStatus({
  role,
  table,
  action,
  currentStatus,
}: {
  role: Role;
  table: AllowedTable;
  action: Action;
  currentStatus: string;
}): string | null {
  if (role === "section_manager") {
    if (currentStatus !== "pending_sm") return null;
    return action === "approve" ? "approved_sm" : "rejected";
  }

  if (role === "general_manager") {
    if (table !== "ot_requests" || currentStatus !== "approved_sm") {
      return null;
    }

    return action === "approve" ? "approved_gm" : "rejected";
  }

  if (role === "hr") {
    const requiredStatus =
      table === "ot_requests" ? "approved_gm" : "approved_sm";

    if (currentStatus !== requiredStatus) return null;

    return action === "approve" ? "approved_hr" : "rejected";
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body: Record<string, unknown> = await req.json();

    const table = cleanString(body.table) as AllowedTable;
    const action = cleanString(body.action) as Action;

    const rawRequestIds: unknown[] = Array.isArray(body.request_ids)
      ? body.request_ids
      : [body.request_id];

    const requestIds: string[] = Array.from(
      new Set<string>(
        rawRequestIds
          .map((id: unknown): string => cleanString(id))
          .filter((id: string): boolean => id.length > 0)
      )
    );

    if (!allowedTables.includes(table)) {
      return NextResponse.json(
        { ok: false, message: "ตารางคำขอไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { ok: false, message: "การดำเนินการไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (requestIds.length === 0) {
      return NextResponse.json(
        { ok: false, message: "ไม่พบรายการที่เลือก" },
        { status: 400 }
      );
    }

    if (requestIds.length > 100) {
      return NextResponse.json(
        { ok: false, message: "เลือกได้ไม่เกิน 100 รายการต่อครั้ง" },
        { status: 400 }
      );
    }

    if (requestIds.some((id: string): boolean => !isUuid(id))) {
      return NextResponse.json(
        { ok: false, message: "request_id ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const employeeId = cookieStore.get("employee_session")?.value;

    if (!employeeId || !isUuid(employeeId)) {
      return NextResponse.json(
        { ok: false, message: "กรุณาเข้าสู่ระบบใหม่" },
        { status: 401 }
      );
    }

    const { data: approver, error: approverError } = await supabaseAdmin
      .from("employees")
      .select("id, role")
      .eq("id", employeeId)
      .eq("active", true)
      .maybeSingle();

    if (approverError) {
      console.error("Load approver error:", approverError);

      return NextResponse.json(
        { ok: false, message: "ไม่สามารถตรวจสอบสิทธิ์ผู้อนุมัติได้" },
        { status: 500 }
      );
    }

    if (!approver) {
      return NextResponse.json(
        { ok: false, message: "ไม่พบข้อมูลผู้อนุมัติ" },
        { status: 401 }
      );
    }

    const role = cleanString(approver.role).toLowerCase() as Role;

    if (
      role !== "section_manager" &&
      role !== "general_manager" &&
      role !== "hr"
    ) {
      return NextResponse.json(
        { ok: false, message: "คุณไม่มีสิทธิ์จัดการคำขอ" },
        { status: 403 }
      );
    }

    const { data: requests, error: readError } = await supabaseAdmin
      .from(table)
      .select("request_id, employee_code, status")
      .in("request_id", requestIds);

    if (readError) {
      console.error("Load requests error:", readError);

      return NextResponse.json(
        { ok: false, message: readError.message },
        { status: 500 }
      );
    }

    const requestRows: RequestRow[] = (requests || []) as RequestRow[];

    if (requestRows.length === 0) {
      return NextResponse.json(
        { ok: false, message: "ไม่พบรายการคำขอ" },
        { status: 404 }
      );
    }

    let allowedEmployeeCodes: Set<string> | null = null;

    if (role === "section_manager") {
      const { data: managerDepartments, error: managerDepartmentsError } =
        await supabaseAdmin
          .from("department_managers")
          .select("department_id")
          .eq("manager_id", employeeId);

      if (managerDepartmentsError) {
        console.error(
          "Load manager departments error:",
          managerDepartmentsError
        );

        return NextResponse.json(
          { ok: false, message: "ไม่สามารถตรวจสอบแผนกที่รับผิดชอบได้" },
          { status: 500 }
        );
      }

      const departmentIds: string[] = (
        (managerDepartments || []) as ManagerDepartmentRow[]
      )
        .map((item: ManagerDepartmentRow): string =>
          cleanString(item.department_id)
        )
        .filter((id: string): boolean => id.length > 0);

      if (departmentIds.length === 0) {
        return NextResponse.json(
          { ok: false, message: "ยังไม่ได้กำหนดแผนกให้หัวหน้าคนนี้" },
          { status: 403 }
        );
      }

      const { data: managedEmployees, error: managedEmployeesError } =
        await supabaseAdmin
          .from("employees")
          .select("employee_code")
          .in("department_id", departmentIds)
          .eq("active", true);

      if (managedEmployeesError) {
        console.error(
          "Load managed employees error:",
          managedEmployeesError
        );

        return NextResponse.json(
          { ok: false, message: "ไม่สามารถตรวจสอบพนักงานในแผนกได้" },
          { status: 500 }
        );
      }

      allowedEmployeeCodes = new Set<string>(
        ((managedEmployees || []) as ManagedEmployeeRow[])
          .map((item: ManagedEmployeeRow): string =>
            cleanString(item.employee_code).toUpperCase()
          )
          .filter((code: string): boolean => code.length > 0)
      );
    }

    let updated = 0;
    let skipped = 0;
    const failed: string[] = [];

    for (const item of requestRows) {
      const requestId = cleanString(item.request_id);
      const employeeCode = cleanString(item.employee_code).toUpperCase();
      const currentStatus = normalizeStatus(item.status);

      if (
        role === "section_manager" &&
        (!employeeCode || !allowedEmployeeCodes?.has(employeeCode))
      ) {
        skipped++;
        continue;
      }

      const nextStatus = getNextStatus({
        role,
        table,
        action,
        currentStatus,
      });

      if (!nextStatus) {
        skipped++;
        continue;
      }

      const acceptedCurrentStatuses: string[] =
        currentStatus === "pending_sm"
          ? ["pending", "pending_sm"]
          : [currentStatus];

      const { data: updatedRow, error: updateError } = await supabaseAdmin
        .from(table)
        .update({
          status: nextStatus,
        })
        .eq("request_id", requestId)
        .in("status", acceptedCurrentStatuses)
        .select("request_id")
        .maybeSingle();

      if (updateError) {
        console.error(`Update request ${requestId} error:`, updateError);
        failed.push(requestId);
        continue;
      }

      if (updatedRow) {
        updated++;
      } else {
        skipped++;
      }
    }

    if (updated === 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "ไม่มีรายการที่อัปเดตได้ กรุณาตรวจสอบสิทธิ์และสถานะคำขอ",
          updated,
          skipped,
          failed: failed.length,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `อัปเดตสำเร็จ ${updated} รายการ`,
      updated,
      skipped,
      failed: failed.length,
    });
  } catch (error: unknown) {
    console.error("Update request status API error:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
      },
      { status: 500 }
    );
  }
}