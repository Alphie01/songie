import { useState, type ReactNode } from 'react';
import type { CaseDoc, CharacterView, DocResponse, LocationView } from '../shared/index.js';
import { AudioPlayer, Picture, Seal, Stamp } from './Bits';
import { FloorPlan } from './FloorPlan';
import { s } from './strings';
import { hash, initials, lira, money, Paras, upper } from './util';

type Of<K extends CaseDoc['kind']> = Extract<CaseDoc, { kind: K }>;

interface DocProps<K extends CaseDoc['kind']> {
  doc: Of<K>;
  data: DocResponse;
  chars: Map<string, CharacterView>;
  locations: LocationView[];
  onPerson: (id: string) => void;
}

/** Bir kanıtın içeriğini gerçek belge görünümünde basar. */
export function DocumentView(props: Omit<DocProps<CaseDoc['kind']>, 'doc'>) {
  const doc = props.data.doc;
  const p = { ...props } as Omit<DocProps<never>, 'doc'>;
  switch (doc.kind) {
    case 'statement':
      return <Statement {...p} doc={doc} />;
    case 'report':
      return <Report {...p} doc={doc} />;
    case 'phoneLog':
      return <PhoneLog {...p} doc={doc} />;
    case 'messages':
      return <Messages {...p} doc={doc} />;
    case 'email':
      return <Email {...p} doc={doc} />;
    case 'receipt':
      return <Receipt {...p} doc={doc} />;
    case 'bank':
      return <Bank {...p} doc={doc} />;
    case 'letter':
      return <Letter {...p} doc={doc} />;
    case 'newspaper':
      return <Newspaper {...p} doc={doc} />;
    case 'photo':
      return <Photo {...p} doc={doc} />;
    case 'accessLog':
      return <AccessLog {...p} doc={doc} />;
    case 'ticket':
      return <Ticket {...p} doc={doc} />;
    case 'table':
      return <Table {...p} doc={doc} />;
    case 'floorplan':
      return <Floor {...p} doc={doc} />;
    case 'audio':
      return <AudioDoc {...p} doc={doc} />;
  }
}

/** Belge numarası yoksa kanıt kimliğinden kararlı bir sayı. */
function serial(data: DocResponse, digits = 4) {
  return String(hash(data.evidenceId) % 10 ** digits).padStart(digits, '0');
}

function yearOf(t: string) {
  return t.match(/(19|20)\d{2}/)?.[0] ?? '';
}

function Scroll({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`dt-doc-scroll ${className ?? ''}`}>{children}</div>;
}

// ---------- İfade tutanağı ----------

function Statement({ doc, data, chars, onPerson }: DocProps<'statement'>) {
  const c = chars.get(doc.person);
  const name = c?.name ?? doc.person;
  const cap = s.doc.capacity[doc.capacity] ?? doc.capacity;
  const year = yearOf(doc.datetime);
  return (
    <article className="dt-paper dt-statement">
      <header className="dt-st-head">
        <p className="dt-st-tc">T.C.</p>
        <p className="dt-st-place">{upper(doc.place)}</p>
        <h2 className="dt-st-title">{upper(`${cap} ${s.doc.statementTitle}`)}</h2>
        <p className="dt-docno">
          {s.doc.fields.no}: {year ? `${year}/` : ''}
          {serial(data, 5)}
        </p>
      </header>

      <table className="dt-idblock">
        <tbody>
          <tr>
            <th>{s.doc.fields.name}</th>
            <td>
              <button type="button" className="dt-plink" onClick={() => onPerson(doc.person)}>
                {upper(name)}
              </button>
            </td>
          </tr>
          {c?.age != null && (
            <tr>
              <th>{s.doc.fields.age}</th>
              <td>{c.age}</td>
            </tr>
          )}
          {c?.role && (
            <tr>
              <th>{s.doc.fields.role}</th>
              <td>{c.role}</td>
            </tr>
          )}
          <tr>
            <th>{s.doc.fields.capacity}</th>
            <td>{cap}</td>
          </tr>
          <tr>
            <th>{s.doc.fields.place}</th>
            <td>{doc.place}</td>
          </tr>
          <tr>
            <th>{s.doc.fields.datetime}</th>
            <td>{doc.datetime}</td>
          </tr>
          <tr>
            <th>{s.doc.fields.takenBy}</th>
            <td>{doc.takenBy}</td>
          </tr>
        </tbody>
      </table>

      <div className="dt-st-body">
        {doc.qa.map((qa, i) => (
          <div key={i} className="dt-qa">
            <p>
              <b className="dt-qa-k">{upper(s.doc.asked)}:</b> {qa.q}
            </p>
            <p>
              <b className="dt-qa-k">{upper(s.doc.answered)}:</b> {qa.a}
            </p>
          </div>
        ))}
        {doc.body && <Paras text={doc.body} />}
      </div>

      <p className="dt-st-close">{s.doc.statementClose}</p>

      <footer className="dt-signs">
        <div className="dt-sign">
          <span className="dt-sign-role">{s.doc.signGiver}</span>
          <span className="dt-scribble">{name}</span>
          <span className="dt-sign-name">{name}</span>
        </div>
        <div className="dt-sign">
          <span className="dt-sign-role">{s.doc.signTaker}</span>
          <span className="dt-scribble">{doc.takenBy.split(' ').slice(-1)[0]}</span>
          <span className="dt-sign-name">{doc.takenBy}</span>
          <Seal id={`st-${data.evidenceId}`} className="dt-seal-ink" text={doc.place} center="T.C." />
        </div>
      </footer>
    </article>
  );
}

// ---------- Rapor ----------

const OFFICIAL = new Set(['scene', 'autopsy', 'lab', 'police', 'expert']);

function Report({ doc, data }: DocProps<'report'>) {
  const parts = doc.agency.split(/\s*[·|]\s*|\s+—\s+/).filter(Boolean);
  const official = OFFICIAL.has(doc.variant);
  const memo = doc.variant === 'internal';
  return (
    <article className="dt-paper dt-report" data-variant={doc.variant}>
      <header className="dt-rp-head">
        {official ? (
          <Seal id={`rh-${data.evidenceId}`} className="dt-seal-head" text={parts[0] ?? doc.agency} center="T.C." />
        ) : (
          <span className="dt-rp-logo" aria-hidden="true">
            {initials(parts[0] ?? doc.agency)}
          </span>
        )}
        <div className="dt-rp-agency">
          {official && <p className="dt-rp-tc">T.C.</p>}
          {parts.map((p, i) => (
            <p key={i} className={i === 0 ? 'dt-rp-agency-main' : undefined}>
              {official ? upper(p) : p}
            </p>
          ))}
        </div>
        <p className="dt-rp-variant">{s.doc.report[doc.variant]}</p>
      </header>

      {memo && <p className="dt-rp-memo">{upper(s.doc.report.internal)}</p>}

      <dl className="dt-rp-meta">
        <div>
          <dt>{s.doc.fields.no}</dt>
          <dd>{doc.docNo}</dd>
        </div>
        <div>
          <dt>{s.doc.fields.date}</dt>
          <dd>{doc.datetime}</dd>
        </div>
        <div>
          <dt>{s.doc.fields.subject}</dt>
          <dd>{doc.heading}</dd>
        </div>
      </dl>

      {!memo && <h2 className="dt-rp-title">{upper(doc.heading)}</h2>}

      <ol className="dt-rp-sections">
        {doc.sections.map((sec, i) => (
          <li key={i}>
            <h3 className="dt-rp-sec-title">{sec.title}</h3>
            <Paras text={sec.text} />
          </li>
        ))}
      </ol>

      <footer className="dt-rp-sign">
        <Stamp text={s.doc.reportStamp[doc.variant]} tone={doc.variant === 'insurance' || memo ? 'red' : 'blue'} />
        <div className="dt-sign">
          <span className="dt-scribble">{doc.signature.split(' ').slice(-1)[0]}</span>
          <span className="dt-sign-name">{doc.signature}</span>
        </div>
      </footer>
    </article>
  );
}

// ---------- HTS ----------

function PhoneLog({ doc }: DocProps<'phoneLog'>) {
  return (
    <article className="dt-paper dt-hts">
      <header className="dt-hts-head">
        <p className="dt-hts-title">{upper(s.doc.htsTitle)}</p>
        <dl className="dt-hts-meta">
          <div>
            <dt>{s.doc.fields.subscriber}</dt>
            <dd>{doc.subscriber}</dd>
          </div>
          <div>
            <dt>{s.doc.fields.number}</dt>
            <dd>{doc.number}</dd>
          </div>
          <div>
            <dt>{s.doc.fields.period}</dt>
            <dd>{doc.period}</dd>
          </div>
        </dl>
      </header>
      <Scroll>
        <table className="dt-hts-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{s.doc.hts.datetime}</th>
              <th>{s.doc.hts.type}</th>
              <th>{s.doc.hts.other}</th>
              <th>{s.doc.hts.duration}</th>
              <th>{s.doc.hts.tower}</th>
            </tr>
          </thead>
          <tbody>
            {doc.rows.map((r, i) => (
              <tr key={i} data-type={r.type}>
                <td>{String(i + 1).padStart(3, '0')}</td>
                <td>{r.datetime}</td>
                <td>{upper(r.type)}</td>
                <td>{r.other}</td>
                <td>{r.duration ?? '—'}</td>
                <td>{r.tower ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroll>
      <p className="dt-hts-foot">{s.doc.page(1, 1)}</p>
    </article>
  );
}

// ---------- Mesajlar ----------

function DeletedIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M6.5 17.5l11-11" />
    </svg>
  );
}

function Messages({ doc }: DocProps<'messages'>) {
  let lastDay = '';
  return (
    <figure className="dt-phone-wrap">
      <div className="dt-phone">
        <div className="dt-phone-bar">
          <span className="dt-phone-av" aria-hidden="true">
            {initials(doc.with)}
          </span>
          <span className="dt-phone-with">{doc.with}</span>
        </div>
        <div className="dt-phone-thread">
          {doc.messages.map((m, i) => {
            const [day, time] = m.time.includes(' ') ? [m.time.split(' ')[0]!, m.time.split(' ').slice(1).join(' ')] : ['', m.time];
            const divider = day && day !== lastDay;
            if (day) lastDay = day;
            const recovered = m.deleted && m.text.trim() && !/^silindi\.?$/i.test(m.text.trim());
            return (
              <div key={i} className="dt-msg-group">
                {divider && <p className="dt-msg-day">{day}</p>}
                {m.from === 'system' ? (
                  <p className="dt-msg-sys">{m.text}</p>
                ) : (
                  <div className="dt-msg" data-from={m.from} data-deleted={m.deleted || undefined}>
                    {m.name && m.from === 'them' && <span className="dt-msg-name">{m.name}</span>}
                    {m.deleted ? (
                      <span className="dt-msg-del">
                        <DeletedIcon /> {s.doc.deleted}
                      </span>
                    ) : (
                      <span className="dt-msg-text">{m.text}</span>
                    )}
                    {recovered && (
                      <span className="dt-msg-rec">
                        {s.doc.recovered}: {m.text}
                      </span>
                    )}
                    <span className="dt-msg-time">{time}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <figcaption className="dt-phone-cap">
        {doc.source}, {doc.owner}
      </figcaption>
    </figure>
  );
}

// ---------- E-posta ----------

function Email({ doc }: DocProps<'email'>) {
  const sender = doc.from.replace(/<.*>/, '').trim();
  return (
    <article className="dt-mail">
      <div className="dt-mail-chrome" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="dt-mail-body">
        <h2 className="dt-mail-subject">{doc.subject}</h2>
        <div className="dt-mail-head">
          <span className="dt-mail-av" aria-hidden="true">
            {initials(sender.split('@')[0]!.replace(/[._-]/g, ' '))}
          </span>
          <dl className="dt-mail-fields">
            <div>
              <dt>{s.doc.fields.from}</dt>
              <dd>{doc.from}</dd>
            </div>
            <div>
              <dt>{s.doc.fields.to}</dt>
              <dd>{doc.to}</dd>
            </div>
            {doc.cc && (
              <div>
                <dt>{s.doc.fields.cc}</dt>
                <dd>{doc.cc}</dd>
              </div>
            )}
          </dl>
          <span className="dt-mail-date">{doc.date}</span>
        </div>
        <div className="dt-mail-text">
          <Paras text={doc.body} />
        </div>
        {doc.attachments.length > 0 && (
          <div className="dt-mail-att">
            <p className="dt-mail-att-n">{s.doc.attachments(doc.attachments.length)}</p>
            <ul>
              {doc.attachments.map((a) => (
                <li key={a}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path d="M8 12.5l5.5-5.5a2.5 2.5 0 0 1 3.5 3.5l-7 7a4 4 0 0 1-5.7-5.7l6.5-6.5" />
                  </svg>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

// ---------- Fiş ----------

function Receipt({ doc, data }: DocProps<'receipt'>) {
  const total = doc.items.reduce((t, it) => t + it.qty * it.price, 0);
  return (
    <article className="dt-receipt">
      <p className="dt-rc-merchant">{upper(doc.merchant)}</p>
      <p className="dt-rc-addr">{doc.address}</p>
      <p className="dt-rc-row">
        <span>{doc.datetime}</span>
        <span>
          {s.doc.receiptNo}:{serial(data)}
        </span>
      </p>
      <hr />
      {doc.items.map((it, i) => (
        <div key={i} className="dt-rc-item">
          {it.qty !== 1 && (
            <p className="dt-rc-qty">
              {it.qty} x {money(it.price)}
            </p>
          )}
          <p className="dt-rc-row">
            <span>{upper(it.name)}</span>
            <span>*{money(it.qty * it.price)}</span>
          </p>
        </div>
      ))}
      <hr />
      <p className="dt-rc-row dt-rc-total">
        <span>{upper(s.doc.total)}</span>
        <span>*{lira(total)}</span>
      </p>
      <p className="dt-rc-row">
        <span>{upper(s.doc.payment)}</span>
        <span>{upper(doc.payment)}</span>
      </p>
      <hr />
      {doc.footer && <p className="dt-rc-foot">{doc.footer}</p>}
      <p className="dt-rc-bar" aria-hidden="true" style={{ backgroundImage: barcode(data.evidenceId) }} />
    </article>
  );
}

// ---------- Banka ----------

function Bank({ doc }: DocProps<'bank'>) {
  const totalIn = doc.rows.filter((r) => r.amount > 0).reduce((t, r) => t + r.amount, 0);
  const totalOut = doc.rows.filter((r) => r.amount < 0).reduce((t, r) => t + r.amount, 0);
  return (
    <article className="dt-paper dt-bank">
      <header className="dt-bank-head">
        <span className="dt-bank-logo" aria-hidden="true">
          {initials(doc.bank)}
        </span>
        <p className="dt-bank-name">{doc.bank}</p>
        <p className="dt-bank-title">{s.doc.bankTitle}</p>
      </header>
      <dl className="dt-bank-meta">
        <div>
          <dt>{s.doc.fields.holder}</dt>
          <dd>{doc.holder}</dd>
        </div>
        <div>
          <dt>{s.doc.fields.iban}</dt>
          <dd className="dt-num">{doc.iban}</dd>
        </div>
        <div>
          <dt>{s.doc.fields.period}</dt>
          <dd>{doc.period}</dd>
        </div>
      </dl>
      <Scroll>
        <table className="dt-bank-table">
          <thead>
            <tr>
              <th>{s.doc.bank.date}</th>
              <th>{s.doc.bank.desc}</th>
              <th className="dt-r">{s.doc.bank.amount}</th>
              <th className="dt-r">{s.doc.bank.balance}</th>
            </tr>
          </thead>
          <tbody>
            {doc.rows.map((r, i) => (
              <tr key={i}>
                <td className="dt-num">{r.date}</td>
                <td>{r.desc}</td>
                <td className="dt-r dt-num" data-sign={r.amount < 0 ? 'neg' : 'pos'}>
                  {r.amount > 0 ? '+' : r.amount < 0 ? '−' : ''}
                  {money(Math.abs(r.amount))}
                </td>
                <td className="dt-r dt-num">{r.balance != null ? money(r.balance) : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>{s.doc.bankIn}</td>
              <td className="dt-r dt-num" data-sign="pos">
                +{money(totalIn)}
              </td>
              <td />
            </tr>
            <tr>
              <td colSpan={2}>{s.doc.bankOut}</td>
              <td className="dt-r dt-num" data-sign="neg">
                −{money(Math.abs(totalOut))}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </Scroll>
    </article>
  );
}

// ---------- Not / mektup ----------

function conditionFx(c: string | undefined): string[] {
  if (!c) return [];
  const t = c.toLocaleLowerCase('tr-TR');
  const fx: string[] = [];
  if (/kahve|çay|leke/.test(t)) fx.push('coffee');
  if (/yırt|kopar|parça/.test(t)) fx.push('torn');
  if (/yan|is|kömür/.test(t)) fx.push('burnt');
  if (/ısla|su |sulu|nem|dağıl/.test(t)) fx.push('wet');
  if (/buruş|katla|kırış/.test(t)) fx.push('crumpled');
  if (/kan/.test(t)) fx.push('blood');
  return fx;
}

function Letter({ doc }: DocProps<'letter'>) {
  const fx = conditionFx(doc.condition);
  return (
    <figure className="dt-letter-wrap">
      <article className="dt-letter" data-hand={doc.hand} data-fx={fx.join(' ') || undefined}>
        {doc.date && <p className="dt-lt-date">{doc.date}</p>}
        {doc.salutation && <p className="dt-lt-sal">{doc.salutation}</p>}
        <div className="dt-lt-body">
          <Paras text={doc.body} />
        </div>
        {doc.signoff && <p className="dt-lt-sign">{doc.signoff}</p>}
      </article>
      {doc.condition && <figcaption className="dt-doc-caption">{s.doc.condition(doc.condition)}</figcaption>}
    </figure>
  );
}

// ---------- Gazete ----------

function Newspaper({ doc, data }: DocProps<'newspaper'>) {
  const img = doc.image ? data.images[doc.image] : undefined;
  return (
    <article className="dt-news">
      <header className="dt-news-mast">
        <p className="dt-news-paper">{doc.paper}</p>
        <p className="dt-news-date">{doc.date}</p>
      </header>
      <h2 className="dt-news-head">{doc.headline}</h2>
      {doc.subhead && <p className="dt-news-sub">{doc.subhead}</p>}
      {img && (
        <figure className="dt-news-fig">
          <Picture url={img.url} alt={img.alt} tone="news" />
          {img.url && <figcaption>{img.alt}</figcaption>}
        </figure>
      )}
      <div className="dt-news-body">
        <Paras text={doc.body} />
      </div>
    </article>
  );
}

// ---------- Fotoğraf ----------

function Photo({ doc, data }: DocProps<'photo'>) {
  const img = data.images[doc.image] ?? { url: null, alt: doc.caption };
  if (doc.cctv) {
    return (
      <figure className="dt-cctv-wrap">
        <div className="dt-cctv">
          <Picture url={img.url} alt={img.alt} tone="cctv" label={s.doc.photoMissing} />
          <div className="dt-cctv-osd" aria-hidden="true">
            <span className="dt-cctv-cam">{doc.cctv.camera}</span>
            <span className="dt-cctv-rec">
              <i /> {s.doc.rec}
            </span>
            <span className="dt-cctv-ts">{doc.cctv.timestamp}</span>
          </div>
        </div>
        <figcaption className="dt-doc-caption">
          <span className="dt-mono">
            {doc.cctv.camera}, {doc.cctv.timestamp}
          </span>
          <br />
          {doc.caption}
        </figcaption>
      </figure>
    );
  }
  return (
    <figure className="dt-print-wrap">
      <div className="dt-print">
        <Picture url={img.url} alt={img.alt} tone="print" label={s.doc.photoMissing} />
        {doc.tag && <span className="dt-tag">{s.doc.photoTag(doc.tag)}</span>}
        <p className="dt-print-cap">{doc.caption}</p>
      </div>
    </figure>
  );
}

// ---------- Kartlı geçiş ----------

function AccessLog({ doc, data }: DocProps<'accessLog'>) {
  const rej = doc.rows.filter((r) => r.result === 'RET').length;
  const alarm = doc.rows.filter((r) => r.result === 'ALARM').length;
  return (
    <article className="dt-paper dt-access">
      <header className="dt-ac-head">
        <p className="dt-ac-sys">{doc.system}</p>
        <p className="dt-ac-title">{upper(s.doc.accessTitle)}</p>
        <dl className="dt-ac-meta">
          <div>
            <dt>{s.doc.fields.site}</dt>
            <dd>{doc.site}</dd>
          </div>
          <div>
            <dt>{s.doc.fields.period}</dt>
            <dd>{doc.period}</dd>
          </div>
          <div>
            <dt>{s.doc.fields.no}</dt>
            <dd>RPR-{serial(data, 6)}</dd>
          </div>
        </dl>
      </header>
      <Scroll>
        <table className="dt-ac-table">
          <thead>
            <tr>
              <th>{s.doc.access.time}</th>
              <th>{s.doc.access.card}</th>
              <th>{s.doc.access.holder}</th>
              <th>{s.doc.access.door}</th>
              <th>{s.doc.access.result}</th>
            </tr>
          </thead>
          <tbody>
            {doc.rows.map((r, i) => (
              <tr key={i} data-result={r.result}>
                <td>{r.time}</td>
                <td>{r.card}</td>
                <td>{r.holder}</td>
                <td>{r.door}</td>
                <td>
                  <span className="dt-ac-res">{r.result}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroll>
      <p className="dt-ac-foot">
        {s.doc.accessSummary(doc.rows.length, rej, alarm)}
      </p>
    </article>
  );
}

// ---------- Bilet ----------

function barcode(seed: string): string {
  let h = hash(seed);
  const stops: string[] = [];
  let x = 0;
  let black = true;
  while (x < 100) {
    h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0;
    const w = black ? 0.6 + (h % 3) * 0.6 : 0.5 + (h % 4) * 0.5;
    const c = black ? '#1b1b1b' : 'transparent';
    stops.push(`${c} ${x.toFixed(2)}%`, `${c} ${Math.min(100, x + w).toFixed(2)}%`);
    x += w;
    black = !black;
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

function Ticket({ doc, data }: DocProps<'ticket'>) {
  const ser = doc.serial ?? `No ${serial(data, 6)}`;
  return (
    <article className="dt-ticket" data-variant={doc.variant}>
      <div className="dt-tk-main">
        <p className="dt-tk-kind">{s.doc.ticket[doc.variant]}</p>
        <h2 className="dt-tk-title">{doc.title}</h2>
        <dl className="dt-tk-fields">
          {doc.fields.map((f, i) => (
            <div key={i}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="dt-tk-stub">
        <span className="dt-tk-serial">{ser}</span>
        <span className="dt-tk-bar" aria-hidden="true" style={{ backgroundImage: barcode(ser) }} />
      </div>
    </article>
  );
}

// ---------- Liste ----------

function Table({ doc }: DocProps<'table'>) {
  return (
    <article className="dt-paper dt-list">
      <h2 className="dt-list-head">{doc.heading}</h2>
      {doc.note && <p className="dt-list-note">{doc.note}</p>}
      <Scroll>
        <table className="dt-list-table">
          <thead>
            <tr>
              {doc.columns.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doc.rows.map((r, i) => (
              <tr key={i}>
                {doc.columns.map((_, j) => (
                  <td key={j}>{r[j] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Scroll>
    </article>
  );
}

// ---------- Kroki ----------

function Floor({ doc, locations }: DocProps<'floorplan'>) {
  const loc = locations.find((l) => l.id === doc.location);
  return (
    <article className="dt-paper dt-plan">
      <header className="dt-plan-head">
        <p className="dt-plan-title">{upper(s.doc.floorplanTitle)}</p>
        <p className="dt-plan-loc">{loc?.name ?? doc.location}</p>
      </header>
      {loc?.plan ? <FloorPlan plan={loc.plan} title={loc.name} /> : <p className="dt-plan-missing">{s.doc.planMissing}</p>}
      <p className="dt-plan-cap">{doc.caption}</p>
    </article>
  );
}

// ---------- Ses kaydı ----------

function AudioDoc({ doc, data, chars, onPerson }: DocProps<'audio'>) {
  const [open, setOpen] = useState(!data.audioUrl);
  return (
    <article className="dt-rec">
      <header className="dt-rec-head">
        <span className="dt-rec-led" aria-hidden="true" />
        <div className="dt-rec-id">
          <p className="dt-rec-variant">{s.audio.variant[doc.variant] ?? doc.variant}</p>
          <p className="dt-rec-source">{doc.source}</p>
        </div>
        <dl className="dt-rec-meta">
          <div>
            <dt>{s.doc.fields.datetime}</dt>
            <dd>{doc.datetime}</dd>
          </div>
          <div>
            <dt>{s.audio.recNo}</dt>
            <dd>SK-{serial(data, 6)}</dd>
          </div>
        </dl>
      </header>
      <AudioPlayer url={data.audioUrl} seed={data.evidenceId} playLabel={s.audio.play} pauseLabel={s.audio.pause} missing={s.audio.missing} />
      <button type="button" className="dt-rec-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? s.audio.hideTranscript : s.audio.showTranscript}
      </button>
      {open && (
        <div className="dt-paper dt-transcript">
          <p className="dt-tr-title">
            {upper(s.audio.transcript)}: {doc.source}, {doc.datetime}
          </p>
          {doc.ambience && <p className="dt-tr-amb">{s.audio.ambience(doc.ambience)}</p>}
          {doc.lines.map((l, i) => {
            const c = l.character ? chars.get(l.character) : undefined;
            const who = c?.name ?? l.name ?? s.audio.unknown;
            return (
              <div key={i} className="dt-tr-line">
                {l.pause ? <p className="dt-tr-amb">{s.audio.silence(l.pause)}</p> : null}
                <p>
                  {c ? (
                    <button type="button" className="dt-plink dt-tr-who" onClick={() => onPerson(c.id)}>
                      {upper(who)}:
                    </button>
                  ) : (
                    <b className="dt-tr-who">{upper(who)}:</b>
                  )}{' '}
                  {l.delivery && <i className="dt-tr-del">({l.delivery}) </i>}
                  {l.text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
