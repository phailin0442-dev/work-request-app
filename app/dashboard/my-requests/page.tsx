import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function MyRequestsPage() {
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

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">รายการคำขอของฉัน</h1>

          <Link
            href="/dashboard"
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          >
            กลับ Dashboard
          </Link>
        </div>

        <RequestSection title="รายการ OT" items={otRequests || []} type="ot" />

        <RequestSection
          title="รายการขอเปลี่ยนกะ"
          items={shiftRequests || []}
          type="shift"
        />

        <RequestSection
          title="รายการขอเปลี่ยนวันหยุด"
          items={dayOffRequests || []}
          type="dayoff"
        />

        <RequestSection
          title="รายการขอลา"
          items={leaveRequests || []}
          type="leave"
        />
      </div>
    </main>
  );
}

function RequestSection({
  title,
  items,
  type,
}: {
  title: string;
  items: any[];
  type: "ot" | "shift" | "dayoff" | "leave";
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      <h2 className="text-xl font-semibold">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">ยังไม่มีรายการ</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-100 text-left">
                <th className="p-3">วันที่/รายการ</th>
                <th className="p-3">รายละเอียด</th>
                <th className="p-3">เหตุผล</th>
                <th className="p-3">สถานะ</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.request_id} className="border-b">
                  <td className="p-3">
                    {type === "ot" && item.ot_date}
                    {type === "shift" && item.shift_date}
                    {type === "dayoff" && item.old_day_off}
                    {type === "leave" && item.leave_day}
                  </td>

                  <td className="p-3">
                    {type === "ot" &&
                      `${item.start_time} - ${item.end_time}`}

                    {type === "shift" &&
                      `${item.old_shift_code} ${item.old_shift_time} → ${item.new_shift_code} ${item.new_shift_time}`}

                    {type === "dayoff" &&
                      `${item.old_day_off} → ${item.new_day_off}`}

                    {type === "leave" && item.leave_type}
                  </td>

                  <td className="p-3">
                    {type === "leave"
                      ? item.leave_reason
                      : item.reason}
                  </td>

                  <td className="p-3">
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                      {item.status}
                    </span>
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