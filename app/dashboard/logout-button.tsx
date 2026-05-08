"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    try {
      setLoading(true);

      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      window.location.href = "/login";
    } catch {
      alert("ออกจากระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
    >
      {loading
        ? "กำลังออกจากระบบ..."
        : "ออกจากระบบ"}
    </button>
  );
}