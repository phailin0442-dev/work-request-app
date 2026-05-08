"use client";

import Link from "next/link";
import { useState } from "react";

export default function LeavePage() {
  const [leaveType, setLeaveType] = useState("");
  const [leaveDay, setLeaveDay] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/leave-form-request", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leave_type: leaveType,
          leave_day: leaveDay,
          leave_reason: leaveReason,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMessage(data.message || "บันทึกไม่สำเร็จ");
        return;
      }

      setMessage("ส่งคำขอลาสำเร็จแล้ว");
      setLeaveType("");
      setLeaveDay("");
      setLeaveReason("");
    } catch (error: any) {
      setMessage(error?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">ขอลา</h1>
        <p className="mt-2 text-slate-600">
          กรอกข้อมูลคำขอลาแล้วกดส่ง
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">ประเภทการลา</label>
            <input
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              placeholder="เช่น ลาป่วย"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">วันที่ลา</label>
            <input
              value={leaveDay}
              onChange={(e) => setLeaveDay(e.target.value)}
              placeholder="เช่น 2026-05-08"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">เหตุผล</label>
            <textarea
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              rows={4}
              placeholder="กรอกเหตุผลการลา"
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
              {loading ? "กำลังบันทึก..." : "ส่งคำขอลา"}
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