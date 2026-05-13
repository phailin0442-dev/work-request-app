"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Employee = {
  id: string;
  employee_code: string;
  full_name: string;
  position?: string | null;
  role: string;
  active: boolean;
  department_name?: string | null;
  pincode?: string | null;
};

function getRoleLabel(role: string) {
  if (role === "general_manager") return "GM";
  if (role === "section_manager") return "SM";
  if (role === "hr") return "HR";
  return "พนักงาน";
}

function getRoleClass(role: string) {
  if (role === "general_manager") return "bg-red-100 text-red-700";
  if (role === "section_manager") return "bg-purple-100 text-purple-700";
  if (role === "hr") return "bg-orange-100 text-orange-700";
  return "bg-green-100 text-green-700";
}

export default function EmployeeTable({
  employees,
}: {
  employees: Employee[];
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [form, setForm] = useState<any>({});

  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);

  const [newEmployee, setNewEmployee] = useState({
    employee_code: "",
    full_name: "",
    department_name: "",
    position: "",
    role: "employee",
    pincode: "",
  });

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const text = `
        ${employee.employee_code}
        ${employee.full_name}
        ${employee.position || ""}
        ${employee.department_name || ""}
      `.toLowerCase();

      return text.includes(keyword);
    });
  }, [employees, search]);

  function startEdit(employee: Employee) {
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
    try {
      setLoading(true);

      const res = await fetch("/api/update-employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.ok) {
        alert(data.message || "แก้ไขไม่สำเร็จ");
        return;
      }

      alert("บันทึกสำเร็จ");

      setEditingId(null);
      setForm({});

      router.refresh();
    } catch (error) {
      alert("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  async function createEmployee() {
    try {
      setLoading(true);

      const res = await fetch("/api/create-employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEmployee),
      });

      const data = await res.json();

      if (!data.ok) {
        alert(data.message || "เพิ่มพนักงานไม่สำเร็จ");
        return;
      }

      alert("เพิ่มพนักงานสำเร็จ");

      setNewEmployee({
        employee_code: "",
        full_name: "",
        department_name: "",
        position: "",
        role: "employee",
        pincode: "",
      });

      setShowCreate(false);

      router.refresh();
    } catch (error) {
      alert("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-red-100 bg-white shadow-xl">
      <div className="border-b border-red-100 bg-red-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              รายชื่อพนักงาน
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              HR สามารถแก้ไขข้อมูลพนักงานได้
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-red-700"
            >
              {showCreate ? "ปิดฟอร์ม" : "+ เพิ่มพนักงาน"}
            </button>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ / รหัส / แผนก"
              className="w-full rounded-2xl border border-red-100 px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100 lg:w-80"
            />
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="border-b border-red-100 bg-red-50/40 p-5">
          <h3 className="text-lg font-black text-slate-900">
            เพิ่มพนักงานใหม่
          </h3>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <input
              value={newEmployee.employee_code}
              onChange={(e) =>
                setNewField(
                  "employee_code",
                  e.target.value
                )
              }
              placeholder="รหัสพนักงาน"
              className="rounded-2xl border border-red-100 px-4 py-3"
            />

            <input
              value={newEmployee.full_name}
              onChange={(e) =>
                setNewField("full_name", e.target.value)
              }
              placeholder="ชื่อ-นามสกุล"
              className="rounded-2xl border border-red-100 px-4 py-3"
            />

            <input
              value={newEmployee.department_name}
              onChange={(e) =>
                setNewField(
                  "department_name",
                  e.target.value
                )
              }
              placeholder="แผนก"
              className="rounded-2xl border border-red-100 px-4 py-3"
            />

            <input
              value={newEmployee.position}
              onChange={(e) =>
                setNewField("position", e.target.value)
              }
              placeholder="ตำแหน่ง"
              className="rounded-2xl border border-red-100 px-4 py-3"
            />

            <select
              value={newEmployee.role}
              onChange={(e) =>
                setNewField("role", e.target.value)
              }
              className="rounded-2xl border border-red-100 px-4 py-3"
            >
              <option value="employee">employee</option>

              <option value="section_manager">
                section_manager
              </option>

              <option value="hr">hr</option>

              <option value="general_manager">
                general_manager
              </option>
            </select>

            <input
              value={newEmployee.pincode}
              onChange={(e) =>
                setNewField("pincode", e.target.value)
              }
              placeholder="PIN"
              className="rounded-2xl border border-red-100 px-4 py-3"
            />
          </div>

          <button
            onClick={createEmployee}
            disabled={loading}
            className="mt-5 rounded-2xl bg-red-600 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "กำลังเพิ่ม..." : "บันทึกพนักงาน"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-red-50 text-left text-red-900">
              <th className="px-5 py-4">รหัส</th>
              <th className="px-5 py-4">ชื่อ</th>
              <th className="px-5 py-4">แผนก</th>
              <th className="px-5 py-4">ตำแหน่ง</th>
              <th className="px-5 py-4">Role</th>
              <th className="px-5 py-4">PIN</th>
              <th className="px-5 py-4">สถานะ</th>
              <th className="px-5 py-4">จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {filteredEmployees.map((employee) => {
              const isEditing =
                editingId === employee.id;

              return (
                <tr
                  key={employee.id}
                  className="border-b border-red-50 hover:bg-red-50/40"
                >
                  <td className="px-5 py-4 font-bold">
                    {isEditing ? (
                      <input
                        value={
                          form.employee_code || ""
                        }
                        onChange={(e) =>
                          setField(
                            "employee_code",
                            e.target.value
                          )
                        }
                        className="rounded-lg border px-2 py-1"
                      />
                    ) : (
                      employee.employee_code
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {isEditing ? (
                      <input
                        value={form.full_name || ""}
                        onChange={(e) =>
                          setField(
                            "full_name",
                            e.target.value
                          )
                        }
                        className="rounded-lg border px-2 py-1"
                      />
                    ) : (
                      employee.full_name
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {isEditing ? (
                      <input
                        value={
                          form.department_name || ""
                        }
                        onChange={(e) =>
                          setField(
                            "department_name",
                            e.target.value
                          )
                        }
                        className="rounded-lg border px-2 py-1"
                      />
                    ) : (
                      employee.department_name || "-"
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {isEditing ? (
                      <input
                        value={form.position || ""}
                        onChange={(e) =>
                          setField(
                            "position",
                            e.target.value
                          )
                        }
                        className="rounded-lg border px-2 py-1"
                      />
                    ) : (
                      employee.position || "-"
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {isEditing ? (
                      <select
                        value={form.role || ""}
                        onChange={(e) =>
                          setField(
                            "role",
                            e.target.value
                          )
                        }
                        className="rounded-lg border px-2 py-1"
                      >
                        <option value="employee">
                          employee
                        </option>

                        <option value="section_manager">
                          section_manager
                        </option>

                        <option value="hr">
                          hr
                        </option>

                        <option value="general_manager">
                          general_manager
                        </option>
                      </select>
                    ) : (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${getRoleClass(
                          employee.role
                        )}`}
                      >
                        {getRoleLabel(employee.role)}
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {isEditing ? (
                      <input
                        value={form.pincode || ""}
                        onChange={(e) =>
                          setField(
                            "pincode",
                            e.target.value
                          )
                        }
                        className="rounded-lg border px-2 py-1"
                      />
                    ) : (
                      employee.pincode || "-"
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={Boolean(form.active)}
                        onChange={(e) =>
                          setField(
                            "active",
                            e.target.checked
                          )
                        }
                      />
                    ) : employee.active ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                        ใช้งาน
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                        ปิดใช้งาน
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={loading}
                          className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white"
                        >
                          บันทึก
                        </button>

                        <button
                          onClick={cancelEdit}
                          className="rounded-xl bg-slate-300 px-4 py-2 text-xs font-bold"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          startEdit(employee)
                        }
                        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
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
                <td
                  colSpan={8}
                  className="p-10 text-center text-slate-500"
                >
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