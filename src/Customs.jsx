import { useState } from 'react';
import { LogoBadge } from './Logo';

/* ── Kosovo excise rates (€/cc) ── */
const KS_EXCISE = [
  { ccMax: 1000,     rate: 0.5 },
  { ccMax: 1300,     rate: 1.0 },
  { ccMax: 1600,     rate: 1.5 },
  { ccMax: 2000,     rate: 2.0 },
  { ccMax: 2500,     rate: 3.0 },
  { ccMax: 3000,     rate: 4.0 },
  { ccMax: Infinity, rate: 5.0 },
];

/* ── Albania excise rates (€/cc) ── */
const AL_EXCISE = [
  { ccMax: 1000,     rate: 0.40 },
  { ccMax: 1300,     rate: 0.80 },
  { ccMax: 1600,     rate: 1.20 },
  { ccMax: 2000,     rate: 1.60 },
  { ccMax: 2500,     rate: 2.40 },
  { ccMax: 3000,     rate: 3.20 },
  { ccMax: Infinity, rate: 4.00 },
];

const AGE_MULTS = [
  { maxAge: 3,        label: '0–3 vjet',   mult: 1.00 },
  { maxAge: 6,        label: '4–6 vjet',   mult: 0.85 },
  { maxAge: 9,        label: '7–9 vjet',   mult: 0.70 },
  { maxAge: 12,       label: '10–12 vjet', mult: 0.55 },
  { maxAge: Infinity, label: '13+ vjet',   mult: 0.40 },
];

function excise(cc, table, age) {
  const band = table.find(b => cc <= b.ccMax) || table.at(-1);
  const am   = AGE_MULTS.find(a => age <= a.maxAge) || AGE_MULTS.at(-1);
  return { value: cc * band.rate * am.mult, ageLabel: am.label };
}

function fmt(n) { return '€' + Math.round(n).toLocaleString('de-DE'); }

const SVCS = [
  { ico: '🛃', name: 'Doganim & inspektim', sub: 'Procedurat e plotë doganore dhe inspektimi teknik i makinës' },
  { ico: '🚢', name: 'Transport deri në destinacion', sub: 'Transportim i sigurt nga Koreja me anije RoRo deri te dera juaj' },
  { ico: '💳', name: 'Pagesa e lehtë', sub: 'Mundësi pagese të plota brenda Kosovës dhe Shqipërisë' },
];

const years = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i);

export default function Customs() {
  const [tab,       setTab]       = useState('ks');   /* 'ks' | 'al' */
  const [price,     setPrice]     = useState('');
  const [cc,        setCc]        = useState('');
  const [year,      setYear]      = useState('');
  const [roro,      setRoro]      = useState('1050'); /* Korea → Durrës */
  const [overland,  setOverland]  = useState('280');  /* Durrës → Kosovo */
  const [result,    setResult]    = useState(null);

  const calc = () => {
    const p   = parseFloat(price);
    const eng = parseInt(cc);
    const yr  = parseInt(year);
    if (isNaN(p) || isNaN(eng) || isNaN(yr)) return;

    const age      = new Date().getFullYear() - yr;
    const roroVal  = parseFloat(roro)    || 0;
    const overVal  = parseFloat(overland)|| 0;

    /* Kosovo */
    const ksCIF   = p + roroVal + overVal;
    const ksDuty  = ksCIF * 0.10;
    const ksVAT   = (ksCIF + ksDuty) * 0.18;
    const ksExc   = excise(eng, KS_EXCISE, age);
    const ksTotal = ksDuty + ksVAT + ksExc.value;
    const ksLand  = ksCIF + ksTotal;

    /* Albania */
    const alCIF   = p + roroVal;
    const alDuty  = alCIF * 0.10;
    const alVAT   = (alCIF + alDuty) * 0.20;
    const alExc   = excise(eng, AL_EXCISE, age);
    const alTotal = alDuty + alVAT + alExc.value;
    const alLand  = alCIF + alTotal;

    setResult({ p, roroVal, overVal, age,
      ks: { cif: ksCIF, duty: ksDuty, vat: ksVAT, exc: ksExc.value, ageLabel: ksExc.ageLabel, total: ksTotal, land: ksLand },
      al: { cif: alCIF, duty: alDuty, vat: alVAT, exc: alExc.value, ageLabel: alExc.ageLabel, total: alTotal, land: alLand },
    });
  };

  const r = result ? (tab === 'ks' ? result.ks : result.al) : null;
  const isKs = tab === 'ks';

  return (
    <>
      <div className="page-hero">
        <p className="page-lbl">Auto Korea Blendi</p>
        <h1 className="page-title">Kalkulator <em>Dogane</em></h1>
        <p className="page-sub">Llogarit koston e plotë të importit — Kosovë &amp; Shqipëri</p>
      </div>

      <div className="calc-wrap">

        {/* ── Country tabs ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
          <button
            onClick={() => setTab('ks')}
            style={{
              flex: 1, padding: '12px 20px', border: isKs ? '1px solid #e8763a' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, background: isKs ? 'rgba(232,118,58,0.12)' : 'rgba(255,255,255,0.03)',
              color: isKs ? '#e8763a' : '#8888a0', fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', transition: 'all .2s',
            }}
          >
            🇽🇰 Kosovë <span style={{ fontSize: 11, opacity: .7, fontWeight: 500 }}>(kryesor)</span>
          </button>
          <button
            onClick={() => setTab('al')}
            style={{
              flex: 1, padding: '12px 20px', border: !isKs ? '1px solid #e8763a' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, background: !isKs ? 'rgba(232,118,58,0.12)' : 'rgba(255,255,255,0.03)',
              color: !isKs ? '#e8763a' : '#8888a0', fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', transition: 'all .2s',
            }}
          >
            🇦🇱 Shqipëri <span style={{ fontSize: 11, opacity: .7, fontWeight: 500 }}>(Durrës)</span>
          </button>
        </div>

        <div className="calc-cols">
          {/* ── Inputs ── */}
          <div className="calc-card">
            <p className="card-hd">Të dhënat e makinës</p>

            <div className="field">
              <label>Çmimi i makinës në Kore (€)</label>
              <input type="number" min="0" placeholder="p.sh. 15000"
                value={price} onChange={e => setPrice(e.target.value)} />
            </div>

            <div className="field">
              <label>Motorri (cc)</label>
              <input type="number" min="500" max="8000" placeholder="p.sh. 2000"
                value={cc} onChange={e => setCc(e.target.value)} />
            </div>

            <div className="field">
              <label>Viti i prodhimit</label>
              <select value={year} onChange={e => setYear(e.target.value)}>
                <option value="">Zgjidh vitin</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <p className="card-hd" style={{ marginTop: '1.25rem' }}>Transport (RoRo)</p>

            <div className="field">
              <label>Koreja → Durrës (anije RoRo)</label>
              <input type="number" min="0" placeholder="1050"
                value={roro} onChange={e => setRoro(e.target.value)} />
              <small>Çmim mesatar — mund ta ndryshosh</small>
            </div>

            {isKs && (
              <div className="field">
                <label>Durrës → Kosovë (tokë)</label>
                <input type="number" min="0" placeholder="280"
                  value={overland} onChange={e => setOverland(e.target.value)} />
                <small>Transport me kamion nga porti</small>
              </div>
            )}

            <button className="btn-calc" onClick={calc}>Llogarit Koston</button>
          </div>

          {/* ── Results ── */}
          <div className="res-card">
            <p className="card-hd">
              {isKs ? '🇽🇰 Rezultati — Kosovë' : '🇦🇱 Rezultati — Shqipëri (Durrës)'}
            </p>

            {!r ? (
              <div className="ph-box">
                <div className="pi">🧮</div>
                <p>Plotëso të dhënat dhe kliko "Llogarit"</p>
              </div>
            ) : (
              <>
                <div className="res-row">
                  <span className="res-lbl">Çmimi i makinës</span>
                  <span className="res-val">{fmt(result.p)}</span>
                </div>
                <div className="res-row">
                  <span className="res-lbl">
                    RoRo (Koreja → Durrës)
                  </span>
                  <span className="res-val">{fmt(result.roroVal)}</span>
                </div>
                {isKs && (
                  <div className="res-row">
                    <span className="res-lbl">
                      Transport Durrës → Kosovë
                    </span>
                    <span className="res-val">{fmt(result.overVal)}</span>
                  </div>
                )}
                <div className="res-row" style={{ borderBottom: '1px solid rgba(232,118,58,0.3)', paddingBottom: 12, marginBottom: 4 }}>
                  <span className="res-lbl">
                    <strong style={{ color: '#f0f0f5' }}>CIF (baza doganore)</strong>
                  </span>
                  <span className="res-val" style={{ color: '#f0f0f5' }}>{fmt(r.cif)}</span>
                </div>
                <div className="res-row">
                  <span className="res-lbl">
                    Dogana (10%)
                  </span>
                  <span className="res-val">{fmt(r.duty)}</span>
                </div>
                <div className="res-row">
                  <span className="res-lbl">
                    TVSH ({isKs ? '18%' : '20%'})
                    <small>Bazë: CIF + dogana</small>
                  </span>
                  <span className="res-val">{fmt(r.vat)}</span>
                </div>
                <div className="res-row">
                  <span className="res-lbl">
                    Akciza
                    <small>{r.ageLabel}</small>
                  </span>
                  <span className="res-val">{fmt(r.exc)}</span>
                </div>
                <div className="res-row">
                  <span className="res-lbl">Totali i doganimit</span>
                  <span className="res-val">{fmt(r.total)}</span>
                </div>

                <div className="res-total" style={{ marginTop: '1.25rem' }}>
                  <div>
                    <span className="res-total-lbl">Çmimi i plotë (landed)</span>
                    <div style={{ fontSize: 11, color: '#55556a', marginTop: 3 }}>
                      makina + transport + doganë
                    </div>
                  </div>
                  <span className="res-total-val">{fmt(r.land)}</span>
                </div>

                {/* Side-by-side compare if calculated */}
                <div style={{ marginTop: '1rem', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#55556a', marginBottom: 10 }}>Krahasim</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#8888a0', marginBottom: 4 }}>🇽🇰 Kosovë</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: tab === 'ks' ? '#e8763a' : '#f0f0f5' }}>{fmt(result.ks.land)}</div>
                    </div>
                    <div style={{ color: '#55556a', fontSize: 16 }}>vs</div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#8888a0', marginBottom: 4 }}>🇦🇱 Shqipëri</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: tab === 'al' ? '#e8763a' : '#f0f0f5' }}>{fmt(result.al.land)}</div>
                    </div>
                  </div>
                </div>

                <p className="discl" style={{ marginTop: '1rem' }}>
                  ⚠️ Llogaritja është orientuese. Tarifat mund të ndryshojnë sipas ligjit doganor. Kontaktoni Auto Korea Blendi për konfirmim zyrtar.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="svc-grid">
        {SVCS.map(s => (
          <div className="svc" key={s.name}>
            <div className="svc-ico">{s.ico}</div>
            <div className="svc-name">{s.name}</div>
            <div className="svc-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="cta-bar">
        <div className="cta-inner">
          <div className="cta-txt">
            <strong>Keni nevojë për ndihmë?</strong>
            Kontaktoni direkt Auto Korea Blendi
          </div>
          <a className="btn-cta" href="tel:044555630">📞 044 555 630</a>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '3rem' }}>
        <LogoBadge size={100} />
      </div>
    </>
  );
}
