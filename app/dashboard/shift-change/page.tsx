"use client";

import Link from "next/link";
import { useState } from "react";

export default function ShiftChangePage() {
  const [shiftDate, setShiftDate] = useState("");
  const [oldShiftCode, setOldShiftCode] = useState("");
  const [oldShiftTime, setOldShiftTime] = useState("");
  const [newShiftCode, setNewShiftCode] = useState("");
  const [newShiftTime, setNewShiftTime] = useState("");
  const [reason, setReason] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/shift-change-request", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shift_date: shiftDate,
          old_shift_code: oldShiftCode,
          old_shift_time: oldShiftTime,
          new_shift_code: newShiftCode,
          new_shift_time: newShiftTime,
          reason,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMessage(data.message || "บันทึกไม่สำเร็จ");
        return;
      }

      setMessage("ส่งคำขอเปลี่ยนกะสำเร็จแล้ว");
      setShiftDate("");
      setOldShiftCode("");
      setOldShiftTime("");
      setNewShiftCode("");
      setNewShiftTime("");
      setReason("");
    } catch (error: any) {
      setMessage(error?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">ขอเปลี่ยนกะ</h1>
        <p className="mt-2 text-slate-600">
          กรอกข้อมูลคำขอเปลี่ยนกะแล้วกดส่ง
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">วันที่ต้องการเปลี่ยนกะ</label>
            <input
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              placeholder="เช่น 2026-05-01"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div className="rounded-xl border p-4 space-y-4">
            <h2 className="font-semibold">กะเดิม</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">กะเดิม</label>
                <input
                  value={oldShiftCode}
                  onChange={(e) => setOldShiftCode(e.target.value)}
                  placeholder="เช่น 07H9"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">เวลาเดิม</label>
                <input
                  value={oldShiftTime}
                  onChange={(e) => setOldShiftTime(e.target.value)}
                  placeholder="เช่น 08.00-17.00"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4 space-y-4">
            <h2 className="font-semibold">กะใหม่</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">กะใหม่</label>
                <input
                  value={newShiftCode}
                  onChange={(e) => setNewShiftCode(e.target.value)}
                  placeholder="เช่น 10H9"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">เวลาใหม่</label>
                <input
                  value={newShiftTime}
                  onChange={(e) => setNewShiftTime(e.target.value)}
                  placeholder="เช่น 10.00-19.00"
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">เหตุผล</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="กรอกเหตุผลการขอเปลี่ยนกะ"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          {message && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              {message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {loading ? "กำลังบันทึก..." : "ส่งคำขอเปลี่ยนกะ"}
            </button>

            <Link
              href="/dashboard"
              className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
            >
              กลับ Dashboard
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}