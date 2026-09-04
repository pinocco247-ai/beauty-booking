"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const INDUSTRIES = [
  { value: "hair", label: "美髮" },
  { value: "nail", label: "美甲 / 凝膠" },
  { value: "lashes", label: "美睫" },
  { value: "brow", label: "霧眉 / 紋繡" },
  { value: "facial", label: "美容 / 做臉" },
  { value: "massage", label: "按摩" },
  { value: "spa", label: "SPA" },
  { value: "foot_care", label: "足部保養 / 修腳" },
  { value: "hair_removal", label: "除毛" },
  { value: "other", label: "其他" },
];

const STAFF_LABELS = [
  "設計師",
  "美容師",
  "美甲師",
  "美睫師",
  "芳療師",
  "按摩師",
  "技師",
  "老師",
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [industryOther, setIndustryOther] = useState("");

  const [staffLabel, setStaffLabel] = useState("設計師");
  const [customStaffLabel, setCustomStaffLabel] = useState("");

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: studio } = await supabase
        .from("studios")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (studio) {
        router.replace("/dashboard");
        return;
      }

      setChecking(false);
    }

    checkUser();
  }, [router, supabase]);

  function generateSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleNameChange(value: string) {
    setName(value);

    if (!slug) {
      setSlug(generateSlug(value));
    }
  }

  function toggleIndustry(value: string) {
    setIndustries((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  async function createStudio() {
    setMessage("");

    if (!name.trim()) {
      setMessage("請輸入工作室名稱。");
      setStep(1);
      return;
    }

    if (!slug.trim()) {
      setMessage("請輸入預約網址名稱。");
      setStep(1);
      return;
    }

    if (industries.length === 0) {
      setMessage("請至少選擇一個產業類型。");
      setStep(2);
      return;
    }

    const finalStaffLabel =
      staffLabel === "自訂" ? customStaffLabel.trim() : staffLabel;

    if (!finalStaffLabel) {
      setMessage("請設定服務人員稱呼。");
      setStep(3);
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: studio, error: studioError } = await supabase
      .from("studios")
      .insert({
        owner_id: user.id,
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        staff_label: finalStaffLabel,
        industry_other:
          industries.includes("other") && industryOther.trim()
            ? industryOther.trim()
            : null,
      })
      .select("id")
      .single();

    if (studioError) {
      if (studioError.code === "23505") {
        setMessage("這個預約網址已經有人使用，請換一個。");
        setStep(1);
      } else {
        setMessage(`建立失敗：${studioError.message}`);
      }

      setSaving(false);
      return;
    }

    const industryRows = industries.map((industry) => ({
      studio_id: studio.id,
      industry,
    }));

    const { error: industryError } = await supabase
      .from("studio_industries")
      .insert(industryRows);

    if (industryError) {
      setMessage(`產業資料建立失敗：${industryError.message}`);
      setSaving(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F7F7F5",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <span style={{ fontSize: "13px", letterSpacing: "0.12em" }}>
          LOADING...
        </span>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F7F7F5",
        color: "#171717",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          height: "76px",
          padding: "0 48px",
          borderBottom: "1px solid #DCDCD7",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#F7F7F5",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            letterSpacing: "0.18em",
          }}
        >
          BEAUTY BOOKING
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#777",
            letterSpacing: "0.08em",
          }}
        >
          SET UP YOUR STUDIO
        </div>
      </header>

      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          minHeight: "calc(100vh - 77px)",
        }}
      >
        <aside
          style={{
            padding: "64px 40px 40px 0",
            borderRight: "1px solid #DCDCD7",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "#8A8A85",
              letterSpacing: "0.14em",
              marginBottom: "28px",
            }}
          >
            SETUP
          </div>

          {[
            ["01", "工作室"],
            ["02", "服務類型"],
            ["03", "人員稱呼"],
            ["04", "完成"],
          ].map(([number, label], index) => {
            const active = step === index + 1;

            return (
              <div
                key={number}
                style={{
                  display: "flex",
                  gap: "18px",
                  padding: "15px 0",
                  color: active ? "#111" : "#999",
                  borderBottom: "1px solid #E4E4E0",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                  }}
                >
                  {number}
                </span>

                <span style={{ fontSize: "14px" }}>{label}</span>
              </div>
            );
          })}
        </aside>

        <section
          style={{
            padding: "64px 0 80px 72px",
            maxWidth: "700px",
          }}
        >
          {step === 1 && (
            <>
              <div style={eyebrow}>STEP 01</div>

              <h1 style={title}>建立你的工作室</h1>

              <p style={description}>
                先設定品牌名稱與公開預約網址，之後都可以在後台修改。
              </p>

              <div style={{ marginTop: "48px" }}>
                <label style={labelStyle}>工作室名稱</label>

                <input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="例如：MOMO BEAUTY"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginTop: "34px" }}>
                <label style={labelStyle}>預約網址</label>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderBottom: "1px solid #AAA",
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#888",
                      whiteSpace: "nowrap",
                    }}
                  >
                    beauty-booking.app/
                  </span>

                  <input
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                    placeholder="momo-beauty"
                    style={{
                      ...inputStyle,
                      borderBottom: "none",
                      paddingLeft: "6px",
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={eyebrow}>STEP 02</div>

              <h1 style={title}>你提供什麼服務？</h1>

              <p style={description}>
                可以複選。這只是工作室分類，不會限制你之後新增的服務。
              </p>

              <div
                style={{
                  marginTop: "46px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1px",
                  background: "#DADAD5",
                  border: "1px solid #DADAD5",
                }}
              >
                {INDUSTRIES.map((industry) => {
                  const selected = industries.includes(industry.value);

                  return (
                    <button
                      key={industry.value}
                      type="button"
                      onClick={() => toggleIndustry(industry.value)}
                      style={{
                        border: "none",
                        background: selected ? "#171717" : "#F7F7F5",
                        color: selected ? "#FFF" : "#171717",
                        padding: "20px",
                        textAlign: "left",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      {selected ? "✓ " : ""}
                      {industry.label}
                    </button>
                  );
                })}
              </div>

              {industries.includes("other") && (
                <div style={{ marginTop: "32px" }}>
                  <label style={labelStyle}>其他產業名稱</label>

                  <input
                    value={industryOther}
                    onChange={(e) => setIndustryOther(e.target.value)}
                    placeholder="例如：頭皮養護"
                    style={inputStyle}
                  />
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div style={eyebrow}>STEP 03</div>

              <h1 style={title}>怎麼稱呼服務人員？</h1>

              <p style={description}>
                顧客預約時會看到「選擇設計師」、「選擇美容師」等文字。
              </p>

              <div
                style={{
                  marginTop: "46px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                {[...STAFF_LABELS, "自訂"].map((item) => {
                  const selected = staffLabel === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setStaffLabel(item)}
                      style={{
                        padding: "17px 20px",
                        border: selected
                          ? "1px solid #171717"
                          : "1px solid #CECEC9",
                        background: selected ? "#171717" : "transparent",
                        color: selected ? "#FFF" : "#171717",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              {staffLabel === "自訂" && (
                <div style={{ marginTop: "32px" }}>
                  <label style={labelStyle}>自訂稱呼</label>

                  <input
                    value={customStaffLabel}
                    onChange={(e) => setCustomStaffLabel(e.target.value)}
                    placeholder="例如：髮型師"
                    style={inputStyle}
                  />
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div style={eyebrow}>READY</div>

              <h1 style={title}>準備完成。</h1>

              <p style={description}>
                建立後會自動啟用 FREE 方案，可先使用 1 位服務人員。
              </p>

              <div
                style={{
                  marginTop: "48px",
                  borderTop: "1px solid #CACAC5",
                  borderBottom: "1px solid #CACAC5",
                }}
              >
                <SummaryRow label="工作室" value={name} />

                <SummaryRow
                  label="產業"
                  value={industries
                    .map(
                      (value) =>
                        INDUSTRIES.find((item) => item.value === value)?.label
                    )
                    .filter(Boolean)
                    .join("、")}
                />

                <SummaryRow
                  label="服務人員稱呼"
                  value={
                    staffLabel === "自訂" ? customStaffLabel : staffLabel
                  }
                />

                <SummaryRow label="方案" value="FREE" />
              </div>
            </>
          )}

          {message && (
            <div
              style={{
                marginTop: "30px",
                padding: "14px 0",
                borderTop: "1px solid #C9C9C4",
                color: "#9A3D37",
                fontSize: "14px",
              }}
            >
              {message}
            </div>
          )}

          <div
            style={{
              marginTop: "52px",
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setStep((current) => current - 1);
                }}
                style={secondaryButton}
              >
                BACK
              </button>
            ) : (
              <span />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setStep((current) => current + 1);
                }}
                style={primaryButton}
              >
                CONTINUE
              </button>
            ) : (
              <button
                type="button"
                onClick={createStudio}
                disabled={saving}
                style={{
                  ...primaryButton,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "CREATING..." : "CREATE STUDIO"}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        padding: "18px 0",
        borderBottom: "1px solid #E0E0DC",
        fontSize: "14px",
      }}
    >
      <span style={{ color: "#888" }}>{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}

const eyebrow: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.18em",
  color: "#858580",
  marginBottom: "18px",
};

const title: React.CSSProperties = {
  fontSize: "46px",
  fontWeight: 500,
  lineHeight: 1.1,
  letterSpacing: "-0.035em",
  margin: 0,
};

const description: React.CSSProperties = {
  maxWidth: "520px",
  color: "#757570",
  fontSize: "15px",
  lineHeight: 1.8,
  marginTop: "18px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  letterSpacing: "0.12em",
  marginBottom: "10px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 0",
  border: "none",
  borderBottom: "1px solid #AAA",
  background: "transparent",
  outline: "none",
  fontSize: "16px",
  color: "#171717",
};

const primaryButton: React.CSSProperties = {
  border: "none",
  background: "#171717",
  color: "#FFF",
  padding: "15px 26px",
  fontSize: "12px",
  letterSpacing: "0.1em",
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  border: "1px solid #BEBEB9",
  background: "transparent",
  color: "#171717",
  padding: "15px 26px",
  fontSize: "12px",
  letterSpacing: "0.1em",
  cursor: "pointer",
};
