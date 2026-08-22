import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import RequestTable from "./request-table";
import ActivityLogTable, {
  type TimelineRow,
} from "../activity-log-table";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

type SearchParams = {
  tab?: string;
};

type EmployeeRecord = {
  id: string;
  employee_code: string;
  role: string | null;
};

type DepartmentManagerRecord = {
  department_id: string;
};

type EmployeeCodeRecord = {
  employee_code: string | null;
};

type EmployeeInfoRecord = {
  employee_code: string | null;
  full_name: string | null;
  department_id: string | null;
  department_name: string | null;
};

type DepartmentRecord = {
  id: string;
  name: string;
};

/*
 * ตาราง shift/dayoff บันทึกสถานะเริ่มต้นเป็น "pending"
 * ส่วน ot/leave บันทึกเป็น "pending_sm"
 * ให้ normalize ให้เป็นค่าเดียวกันก่อนเช็ก
 */
function normalizeStatusValue(value: unknown): string {
  const status = String(value ?? "")
    .trim()
    .toLowerCase();

  return status === "pending" ? "pending_sm" : status;
}

/*
 * นับเฉพาะรายการที่ "ยังไม่จบกระบวนการ"
 * คือยังไม่ถูก HR อนุมัติ (approved_hr) และไม่ถูกไม่อนุมัติ (rejected)
 * เพื่อใช้แสดงยอดในแท็บ ให้ HR เห็นว่าเหลืองานที่ต้องทำอีกกี่รายการ
 */
function countPending(items: any[]) {
  return items.filter((item) => {
    const status = normalizeStatusValue(item.status);
    return status !== "approved_hr" && status !== "rejected";
  }).length;
}

function getEventDate(requestType: string, item: any): string {
  if (requestType === "ot") return String(item.ot_date || "");
  if (requestType === "shift") return String(item.shift_date || "");
  if (requestType === "dayoff") return String(item.old_day_off || "");
  if (requestType === "leave") return String(item.leave_day || "");
  return "";
}

function getSummary(requestType: string, item: any): string {
  if (requestType === "ot") {
    return `${item.ot_type || "-"} ${item.start_time || "-"}-${
      item.end_time || "-"
    }`;
  }

  if (requestType === "shift") {
    return `${item.old_shift_code || "-"} → ${
      item.new_shift_code || "-"
    }`;
  }

  if (requestType === "dayoff") {
    return `${item.old_day_off || "-"} → ${item.new_day_off || "-"}`;
  }

  if (requestType === "leave") {
    const days = item.leave_total_days
      ? ` (${item.leave_total_days} วัน)`
      : "";
    return `${item.leave_type || "-"}${days}`;
  }

  return "-";
}

type StageEntry = { label: string; at: string };

function buildTimelineRows(
  requestType: "ot" | "shift" | "dayoff" | "leave",
  items: any[],
  smMap: Map<string, StageEntry>,
  gmMap: Map<string, StageEntry>,
  hrMap: Map<string, StageEntry>
): TimelineRow[] {
  return items.map((item) => {
    const requestId = String(item.request_id || "");
    const sm = smMap.get(requestId) || null;
    const gm = gmMap.get(requestId) || null;
    const hr = hrMap.get(requestId) || null;

    return {
      request_type: requestType,
      request_id: requestId,
      employee_code: String(item.employee_code || "").toUpperCase(),
      employee_name: item.employee_name || "-",
      department_id: item.department_id || "",
      department_name: item.department_name || "-",
      summary: getSummary(requestType, item),
      event_date: getEventDate(requestType, item),
      submitted_at: item.created_at || null,
      sm_label: sm?.label || null,
      sm_at: sm?.at || null,
      gm_label: gm?.label || null,
      gm_at: gm?.at || null,
      hr_label: hr?.label || null,
      hr_at: hr?.at || null,
      status: item.status,
    };
  });
}

export default async function ManageRequestsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const activeTab = params?.tab || "ot";

  const cookieStore = await cookies();
  const employeeId =
    cookieStore.get("employee_session")?.value;

  if (!employeeId) {
    redirect("/login");
  }

  const { data: employee, error: employeeError } =
    await supabaseAdmin
      .from("employees")
      .select("id, employee_code, role")
      .eq("id", employeeId)
      .eq("active", true)
      .maybeSingle<EmployeeRecord>();

  if (employeeError) {
    console.error(
      "โหลดข้อมูลพนักงานไม่สำเร็จ:",
      employeeError
    );
    redirect("/login");
  }

  if (!employee) {
    redirect("/login");
  }

  const role = String(employee.role || "")
    .trim()
    .toLowerCase();

  const isSM = role === "section_manager";
  const isGM = role === "general_manager";
  const isHR = role === "hr";

  if (!isSM && !isGM && !isHR) {
    redirect("/dashboard");
  }

  const otStatus = isSM
    ? ["pending_sm", "pending"]
    : isGM
      ? ["approved_sm"]
      : isHR
        ? [
          "pending_sm",
          "pending",
          "approved_sm",
          "approved_gm",
          "approved_hr",
          "rejected",
        ]
        : [];

  const otherStatus = isSM
    ? ["pending_sm", "pending"]
    : isHR
      ? [
        "pending_sm",
        "pending",
        "approved_sm",
        "approved_gm",
        "approved_hr",
        "rejected",
      ]
      : [];

  let managedDepartmentIds: string[] = [];
  let managedEmployeeCodes: string[] = [];

  if (isSM) {
    const {
      data: managerDepartments,
      error: managerDepartmentsError,
    } = await supabaseAdmin
      .from("department_managers")
      .select("department_id")
      .eq("manager_id", employee.id);

    if (managerDepartmentsError) {
      console.error(
        "โหลดแผนกที่หัวหน้ารับผิดชอบไม่สำเร็จ:",
        managerDepartmentsError
      );
    } else {
      managedDepartmentIds = (
        (managerDepartments || []) as DepartmentManagerRecord[]
      )
        .map((item) =>
          String(item.department_id || "").trim()
        )
        .filter(Boolean);
    }

    if (managedDepartmentIds.length > 0) {
      const {
        data: managedEmployees,
        error: managedEmployeesError,
      } = await supabaseAdmin
        .from("employees")
        .select("employee_code")
        .in("department_id", managedDepartmentIds)
        .eq("active", true);

      if (managedEmployeesError) {
        console.error(
          "โหลดรายชื่อพนักงานในแผนกไม่สำเร็จ:",
          managedEmployeesError
        );
      } else {
        managedEmployeeCodes = (
          (managedEmployees || []) as EmployeeCodeRecord[]
        )
          .map((item) =>
            String(item.employee_code || "")
              .trim()
              .toUpperCase()
          )
          .filter(Boolean);
      }
    }
  }

  const {
    data: employeeInfos,
    error: employeeInfosError,
  } = await supabaseAdmin
    .from("employees")
    .select(
      "employee_code, full_name, department_id, department_name"
    );

  if (employeeInfosError) {
    console.error(
      "โหลดข้อมูลพนักงานไม่สำเร็จ:",
      employeeInfosError
    );
  }

  const employeeInfoMap = new Map<
    string,
    {
      full_name: string;
      department_id: string;
      department_name: string;
    }
  >(
    ((employeeInfos || []) as EmployeeInfoRecord[]).map(
      (item) => [
        String(item.employee_code || "")
          .trim()
          .toUpperCase(),
        {
          full_name:
            String(item.full_name || "").trim() || "-",
          department_id: String(
            item.department_id || ""
          ).trim(),
          department_name:
            String(item.department_name || "").trim() ||
            "-",
        },
      ]
    )
  );

  async function getRequests(
    tableName: string,
    statuses: string[]
  ) {
    if (statuses.length === 0) {
      return [];
    }

    if (isSM && managedDepartmentIds.length === 0) {
      return [];
    }

    if (isSM && managedEmployeeCodes.length === 0) {
      return [];
    }

    let query = supabaseAdmin
      .from(tableName)
      .select("*")
      .in("status", statuses)
      .order("created_at", { ascending: false });

    if (isSM) {
      query = query.in(
        "employee_code",
        managedEmployeeCodes
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        `โหลดข้อมูลจาก ${tableName} ไม่สำเร็จ:`,
        error
      );
      return [];
    }

    return (data || []).map((item) => {
      const employeeCode = String(
        item.employee_code || ""
      )
        .trim()
        .toUpperCase();

      const employeeInfo =
        employeeInfoMap.get(employeeCode);

      return {
        ...item,
        employee_name:
          employeeInfo?.full_name || "-",
        department_id:
          employeeInfo?.department_id || "",
        department_name:
          employeeInfo?.department_name || "-",
      };
    });
  }

  const {
    data: departments,
    error: departmentsError,
  } = await supabaseAdmin
    .from("departments")
    .select("id, name")
    .order("name", { ascending: true });

  if (departmentsError) {
    console.error(
      "โหลดรายชื่อแผนกไม่สำเร็จ:",
      departmentsError
    );
  }

  const departmentOptions =
    (departments || []) as DepartmentRecord[];

  const [
    otRequests,
    shiftRequests,
    dayOffRequests,
    leaveRequests,
  ] = await Promise.all([
    getRequests("ot_requests", otStatus),
    getRequests("shift_change_requests", otherStatus),
    getRequests(
      "day_off_change_requests",
      otherStatus
    ),
    getRequests("leave_form_requests", otherStatus),
  ]);

  /*
   * ยอดที่แสดงในแท็บ = จำนวนรายการที่ยังไม่จบกระบวนการ
   * (ไม่นับรายการที่ HR อนุมัติแล้ว หรือไม่อนุมัติแล้ว)
   * ไม่ใช่จำนวนรายการทั้งหมดที่โหลดมา
   */
  const otPendingCount = countPending(otRequests);
  const shiftPendingCount = countPending(shiftRequests);
  const dayOffPendingCount = countPending(dayOffRequests);
  const leavePendingCount = countPending(leaveRequests);

  /*
   * ประวัติกิจกรรมทั้งระบบ (เฉพาะ HR เท่านั้นที่เห็น)
   * รวมทุกคน ทุกคำขอ เรียงตามเวลาล่าสุดก่อน
   */
  /*
   * ประวัติกิจกรรมทั้งระบบ (เฉพาะ HR เท่านั้นที่เห็น)
   * แสดงแบบ 1 คำขอ 1 แถว โดยดึง log การอนุมัติ (ไม่รวม log ตอนยื่นคำขอ)
   * มา map เข้ากับคำขอแต่ละใบตาม request_id
   */
  let activityTimelineRows: TimelineRow[] = [];

  if (isHR) {
    const { data: approvalLogs, error: approvalLogsError } =
      await supabaseAdmin
        .from("activity_log")
        .select("*")
        .neq("actor_role", "employee")
        .order("created_at", { ascending: true });

    if (approvalLogsError) {
      console.error(
        "โหลดประวัติการอนุมัติไม่สำเร็จ:",
        approvalLogsError
      );
    }

    const smMap = new Map<string, StageEntry>();
    const gmMap = new Map<string, StageEntry>();
    const hrMap = new Map<string, StageEntry>();

    for (const log of approvalLogs || []) {
      const requestId = String(log.request_id || "");
      if (!requestId) continue;

      const entry: StageEntry = {
        label: String(log.action_label || ""),
        at: log.created_at,
      };

      if (log.actor_role === "section_manager") {
        smMap.set(requestId, entry);
      } else if (log.actor_role === "general_manager") {
        gmMap.set(requestId, entry);
      } else if (log.actor_role === "hr") {
        hrMap.set(requestId, entry);
      }
    }

    /*
     * ประวัติต้องดึงคำขอ "ทั้งหมด" ไม่ใช่แค่ที่แสดงในแท็บปัจจุบัน
     * เพราะ otRequests ฯลฯ ที่มีอยู่แล้วเป็นของ HR ครบทุกสถานะอยู่แล้ว
     * จึงใช้ชุดเดียวกันได้เลยโดยไม่ต้อง query ซ้ำ
     */
    activityTimelineRows = [
      ...buildTimelineRows("ot", otRequests, smMap, gmMap, hrMap),
      ...buildTimelineRows(
        "shift",
        shiftRequests,
        smMap,
        gmMap,
        hrMap
      ),
      ...buildTimelineRows(
        "dayoff",
        dayOffRequests,
        smMap,
        gmMap,
        hrMap
      ),
      ...buildTimelineRows(
        "leave",
        leaveRequests,
        smMap,
        gmMap,
        hrMap
      ),
    ].sort((a, b) => {
      const aTime = a.submitted_at
        ? new Date(a.submitted_at).getTime()
        : 0;
      const bTime = b.submitted_at
        ? new Date(b.submitted_at).getTime()
        : 0;
      return bTime - aTime;
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto w-full max-w-[1800px] space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              จัดการคำขอ
            </h1>

            <p className="mt-1 text-slate-600">
              Role: {role}
            </p>

            {isSM && (
              <>
                <p className="mt-1 text-sm text-slate-500">
                  แผนกที่รับผิดชอบ:{" "}
                  {managedDepartmentIds.length} แผนก
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  พนักงานในแผนก:{" "}
                  {managedEmployeeCodes.length} คน
                </p>
              </>
            )}
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg bg-slate-900 px-4 py-2 text-center text-white"
          >
            กลับ Dashboard
          </Link>
        </div>

        {isSM &&
          managedDepartmentIds.length === 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-semibold text-amber-800">
                ยังไม่ได้กำหนดแผนกให้หัวหน้าคนนี้
              </h2>

              <p className="mt-1 text-sm text-amber-700">
                กรุณาตรวจสอบตาราง
                department_managers ว่ามี manager_id
                ของบัญชีนี้หรือไม่
              </p>
            </div>
          )}

        {isGM && (
          <RequestTable
            title="คำขอ OT: รอ GM อนุมัติ"
            table="ot_requests"
            items={otRequests}
            type="ot"
            role={role}
            departments={departmentOptions}
          />
        )}

        {(isSM || isHR) && (
          <>
            <div className="rounded-2xl bg-white p-4 shadow">
              <div
                className={
                  isHR
                    ? "grid gap-3 sm:grid-cols-5"
                    : "grid gap-3 sm:grid-cols-4"
                }
              >
                <TabButton
                  href="/dashboard/manage-requests?tab=ot"
                  active={activeTab === "ot"}
                >
                  OT ({otPendingCount})
                </TabButton>

                <TabButton
                  href="/dashboard/manage-requests?tab=shift"
                  active={activeTab === "shift"}
                >
                  เปลี่ยนกะ ({shiftPendingCount})
                </TabButton>

                <TabButton
                  href="/dashboard/manage-requests?tab=dayoff"
                  active={activeTab === "dayoff"}
                >
                  เปลี่ยนวันหยุด ({dayOffPendingCount})
                </TabButton>

                <TabButton
                  href="/dashboard/manage-requests?tab=leave"
                  active={activeTab === "leave"}
                >
                  ขอลา ({leavePendingCount})
                </TabButton>

                {isHR && (
                  <TabButton
                    href="/dashboard/manage-requests?tab=activity"
                    active={activeTab === "activity"}
                  >
                    ประวัติกิจกรรมทั้งหมด ({activityTimelineRows.length})
                  </TabButton>
                )}
              </div>
            </div>

            {activeTab === "ot" && (
              <RequestTable
                title={
                  isHR
                    ? "คำขอ OT ทั้งหมด"
                    : "คำขอ OT: รอหัวหน้าแผนกอนุมัติ"
                }
                table="ot_requests"
                items={otRequests}
                type="ot"
                role={role}
                departments={departmentOptions}
              />
            )}

            {activeTab === "shift" && (
              <RequestTable
                title={
                  isHR
                    ? "คำขอเปลี่ยนกะทั้งหมด"
                    : "คำขอเปลี่ยนกะ: รอหัวหน้าแผนกอนุมัติ"
                }
                table="shift_change_requests"
                items={shiftRequests}
                type="shift"
                role={role}
                departments={departmentOptions}
              />
            )}

            {activeTab === "dayoff" && (
              <RequestTable
                title={
                  isHR
                    ? "คำขอเปลี่ยนวันหยุดทั้งหมด"
                    : "คำขอเปลี่ยนวันหยุด: รอหัวหน้าแผนกอนุมัติ"
                }
                table="day_off_change_requests"
                items={dayOffRequests}
                type="dayoff"
                role={role}
                departments={departmentOptions}
              />
            )}

            {activeTab === "leave" && (
              <RequestTable
                title={
                  isHR
                    ? "คำขอลาทั้งหมด"
                    : "คำขอลา: รอหัวหน้าแผนกอนุมัติ"
                }
                table="leave_form_requests"
                items={leaveRequests}
                type="leave"
                role={role}
                departments={departmentOptions}
              />
            )}

            {isHR && activeTab === "activity" && (
              <ActivityLogTable
                items={activityTimelineRows}
                departments={departmentOptions}
                variant="hr"
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function TabButton({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-xl bg-red-700 px-4 py-3 text-center font-semibold text-white shadow"
          : "rounded-xl bg-slate-100 px-4 py-3 text-center font-semibold text-slate-700 hover:bg-red-100"
      }
    >
      {children}
    </Link>
  );
}