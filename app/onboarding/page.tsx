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

const BRAND_COLORS = [
  "#171717",
  "#6E665F",
  "#A69084",
  "#7B8277",
  "#857A8D",
  "#8D6D6D",
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
  const [slugTouched, setSlugTouched] = useState(false);

  const [industries, setIndustries] = useState<string[]>([]);
  const [industryOther, setIndustryOther] = useState("");

  const [primaryColor, setPrimaryColor] = useState("#171717");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

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
  }, [router]);

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

    if (!slugTouched) {
      setSlug(generateSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(generateSlug(value));
  }

  function toggleIndustry(value: string) {
    setIndustries((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  function validateCurrentStep() {
    setMessage("");

    if (step === 1) {
      if (!name.trim()) {
        setMessage("請輸入工作室名稱。");
        return false;
      }

      if (!slug.trim()) {
        setMessage("請輸入預約網址名稱。");
        return false;
      }
    }

    if (step === 2) {
      if (industries.length === 0) {
        setMessage("請至少選擇一個產業類型。");
        return false;
      }

      if (
        industries.includes("other") &&
        !industryOther.trim()
      ) {
        setMessage("請輸入其他產業名稱。");
        return false;
      }
    }

    return true;
  }

  function nextStep() {
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(current + 1, 4));
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

    if (
      industries.includes("other") &&
      !industryOther.trim()
    ) {
      setMessage("請輸入其他產業名稱。");
      setStep(2);
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
        primary_color: primaryColor,
        instagram: instagram.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
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
          color: "#171717",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            letterSpacing: "0.14em",
          }}
        >
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
            ["02", "產業類型"],
            ["03", "品牌設定"],
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

                <span style={{ fontSize: "14px" }}>
                  {label}
                </span>
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
                  onChange={(e) =>
                    handleNameChange(e.target.value)
                  }
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
                    onChange={(e) =>
                      handleSlugChange(e.target.value)
                    }
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

              <h1 style={title}>你的工作室做什麼？</h1>

              <p style={description}>
                可以複選。美甲、美睫、美髮、霧眉、按摩等可以同時存在，不會限制後續服務內容。
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
                  const selected =
                    industries.includes(industry.value);

                  return (
                    <button
                      key={industry.value}
                      type="button"
                      onClick={() =>
                        toggleIndustry(industry.value)
                      }
                      style={{
                        border: "none",
                        background: selected
                          ? "#171717"
                          : "#F7F7F5",
                        color: selected
                          ? "#FFFFFF"
                          : "#171717",
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
                  <label style={labelStyle}>
                    其他產業名稱
                  </label>

                  <input
                    value={industryOther}
                    onChange={(e) =>
                      setIndustryOther(e.target.value)
                    }
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

              <h1 style={title}>品牌基本設定</h1>

              <p style={description}>
                先設定最基本的品牌資訊，之後可以在工作室設定裡繼續修改。
              </p>

              <div style={{ marginTop: "46px" }}>
                <label style={labelStyle}>品牌主色</label>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  {BRAND_COLORS.map((color) => {
                    const selected =
                      primaryColor === color;

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          setPrimaryColor(color)
                        }
                        aria-label={color}
                        style={{
                          width: "42px",
                          height: "42px",
                          border:
                            selected
                              ? "2px solid #171717"
                              : "1px solid #C8C8C3",
                          background: color,
                          cursor: "pointer",
                          boxShadow: selected
                            ? "0 0 0 3px #F7F7F5, 0 0 0 4px #171717"
                            : "none",
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: "36px" }}>
                <label style={labelStyle}>Instagram</label>

                <input
                  value={instagram}
                  onChange={(e) =>
                    setInstagram(e.target.value)
                  }
                  placeholder="@momo.beauty"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginTop: "34px" }}>
                <label style={labelStyle}>電話</label>

                <input
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  placeholder="0912 345 678"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginTop: "34px" }}>
                <label style={labelStyle}>地址</label>

                <input
                  value={address}
                  onChange={(e) =>
                    setAddress(e.target.value)
                  }
                  placeholder="台北市..."
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div style={eyebrow}>READY</div>

              <h1 style={title}>準備完成。</h1>

              <p style={description}>
                建立後會自動啟用 FREE 方案。服務人員的姓名、職稱與可提供服務，會在之後建立人員時個別設定。
              </p>

              <div
                style={{
                  marginTop: "48px",
                  borderTop: "1px solid #CACAC5",
                  borderBottom: "1px solid #CACAC5",
                }}
              >
                <SummaryRow
                  label="工作室"
                  value={name}
                />

                <SummaryRow
                  label="產業"
                  value={industries
                    .map((value) => {
                      if (value === "other") {
                        return industryOther || "其他";
                      }

                      return INDUSTRIES.find(
                        (item) =>
                          item.value === value
                      )?.label;
                    })
                    .filter(Boolean)
                    .join("、")}
                />

                <SummaryRow
                  label="品牌主色"
                  value={primaryColor}
                />

                <SummaryRow
                  label="方案"
                  value="FREE"
                />
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
                  setStep((current) =>
                    Math.max(current - 1, 1)
                  );
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
                onClick={nextStep}
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
                {saving
                  ? "CREATING..."
                  : "CREATE STUDIO"}
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
      <span style={{ color: "#888" }}>
        {label}
      </span>

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
  maxWidth: "540px",
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
  color: "#FFFFFF",
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
