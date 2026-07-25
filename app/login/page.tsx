"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [employeeCode, setEmployeeCode] = useState("");
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_code: employeeCode.trim(),
          pincode: pincode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.message || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      window.location.href = "/dashboard";
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-info">
          <div className="badge">HR APPROVAL WORKFLOW</div>

          <div>
            <h1>เข้าสู่ระบบ</h1>
            <p>
              ระบบบันทึกเวลาการทำงานของพนักงาน ADECCO
            </p>
          </div>

          <div className="features">
            <div>✅ ยื่น OT / ลา / เปลี่ยนกะ</div>
            <div>✅ Export Excel และจัดการพนักงาน</div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-heading">
            <div className="logo-circle">HR</div>

            <div>
              <h2>Welcome Back</h2>
              <p>กรอกรหัสพนักงานและ PIN เพื่อเข้าใช้งาน</p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="employee-code">รหัสพนักงาน</label>
            <input
              id="employee-code"
              value={employeeCode}
              onChange={(event) =>
                setEmployeeCode(event.target.value)
              }
              placeholder="เช่น AD123456"
              autoComplete="username"
              autoCapitalize="characters"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="pincode">PIN</label>
            <input
              id="pincode"
              value={pincode}
              onChange={(event) =>
                setPincode(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 4)
                )
              }
              placeholder="PIN 4 ตัวท้าย"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              required
            />
          </div>

          {message && (
            <div className="error-box" role="alert">
              {message}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>

          <p className="footer-text">
            © HR Approval Workflow System
          </p>
        </form>
      </section>

      <style jsx>{`
        :global(html),
        :global(body) {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden;
        }

        :global(*) {
          box-sizing: border-box;
        }

        .login-page {
          width: 100%;
          height: 100dvh;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(12px, 2vw, 24px);
          font-family: Arial, Helvetica, sans-serif;
          background:
            linear-gradient(
              135deg,
              #7f1d1d 0%,
              #dc2626 45%,
              #fff1f2 45%,
              #ffffff 100%
            );
        }

        .login-card {
          width: min(1050px, 100%);
          height: min(620px, calc(100dvh - 32px));
          min-height: 0;
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          overflow: hidden;
          border-radius: clamp(22px, 3vw, 32px);
          background: #ffffff;
          box-shadow: 0 30px 70px rgba(127, 29, 29, 0.35);
        }

        .login-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: clamp(22px, 4vh, 36px);
          padding: clamp(32px, 5vw, 56px);
          color: #ffffff;
          background: linear-gradient(135deg, #991b1b, #dc2626);
        }

        .badge {
          width: fit-content;
          max-width: 100%;
          padding: 9px 15px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          font-size: clamp(11px, 1.1vw, 13px);
          font-weight: 800;
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        .login-info h1 {
          margin: 0;
          font-size: clamp(38px, 5vw, 54px);
          font-weight: 900;
          line-height: 1.05;
        }

        .login-info p {
          margin: 14px 0 0;
          max-width: 520px;
          color: #fee2e2;
          font-size: clamp(15px, 1.6vw, 18px);
          line-height: 1.6;
        }

        .features {
          display: grid;
          gap: 12px;
        }

        .features div {
          padding: 13px 15px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.14);
          font-size: clamp(13px, 1.25vw, 15px);
          font-weight: 700;
        }

        .login-form {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: clamp(14px, 2.5vh, 22px);
          padding: clamp(28px, 5vw, 56px);
          background: #ffffff;
        }

        .form-heading {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .logo-circle {
          width: clamp(54px, 5vw, 66px);
          height: clamp(54px, 5vw, 66px);
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          border-radius: 20px;
          background: #fee2e2;
          color: #b91c1c;
          font-size: clamp(20px, 2vw, 24px);
          font-weight: 900;
        }

        .form-heading h2 {
          margin: 0;
          color: #111827;
          font-size: clamp(27px, 3vw, 34px);
          font-weight: 900;
        }

        .form-heading p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.45;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field label {
          color: #334155;
          font-size: 14px;
          font-weight: 800;
        }

        .field input {
          width: 100%;
          min-width: 0;
          height: 50px;
          border: 1px solid #fecaca;
          border-radius: 15px;
          padding: 0 15px;
          outline: none;
          background: #ffffff;
          color: #111827;
          font-size: 16px;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .field input:focus {
          border-color: #ef4444;
          box-shadow: 0 0 0 4px #fee2e2;
        }

        .error-box {
          padding: 12px 14px;
          border-radius: 14px;
          background: #fee2e2;
          color: #991b1b;
          font-size: 13px;
          font-weight: 700;
        }

        button {
          width: 100%;
          min-height: 50px;
          border: none;
          border-radius: 15px;
          padding: 0 18px;
          cursor: pointer;
          background: linear-gradient(135deg, #b91c1c, #ef4444);
          box-shadow: 0 14px 24px rgba(220, 38, 38, 0.25);
          color: #ffffff;
          font-size: 16px;
          font-weight: 900;
          transition:
            transform 0.2s ease,
            opacity 0.2s ease;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .footer-text {
          margin: 0;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
        }

        @media (max-width: 760px) {
          .login-page {
            padding: 12px;
            background: linear-gradient(160deg, #991b1b 0%, #ef4444 34%, #fff1f2 34%);
          }

          .login-card {
            height: calc(100dvh - 24px);
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
            border-radius: 24px;
          }

          .login-info {
            justify-content: flex-start;
            gap: 8px;
            padding: 18px 22px;
          }

          .badge {
            padding: 7px 12px;
            font-size: 10px;
          }

          .login-info h1 {
            margin-top: 2px;
            font-size: 28px;
          }

          .login-info p {
            margin-top: 5px;
            font-size: 13px;
            line-height: 1.35;
          }

          .features {
            display: none;
          }

          .login-form {
            justify-content: center;
            gap: 14px;
            padding: 20px 22px;
          }

          .form-heading {
            flex-direction: row;
            align-items: center;
            gap: 12px;
          }

          .logo-circle {
            width: 52px;
            height: 52px;
            border-radius: 16px;
          }

          .form-heading h2 {
            font-size: 25px;
          }

          .form-heading p {
            font-size: 12px;
          }

          .field input,
          button {
            min-height: 48px;
            height: 48px;
          }
        }

        @media (max-height: 650px) and (min-width: 761px) {
          .login-card {
            height: calc(100dvh - 20px);
          }

          .login-info,
          .login-form {
            padding-top: 24px;
            padding-bottom: 24px;
          }

          .login-info {
            gap: 18px;
          }

          .features {
            gap: 8px;
          }

          .features div {
            padding: 10px 13px;
          }

          .login-form {
            gap: 12px;
          }

          .logo-circle {
            width: 52px;
            height: 52px;
            border-radius: 16px;
          }

          .field input,
          button {
            height: 46px;
            min-height: 46px;
          }
        }

        @media (max-height: 560px) {
          .footer-text {
            display: none;
          }

          .login-info p {
            line-height: 1.35;
          }
        }
      `}</style>
    </main>
  );
}