import { useState, useEffect, useRef } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace("#","");
  return { r:parseInt(h.slice(0,2),16), g:parseInt(h.slice(2,4),16), b:parseInt(h.slice(4,6),16) };
}
function lighten(hex,a) {
  try {
    const {r,g,b}=hexToRgb(hex);
    return `#${[r,g,b].map(c=>Math.round(c+(255-c)*a).toString(16).padStart(2,"0")).join("")}`;
  } catch(e) { return hex; }
}
function darken(hex,a) {
  try {
    const {r,g,b}=hexToRgb(hex);
    return `#${[r,g,b].map(c=>Math.round(c*(1-a)).toString(16).padStart(2,"0")).join("")}`;
  } catch(e) { return hex; }
}
function makeShades(hex) {
  return {
    50:lighten(hex,.93),100:lighten(hex,.83),200:lighten(hex,.65),
    300:lighten(hex,.47),400:lighten(hex,.23),500:hex,
    600:darken(hex,.13),700:darken(hex,.27),800:darken(hex,.45),900:darken(hex,.65)
  };
}
function typeScale(base) {
  const b=Number(base)||16;
  return {xs:`${(b*.75).toFixed(1)}px`,sm:`${(b*.875).toFixed(1)}px`,base:`${b}px`,
    lg:`${(b*1.125).toFixed(1)}px`,xl:`${(b*1.25).toFixed(1)}px`,"2xl":`${(b*1.5).toFixed(1)}px`,
    "3xl":`${(b*1.875).toFixed(1)}px`,"4xl":`${(b*2.25).toFixed(1)}px`,"5xl":`${(b*3).toFixed(1)}px`};
}
function spacingScale(sp) {
  const s=Number(sp)||8;
  return {0:"0px",1:`${s*.25}px`,2:`${s*.5}px`,3:`${s*.75}px`,4:`${s}px`,
    5:`${s*1.25}px`,6:`${s*1.5}px`,8:`${s*2}px`,10:`${s*2.5}px`,12:`${s*3}px`,
    16:`${s*4}px`,20:`${s*5}px`,24:`${s*6}px`,32:`${s*8}px`};
}
function isValidHex(h) { return /^#[0-9A-Fa-f]{6}$/.test(h); }
function safeHex(h,fallback="#6C47FF") { return isValidHex(h)?h:fallback; }

const FONTS=["Playfair Display","DM Sans","JetBrains Mono","Sora","Fraunces",
  "Plus Jakarta Sans","Epilogue","Space Grotesk","Raleway","Nunito","Libre Baskerville","Lora"];
const PRESET_COLORS=["#6C47FF","#0070F3","#FF4154","#F97316","#10B981","#8B5CF6","#EC4899","#0EA5E9","#14B8A6","#F43F5E"];

// ─── Shared Styles ────────────────────────────────────────────────────────────
const cardSt={background:"#fff",borderRadius:14,padding:20,border:"1.5px solid #E8E3FF",boxShadow:"0 4px 20px rgba(108,71,255,0.07)"};
const fLbl={display:"block",fontSize:11,fontWeight:700,color:"#9B8ECC",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6};
const iSt={padding:"10px 12px",borderRadius:8,border:"1.5px solid #E8E3FF",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",background:"#FAFAFF",color:"#1A1A2E",width:"100%",boxSizing:"border-box"};
const secLbl={fontSize:11,fontWeight:700,color:"#9B8ECC",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:10};

function ContBtn({onClick,label="Continue →",disabled=false,color="#6C47FF"}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:"11px 24px",borderRadius:9,border:"none",
      background:disabled?"#E8E3FF":`linear-gradient(135deg,${color},#9B78FF)`,
      color:disabled?"#bbb":"#fff",fontSize:14,fontWeight:700,
      cursor:disabled?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",marginTop:16,
      boxShadow:disabled?"none":"0 4px 14px rgba(108,71,255,0.3)"
    }}>{label}</button>
  );
}

function ColorField({label,value,onChange}) {
  const safe=safeHex(value,"#6C47FF");
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <span style={fLbl}>{label}</span>
      <div style={{display:"flex",alignItems:"center",gap:8,background:"#F7F5FF",border:"1.5px solid #E8E3FF",borderRadius:8,padding:"8px 10px"}}>
        <input type="color" value={safe} onChange={e=>onChange(e.target.value)}
          style={{width:28,height:28,border:"none",borderRadius:6,cursor:"pointer",padding:0,background:"none"}}/>
        <input value={value} onChange={e=>onChange(e.target.value)}
          style={{border:"none",background:"none",fontFamily:"monospace",fontSize:13,color:"#333",width:"100%",outline:"none"}}/>
      </div>
    </div>
  );
}

// ─── AI Image Analysis ────────────────────────────────────────────────────────
async function analyzeImageWithAI(base64Data, mediaType) {
  const prompt = `You are a design system expert. Analyze this UI design image and extract design tokens.

Return ONLY a valid JSON object with exactly these fields (no markdown, no explanation):
{
  "brandName": "guess a brand name from the UI or use 'My Brand'",
  "primaryColor": "#hexcode of the dominant brand/action color",
  "secondaryColor": "#hexcode of a secondary accent color",
  "neutralColor": "#hexcode of the darkest neutral/text color",
  "successColor": "#hexcode for success states (use #22C55E if unclear)",
  "warningColor": "#hexcode for warning states (use #F59E0B if unclear)",
  "errorColor": "#hexcode for error/danger states (use #EF4444 if unclear)",
  "displayFont": "closest matching font from this list: Playfair Display, DM Sans, Sora, Fraunces, Plus Jakarta Sans, Epilogue, Space Grotesk, Raleway, Nunito, Libre Baskerville, Lora",
  "bodyFont": "closest matching body font from the same list",
  "monoFont": "JetBrains Mono",
  "baseFontSize": "16",
  "borderRadius": "estimate in px as a number string: 0 for sharp, 4-8 for subtle, 12-16 for rounded, 24 for very rounded",
  "spacing": "8",
  "aiNotes": "2-3 sentences describing the design style, mood, and key visual characteristics you observed"
}`;

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Data, mediaType }),
  });

  if (!response.ok) throw new Error("API error");
  const data = await response.json();
  return data;
}

// ─── Upload Card ──────────────────────────────────────────────────────────────
function UploadCard({onImageAnalyzed, onSkip}) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const processFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, etc.)");
      return;
    }
    setError(null);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const base64 = dataUrl.split(",")[1];
      const mediaType = file.type;
      setPreview(dataUrl);
      try {
        const result = await analyzeImageWithAI(base64, mediaType);
        onImageAnalyzed(result, dataUrl);
      } catch(err) {
        setError("Couldn't analyze the image. You can fill in the details manually.");
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  return (
    <div style={cardSt}>
      <div style={{marginBottom:14}}>
        <p style={{...fLbl,marginBottom:4}}>Upload a design screenshot</p>
        <p style={{fontSize:13,color:"#aaa",margin:0}}>AI will extract colors, fonts & style from your image</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e=>{e.preventDefault();setDragging(true)}}
        onDragLeave={()=>setDragging(false)}
        onDrop={onDrop}
        onClick={()=>!loading&&inputRef.current.click()}
        style={{
          border:`2px dashed ${dragging?"#6C47FF":"#D8D0FF"}`,
          borderRadius:12, padding:"28px 20px",
          textAlign:"center", cursor:loading?"default":"pointer",
          background:dragging?"#F0EDFF":"#FAFAFF",
          transition:"all .2s",
          minHeight:130, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:10,
          position:"relative", overflow:"hidden"
        }}>
        <input ref={inputRef} type="file" accept="image/*" style={{display:"none"}}
          onChange={e=>processFile(e.target.files[0])} />

        {loading ? (
          <>
            {preview && <img src={preview} alt="" style={{width:80,height:60,objectFit:"cover",borderRadius:8,opacity:0.5,marginBottom:4}}/>}
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              {[0,1,2].map(j=>(
                <div key={j} style={{width:8,height:8,borderRadius:"50%",background:"#6C47FF",
                  animation:"bounce 1.1s ease-in-out infinite",animationDelay:`${j*.18}s`}}/>
              ))}
            </div>
            <p style={{fontSize:13,color:"#6C47FF",fontWeight:600,margin:0}}>Analyzing your design…</p>
          </>
        ) : (
          <>
            <div style={{fontSize:32}}>🖼️</div>
            <p style={{fontSize:14,fontWeight:600,color:"#6C47FF",margin:0}}>
              {dragging?"Drop it here!":"Drag & drop or click to upload"}
            </p>
            <p style={{fontSize:12,color:"#bbb",margin:0}}>PNG, JPG, WebP supported</p>
          </>
        )}
      </div>

      {error && <p style={{fontSize:12,color:"#EF4444",marginTop:8,marginBottom:0}}>{error}</p>}

      <div style={{display:"flex",alignItems:"center",gap:12,marginTop:14}}>
        <div style={{flex:1,height:1,background:"#EDE9FF"}}/>
        <span style={{fontSize:12,color:"#ccc"}}>or</span>
        <div style={{flex:1,height:1,background:"#EDE9FF"}}/>
      </div>

      <button onClick={onSkip} style={{
        width:"100%",marginTop:12,padding:"10px",borderRadius:9,
        border:"1.5px solid #E8E3FF",background:"transparent",
        color:"#888",fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600
      }}>Fill in manually instead →</button>
    </div>
  );
}

// ─── AI Pre-fill Review Card ──────────────────────────────────────────────────
function ReviewCard({values, aiNotes, imagePreview, onChange, onConfirm}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={cardSt}>
      {/* Image + AI notes */}
      <div style={{display:"flex",gap:14,marginBottom:18,alignItems:"flex-start"}}>
        {imagePreview && (
          <img src={imagePreview} alt="Your design" style={{
            width:90,height:68,objectFit:"cover",borderRadius:10,
            border:"1.5px solid #E8E3FF",flexShrink:0
          }}/>
        )}
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:18}}>✨</span>
            <span style={{fontWeight:700,fontSize:14,color:"#1A1A2E"}}>AI extracted your design style</span>
          </div>
          <p style={{fontSize:13,color:"#666",margin:0,lineHeight:1.55}}>{aiNotes}</p>
        </div>
      </div>

      {/* Brand name */}
      <div style={{marginBottom:16}}>
        <label style={fLbl}>Brand Name</label>
        <input value={values.brandName} onChange={e=>onChange("brandName",e.target.value)}
          style={iSt} placeholder="Brand or product name"/>
      </div>

      {/* Colors */}
      <div style={{marginBottom:16}}>
        <label style={fLbl}>Colors — click to edit</label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10}}>
          {[["primaryColor","Primary"],["secondaryColor","Secondary"],["neutralColor","Neutral"],
            ["successColor","Success"],["warningColor","Warning"],["errorColor","Error"]
          ].map(([k,l])=>(
            <ColorField key={k} label={l} value={values[k]} onChange={v=>onChange(k,v)}/>
          ))}
        </div>
      </div>

      {/* Toggle advanced */}
      <button onClick={()=>setExpanded(x=>!x)} style={{
        background:"none",border:"none",color:"#9B8ECC",fontSize:13,
        cursor:"pointer",padding:"4px 0",fontFamily:"'DM Sans',sans-serif",
        fontWeight:600,display:"flex",alignItems:"center",gap:6,marginBottom:4
      }}>
        <span style={{transition:"transform .2s",display:"inline-block",transform:expanded?"rotate(90deg)":"rotate(0deg)"}}>▶</span>
        {expanded?"Hide":"Edit"} fonts & sizing
      </button>

      {expanded && (
        <div style={{borderTop:"1px solid #F0EDFF",paddingTop:16,marginTop:8}}>
          {/* Fonts */}
          <label style={fLbl}>Typography</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12,marginBottom:16}}>
            {[["displayFont","Display / Heading"],["bodyFont","Body"],["monoFont","Monospace"]].map(([k,l])=>(
              <div key={k}>
                <span style={{...fLbl,marginBottom:4}}>{l}</span>
                <select value={values[k]} onChange={e=>onChange(k,e.target.value)} style={{...iSt,cursor:"pointer"}}>
                  {FONTS.map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
            ))}
          </div>
          {/* Sizing */}
          <label style={fLbl}>Sizing</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {[["baseFontSize","Font Size",12,24],["borderRadius","Radius",0,32],["spacing","Spacing",4,20]].map(([k,l,min,max])=>(
              <div key={k}>
                <span style={{...fLbl,marginBottom:4}}>{l}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <input type="range" min={min} max={max} value={values[k]}
                    onChange={e=>onChange(k,e.target.value)}
                    style={{flex:1,accentColor:"#6C47FF"}}/>
                  <span style={{fontFamily:"monospace",fontSize:13,color:"#6C47FF",fontWeight:700,minWidth:32}}>{values[k]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ContBtn onClick={onConfirm} label="Looks good — Generate System 🚀"/>
    </div>
  );
}

// ─── Step Cards (manual flow) ─────────────────────────────────────────────────
function BrandCard({value,onChange,onSubmit}) {
  return (
    <div style={cardSt}>
      <label style={fLbl}>Brand / Product Name</label>
      <input value={value} onChange={e=>onChange(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&value.trim()&&onSubmit()}
        placeholder="e.g. Acme, Spark, Notion…" style={iSt} autoFocus/>
      <ContBtn onClick={onSubmit} disabled={!value.trim()}/>
    </div>
  );
}
function PrimaryCard({value,onChange,onSubmit}) {
  return (
    <div style={cardSt}>
      <ColorField label="Primary Color" value={value} onChange={onChange}/>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:12}}>
        {PRESET_COLORS.map(c=>(
          <button key={c} onClick={()=>onChange(c)} style={{
            width:30,height:30,borderRadius:8,background:c,cursor:"pointer",
            border:value===c?"2.5px solid #1A1A2E":"2px solid transparent",padding:0,transition:"border .1s"
          }}/>
        ))}
      </div>
      <ContBtn onClick={onSubmit}/>
    </div>
  );
}
function PaletteCard({values,onChange,onSubmit}) {
  return (
    <div style={cardSt}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
        {[["secondaryColor","Secondary"],["neutralColor","Neutral / Dark"],
          ["successColor","Success"],["warningColor","Warning"],["errorColor","Error"]
        ].map(([k,l])=>(
          <ColorField key={k} label={l} value={values[k]} onChange={v=>onChange(k,v)}/>
        ))}
      </div>
      <ContBtn onClick={onSubmit}/>
    </div>
  );
}
function FontCard({values,onChange,onSubmit}) {
  return (
    <div style={cardSt}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:16}}>
        {[["displayFont","Display / Heading"],["bodyFont","Body Text"],["monoFont","Monospace"]].map(([k,l])=>(
          <div key={k}>
            <label style={fLbl}>{l}</label>
            <select value={values[k]} onChange={e=>onChange(k,e.target.value)} style={{...iSt,cursor:"pointer"}}>
              {FONTS.map(f=><option key={f}>{f}</option>)}
            </select>
            <span style={{display:"block",marginTop:8,fontSize:19,fontFamily:`'${values[k]}',serif`,color:"#1A1A2E",lineHeight:1}}>
              The quick brown fox
            </span>
          </div>
        ))}
      </div>
      <ContBtn onClick={onSubmit}/>
    </div>
  );
}
function SizesCard({values,onChange,onSubmit}) {
  return (
    <div style={cardSt}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:20}}>
        {[["baseFontSize","Base Font Size",12,24],["borderRadius","Border Radius",0,32],["spacing","Base Spacing",4,20]].map(([k,l,min,max])=>(
          <div key={k}>
            <label style={fLbl}>{l}</label>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <input type="range" min={min} max={max} value={values[k]}
                onChange={e=>onChange(k,e.target.value)} style={{flex:1,accentColor:"#6C47FF"}}/>
              <span style={{fontFamily:"monospace",fontSize:14,color:"#6C47FF",minWidth:36,textAlign:"right",fontWeight:700}}>{values[k]}px</span>
            </div>
            <div style={{marginTop:10,height:32,display:"flex",alignItems:"center"}}>
              {k==="borderRadius"&&<div style={{width:52,height:26,background:"#EDE9FF",borderRadius:`${values[k]}px`,border:"1.5px solid #C4B8FF"}}/>}
              {k==="spacing"&&<div style={{display:"flex",gap:3,alignItems:"flex-end"}}>
                {[1,2,3,4].map(n=><div key={n} style={{width:`${values[k]*n*.7}px`,height:`${values[k]*n*.7}px`,background:`rgba(108,71,255,${n*.2})`,borderRadius:3}}/>)}
              </div>}
              {k==="baseFontSize"&&<span style={{fontSize:`${values[k]}px`,color:"#1A1A2E",lineHeight:1,fontWeight:700}}>Ag</span>}
            </div>
          </div>
        ))}
      </div>
      <ContBtn onClick={onSubmit} label="Generate Design System 🚀"/>
    </div>
  );
}

// ─── Token Row ────────────────────────────────────────────────────────────────
function TokenRow({token,val,desc}) {
  const [cp,setCp]=useState(false);
  return (
    <div onClick={()=>{navigator.clipboard.writeText(val);setCp(true);setTimeout(()=>setCp(false),1000);}}
      style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1.5fr",padding:"9px 14px",
        borderBottom:"1px solid #F0EDFF",cursor:"pointer",fontFamily:"monospace",fontSize:12}}
      onMouseEnter={e=>e.currentTarget.style.background="#F7F5FF"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <span style={{color:"#6C47FF"}}>{token}</span>
      <span style={{color:"#333"}}>{cp?"✓ copied":val}</span>
      <span style={{color:"#bbb",fontFamily:"'DM Sans',sans-serif",fontSize:11}}>{desc}</span>
    </div>
  );
}

// ─── Design System Output ─────────────────────────────────────────────────────
function DSOutput({system}) {
  const [tab,setTab]=useState("colors");
  const [copied,setCopied]=useState(null);
  const cp=(val,key)=>{navigator.clipboard.writeText(val);setCopied(key);setTimeout(()=>setCopied(null),1200);};

  const exportCSS=()=>{
    const lines=[`:root {`,`  /* ${system.brandName} Design Tokens */`];
    Object.entries(system.colors).forEach(([n,s])=>{lines.push("");Object.entries(s).forEach(([w,v])=>lines.push(`  --color-${n}-${w}: ${v};`));});
    lines.push("");Object.entries(system.typography.scale).forEach(([k,v])=>lines.push(`  --text-${k}: ${v};`));
    lines.push("");Object.entries(system.spacing).forEach(([k,v])=>lines.push(`  --spacing-${k}: ${v};`));
    lines.push("");Object.entries(system.borderRadius).forEach(([k,v])=>lines.push(`  --radius-${k}: ${v};`));
    lines.push("}");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([lines.join("\n")],{type:"text/css"}));
    a.download=`${system.brandName.toLowerCase()}-tokens.css`;a.click();
  };
  const exportJSON=()=>{
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(system,null,2)],{type:"application/json"}));
    a.download=`${system.brandName.toLowerCase()}-tokens.json`;a.click();
  };

  return (
    <div style={{marginTop:10,borderRadius:16,overflow:"hidden",border:"1.5px solid #E8E3FF",boxShadow:"0 8px 32px rgba(108,71,255,0.12)"}}>
      <div style={{background:"linear-gradient(135deg,#1A1A2E,#2D1B69)",padding:"18px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <h3 style={{margin:0,color:"#fff",fontFamily:"'Playfair Display',serif",fontSize:18}}>{system.brandName} — Design System</h3>
          <p style={{margin:"3px 0 0",color:"#9B8ECC",fontSize:12}}>Click any swatch or token to copy</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          {[["CSS ↓",exportCSS,"#ffffff22"],["JSON ↓",exportJSON,"#6C47FF"]].map(([l,fn,bg])=>(
            <button key={l} onClick={fn} style={{padding:"7px 14px",borderRadius:8,border:"1px solid #ffffff33",background:bg,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{display:"flex",background:"#F0EDFF",padding:"6px 6px 0",gap:2,overflowX:"auto"}}>
        {["colors","typography","spacing","components","tokens"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:"8px 16px",border:"none",borderRadius:"8px 8px 0 0",
            background:tab===t?"#fff":"transparent",color:tab===t?"#6C47FF":"#888",
            fontSize:13,fontWeight:700,cursor:"pointer",textTransform:"capitalize",
            fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"
          }}>{t}</button>
        ))}
      </div>
      <div style={{background:"#fff",padding:22}}>
        {tab==="colors"&&Object.entries(system.colors).map(([name,s])=>(
          <div key={name} style={{marginBottom:22}}>
            <p style={secLbl}>{name}</p>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {Object.entries(s).map(([w,v])=>(
                <div key={w} onClick={()=>cp(v,`${name}${w}`)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer"}}>
                  <div style={{width:52,height:36,borderRadius:8,background:v,border:"1px solid rgba(0,0,0,0.07)",
                    boxShadow:copied===`${name}${w}`?"0 0 0 2.5px #6C47FF":"none",transition:"box-shadow .15s"}}/>
                  <span style={{fontFamily:"monospace",fontSize:9,color:"#999"}}>{w}</span>
                  <span style={{fontFamily:"monospace",fontSize:9,color:"#6C47FF",height:10}}>{copied===`${name}${w}`?"✓":""}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {tab==="typography"&&(
          <div>
            <p style={secLbl}>Font Families</p>
            {Object.entries(system.typography.fonts).map(([role,font])=>(
              <div key={role} style={{display:"flex",alignItems:"baseline",gap:16,marginBottom:10,padding:"12px 16px",background:"#FAFAFF",borderRadius:10}}>
                <span style={{fontFamily:"monospace",fontSize:11,color:"#6C47FF",minWidth:60}}>{role}</span>
                <span style={{fontSize:22,fontFamily:`'${font}',serif`,color:"#1A1A2E"}}>The quick brown fox</span>
                <span style={{fontSize:12,color:"#bbb",marginLeft:"auto"}}>{font}</span>
              </div>
            ))}
            <p style={{...secLbl,marginTop:20}}>Type Scale</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:16,alignItems:"flex-end"}}>
              {Object.entries(system.typography.scale).map(([k,v])=>(
                <div key={k} style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:2}}>
                  <span style={{fontSize:v,fontFamily:`'${system.typography.fonts.display}',serif`,color:"#1A1A2E",lineHeight:1}}>Ag</span>
                  <span style={{fontFamily:"monospace",fontSize:10,color:"#6C47FF"}}>{k}</span>
                  <span style={{fontFamily:"monospace",fontSize:10,color:"#ccc"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==="spacing"&&(
          <div>
            <p style={secLbl}>Spacing Scale</p>
            <div style={{marginBottom:28}}>
              {Object.entries(system.spacing).filter(([k])=>k!=="0").map(([k,v])=>(
                <div key={k} style={{display:"flex",alignItems:"center",gap:12,marginBottom:7}}>
                  <span style={{fontFamily:"monospace",fontSize:12,color:"#6C47FF",minWidth:28,textAlign:"right"}}>{k}</span>
                  <div style={{height:14,width:v,background:"linear-gradient(90deg,#6C47FF,#A98BFF)",borderRadius:3,minWidth:3}}/>
                  <span style={{fontSize:12,color:"#bbb"}}>{v}</span>
                </div>
              ))}
            </div>
            <p style={secLbl}>Border Radius</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:14}}>
              {Object.entries(system.borderRadius).map(([k,v])=>(
                <div key={k} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                  <div style={{width:56,height:56,background:"linear-gradient(135deg,#EDE9FF,#D8D0FF)",borderRadius:v,border:"1.5px solid #C4B8FF"}}/>
                  <span style={{fontFamily:"monospace",fontSize:11,color:"#6C47FF"}}>{k}</span>
                  <span style={{fontSize:10,color:"#bbb"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==="components"&&(
          <div>
            <p style={secLbl}>Buttons</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:22,alignItems:"center"}}>
              {[{l:"Primary",bg:system.colors.primary[500],c:"#fff",b:"none"},
                {l:"Secondary",bg:system.colors.secondary[500],c:"#fff",b:"none"},
                {l:"Outline",bg:"transparent",c:system.colors.primary[500],b:`2px solid ${system.colors.primary[500]}`},
                {l:"Ghost",bg:system.colors.primary[50],c:system.colors.primary[700],b:"none"},
                {l:"Danger",bg:system.colors.error[500],c:"#fff",b:"none"},
              ].map(btn=>(
                <button key={btn.l} style={{padding:"10px 20px",borderRadius:system.borderRadius.md,background:btn.bg,color:btn.c,border:btn.b,fontSize:14,fontFamily:`'${system.typography.fonts.body}',sans-serif`,fontWeight:600,cursor:"pointer"}}>{btn.l}</button>
              ))}
            </div>
            <p style={secLbl}>Inputs</p>
            <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:22}}>
              <input placeholder="Default input" style={{padding:"10px 14px",borderRadius:system.borderRadius.md,border:"1.5px solid #DDD",fontSize:14,fontFamily:`'${system.typography.fonts.body}',sans-serif`,outline:"none"}}/>
              <input placeholder="Focused state" style={{padding:"10px 14px",borderRadius:system.borderRadius.md,border:`2px solid ${system.colors.primary[500]}`,boxShadow:`0 0 0 3px ${system.colors.primary[100]}`,fontSize:14,fontFamily:`'${system.typography.fonts.body}',sans-serif`,outline:"none"}}/>
            </div>
            <p style={secLbl}>Cards</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12,marginBottom:22}}>
              {[{t:"Flat",sh:"none",br:`1px solid ${system.colors.neutral[100]}`},
                {t:"Elevated",sh:"0 4px 16px rgba(0,0,0,0.1)",br:"none"},
                {t:"Outlined",sh:"none",br:`2px solid ${system.colors.primary[200]}`}
              ].map(c=>(
                <div key={c.t} style={{padding:16,borderRadius:system.borderRadius.lg,boxShadow:c.sh,border:c.br,background:"#fff"}}>
                  <div style={{width:32,height:32,borderRadius:system.borderRadius.sm,background:system.colors.primary[100],marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>✦</div>
                  <p style={{fontFamily:`'${system.typography.fonts.display}',serif`,fontWeight:700,fontSize:13,color:"#1A1A2E",margin:"0 0 4px"}}>{c.t} Card</p>
                  <p style={{fontFamily:`'${system.typography.fonts.body}',sans-serif`,fontSize:12,color:"#999",margin:0}}>A reusable card from your system.</p>
                </div>
              ))}
            </div>
            <p style={secLbl}>Badges</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {[["Success",system.colors.success[50],system.colors.success[700]],
                ["Warning",system.colors.warning[50],system.colors.warning[700]],
                ["Error",system.colors.error[50],system.colors.error[700]],
                ["Primary",system.colors.primary[50],system.colors.primary[700]],
                ["Neutral",system.colors.neutral[100],system.colors.neutral[700]],
              ].map(([l,bg,c])=>(
                <span key={l} style={{padding:"4px 12px",borderRadius:system.borderRadius.full,background:bg,color:c,fontSize:12,fontWeight:600,fontFamily:`'${system.typography.fonts.body}',sans-serif`}}>{l}</span>
              ))}
            </div>
          </div>
        )}
        {tab==="tokens"&&(
          <div>
            <p style={{fontSize:12,color:"#bbb",marginBottom:12}}>Click any row to copy the value</p>
            <div style={{background:"#FAFAFF",borderRadius:10,overflow:"hidden",fontSize:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1.5fr",padding:"8px 14px",background:"#EDE9FF",fontFamily:"monospace",fontWeight:700,color:"#6C47FF"}}>
                <span>Token</span><span>Value</span><span>Description</span>
              </div>
              {[
                ...Object.entries(system.colors).flatMap(([n,s])=>Object.entries(s).map(([w,v])=>[`--color-${n}-${w}`,v,`${n} ${w}`])),
                ...Object.entries(system.typography.scale).map(([k,v])=>[`--text-${k}`,v,`Font size ${k}`]),
                ...Object.entries(system.spacing).map(([k,v])=>[`--spacing-${k}`,v,`Spacing ${k}`]),
                ...Object.entries(system.borderRadius).map(([k,v])=>[`--radius-${k}`,v,`Radius ${k}`]),
              ].map(([token,val,desc],i)=>(
                <TokenRow key={i} token={token} val={val} desc={desc}/>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const INIT={
  brandName:"",primaryColor:"#6C47FF",secondaryColor:"#FF6B6B",neutralColor:"#1A1A2E",
  successColor:"#22C55E",warningColor:"#F59E0B",errorColor:"#EF4444",
  displayFont:"Playfair Display",bodyFont:"DM Sans",monoFont:"JetBrains Mono",
  baseFontSize:"16",borderRadius:"8",spacing:"8",
};

// phases: start → [image-review OR brand] → primary → palette → fonts → sizes → done
const ALL_PHASES=["start","brand","primary","palette","fonts","sizes","done"];

export default function App() {
  const [form,setForm]=useState(INIT);
  const [messages,setMessages]=useState([]);
  const [phase,setPhase]=useState("start");
  const [typing,setTyping]=useState(false);
  const [imagePreview,setImagePreview]=useState(null);
  const [aiNotes,setAiNotes]=useState("");
  const bottomRef=useRef();

  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    setTimeout(()=>{
      setMessages([{
        from:"bot",
        text:"Hey! 👋 I'm your **Design System Generator**. \n\nWant to start from a design you already have? **Upload a screenshot** and I'll extract the colors, fonts, and style automatically. Or you can fill everything in manually."
      }]);
    },400);
  },[]);

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  },[messages,typing,phase]);

  const botSay=(text,extra={})=>{
    setTyping(true);
    setTimeout(()=>{setTyping(false);setMessages(m=>[...m,{from:"bot",text,...extra}]);},750);
  };
  const userSay=(text)=>setMessages(m=>[...m,{from:"user",text}]);

  // ── Image analysed ──
  const handleImageAnalyzed=(result,preview)=>{
    setImagePreview(preview);
    setAiNotes(result.aiNotes||"");
    setForm({
      brandName:result.brandName||"",
      primaryColor:safeHex(result.primaryColor,"#6C47FF"),
      secondaryColor:safeHex(result.secondaryColor,"#FF6B6B"),
      neutralColor:safeHex(result.neutralColor,"#1A1A2E"),
      successColor:safeHex(result.successColor,"#22C55E"),
      warningColor:safeHex(result.warningColor,"#F59E0B"),
      errorColor:safeHex(result.errorColor,"#EF4444"),
      displayFont:FONTS.includes(result.displayFont)?result.displayFont:"Playfair Display",
      bodyFont:FONTS.includes(result.bodyFont)?result.bodyFont:"DM Sans",
      monoFont:"JetBrains Mono",
      baseFontSize:result.baseFontSize||"16",
      borderRadius:result.borderRadius||"8",
      spacing:result.spacing||"8",
    });
    userSay("📎 Uploaded a design screenshot");
    botSay("✨ Got it! I've analysed your design and extracted the tokens below. **Review and edit** anything you'd like, then hit generate.");
    setPhase("image-review");
  };

  // ── Skip upload ──
  const handleSkip=()=>{
    userSay("I'll fill in manually");
    botSay("No problem! Let's start with your **brand or product name**.");
    setPhase("brand");
  };

  // ── Confirm AI pre-fill ──
  const handleReviewConfirm=()=>{
    userSay(`Brand: ${form.brandName} · Primary: ${form.primaryColor} · Display: ${form.displayFont}`);
    generateSystem();
  };

  // ── Manual steps ──
  const handleBrand=()=>{
    if(!form.brandName.trim())return;
    userSay(form.brandName);
    setPhase("primary");
    botSay(`Nice to meet you, **${form.brandName}**! 🎉 Now set your **primary brand color**.`);
  };
  const handlePrimary=()=>{
    userSay(`Primary: ${form.primaryColor}`);
    setPhase("palette");
    botSay("Love that color! 🎨 Now fill in the rest of your **color palette**.");
  };
  const handlePalette=()=>{
    userSay(`Secondary ${form.secondaryColor} · Neutral ${form.neutralColor} · Success/Warning/Error set`);
    setPhase("fonts");
    botSay("Perfect palette! Now choose your **typography**.");
  };
  const handleFonts=()=>{
    userSay(`Display: ${form.displayFont} · Body: ${form.bodyFont} · Mono: ${form.monoFont}`);
    setPhase("sizes");
    botSay("Great choices! Last step — set your **base sizing values**.");
  };
  const handleSizes=()=>{
    userSay(`Font: ${form.baseFontSize}px · Radius: ${form.borderRadius}px · Spacing: ${form.spacing}px`);
    generateSystem();
  };

  // ── Generate ──
  const generateSystem=()=>{
    setPhase("done");
    setTyping(true);
    setTimeout(()=>{
      setTyping(false);
      const br=Number(form.borderRadius);
      const system={
        brandName:form.brandName||"My Brand",
        colors:{
          primary:makeShades(safeHex(form.primaryColor,"#6C47FF")),
          secondary:makeShades(safeHex(form.secondaryColor,"#FF6B6B")),
          neutral:makeShades(safeHex(form.neutralColor,"#1A1A2E")),
          success:makeShades(safeHex(form.successColor,"#22C55E")),
          warning:makeShades(safeHex(form.warningColor,"#F59E0B")),
          error:makeShades(safeHex(form.errorColor,"#EF4444")),
        },
        typography:{
          fonts:{display:form.displayFont,body:form.bodyFont,mono:form.monoFont},
          scale:typeScale(form.baseFontSize),
        },
        spacing:spacingScale(form.spacing),
        borderRadius:{
          none:"0px",sm:`${Math.max(2,br*.5)}px`,md:`${br}px`,
          lg:`${br*1.5}px`,xl:`${br*2}px`,"2xl":`${br*3}px`,full:"9999px"
        },
      };
      setMessages(m=>[...m,{
        from:"bot",
        text:`All done! Here's your **${system.brandName}** design system. 🎉 Browse the tabs, click any swatch or token to copy, and export as CSS or JSON when ready.`,
        system
      }]);
    },1800);
  };

  const renderText=(text)=>
    text.split(/\*\*(.+?)\*\*/g).map((p,i)=>i%2===1?<strong key={i}>{p}</strong>:<span key={i}>{p}</span>);

  // Determine progress index
  const phaseOrder=["start","image-review","brand","primary","palette","fonts","sizes","done"];
  const progressPct=Math.round((phaseOrder.indexOf(phase)/7)*100);

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:"#F5F3FF",fontFamily:"'DM Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono&family=Sora:wght@400;600&family=Fraunces:wght@700&family=Plus+Jakarta+Sans:wght@400;600&family=Epilogue:wght@400;600&family=Lora:wght@700&family=Space+Grotesk:wght@400;600&family=Raleway:wght@400;600&display=swap" rel="stylesheet"/>

      {/* Top bar */}
      <div style={{background:"#1A1A2E",padding:"13px 22px",display:"flex",alignItems:"center",gap:12,flexShrink:0,boxShadow:"0 2px 16px rgba(0,0,0,0.25)",zIndex:10}}>
        <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#6C47FF,#A98BFF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>✦</div>
        <div>
          <div style={{color:"#fff",fontWeight:700,fontSize:15}}>DesignTokens</div>
          <div style={{color:"#9B8ECC",fontSize:11}}>Design system generator</div>
        </div>
        {/* Progress bar */}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:80,height:5,borderRadius:3,background:"#ffffff15",overflow:"hidden"}}>
            <div style={{height:"100%",background:"linear-gradient(90deg,#6C47FF,#A98BFF)",width:`${progressPct}%`,transition:"width .4s ease",borderRadius:3}}/>
          </div>
          <span style={{color:"#9B8ECC",fontSize:11,minWidth:28}}>{progressPct}%</span>
        </div>
      </div>

      {/* Chat messages */}
      <div style={{flex:1,overflowY:"auto",paddingTop:20,paddingBottom:8}}>
        <div style={{maxWidth:720,margin:"0 auto",padding:"0 16px",display:"flex",flexDirection:"column",gap:16}}>

          {messages.map((msg,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:msg.from==="user"?"flex-end":"flex-start"}}>
              {msg.from==="bot"&&(
                <div style={{display:"flex",gap:10,alignItems:"flex-start",width:"100%"}}>
                  <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#6C47FF,#A98BFF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,marginTop:2}}>✦</div>
                  <div style={{flex:1,maxWidth:"calc(100% - 44px)"}}>
                    <div style={{background:"#fff",borderRadius:"4px 16px 16px 16px",padding:"12px 16px",boxShadow:"0 2px 12px rgba(108,71,255,0.07)",border:"1px solid #EDE9FF",fontSize:14,lineHeight:1.65,color:"#2D2D2D",display:"inline-block",maxWidth:"90%"}}>
                      {renderText(msg.text)}
                    </div>
                    {msg.system&&<DSOutput system={msg.system}/>}
                  </div>
                </div>
              )}
              {msg.from==="user"&&(
                <div style={{background:"linear-gradient(135deg,#6C47FF,#7C5CFF)",color:"#fff",borderRadius:"16px 4px 16px 16px",padding:"11px 16px",maxWidth:"72%",fontSize:14,lineHeight:1.5,boxShadow:"0 2px 12px rgba(108,71,255,0.25)"}}>
                  {msg.text}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {typing&&(
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#6C47FF,#A98BFF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>✦</div>
              <div style={{background:"#fff",borderRadius:"4px 16px 16px 16px",padding:"14px 18px",boxShadow:"0 2px 12px rgba(108,71,255,0.07)",border:"1px solid #EDE9FF",display:"inline-block"}}>
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  {[0,1,2].map(j=>(
                    <div key={j} style={{width:7,height:7,borderRadius:"50%",background:"#C4B8FF",
                      animation:"bounce 1.1s ease-in-out infinite",animationDelay:`${j*.18}s`}}/>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef}/>
        </div>
      </div>

      {/* Sticky input panel */}
      {!typing&&phase!=="done"&&(
        <div style={{borderTop:"1px solid #E8E3FF",background:"#FAFAFF",padding:"16px",flexShrink:0,maxHeight:"60vh",overflowY:"auto"}}>
          <div style={{maxWidth:720,margin:"0 auto"}}>
            {phase==="start"&&(
              <UploadCard onImageAnalyzed={handleImageAnalyzed} onSkip={handleSkip}/>
            )}
            {phase==="image-review"&&(
              <ReviewCard
                values={form}
                aiNotes={aiNotes}
                imagePreview={imagePreview}
                onChange={(k,v)=>upd(k,v)}
                onConfirm={handleReviewConfirm}
              />
            )}
            {phase==="brand"&&<BrandCard value={form.brandName} onChange={v=>upd("brandName",v)} onSubmit={handleBrand}/>}
            {phase==="primary"&&<PrimaryCard value={form.primaryColor} onChange={v=>upd("primaryColor",v)} onSubmit={handlePrimary}/>}
            {phase==="palette"&&<PaletteCard values={form} onChange={(k,v)=>upd(k,v)} onSubmit={handlePalette}/>}
            {phase==="fonts"&&<FontCard values={form} onChange={(k,v)=>upd(k,v)} onSubmit={handleFonts}/>}
            {phase==="sizes"&&<SizesCard values={form} onChange={(k,v)=>upd(k,v)} onSubmit={handleSizes}/>}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:#F0EDFF}
        ::-webkit-scrollbar-thumb{background:#C4B8FF;border-radius:3px}
      `}</style>
    </div>
  );
}
