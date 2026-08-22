"use client";

import { useMemo, useState } from "react";

export type TimelineRow = {
  request_type: "ot" | "shift" | "dayoff" | "leave";
  request_id: string;
  employee_code: string;
  employee_name: string;
  department_id: string;
  department_name: string;
  summary: string;
  event_date: string;
  submitted_at: string | null;
  sm_label: string | null;
  sm_at: string | null;
  gm_label: string | null;
  gm_at: string | null;
  hr_label: string | null;
  hr_at: string | null;
  status: string;
};

type DepartmentOption = {
  id: string;
  name: string;
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  ot: "OT",
  leave: "ลา",
  shift: "เปลี่ยนกะ",
  dayoff: "เปลี่ยนวันหยุด",
};

function normalizeStatusValue(value: unknown): string {
  const status = String(value ?? "")
    .trim()
    .toLowerCase();

  return status === "pending" ? "pending_sm" : status;
}

function formatDateTime(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatusValue(status);

  const label =
    normalized === "pending_sm"
      ? "รอ SM อนุมัติ"
      : normalized === "approved_sm"
      ? "รอ GM/HR อนุมัติ"
      : normalized === "approved_gm"
      ? "รอ HR อนุมัติ"
      : normalized === "approved_hr"
      ? "อนุมัติแล้ว"
      : normalized === "rejected"
      ? "ไม่อนุมัติ"
      : status || "-";

  const className =
    normalized === "approved_hr"
      ? "bg-green-100 text-green-700"
      : normalized === "rejected"
      ? "bg-red-100 text-red-700"
      : normalized === "approved_sm" || normalized === "approved_gm"
      ? "bg-blue-100 text-blue-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

/*
 * แสดงผลแต่ละขั้น (SM / GM / HR) ตามสถานะปัจจุบันจริงของคำขอ
 * - ถ้ามี log ของขั้นนั้นแล้ว ให้โชว์ผล + เวลา
 * - ถ้ายังไม่ถึงคิวขั้นนั้นเลย ให้โชว์ "-"
 * - ถ้าตอนนี้กำลังรออยู่ที่ขั้นนั้นพอดี ให้โชว์ "รอดำเนินการ"
 */
function StageCell({
  stage,
  requestType,
  status,
  label,
  at,
}: {
  stage: "sm" | "gm" | "hr";
  requestType: string;
  status: string;
  label: string | null;
  at: string | null;
}) {
  const normalized = normalizeStatusValue(status);
  const time = formatDateTime(at);

  if (label) {
    const isRejected = label.includes("ไม่อนุมัติ");

    return (
      <span
        className={
          isRejected
            ? "text-red-600"
            : "text-slate-600"
        }
      >
        {label}
        {time && (
          <>
            <br />
            <span className="text-xs text-slate-400">
              {time}
            </span>
          </>
        )}
      </span>
    );
  }

  if (stage === "gm" && requestType !== "ot") {
    return <span className="text-slate-300">-</span>;
  }

  if (normalized === "rejected") {
    return <span className="text-slate-300">-</span>;
  }

  const isWaitingNow =
    (stage === "sm" && normalized === "pending_sm") ||
    (stage === "gm" &&
      requestType === "ot" &&
      normalized === "approved_sm") ||
    (stage === "hr" &&
      ((requestType === "ot" && normalized === "approved_gm") ||
        (requestType !== "ot" && normalized === "approved_sm")));

  if (isWaitingNow) {
    return (
      <span className="font-medium text-amber-600">
        รอดำเนินการ
      </span>
    );
  }

  return <span className="text-slate-300">-</span>;
}

export default function ActivityLogTable({
  items,
  departments,
  variant,
}: {
  items: TimelineRow[];
  departments: DepartmentOption[];
  variant: "hr" | "employee";
}) {
  const isHR = variant === "hr";

  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const departmentOptions = useMemo(() => {
    return departments
      .map((department) => ({
        value: String(department.id || "").trim(),
        label: String(department.name || "").trim(),
      }))
      .filter((d) => d.value && d.label)
      .sort((a, b) => a.label.localeCompare(b.label, "th"));
  }, [departments]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return items.filter((item) => {
      if (dateFrom && item.event_date < dateFrom) return false;
      if (dateTo && item.event_date > dateTo) return false;

      if (
        isHR &&
        departmentFilter !== "all" &&
        item.department_id !== departmentFilter
      ) {
        return false;
      }

      if (statusFilter !== "all") {
        const currentStatus = normalizeStatusValue(item.status);
        if (currentStatus !== statusFilter) return false;
      }

      if (isHR && normalizedSearch) {
        const name = item.employee_name.toLowerCase();
        const code = item.employee_code.toLowerCase();

        if (
          !name.includes(normalizedSearch) &&
          !code.includes(normalizedSearch)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    items,
    searchText,
    dateFrom,
    dateTo,
    departmentFilter,
    statusFilter,
    isHR,
  ]);

  function clearFilter() {
    setSearchText("");
    setDateFrom("");
    setDateTo("");
    setDepartmentFilter("all");
    setStatusFilter("all");
  }

  const filterGridClassName = isHR
    ? "grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_1fr_1fr_0.9fr]"
    : "grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_0.9fr]";

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow">
      <div className="bg-red-700 px-6 py-4 text-white">
        <h2 className="text-xl font-semibold">
          {isHR ? "ประวัติกิจกรรมทั้งระบบ" : "ประวัติกิจกรรมของฉัน"}
        </h2>
        <p className="mt-1 text-sm text-red-100">
          แสดง {filteredItems.length} รายการ จากทั้งหมด {items.length} รายการ
        </p>
      </div>

      <div className="m-6 rounded-xl border bg-slate-50 p-4">
        <div className={filterGridClassName}>
          {isHR && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                ค้นหาชื่อ / รหัสพนักงาน
              </label>
              <input
                type="text"
                value={searchText}
                placeholder="พิมพ์ชื่อหรือรหัสพนักงาน..."
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">
              วันที่เริ่มต้น
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              วันที่สิ้นสุด
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          {isHR && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                แผนก
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="all">ทุกแผนก</option>
                {departmentOptions.map((department) => (
                  <option key={department.value} value={department.value}>
                    {department.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">
              สถานะ
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="all">ทั้งหมด</option>
              <option value="pending_sm">รอ SM อนุมัติ</option>
              <option value="approved_sm">SM อนุมัติแล้ว</option>
              <option value="approved_gm">GM อนุมัติแล้ว (เฉพาะ OT)</option>
              <option value="approved_hr">HR อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilter}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <p className="mx-6 mb-6 text-sm text-slate-500">
          ไม่มีรายการ
        </p>
      ) : (
        <div className="mx-6 mb-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-100 text-left">
                {isHR && <th className="p-3">รหัส</th>}
                {isHR && <th className="p-3">ชื่อ</th>}
                {isHR && <th className="p-3">แผนก</th>}
                <th className="p-3">ประเภท</th>
                <th className="p-3">รายการที่ทำ</th>
                <th className="p-3">SM</th>
                <th className="p-3">GM</th>
                <th className="p-3">HR</th>
                <th className="p-3">สถานะ</th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.request_id}
                  className="border-b align-top"
                >
                  {isHR && <td className="p-3">{item.employee_code}</td>}
                  {isHR && <td className="p-3">{item.employee_name}</td>}
                  {isHR && <td className="p-3">{item.department_name}</td>}

                  <td className="p-3">
                    {REQUEST_TYPE_LABELS[item.request_type] ||
                      item.request_type}
                  </td>

                  <td className="p-3">{item.summary}</td>

                  <td className="p-3">
                    <StageCell
                      stage="sm"
                      requestType={item.request_type}
                      status={item.status}
                      label={item.sm_label}
                      at={item.sm_at}
                    />
                  </td>

                  <td className="p-3">
                    <StageCell
                      stage="gm"
                      requestType={item.request_type}
                      status={item.status}
                      label={item.gm_label}
                      at={item.gm_at}
                    />
                  </td>

                  <td className="p-3">
                    <StageCell
                      stage="hr"
                      requestType={item.request_type}
                      status={item.status}
                      label={item.hr_label}
                      at={item.hr_at}
                    />
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