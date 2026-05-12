"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type RequestType = "ot" | "shift" | "dayoff" | "leave";

export default function RequestTable({
  title,
  table,
  items,
  type,
  role,
}: {
  title: string;
  table: string;
  items: any[];
  type: RequestType;
  role: string;
}) {
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isHR = role === "hr";

  function getRequestDate(item: any) {
    if (type === "ot") return String(item.ot_date || "");
    if (type === "shift") return String(item.shift_date || "");
    if (type === "dayoff") return String(item.old_day_off || "");
    if (type === "leave") return String(item.leave_day || "");
    return "";
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const requestDate = getRequestDate(item);

      if (!requestDate) return false;

      if (dateFrom && requestDate < dateFrom) return false;
      if (dateTo && requestDate > dateTo) return false;

      if (isHR && statusFilter !== "all") {
        if (statusFilter === "pending") {
          return item.status === "pending" || item.status === "pending_sm";
        }

        if (statusFilter === "approved") {
          return (
            item.status === "approved_sm" ||
            item.status === "approved_gm" ||
            item.status === "approved_hr"
          );
        }

        if (statusFilter === "rejected") {
          return item.status === "rejected";
        }
      }

      return true;
    });
  }, [items, dateFrom, dateTo, statusFilter, isHR]);

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    const validIds = filteredItems
      .map((item) => String(item.request_id || "").trim())
      .filter(Boolean);

    if (selectedIds.length === validIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(validIds);
    }
  }

  function clearFilter() {
    setDateFrom("");
    setDateTo("");
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

  async function updateSelected(action: "approve" | "reject") {
    if (selectedIds.length === 0) {
      alert("กรุณาเลือกรายการก่อน");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/update-request-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        table,
        action,
        request_ids: selectedIds,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.ok) {
      alert(data.message || "อัปเดตไม่สำเร็จ");
      return;
    }

    setSelectedIds([]);
    router.refresh();
  }

  async function saveEdit() {
    if (!editingId) return;

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
    setLoading(false);

    if (!data.ok) {
      alert(data.message || "แก้ไขไม่สำเร็จ");
      return;
    }

    setEditingId(null);
    setEditForm({});
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-red-700 px-6 py-4 text-white">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-red-100">
            แสดง {filteredItems.length} รายการ จากทั้งหมด {items.length} รายการ
          </p>
        </div>

        {filteredItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateSelected("approve")}
              disabled={loading}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              อนุมัติที่เลือก
            </button>

            <button
              onClick={() => updateSelected("reject")}
              disabled={loading}
              className="rounded-lg bg-red-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              ไม่อนุมัติที่เลือก
            </button>
          </div>
        )}
      </div>

      <div className="m-6 rounded-xl border bg-slate-50 p-4">
        <div className={isHR ? "grid gap-3 sm:grid-cols-4" : "grid gap-3 sm:grid-cols-3"}>
          <div>
            <label className="mb-1 block text-sm font-medium">วันที่เริ่มต้น</label>
            <input
              type="text"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setSelectedIds([]);
              }}
              placeholder="เช่น 2026-05-01"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">วันที่สิ้นสุด</label>
            <input
              type="text"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setSelectedIds([]);
              }}
              placeholder="เช่น 2026-05-31"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          {isHR && (
            <div>
              <label className="mb-1 block text-sm font-medium">สถานะ</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setSelectedIds([]);
                }}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="all">ทั้งหมด</option>
                <option value="pending">รออนุมัติ</option>
                <option value="approved">อนุมัติแล้ว</option>
                <option value="rejected">ไม่อนุมัติ</option>
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={clearFilter}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <p className="mx-6 mb-6 text-sm text-slate-500">ไม่มีรายการ</p>
      ) : (
        <div className="mx-6 mb-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-100 text-left">
                <th className="p-3">
                  <input
                    type="checkbox"
                    checked={
                      filteredItems.length > 0 &&
                      selectedIds.length === filteredItems.length
                    }
                    onChange={toggleAll}
                  />
                </th>
                <th className="p-3">พนักงาน</th>
                <th className="p-3">วันที่</th>
                <th className="p-3">รายละเอียด</th>
                <th className="p-3">เหตุผล</th>
                <th className="p-3">สถานะ</th>
                {isHR && <th className="p-3">แก้ไข</th>}
              </tr>
            </thead>

            <tbody>
              {filteredItems.map((item) => {
                const isEditing = editingId === item.request_id;

                return (
                  <tr key={item.request_id} className="border-b align-top">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.request_id)}
                        onChange={() => toggleOne(item.request_id)}
                      />
                    </td>

                    <td className="p-3">{item.employee_code}</td>

                    <td className="p-3">
                      {isEditing ? (
                        <DateEdit type={type} form={editForm} setField={setField} />
                      ) : (
                        <>
                          {type === "ot" && item.ot_date}
                          {type === "shift" && item.shift_date}
                          {type === "dayoff" && item.old_day_off}
                          {type === "leave" && (
                            <>
                              {item.leave_day}
                              {item.leave_to_day ? ` ถึง ${item.leave_to_day}` : ""}
                              {item.leave_total_days
                                ? ` (${item.leave_total_days} วัน)`
                                : ""}
                            </>
                          )}
                        </>
                      )}
                    </td>

                    <td className="p-3">
                      {isEditing ? (
                        <DetailEdit type={type} form={editForm} setField={setField} />
                      ) : (
                        <>
                          {type === "ot" && `${item.start_time} - ${item.end_time}`}
                          {type === "shift" &&
                            `${item.old_shift_code} ${item.old_shift_time} → ${item.new_shift_code} ${item.new_shift_time}`}
                          {type === "dayoff" &&
                            `${item.old_day_off} → ${item.new_day_off}`}
                          {type === "leave" && item.leave_type}
                        </>
                      )}
                    </td>

                    <td className="p-3">
                      {isEditing ? (
                        <textarea
                          value={
                            type === "leave"
                              ? editForm.leave_reason || ""
                              : editForm.reason || ""
                          }
                          onChange={(e) =>
                            setField(
                              type === "leave" ? "leave_reason" : "reason",
                              e.target.value
                            )
                          }
                          className="min-w-[220px] rounded border px-2 py-1"
                          rows={3}
                        />
                      ) : type === "leave" ? (
                        item.leave_reason
                      ) : (
                        item.reason
                      )}
                    </td>

                    <td className="p-3">
                      {isEditing ? (
                        <select
                          value={editForm.status || ""}
                          onChange={(e) => setField("status", e.target.value)}
                          className="rounded border px-2 py-1"
                        >
                          <option value="pending_sm">รอ SM อนุมัติ</option>
                          <option value="approved_sm">SM อนุมัติแล้ว</option>
                          <option value="approved_gm">GM อนุมัติแล้ว</option>
                          <option value="approved_hr">HR อนุมัติแล้ว</option>
                          <option value="rejected">ไม่อนุมัติ</option>
                        </select>
                      ) : (
                        <StatusBadge status={item.status} />
                      )}
                    </td>

                    {isHR && (
                      <td className="p-3">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={saveEdit}
                              disabled={loading}
                              className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                            >
                              บันทึก
                            </button>

                            <button
                              onClick={cancelEdit}
                              disabled={loading}
                              className="rounded bg-slate-500 px-3 py-1 text-xs text-white disabled:opacity-50"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button
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
        value={form.ot_date || ""}
        onChange={(e) => setField("ot_date", e.target.value)}
        className="min-w-[140px] rounded border px-2 py-1"
      />
    );
  }

  if (type === "shift") {
    return (
      <input
        value={form.shift_date || ""}
        onChange={(e) => setField("shift_date", e.target.value)}
        className="min-w-[140px] rounded border px-2 py-1"
      />
    );
  }

  if (type === "dayoff") {
    return (
      <div className="space-y-2">
        <input
          value={form.old_day_off || ""}
          onChange={(e) => setField("old_day_off", e.target.value)}
          placeholder="วันหยุดเดิม"
          className="min-w-[140px] rounded border px-2 py-1"
        />

        <input
          value={form.new_day_off || ""}
          onChange={(e) => setField("new_day_off", e.target.value)}
          placeholder="วันหยุดใหม่"
          className="min-w-[140px] rounded border px-2 py-1"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        value={form.leave_day || ""}
        onChange={(e) => setField("leave_day", e.target.value)}
        placeholder="ลาตั้งแต่วันที่"
        className="min-w-[140px] rounded border px-2 py-1"
      />

      <input
        value={form.leave_to_day || ""}
        onChange={(e) => setField("leave_to_day", e.target.value)}
        placeholder="ลาถึงวันที่"
        className="min-w-[140px] rounded border px-2 py-1"
      />

      <input
        value={form.leave_total_days || ""}
        onChange={(e) => setField("leave_total_days", e.target.value)}
        placeholder="จำนวนวันลา"
        className="min-w-[140px] rounded border px-2 py-1"
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
          value={form.start_time || ""}
          onChange={(e) => setField("start_time", e.target.value)}
          placeholder="เวลาเริ่ม"
          className="min-w-[140px] rounded border px-2 py-1"
        />

        <input
          value={form.end_time || ""}
          onChange={(e) => setField("end_time", e.target.value)}
          placeholder="เวลาสิ้นสุด"
          className="min-w-[140px] rounded border px-2 py-1"
        />
      </div>
    );
  }

  if (type === "shift") {
    return (
      <div className="space-y-2">
        <input
          value={form.old_shift_code || ""}
          onChange={(e) => setField("old_shift_code", e.target.value)}
          placeholder="กะเดิม"
          className="min-w-[140px] rounded border px-2 py-1"
        />

        <input
          value={form.old_shift_time || ""}
          onChange={(e) => setField("old_shift_time", e.target.value)}
          placeholder="เวลาเดิม"
          className="min-w-[140px] rounded border px-2 py-1"
        />

        <input
          value={form.new_shift_code || ""}
          onChange={(e) => setField("new_shift_code", e.target.value)}
          placeholder="กะใหม่"
          className="min-w-[140px] rounded border px-2 py-1"
        />

        <input
          value={form.new_shift_time || ""}
          onChange={(e) => setField("new_shift_time", e.target.value)}
          placeholder="เวลาใหม่"
          className="min-w-[140px] rounded border px-2 py-1"
        />
      </div>
    );
  }

  if (type === "dayoff") {
    return <span className="text-slate-500">แก้วันที่ในช่องวันที่</span>;
  }

  return (
    <input
      value={form.leave_type || ""}
      onChange={(e) => setField("leave_type", e.target.value)}
      placeholder="ประเภทการลา"
      className="min-w-[140px] rounded border px-2 py-1"
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