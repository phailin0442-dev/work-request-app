import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ActivityLogTable, {
  type TimelineRow,
} from "../activity-log-table";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type StageEntry = { label: string; at: string };

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
      employee_name: "-",
      department_id: "",
      department_name: "-",
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

export default async function MyRequestsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const activeTab = params?.tab || "ot";

  const cookieStore = await cookies();
  const employeeId = cookieStore.get("employee_session")?.value;

  if (!employeeId) {
    redirect("/login");
  }

  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("employee_code")
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  if (!employee) {
    redirect("/login");
  }

  const employeeCode = employee.employee_code;

  const { data: otRequests } = await supabaseAdmin
    .from("ot_requests")
    .select("*")
    .eq("employee_code", employeeCode)
    .order("created_at", { ascending: false });

  const { data: shiftRequests } = await supabaseAdmin
    .from("shift_change_requests")
    .select("*")
    .eq("employee_code", employeeCode)
    .order("created_at", { ascending: false });

  const { data: dayOffRequests } = await supabaseAdmin
    .from("day_off_change_requests")
    .select("*")
    .eq("employee_code", employeeCode)
    .order("created_at", { ascending: false });

  const { data: leaveRequests } = await supabaseAdmin
    .from("leave_form_requests")
    .select("*")
    .eq("employee_code", employeeCode)
    .order("created_at", { ascending: false });

  /*
   * ประวัติกิจกรรมของตัวเอง แบบ 1 คำขอ 1 แถว
   * ดึงเฉพาะ log การอนุมัติ (ไม่รวม log ตอนยื่นคำขอ)
   * มา map เข้ากับคำขอแต่ละใบตาม request_id
   */
  const { data: approvalLogs, error: approvalLogsError } =
    await supabaseAdmin
      .from("activity_log")
      .select("*")
      .eq("employee_code", employeeCode)
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

  const activityTimelineRows: TimelineRow[] = [
    ...buildTimelineRows(
      "ot",
      otRequests || [],
      smMap,
      gmMap,
      hrMap
    ),
    ...buildTimelineRows(
      "shift",
      shiftRequests || [],
      smMap,
      gmMap,
      hrMap
    ),
    ...buildTimelineRows(
      "dayoff",
      dayOffRequests || [],
      smMap,
      gmMap,
      hrMap
    ),
    ...buildTimelineRows(
      "leave",
      leaveRequests || [],
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

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">คำขอของฉัน</h1>
            <p className="mt-1 text-slate-600">
              ดูสถานะคำขอทั้งหมดของพนักงาน
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          >
            กลับ Dashboard
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="grid gap-3 sm:grid-cols-5">
            <TabButton
              href="/dashboard/my-requests?tab=ot"
              active={activeTab === "ot"}
            >
              OT ({otRequests?.length || 0})
            </TabButton>

            <TabButton
              href="/dashboard/my-requests?tab=shift"
              active={activeTab === "shift"}
            >
              เปลี่ยนกะ ({shiftRequests?.length || 0})
            </TabButton>

            <TabButton
              href="/dashboard/my-requests?tab=dayoff"
              active={activeTab === "dayoff"}
            >
              เปลี่ยนวันหยุด ({dayOffRequests?.length || 0})
            </TabButton>

            <TabButton
              href="/dashboard/my-requests?tab=leave"
              active={activeTab === "leave"}
            >
              ลา ({leaveRequests?.length || 0})
            </TabButton>

            <TabButton
              href="/dashboard/my-requests?tab=activity"
              active={activeTab === "activity"}
            >
              ประวัติกิจกรรม ({activityTimelineRows.length})
            </TabButton>
          </div>
        </div>

        {activeTab === "ot" && (
          <RequestCard
            title="รายการ OT"
            items={otRequests || []}
            type="ot"
          />
        )}

        {activeTab === "shift" && (
          <RequestCard
            title="รายการเปลี่ยนกะ"
            items={shiftRequests || []}
            type="shift"
          />
        )}

        {activeTab === "dayoff" && (
          <RequestCard
            title="รายการเปลี่ยนวันหยุด"
            items={dayOffRequests || []}
            type="dayoff"
          />
        )}

        {activeTab === "leave" && (
          <RequestCard
            title="รายการลา"
            items={leaveRequests || []}
            type="leave"
          />
        )}

        {activeTab === "activity" && (
          <ActivityLogTable
            items={activityTimelineRows}
            departments={[]}
            variant="employee"
          />
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

function RequestCard({
  title,
  items,
  type,
}: {
  title: string;
  items: any[];
  type: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow">
      <div className="bg-red-700 px-6 py-4 text-white">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">ไม่มีรายการ</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-100 text-left">
                <th className="p-3">วันที่</th>
                <th className="p-3">รายละเอียด</th>
                <th className="p-3">เหตุผล</th>
                <th className="p-3">สถานะ</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.request_id} className="border-b align-top">
                  <td className="p-3">
                    {type === "ot" && item.ot_date}

                    {type === "shift" && item.shift_date}

                    {type === "dayoff" && item.old_day_off}

                    {type === "leave" && (
                      <>
                        {item.leave_day}
                        {item.leave_to_day
                          ? ` ถึง ${item.leave_to_day}`
                          : ""}
                      </>
                    )}
                  </td>

                  <td className="p-3">
                    {type === "ot" && (
                      <>
                        <div>{item.ot_type}</div>
                        <div>
                          {item.start_time} - {item.end_time}
                        </div>
                      </>
                    )}

                    {type === "shift" && (
                      <>
                        {item.old_shift_code} {item.old_shift_time}
                        <br />→<br />
                        {item.new_shift_code} {item.new_shift_time}
                      </>
                    )}

                    {type === "dayoff" && (
                      <>
                        {item.old_day_off} → {item.new_day_off}
                      </>
                    )}

                    {type === "leave" && (
                      <>
                        <div>{item.leave_type}</div>

                        {item.leave_total_days && (
                          <div>{item.leave_total_days} วัน</div>
                        )}
                      </>
                    )}
                  </td>

                  <td className="p-3">
                    {type === "leave"
                      ? item.leave_reason
                      : item.reason}
                  </td>

                  <td className="p-3">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "pending" || status === "pending_sm"
      ? "รอ SM อนุมัติ"
      : status === "approved_sm"
      ? "SM อนุมัติแล้ว"
      : status === "approved_gm"
      ? "GM อนุมัติแล้ว"
      : status === "approved_hr"
      ? "HR อนุมัติแล้ว"
      : status === "rejected"
      ? "ไม่อนุมัติ"
      : status;

  const className =
    status === "approved_gm" || status === "approved_hr"
      ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
      : status === "approved_sm"
      ? "rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
      : status === "rejected"
      ? "rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
      : "rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700";

  return <span className={className}>{label}</span>;
}