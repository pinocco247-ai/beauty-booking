"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

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

type Studio = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  phone: string | null;
  address: string | null;
  instagram: string | null;
  industry_other: string | null;
};

export default function StudioSettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [studioId, setStudioId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#171717");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [instagram, setInstagram] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [industryOther, setIndustryOther] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadStudio() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: studioData, error: studioError } = await supabase
        .from("studios")
        .select(
          "id, name, slug, logo_url, primary_color, phone, address, instagram, industry_other"
        )
        .eq("owner_id", user.id)
        .maybeSingle();

      if (studioError) {
        setMessage(`讀取失敗：${studioError.message}`);
        setLoading(false);
        return;
      }

      if (!studioData) {
        router.replace("/onboarding");
        return;
      }

      const studio = studioData as Studio;

      setStudioId(studio.id);
      setName(studio.name);
      setSlug(studio.slug);
      setLogoUrl(studio.logo_url || "");
      setPrimaryColor(studio.primary_color || "#171717");
      setPhone(studio.phone || "");
      setAddress(studio.address || "");
      setInstagram(studio.instagram || "");
      setIndustryOther(studio.industry_other || "");

      const { data: industryData, error: industryError } = await supabase
        .from("studio_industries")
        .select("industry")
        .eq("studio_id", studio.id);

      if (industryError) {
        setMessage(`讀取產業失敗：${industryError.message}`);
        setLoading(false);
        return;
      }

      setIndustries(
        (industryData || []).map((item: { industry: string }) => item.industry)
      );

      setLoading(false);
    }

    loadStudio();
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

  function toggleIndustry(value: string) {
    setIndustries((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  async function saveStudio() {
    setMessage("");
    setSuccess(false);

    if (!name.trim()) {
      setMessage("請輸入工作室名稱。");
      return;
    }

    if (!slug.trim()) {
      setMessage("請輸入公開預約網址。");
      return;
    }

    if (industries.length === 0) {
      setMessage("請至少選擇一個產業類型。");
      return;
    }

    if (industries.includes("other") && !industryOther.trim()) {
      setMessage("請輸入其他產業名稱。");
      return;
    }

    setSaving(true);

    const { error: studioError } = await supabase
      .from("studios")
      .update({
        name: name.trim(),
        slug: slug.trim(),
        logo_url: logoUrl.trim() || null,
        primary_color: primaryColor,
        phone: phone.trim() || null,
        address: address.trim() || null,
        instagram: instagram.trim() || null,
        industry_other:
          industries.includes("other") && industryOther.trim()
            ? industryOther.trim()
            : null,
      })
      .eq("id", studioId);

    if (studioError) {
      if (studioError.code === "23505") {
        setMessage("這個公開預約網址已經有人使用，請換一個。");
      } else {
        setMessage(`儲存失敗：${studioError.message}`);
      }

      setSaving(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("studio_industries")
      .delete()
      .eq("studio_id", studioId);

    if (deleteError) {
      setMessage(`更新產業失敗：${deleteError.message}`);
      setSaving(false);
      return;
    }

    const rows = industries.map((industry) => ({
      studio_id: studioId,
      industry,
    }));

    const { error: insertError } = await supabase
      .from("studio_industries")
      .insert(rows);

    if (insertError) {
      setMessage(`更新產業失敗：${insertError.message}`);
      setSaving(false);
      return;
    }

    setSuccess(true);
    setMessage("已儲存工作室設定。");
    setSaving(false);
  }

  if (loading) {
    return (
      <main style={loadingPageStyle}>
        <span style={{ fontSize: "12px", letterSpacing: "0.14em" }}>
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
          padding: "0 42px",
          borderBottom: "1px solid #DADAD5",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: "13px", letterSpacing: "0.18em" }}>
          BEAUTY BOOKING
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          style={textButton}
        >
          BACK TO DASHBOARD
        </button>
      </header>

      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "64px 48px 90px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: "72px",
          }}
        >
          <aside>
            <div style={eyebrow}>STUDIO SETTINGS</div>

            <h1
              style={{
                fontSize: "42px",
                fontWeight: 500,
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
                margin: 0,
              }}
            >
              工作室設定
            </h1>

            <p
              style={{
                marginTop: "18px",
                color: "#777",
                fontSize: "14px",
                lineHeight: 1.8,
              }}
            >
              這些資料會影響你的品牌資訊與公開預約頁。
            </p>
          </aside>

          <section>
            <SectionTitle
              number="01"
              title="基本資料"
              description="設定工作室名稱與公開預約網址。"
            />

            <div style={fieldGroup}>
              <label style={labelStyle}>工作室名稱</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>公開預約網址</label>

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
                  your-domain.com/
                </span>

                <input
                  value={slug}
                  onChange={(e) => setSlug(generateSlug(e.target.value))}
                  style={{
                    ...inputStyle,
                    borderBottom: "none",
                    paddingLeft: "6px",
                  }}
                />
              </div>
            </div>

            <div style={separator} />

            <SectionTitle
              number="02"
              title="品牌"
              description="設定 Logo 與品牌主色。"
            />

            <div style={fieldGroup}>
              <label style={labelStyle}>Logo 圖片網址</label>
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />

              <div
                style={{
                  marginTop: "10px",
                  fontSize: "12px",
                  color: "#999",
                  lineHeight: 1.6,
                }}
              >
                第一版先使用圖片網址，之後再做直接上傳。
              </div>
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>品牌主色</label>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                {BRAND_COLORS.map((color) => {
                  const selected = primaryColor === color;

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setPrimaryColor(color)}
                      aria-label={color}
                      style={{
                        width: "42px",
                        height: "42px",
                        border: selected
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

            <div style={separator} />

            <SectionTitle
              number="03"
              title="聯絡資訊"
              description="顧客之後可以在公開預約頁看到這些資訊。"
            />

            <div style={fieldGroup}>
              <label style={labelStyle}>電話</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912 345 678"
                style={inputStyle}
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>地址</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="台北市..."
                style={inputStyle}
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Instagram</label>
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@yourstudio"
                style={inputStyle}
              />
            </div>

            <div style={separator} />

            <SectionTitle
              number="04"
              title="產業類型"
              description="可以複選，不會限制你之後建立的服務。"
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1px",
                border: "1px solid #DADAD5",
                background: "#DADAD5",
                marginTop: "28px",
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
                      padding: "18px 20px",
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
              <div style={fieldGroup}>
                <label style={labelStyle}>其他產業名稱</label>
                <input
                  value={industryOther}
                  onChange={(e) => setIndustryOther(e.target.value)}
                  placeholder="例如：頭皮養護"
                  style={inputStyle}
                />
              </div>
            )}

            {message && (
              <div
                style={{
                  marginTop: "36px",
                  padding: "16px 0",
                  borderTop: "1px solid #D0D0CB",
                  color: success ? "#3D6C4D" : "#A43E38",
                  fontSize: "14px",
                }}
              >
                {message}
              </div>
            )}

            <div
              style={{
                marginTop: "42px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={saveStudio}
                disabled={saving}
                style={{
                  border: "none",
                  background: "#171717",
                  color: "#FFF",
                  padding: "15px 28px",
                  fontSize: "12px",
                  letterSpacing: "0.1em",
                  cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "SAVING..." : "SAVE CHANGES"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div style={eyebrow}>{number}</div>

      <h2
        style={{
          fontSize: "28px",
          fontWeight: 500,
          letterSpacing: "-0.03em",
          margin: 0,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          marginTop: "10px",
          color: "#888",
          fontSize: "14px",
          lineHeight: 1.7,
        }}
      >
        {description}
      </p>
    </div>
  );
}

const loadingPageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#F7F7F5",
  color: "#171717",
  fontFamily: "Arial, sans-serif",
};

const eyebrow: React.CSSProperties = {
  fontSize: "11px",
  color: "#888",
  letterSpacing: "0.16em",
  marginBottom: "14px",
};

const fieldGroup: React.CSSProperties = {
  marginTop: "32px",
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

const separator: React.CSSProperties = {
  height: "1px",
  background: "#D4D4CF",
  margin: "64px 0",
};

const textButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#171717",
  fontSize: "11px",
  letterSpacing: "0.1em",
  cursor: "pointer",
};
