"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function EmployeeTable({
  employees,
}: {
  employees: any[];
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    employee_code: "",
    full_name: "",
    position: "",
    role: "employee",
    pincode: "",
  });

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return employees;

    return employees.filter((employee) => {
      const employeeCode = String(employee.employee_code || "").toLowerCase();
      const fullName = String(employee.full_name || "").toLowerCase();
      const position = String(employee.position || "").toLowerCase();

      return (
        employeeCode.includes(keyword) ||
        fullName.includes(keyword) ||
        position.includes(keyword)
      );
    });
  }, [employees, search]);

  function startEdit(employee: any) {
    setEditingId(employee.id);
    setForm({ ...employee });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({});
  }

  function setField(field: string, value: any) {
    setForm((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  }

  function setNewField(field: string, value: any) {
    setNewEmployee((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function saveEdit() {
    setLoading(true);

    const res = await fetch("/api/update-employee", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.ok) {
      alert(data.message || "แก้ไขไม่สำเร็จ");
      return;
    }

    setEditingId(null);
    setForm({});
    router.refresh();
  }

  async function createEmployee() {
    setLoading(true);

    const res = await fetch("/api/create-employee", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newEmployee),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.ok) {
      alert(data.message || "เพิ่มพนักงานไม่สำเร็จ");
      return;
    }

    setNewEmployee({
      employee_code: "",
      full_name: "",
      position: "",
      role: "employee",
      pincode: "",
    });

    setShowCreate(false);
    router.refresh();
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">รายชื่อพนักงาน</h2>
          <p className="mt-1 text-sm text-slate-500">
            ค้นหาได้จากชื่อ นามสกุล รหัสพนักงาน หรือตำแหน่ง
          </p>
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white"
        >
          {showCreate ? "ปิดฟอร์มเพิ่มพนักงาน" : "เพิ่มพนักงานใหม่"}
        </button>
      </div>

      <div className="mt-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหา เช่น ไพลิน / AD000015 / HR"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
        />

        <p className="mt-2 text-xs text-slate-500">
          พบ {filteredEmployees.length} รายการ จากทั้งหมด {employees.length} รายการ
        </p>
      </div>

      {showCreate && (
        <div className="mt-4 rounded-xl border bg-slate-50 p-4">
          <h3 className="font-semibold">เพิ่มพนักงานใหม่</h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              value={newEmployee.employee_code}
              onChange={(e) => setNewField("employee_code", e.target.value)}
              placeholder="รหัสพนักงาน"
              className="rounded border px-3 py-2"
            />

            <input
              value={newEmployee.full_name}
              onChange={(e) => setNewField("full_name", e.target.value)}
              placeholder="ชื่อ-นามสกุล"
              className="rounded border px-3 py-2"
            />

            <input
              value={newEmployee.position}
              onChange={(e) => setNewField("position", e.target.value)}
              placeholder="ตำแหน่ง"
              className="rounded border px-3 py-2"
            />

            <select
              value={newEmployee.role}
              onChange={(e) => setNewField("role", e.target.value)}
              className="rounded border px-3 py-2"
            >
              <option value="employee">employee</option>
              <option value="section_manager">section_manager</option>
              <option value="general_manager">general_manager</option>
              <option value="hr">hr</option>
            </select>

            <input
              value={newEmployee.pincode}
              onChange={(e) => setNewField("pincode", e.target.value)}
              placeholder="PIN"
              className="rounded border px-3 py-2"
            />
          </div>

          <button
            onClick={createEmployee}
            disabled={loading}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "กำลังเพิ่ม..." : "บันทึกพนักงานใหม่"}
          </button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-100 text-left">
              <th className="p-3">รหัสพนักงาน</th>
              <th className="p-3">ชื่อ</th>
              <th className="p-3">ตำแหน่ง</th>
              <th className="p-3">Role</th>
              <th className="p-3">Active</th>
              <th className="p-3">จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {filteredEmployees.map((employee) => {
              const isEditing = editingId === employee.id;

              return (
                <tr key={employee.id} className="border-b">
                  <td className="p-3">
                    {isEditing ? (
                      <input
                        value={form.employee_code || ""}
                        onChange={(e) =>
                          setField("employee_code", e.target.value)
                        }
                        className="rounded border px-2 py-1"
                      />
                    ) : (
                      employee.employee_code
                    )}
                  </td>

                  <td className="p-3">
                    {isEditing ? (
                      <input
                        value={form.full_name || ""}
                        onChange={(e) =>
                          setField("full_name", e.target.value)
                        }
                        className="rounded border px-2 py-1"
                      />
                    ) : (
                      employee.full_name
                    )}
                  </td>

                  <td className="p-3">
                    {isEditing ? (
                      <input
                        value={form.position || ""}
                        onChange={(e) =>
                          setField("position", e.target.value)
                        }
                        className="rounded border px-2 py-1"
                      />
                    ) : (
                      employee.position
                    )}
                  </td>

                  <td className="p-3">
                    {isEditing ? (
                      <select
                        value={form.role || ""}
                        onChange={(e) => setField("role", e.target.value)}
                        className="rounded border px-2 py-1"
                      >
                        <option value="employee">employee</option>
                        <option value="section_manager">section_manager</option>
                        <option value="general_manager">general_manager</option>
                        <option value="hr">hr</option>
                      </select>
                    ) : (
                      employee.role
                    )}
                  </td>

                  <td className="p-3">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={Boolean(form.active)}
                        onChange={(e) => setField("active", e.target.checked)}
                      />
                    ) : employee.active ? (
                      "ใช้งาน"
                    ) : (
                      "ปิดใช้งาน"
                    )}
                  </td>

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
                        onClick={() => startEdit(employee)}
                        className="rounded bg-slate-900 px-3 py-1 text-xs text-white"
                      >
                        แก้ไข
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  ไม่พบข้อมูลพนักงาน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}