const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': 'https://www.encar.com/',
  'Origin': 'https://www.encar.com',
};

const FUEL_MAP = {
  'diesel': '디젤', 'dizel': '디젤',
  'benzin': '가솔린', 'benzine': '가솔린', 'gasoline': '가솔린',
  'elektrik': '전기', 'electric': '전기',
  'hibrid': '하이브리드', 'hybrid': '하이브리드',
  'lpg': 'LPG'
};

async function attempt(fetchUrl, isWrapped, signal, label, extraHeaders) {
  const r = await fetch(fetchUrl, { signal, headers: extraHeaders });
  if (!r.ok) throw new Error(`${label}: HTTP ${r.status}`);
  const text = await r.text();

  let data;
  if (isWrapped) {
    const outer = JSON.parse(text);
    if (outer.status?.http_code === 403) throw new Error(`${label}: Encar 403 via proxy`);
    if (!outer.contents) throw new Error(`${label}: empty proxy contents`);
    data = JSON.parse(outer.contents);
  } else {
    data = JSON.parse(text);
  }

  if (!Array.isArray(data?.SearchResults)) throw new Error(`${label}: no SearchResults`);
  console.log(`[${label}] OK Count=${data.Count} items=${data.SearchResults.length}`);
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    manufacturer = '',
    model        = '',
    fuel         = '',
    yearFrom     = '',
    yearTo       = '',
    mileageFrom  = '',
    mileageTo    = '',
    page         = '0',
    count        = '500'
  } = req.query;

  const offset = parseInt(page) * parseInt(count);

  // Encar DSL:
  //   No filters → (And.Hidden.N.)
  //   With filters → (And.Hidden.N._.COND1._.COND2.)
  // Separator between every condition is "._."
  // Range syntax: Year.range(FROM..TO)  Mileage.range(FROM..TO)
  const parts = [];

  if (manufacturer) parts.push(`Manufacturer.${manufacturer}`);

  if (fuel) {
    const encarFuel = FUEL_MAP[fuel.toLowerCase().trim()] || fuel;
    parts.push(`FuelType.${encarFuel}`);
  }

  if (yearFrom || yearTo) {
    parts.push(`Year.range(${yearFrom || 2000}..${yearTo || 2027})`);
  }

  if (mileageFrom || mileageTo) {
    parts.push(`Mileage.range(${mileageFrom || 0}..${mileageTo || 999999})`);
  }

  const q = parts.length > 0
    ? `(And.Hidden.N._.${parts.join('._.')}.)`
    : `(And.Hidden.N.)`;

  const encarUrl = `https://api.encar.com/search/car/list/general?${new URLSearchParams({
    count: 'true',
    q,
    sr: `|ModifiedDate|${offset}|${parseInt(count)}`,
    inav: '|Metadata|Sort'
  })}`;

  console.log('[Encar] q:', q);

  // 8 s hard timeout — well under Vercel Hobby 10 s function limit.
  // All 4 attempts fire in parallel; the fastest valid response wins.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  const enc = encodeURIComponent(encarUrl);

  try {
    const data = await Promise.any([
      attempt(encarUrl,                                              false, ctrl.signal, 'direct',    BROWSER_HEADERS),
      attempt(`https://api.allorigins.win/get?url=${enc}`,          true,  ctrl.signal, 'allorigins', {}),
      attempt(`https://corsproxy.io/?${enc}`,                       false, ctrl.signal, 'corsproxy',  {}),
      attempt(`https://api.codetabs.com/v1/proxy?quest=${enc}`,     false, ctrl.signal, 'codetabs',   {}),
    ]);

    clearTimeout(timer);
    return res.status(200).json(data);

  } catch (err) {
    clearTimeout(timer);
    const isTimeout = ctrl.signal.aborted;
    const detail = err instanceof AggregateError
      ? err.errors.map(e => e.message).join(' | ')
      : err.message;
    console.error('[FAIL]', isTimeout ? 'timeout 8s' : detail);

    return res.status(isTimeout ? 504 : 502).json({
      error: isTimeout
        ? 'Timeout. Provo përsëri.'
        : 'Nuk u mor përgjigje nga burimet. Provo përsëri.',
      code: isTimeout ? 'TIMEOUT' : 'ALL_FAILED',
      query: q,
      detail
    });
  }
}
