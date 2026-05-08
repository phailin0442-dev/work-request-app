"use client";

import { useState } from "react";

export default function LoginPage() {
  const [employeeCode, setEmployeeCode] = useState("");
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_code: employeeCode,
          pincode,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMessage(data.message || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setMessage("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4"
      >
        <div>
          <h1 className="text-2xl font-bold">เข้าสู่ระบบ</h1>
          <p className="text-sm text-slate-500">
            ใช้รหัสพนักงาน และ PIN
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">รหัสพนักงาน</label>
          <input
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium">PIN</label>
          <input
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            type="password"
            maxLength={4}
            className="w-full border rounded-lg px-3 py-2 mt-1"
          />
        </div>

        {message && (
          <div className="text-sm text-red-600">
            {message}
          </div>
        )}

        <button
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-2"
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </main>
  );
}