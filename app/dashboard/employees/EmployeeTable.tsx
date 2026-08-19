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
  department_id?: string | null;
  department_name?: string | null;
  pincode?: string | null;
};

type Department = {
  id: string;
  name: string;
};

type EmployeeForm = {
  id?: string;
  employee_code: string;
  full_name: string;
  department_id: string;
  department_name: string;
  position: string;
  role: string;
  pincode: string;
  active: boolean;
};

const EMPTY_FORM: EmployeeForm = {
  employee_code: "",
  full_name: "",
  department_id: "",
  department_name: "",
  position: "",
  role: "employee",
  pincode: "",
  active: true,
};

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function getRoleLabel(role: string): string {
  if (role === "general_manager") return "GM";
  if (role === "section_manager") return "SM";
  if (role === "hr") return "HR";
  return "พนักงาน";
}

function getRoleClass(role: string): string {
  if (role === "general_manager") return "bg-red-100 text-red-700";
  if (role === "section_manager") return "bg-purple-100 text-purple-700";
  if (role === "hr") return "bg-orange-100 text-orange-700";
  return "bg-green-100 text-green-700";
}


export default function EmployeeTable({
  employees,
  departments,
}: {
  employees: Employee[];
  departments: Department[];
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);

  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [newEmployee, setNewEmployee] =
    useState<EmployeeForm>(EMPTY_FORM);

  const departmentMap = useMemo(() => {
    return new Map(
      departments.map((department) => [
        cleanString(department.id),
        cleanString(department.name),
      ])
    );
  }, [departments]);

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const text = [
        employee.employee_code,
        employee.full_name,
        employee.position,
        employee.department_name,
        getRoleLabel(employee.role),
      ]
        .map((value) => cleanString(value).toLowerCase())
        .join(" ");

      const matchesSearch = !keyword || text.includes(keyword);

      const matchesDepartment =
        departmentFilter === "all" ||
        cleanString(employee.department_id) === departmentFilter;

      const matchesRole =
        roleFilter === "all" || employee.role === roleFilter;

      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" && employee.active) ||
        (activeFilter === "inactive" && !employee.active);

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesRole &&
        matchesActive
      );
    });
  }, [
    employees,
    search,
    departmentFilter,
    roleFilter,
    activeFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / pageSize)
  );

  const safePage = Math.min(page, totalPages);

  const pagedEmployees = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, safePage]);

  function startEdit(employee: Employee) {
    setEditingId(employee.id);

    setForm({
      id: employee.id,
      employee_code: cleanString(employee.employee_code),
      full_name: cleanString(employee.full_name),
      department_id: cleanString(employee.department_id),
      department_name: cleanString(employee.department_name),
      position: cleanString(employee.position),
      role: cleanString(employee.role) || "employee",
      pincode: cleanString(employee.pincode),
      active: Boolean(employee.active),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function setField<K extends keyof EmployeeForm>(
    field: K,
    value: EmployeeForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function setNewField<K extends keyof EmployeeForm>(
    field: K,
    value: EmployeeForm[K]
  ) {
    setNewEmployee((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleEditDepartmentChange(departmentId: string) {
    setForm((previous) => ({
      ...previous,
      department_id: departmentId,
      department_name: departmentMap.get(departmentId) || "",
    }));
  }

  function handleCreateDepartmentChange(departmentId: string) {
    setNewEmployee((previous) => ({
      ...previous,
      department_id: departmentId,
      department_name: departmentMap.get(departmentId) || "",
    }));
  }

  function validateEmployee(data: EmployeeForm): string | null {
    if (!cleanString(data.employee_code)) {
      return "กรุณากรอกรหัสพนักงาน";
    }

    if (!cleanString(data.full_name)) {
      return "กรุณากรอกชื่อ-นามสกุล";
    }

    if (!cleanString(data.department_id)) {
      return "กรุณาเลือกแผนก";
    }

    if (!cleanString(data.role)) {
      return "กรุณาเลือก Role";
    }

    if (!cleanString(data.pincode)) {
      return "กรุณากรอก PIN";
    }

    return null;
  }

  async function saveEdit() {
    const validationMessage = validateEmployee(form);

    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/update-employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        alert(data.message || "แก้ไขข้อมูลไม่สำเร็จ");
        return;
      }

      alert("บันทึกข้อมูลสำเร็จ");
      cancelEdit();
      router.refresh();
    } catch (error) {
      console.error("Update employee error:", error);
      alert("เกิดข้อผิดพลาดระหว่างแก้ไขข้อมูล");
    } finally {
      setLoading(false);
    }
  }

  async function createEmployee() {
    const validationMessage = validateEmployee(newEmployee);

    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/create-employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEmployee),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        alert(data.message || "เพิ่มพนักงานไม่สำเร็จ");
        return;
      }

      alert("เพิ่มพนักงานสำเร็จ");
      setNewEmployee(EMPTY_FORM);
      setShowCreate(false);
      router.refresh();
    } catch (error) {
      console.error("Create employee error:", error);
      alert("เกิดข้อผิดพลาดระหว่างเพิ่มพนักงาน");
    } finally {
      setLoading(false);
    }
  }

  async function deleteEmployee(employee: Employee) {
    const confirmed = window.confirm(
      `ยืนยันการลบพนักงาน ${employee.employee_code} - ${employee.full_name}?\n\nการลบไม่สามารถย้อนกลับได้`
    );

    if (!confirmed) return;

    try {
      setDeletingId(employee.id);

      const response = await fetch("/api/delete-employee", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: employee.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        alert(data.message || "ลบพนักงานไม่สำเร็จ");
        return;
      }

      alert("ลบพนักงานสำเร็จ");

      if (editingId === employee.id) {
        cancelEdit();
      }

      router.refresh();
    } catch (error) {
      console.error("Delete employee error:", error);
      alert("เกิดข้อผิดพลาดระหว่างลบพนักงาน");
    } finally {
      setDeletingId(null);
    }
  }

  function resetFilters() {
    setSearch("");
    setDepartmentFilter("all");
    setRoleFilter("all");
    setActiveFilter("all");
    setPage(1);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-red-100 bg-white shadow-xl">
      <div className="border-b border-red-100 bg-red-50 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              รายชื่อพนักงาน
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              แสดง {filteredEmployees.length} จาก {employees.length} คน
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowCreate((previous) => !previous);
              setNewEmployee(EMPTY_FORM);
            }}
            className="w-fit rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-red-700"
          >
            {showCreate ? "ปิดฟอร์ม" : "+ เพิ่มพนักงาน"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="ค้นหาชื่อ / รหัส / ตำแหน่ง"
            className="rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100 xl:col-span-2"
          />

          <select
            value={departmentFilter}
            onChange={(event) => {
              setDepartmentFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
          >
            <option value="all">ทุกแผนก</option>

            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
          >
            <option value="all">ทุก Role</option>
            <option value="employee">พนักงาน</option>
            <option value="section_manager">SM</option>
            <option value="hr">HR</option>
            <option value="general_manager">GM</option>
          </select>

          <div className="flex gap-2">
            <select
              value={activeFilter}
              onChange={(event) => {
                setActiveFilter(event.target.value);
                setPage(1);
              }}
              className="min-w-0 flex-1 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="active">ใช้งาน</option>
              <option value="inactive">ปิดใช้งาน</option>
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              ล้าง
            </button>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="border-b border-red-100 bg-red-50/40 p-5">
          <h3 className="text-lg font-black text-slate-900">
            เพิ่มพนักงานใหม่
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                รหัสพนักงาน
              </label>
              <input
                value={newEmployee.employee_code}
                onChange={(event) =>
                  setNewField("employee_code", event.target.value)
                }
                placeholder="เช่น 00014525"
                className="input-control"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                ชื่อ-นามสกุล
              </label>
              <input
                value={newEmployee.full_name}
                onChange={(event) =>
                  setNewField("full_name", event.target.value)
                }
                placeholder="ชื่อ-นามสกุล"
                className="input-control"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                แผนก
              </label>
              <select
                value={newEmployee.department_id}
                onChange={(event) =>
                  handleCreateDepartmentChange(event.target.value)
                }
                className="input-control"
              >
                <option value="">เลือกแผนก</option>

                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                ตำแหน่ง
              </label>
              <input
                value={newEmployee.position}
                onChange={(event) =>
                  setNewField("position", event.target.value)
                }
                placeholder="ตำแหน่งงาน"
                className="input-control"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Role
              </label>
              <select
                value={newEmployee.role}
                onChange={(event) =>
                  setNewField("role", event.target.value)
                }
                className="input-control"
              >
                <option value="employee">พนักงาน</option>
                <option value="section_manager">Section Manager</option>
                <option value="hr">HR</option>
                <option value="general_manager">
                  General Manager
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                PIN
              </label>
              <input
                value={newEmployee.pincode}
                onChange={(event) =>
                  setNewField("pincode", event.target.value)
                }
                placeholder="PIN"
                inputMode="numeric"
                className="input-control"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={createEmployee}
              disabled={loading}
              className="rounded-2xl bg-red-600 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "กำลังบันทึก..." : "บันทึกพนักงาน"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setNewEmployee(EMPTY_FORM);
              }}
              disabled={loading}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      <div className="w-full overflow-hidden">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b bg-red-50 text-left text-red-900 shadow-sm">
              <th className="w-[12%] px-4 py-3">รหัส</th>
              <th className="w-[20%] px-4 py-3">ชื่อ</th>
              <th className="w-[15%] px-4 py-3">แผนก</th>
              <th className="w-[15%] px-4 py-3">ตำแหน่ง</th>
              <th className="w-[10%] px-4 py-3">Role</th>
              <th className="w-[8%] px-4 py-3">PIN</th>
              <th className="w-[9%] px-4 py-3">สถานะ</th>
              <th className="w-[11%] px-4 py-3 text-center">จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {pagedEmployees.map((employee) => {
              const isEditing = editingId === employee.id;

              return (
                <tr
                  key={employee.id}
                  className="border-b border-red-50 align-top transition hover:bg-red-50/40"
                >
                  <td className="truncate px-4 py-3 font-bold">
                    {isEditing ? (
                      <input
                        value={form.employee_code}
                        onChange={(event) =>
                          setField("employee_code", event.target.value)
                        }
                        className="table-input w-full"
                      />
                    ) : (
                      employee.employee_code
                    )}
                  </td>

                  <td className="truncate px-4 py-3">
                    {isEditing ? (
                      <input
                        value={form.full_name}
                        onChange={(event) =>
                          setField("full_name", event.target.value)
                        }
                        className="table-input w-full"
                      />
                    ) : (
                      employee.full_name
                    )}
                  </td>

                  <td className="truncate px-4 py-3">
                    {isEditing ? (
                      <select
                        value={form.department_id}
                        onChange={(event) =>
                          handleEditDepartmentChange(event.target.value)
                        }
                        className="table-input w-full"
                      >
                        <option value="">เลือกแผนก</option>

                        {departments.map((department) => (
                          <option
                            key={department.id}
                            value={department.id}
                          >
                            {department.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      employee.department_name || "-"
                    )}
                  </td>

                  <td className="truncate px-4 py-3">
                    {isEditing ? (
                      <input
                        value={form.position}
                        onChange={(event) =>
                          setField("position", event.target.value)
                        }
                        className="table-input w-full"
                      />
                    ) : (
                      employee.position || "-"
                    )}
                  </td>

                  <td className="truncate px-4 py-3">
                    {isEditing ? (
                      <select
                        value={form.role}
                        onChange={(event) =>
                          setField("role", event.target.value)
                        }
                        className="table-input w-full"
                      >
                        <option value="employee">พนักงาน</option>
                        <option value="section_manager">SM</option>
                        <option value="hr">HR</option>
                        <option value="general_manager">GM</option>
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

                  <td className="truncate px-4 py-3">
                    {isEditing ? (
                      <input
                        value={form.pincode}
                        onChange={(event) =>
                          setField("pincode", event.target.value)
                        }
                        inputMode="numeric"
                        className="table-input w-full"
                      />
                    ) : (
                      employee.pincode || "-"
                    )}
                  </td>

                  <td className="truncate px-4 py-3">
                    {isEditing ? (
                      <label className="inline-flex items-center gap-2 font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={form.active}
                          onChange={(event) =>
                            setField("active", event.target.checked)
                          }
                          className="h-4 w-4 accent-red-600"
                        />
                        ใช้งาน
                      </label>
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

                  <td className="truncate px-4 py-3">
                    {isEditing ? (
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={loading}
                          className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {loading ? "กำลังบันทึก" : "บันทึก"}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={loading}
                          className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-300 disabled:opacity-50"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(employee)}
                          disabled={deletingId === employee.id}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
                        >
                          แก้ไข
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteEmployee(employee)}
                          disabled={deletingId === employee.id || loading}
                          className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === employee.id ? "กำลังลบ" : "ลบ"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredEmployees.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="p-12 text-center text-slate-500"
                >
                  ไม่พบข้อมูลพนักงานตามเงื่อนไขที่เลือก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-red-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          หน้า {safePage} จาก {totalPages} · แสดงไม่เกิน {pageSize} คนต่อหน้า
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage <= 1}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ก่อนหน้า
          </button>

          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={safePage >= totalPages}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ถัดไป
          </button>
        </div>
      </div>

      <style jsx>{`
        .input-control {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(254 202 202);
          background: white;
          padding: 0.75rem 1rem;
          outline: none;
        }

        .input-control:focus {
          border-color: rgb(248 113 113);
          box-shadow: 0 0 0 4px rgb(254 226 226);
        }

        .table-input {
          border-radius: 0.625rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0.4rem 0.5rem;
          outline: none;
        }

        .table-input:focus {
          border-color: rgb(248 113 113);
          box-shadow: 0 0 0 3px rgb(254 226 226);
        }
      `}</style>
    </section>
  );
}