"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type RequestType = "ot" | "shift" | "dayoff" | "leave";

type DepartmentOption = {
  id: string;
  name: string;
};

type RequestTableProps = {
  title: string;
  table: string;
  items: any[];
  type: RequestType;
  role: string;
  departments: DepartmentOption[];
};

const BATCH_SIZE = 100;

/*
 * ตาราง shift/dayoff บันทึกสถานะเริ่มต้นเป็น "pending"
 * ส่วน ot/leave บันทึกเป็น "pending_sm"
 * ให้ normalize ให้เป็นค่าเดียวกันก่อนเทียบกับตัวกรอง
 */
function normalizeStatusValue(value: unknown): string {
  const status = String(value ?? "")
    .trim()
    .toLowerCase();

  return status === "pending" ? "pending_sm" : status;
}

export default function RequestTable({
  title,
  table,
  items,
  type,
  role,
  departments,
}: RequestTableProps) {
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("");

  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const isGM = role === "general_manager";
  const isHR = role === "hr";
  const canFilterDepartment = isGM || isHR;

  function getRequestDate(item: any) {
    if (type === "ot") return String(item.ot_date || "");
    if (type === "shift") return String(item.shift_date || "");
    if (type === "dayoff") return String(item.old_day_off || "");
    if (type === "leave") return String(item.leave_day || "");
    return "";
  }

  function getDepartmentKey(item: any) {
    return String(
      item.department_id ||
      item.department_name ||
      ""
    ).trim();
  }

  function formatCreatedAt(value: unknown) {
    if (!value) return "-";

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });
  }

  const departmentOptions = useMemo(() => {
    return departments
      .map((department) => ({
        value: String(department.id || "").trim(),
        label: String(department.name || "").trim(),
      }))
      .filter(
        (department) =>
          department.value && department.label
      )
      .sort((a, b) =>
        a.label.localeCompare(b.label, "th")
      );
  }, [departments]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchText
      .trim()
      .toLowerCase();

    return items.filter((item) => {
      const requestDate = getRequestDate(item);

      if (!requestDate) return false;

      if (dateFrom && requestDate < dateFrom) return false;
      if (dateTo && requestDate > dateTo) return false;

      if (
        canFilterDepartment &&
        departmentFilter !== "all" &&
        getDepartmentKey(item) !== departmentFilter
      ) {
        return false;
      }

      if (isHR && statusFilter !== "all") {
        const currentStatus = normalizeStatusValue(
          item.status
        );

        if (currentStatus !== statusFilter) {
          return false;
        }
      }

      if (normalizedSearch) {
        const employeeName = String(
          item.employee_name || ""
        ).toLowerCase();

        const employeeCode = String(
          item.employee_code || ""
        ).toLowerCase();

        const matchesSearch =
          employeeName.includes(normalizedSearch) ||
          employeeCode.includes(normalizedSearch);

        if (!matchesSearch) return false;
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
    canFilterDepartment,
    isHR,
    type,
  ]);

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  function toggleAll() {
    const validIds = filteredItems
      .map((item) => String(item.request_id || "").trim())
      .filter(Boolean);

    const allSelected =
      validIds.length > 0 &&
      validIds.every((id) => selectedIds.includes(id));

    setSelectedIds(allSelected ? [] : validIds);
  }

  function clearFilter() {
    setSearchText("");
    setDateFrom("");
    setDateTo("");
    setDepartmentFilter("all");
    setStatusFilter("all");
    setSelectedIds([]);
  }

  function startEdit(item: any) {
    setEditingId(item.request_id);
    setEditForm({ ...item });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  function setField(field: string, value: string) {
    setEditForm((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  }

  /*
   * แบ่งอัปเดตทีละ BATCH_SIZE (100) รายการอัตโนมัติ
   * เพื่อไม่ให้ชนกับ limit ของ API ฝั่ง backend
   * ผู้ใช้เลือกได้ทั้งหมดโดยไม่ต้องกังวลเรื่องจำนวน
   */
  async function updateSelected(action: "approve" | "reject") {
    if (selectedIds.length === 0) {
      alert("กรุณาเลือกรายการก่อน");
      return;
    }

    const actionLabel =
      action === "approve" ? "อนุมัติ" : "ไม่อนุมัติ";

    if (selectedIds.length > BATCH_SIZE) {
      const confirmed = window.confirm(
        `คุณเลือกไว้ ${selectedIds.length} รายการ ` +
        `ระบบจะแบ่งดำเนินการทีละ ${BATCH_SIZE} รายการอัตโนมัติ ` +
        `(ทั้งหมด ${Math.ceil(
          selectedIds.length / BATCH_SIZE
        )} ชุด) ยืนยันที่จะ${actionLabel}หรือไม่?`
      );

      if (!confirmed) return;
    }

    const chunks: string[][] = [];

    for (
      let i = 0;
      i < selectedIds.length;
      i += BATCH_SIZE
    ) {
      chunks.push(selectedIds.slice(i, i + BATCH_SIZE));
    }

    try {
      setLoading(true);

      let totalUpdated = 0;
      let totalSkipped = 0;
      let totalFailed = 0;
      const chunkErrors: string[] = [];

      for (let index = 0; index < chunks.length; index++) {
        setLoadingLabel(
          chunks.length > 1
            ? `กำลังดำเนินการ (${index + 1}/${chunks.length
            } ชุด)...`
            : "กำลังดำเนินการ..."
        );

        const res = await fetch(
          "/api/update-request-status",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              table,
              action,
              request_ids: chunks[index],
            }),
          }
        );

        const data = await res.json();

        if (!res.ok || !data.ok) {
          chunkErrors.push(
            data.message ||
            `ชุดที่ ${index + 1} อัปเดตไม่สำเร็จ`
          );
          continue;
        }

        totalUpdated += Number(data.updated || 0);
        totalSkipped += Number(data.skipped || 0);
        totalFailed += Number(data.failed || 0);
      }

      let summary = `${actionLabel}สำเร็จ ${totalUpdated} รายการ`;

      if (totalSkipped > 0) {
        summary += ` (ข้าม ${totalSkipped} รายการที่สิทธิ์/สถานะไม่ตรง)`;
      }

      if (chunkErrors.length > 0) {
        summary += `\n\nมีบางชุดผิดพลาด:\n${chunkErrors.join(
          "\n"
        )}`;
      }

      alert(summary);

      setSelectedIds([]);
      router.refresh();
    } catch (error) {
      console.error("Update request status error:", error);
      alert("ไม่สามารถเชื่อมต่อระบบได้");
    } finally {
      setLoading(false);
      setLoadingLabel("");
    }
  }

  async function saveEdit() {
    if (!editingId) return;

    try {
      setLoading(true);

      const res = await fetch("/api/update-request-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table,
          request_id: editingId,
          type,
          data: editForm,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        alert(data.message || "แก้ไขไม่สำเร็จ");
        return;
      }

      setEditingId(null);
      setEditForm({});
      router.refresh();
    } catch (error) {
      console.error("Update request data error:", error);
      alert("ไม่สามารถเชื่อมต่อระบบได้");
    } finally {
      setLoading(false);
    }
  }

  const filteredRequestIds = filteredItems
    .map((item) => String(item.request_id || "").trim())
    .filter(Boolean);

  const allFilteredSelected =
    filteredRequestIds.length > 0 &&
    filteredRequestIds.every((id) =>
      selectedIds.includes(id)
    );

  /*
   * จำนวนคอลัมน์ตัวกรอง: ค้นหา + วันที่เริ่ม + วันที่สิ้นสุด
   * + แผนก (ถ้ามีสิทธิ์) + สถานะ (เฉพาะ HR) + ปุ่มล้าง
   */
  const filterGridClassName = isHR
    ? "grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_1fr_1fr_0.9fr]"
    : canFilterDepartment
      ? "grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_1fr_0.9fr]"
      : "grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_0.9fr]";

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-red-700 px-6 py-4 text-white">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-red-100">
            แสดง {filteredItems.length} รายการ จากทั้งหมด {items.length} รายการ
            {selectedIds.length > 0
              ? ` · เลือกไว้ ${selectedIds.length} รายการ`
              : ""}
          </p>
        </div>

        {filteredItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateSelected("approve")}
              disabled={loading}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && loadingLabel
                ? loadingLabel
                : "อนุมัติที่เลือก"}
            </button>

            <button
              type="button"
              onClick={() => updateSelected("reject")}
              disabled={loading}
              className="rounded-lg bg-red-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && loadingLabel
                ? loadingLabel
                : "ไม่อนุมัติที่เลือก"}
            </button>
          </div>
        )}
      </div>

      <div className="m-6 rounded-xl border bg-slate-50 p-4">
        <div className={filterGridClassName}>
          <div>
            <label className="mb-1 block text-sm font-medium">
              ค้นหาชื่อ / รหัสพนักงาน
            </label>
            <input
              type="text"
              value={searchText}
              placeholder="พิมพ์ชื่อหรือรหัสพนักงาน..."
              onChange={(e) => {
                setSearchText(e.target.value);
                setSelectedIds([]);
              }}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              วันที่เริ่มต้น
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setSelectedIds([]);
              }}
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
              onChange={(e) => {
                setDateTo(e.target.value);
                setSelectedIds([]);
              }}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          {canFilterDepartment && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                แผนก
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setSelectedIds([]);
                }}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="all">ทุกแผนก</option>

                {departmentOptions.map((department) => (
                  <option
                    key={department.value}
                    value={department.value}
                  >
                    {department.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isHR && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                สถานะ
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setSelectedIds([]);
                }}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="all">ทั้งหมด</option>
                <option value="pending_sm">
                  รอ SM อนุมัติ
                </option>
                <option value="approved_sm">
                  SM อนุมัติแล้ว
                </option>
                <option value="approved_gm">
                  GM อนุมัติแล้ว (เฉพาะ OT)
                </option>
                <option value="approved_hr">
                  HR อนุมัติแล้ว
                </option>
                <option value="rejected">
                  ไม่อนุมัติ
                </option>
              </select>
            </div>
          )}

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
        <div className="mx-6 mb-6 overflow-hidden">
          <table className="w-full table-fixed border-collapse text-[13px]">
            <thead>
              <tr className="border-b bg-slate-100 text-left">
                <th className="w-[3%] px-2 py-3">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAll}
                    aria-label="เลือกรายการทั้งหมด"
                  />
                </th>
                <th className="w-[9%] px-2 py-3">รหัสพนักงาน</th>
                <th className="w-[13%] px-2 py-3">ชื่อพนักงาน</th>
                {canFilterDepartment && (
                  <th className="w-[8%] px-2 py-3">แผนก</th>
                )}
                <th className="w-[12%] px-2 py-3">วันที่กรอก</th>
                <th className="w-[10%] px-2 py-3">วันที่ขอ</th>
                <th className="w-[12%] px-2 py-3">รายละเอียด</th>
                <th className="w-[16%] px-2 py-3">เหตุผล</th>
                <th className="w-[11%] px-2 py-3">สถานะ</th>
                {isHR && <th className="w-[6%] px-2 py-3">แก้ไข</th>}
              </tr>
            </thead>

            <tbody>
              {filteredItems.map((item) => {
                const requestId = String(item.request_id || "");
                const isEditing = editingId === requestId;

                return (
                  <tr
                    key={requestId}
                    className="border-b align-top"
                  >
                    <td className="px-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(requestId)}
                        onChange={() => toggleOne(requestId)}
                        aria-label={`เลือกคำขอ ${requestId}`}
                      />
                    </td>

                    <td className="truncate px-2 py-3 font-medium" title={item.employee_code || "-"}>
                      {item.employee_code || "-"}
                    </td>

                    <td className="truncate px-2 py-3" title={item.employee_name || "-"}>
                      {item.employee_name || "-"}
                    </td>

                    {canFilterDepartment && (
                      <td className="truncate px-2 py-3" title={item.department_name || "-"}>
                        {item.department_name || "-"}
                      </td>
                    )}

                    <td className="whitespace-nowrap px-2 py-3">
                      {formatCreatedAt(item.created_at)}
                    </td>

                    <td className="break-words px-2 py-3">
                      {isEditing ? (
                        <DateEdit
                          type={type}
                          form={editForm}
                          setField={setField}
                        />
                      ) : (
                        <>
                          {type === "ot" && (item.ot_date || "-")}
                          {type === "shift" && (item.shift_date || "-")}
                          {type === "dayoff" && (item.old_day_off || "-")}
                          {type === "leave" && (
                            <>
                              {item.leave_day || "-"}
                              {item.leave_to_day
                                ? ` ถึง ${item.leave_to_day}`
                                : ""}
                              {item.leave_total_days
                                ? ` (${item.leave_total_days} วัน)`
                                : ""}
                            </>
                          )}
                        </>
                      )}
                    </td>

                    <td className="break-words px-2 py-3">
                      {isEditing ? (
                        <DetailEdit
                          type={type}
                          form={editForm}
                          setField={setField}
                        />
                      ) : (
                        <>
                          {type === "ot" &&
                            `${item.start_time || "-"} - ${item.end_time || "-"
                            }`}
                          {type === "shift" &&
                            `${item.old_shift_code || "-"} ${item.old_shift_time || ""
                            } → ${item.new_shift_code || "-"} ${item.new_shift_time || ""
                            }`}
                          {type === "dayoff" &&
                            `${item.old_day_off || "-"} → ${item.new_day_off || "-"
                            }`}
                          {type === "leave" &&
                            (item.leave_type || "-")}
                        </>
                      )}
                    </td>

                    <td className="break-words px-2 py-3">
                      {isEditing ? (
                        <textarea
                          value={
                            type === "leave"
                              ? editForm.leave_reason || ""
                              : editForm.reason || ""
                          }
                          onChange={(e) =>
                            setField(
                              type === "leave"
                                ? "leave_reason"
                                : "reason",
                              e.target.value
                            )
                          }
                          className="w-full rounded border px-2 py-1"
                          rows={3}
                        />
                      ) : type === "leave" ? (
                        item.leave_reason || "-"
                      ) : (
                        item.reason || "-"
                      )}
                    </td>

                    <td className="whitespace-nowrap px-2 py-3">
                      {isEditing ? (
                        <select
                          value={editForm.status || ""}
                          onChange={(e) =>
                            setField("status", e.target.value)
                          }
                          className="rounded border px-2 py-1"
                        >
                          <option value="pending">
                            รอ SM อนุมัติ
                          </option>
                          <option value="pending_sm">
                            รอ SM อนุมัติ
                          </option>
                          <option value="approved_sm">
                            SM อนุมัติแล้ว
                          </option>
                          <option value="approved_gm">
                            GM อนุมัติแล้ว
                          </option>
                          <option value="approved_hr">
                            HR อนุมัติแล้ว
                          </option>
                          <option value="rejected">
                            ไม่อนุมัติ
                          </option>
                        </select>
                      ) : (
                        <StatusBadge status={item.status} />
                      )}
                    </td>

                    {isHR && (
                      <td className="px-2 py-3">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={loading}
                              className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                            >
                              บันทึก
                            </button>

                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={loading}
                              className="rounded bg-slate-500 px-3 py-1 text-xs text-white disabled:opacity-50"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="rounded bg-slate-900 px-3 py-1 text-xs text-white"
                          >
                            แก้ไข
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DateEdit({
  type,
  form,
  setField,
}: {
  type: RequestType;
  form: any;
  setField: (field: string, value: string) => void;
}) {
  if (type === "ot") {
    return (
      <input
        type="date"
        value={form.ot_date || ""}
        onChange={(e) =>
          setField("ot_date", e.target.value)
        }
        className="w-full rounded border px-2 py-1"
      />
    );
  }

  if (type === "shift") {
    return (
      <input
        type="date"
        value={form.shift_date || ""}
        onChange={(e) =>
          setField("shift_date", e.target.value)
        }
        className="w-full rounded border px-2 py-1"
      />
    );
  }

  if (type === "dayoff") {
    return (
      <div className="space-y-2">
        <input
          type="date"
          value={form.old_day_off || ""}
          onChange={(e) =>
            setField("old_day_off", e.target.value)
          }
          className="w-full rounded border px-2 py-1"
        />

        <input
          type="date"
          value={form.new_day_off || ""}
          onChange={(e) =>
            setField("new_day_off", e.target.value)
          }
          className="w-full rounded border px-2 py-1"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="date"
        value={form.leave_day || ""}
        onChange={(e) =>
          setField("leave_day", e.target.value)
        }
        className="w-full rounded border px-2 py-1"
      />

      <input
        type="date"
        value={form.leave_to_day || ""}
        onChange={(e) =>
          setField("leave_to_day", e.target.value)
        }
        className="w-full rounded border px-2 py-1"
      />

      <input
        type="number"
        min="0"
        step="0.5"
        value={form.leave_total_days || ""}
        onChange={(e) =>
          setField("leave_total_days", e.target.value)
        }
        placeholder="จำนวนวันลา"
        className="w-full rounded border px-2 py-1"
      />
    </div>
  );
}

function DetailEdit({
  type,
  form,
  setField,
}: {
  type: RequestType;
  form: any;
  setField: (field: string, value: string) => void;
}) {
  if (type === "ot") {
    return (
      <div className="space-y-2">
        <input
          type="time"
          value={form.start_time || ""}
          onChange={(e) =>
            setField("start_time", e.target.value)
          }
          className="w-full rounded border px-2 py-1"
        />

        <input
          type="time"
          value={form.end_time || ""}
          onChange={(e) =>
            setField("end_time", e.target.value)
          }
          className="w-full rounded border px-2 py-1"
        />
      </div>
    );
  }

  if (type === "shift") {
    return (
      <div className="space-y-2">
        <input
          value={form.old_shift_code || ""}
          onChange={(e) =>
            setField("old_shift_code", e.target.value)
          }
          placeholder="กะเดิม"
          className="w-full rounded border px-2 py-1"
        />

        <input
          value={form.old_shift_time || ""}
          onChange={(e) =>
            setField("old_shift_time", e.target.value)
          }
          placeholder="เวลาเดิม"
          className="w-full rounded border px-2 py-1"
        />

        <input
          value={form.new_shift_code || ""}
          onChange={(e) =>
            setField("new_shift_code", e.target.value)
          }
          placeholder="กะใหม่"
          className="w-full rounded border px-2 py-1"
        />

        <input
          value={form.new_shift_time || ""}
          onChange={(e) =>
            setField("new_shift_time", e.target.value)
          }
          placeholder="เวลาใหม่"
          className="w-full rounded border px-2 py-1"
        />
      </div>
    );
  }

  if (type === "dayoff") {
    return (
      <span className="text-slate-500">
        แก้วันที่ในช่องวันที่ขอ
      </span>
    );
  }

  return (
    <input
      value={form.leave_type || ""}
      onChange={(e) =>
        setField("leave_type", e.target.value)
      }
      placeholder="ประเภทการลา"
      className="w-full rounded border px-2 py-1"
    />
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
              : status || "-";

  const className =
    status === "approved_gm" ||
      status === "approved_hr"
      ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
      : status === "approved_sm"
        ? "rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
        : status === "rejected"
          ? "rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
          : "rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700";

  return <span className={className}>{label}</span>;
}