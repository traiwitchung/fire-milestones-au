// Overview — the landing tab. Reads every other tab's saved data and shows where things stand,
// plus a to-do list (check-in due, FIRE out of sync, backup overdue…) with one-tap fixes.
(() => {
  const { useState, useMemo } = React;
  const { ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } = Recharts;
  const {
    T, mono, fmt, fmtFull, fmtSigned, fmtDate, todayISO, parseISO, num, CATS, ASSET_CATS,
    useIsMobile, Card, Button,
  } = window.UI;

  const META_KEY = "fire-meta"; // { lastBackup: ISO } — written by the Backup button
  const readMeta = () => { try { return JSON.parse(localStorage.getItem(META_KEY) || "{}"); } catch { return {}; } };
  const daysSince = (iso) => iso ? Math.floor((parseISO(todayISO()) - parseISO(iso.slice(0, 10))) / 86400000) : null;
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  // Everything the Overview shows, recomputed from storage each time.
  function gather() {
    const { MoneyEngine, LoanEngine, FireEngine } = window;
    const money = MoneyEngine.loadMoney();
    const m = MoneyEngine.computeMoney(money);
    const moneySync = MoneyEngine.fireSync(money, m, MoneyEngine.loadFire());
    const fireIn = { ...FireEngine.loadFireInputs(), ...FireEngine.loadMsInputs() };
    const fire = FireEngine.computeAll(fireIn);
    const loan = LoanEngine.hasLoan() ? LoanEngine.loanSummary(LoanEngine.loadLoan(), LoanEngine.loadFire()) : null;
    const loanInputs = loan ? LoanEngine.loadLoan() : null;
    return { money, m, moneySync, fireIn, fire, loan, loanInputs, meta: readMeta() };
  }

  const Icon = ({ ok, warn }) => (
    <span style={{
      width: 20, height: 20, borderRadius: 999, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700,
      background: ok ? `${T.green}18` : warn ? `${T.red}18` : `${T.accent}18`,
      color: ok ? T.green : warn ? T.red : T.accent,
      border: `1px solid ${ok ? `${T.green}50` : warn ? `${T.red}50` : `${T.accent}50`}`,
    }}>{ok ? "✓" : warn ? "!" : "•"}</span>
  );

  // Card header that links to a tab
  const TabLink = ({ go, tab, children }) => (
    <button onClick={() => go(tab)} style={{
      background: "transparent", border: "none", color: T.accent, cursor: "pointer",
      fontSize: 11, fontWeight: 600, padding: 0, fontFamily: "'DM Sans', sans-serif",
    }}>{children} →</button>
  );

  const Big = ({ children, color = T.text, size = 26 }) => (
    <div style={{ fontSize: size, fontWeight: 700, color, ...mono, lineHeight: 1.15 }}>{children}</div>
  );
  const Sub = ({ children }) => <div style={{ fontSize: 12, color: T.textDim, marginTop: 4, lineHeight: 1.45 }}>{children}</div>;
  const Bar = ({ p, color }) => (
    <div style={{ marginTop: 10, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, p * 100))}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s" }} />
    </div>
  );

  function Overview({ go }) {
    const isMobile = useIsMobile();
    const [version, setVersion] = useState(0);
    const [done, setDone] = useState(null);
    const d = useMemo(gather, [version]);
    const { money, m, moneySync, fireIn, fire, loan, loanInputs, meta } = d;
    const refresh = (note) => { setDone(note); setVersion(v => v + 1); };

    const latest = m.latest, prev = m.prev;
    const now = m.now;
    const hasData = money.snapshots.length > 0;

    // ─── To-do list ───
    const todos = [];
    const sinceCheckIn = latest ? daysSince(latest.date) : null;
    if (!latest) todos.push({ warn: false, text: "Record your balances for the first time — it takes two minutes.", action: "Check in", run: () => go("networth", "checkin") });
    else if (sinceCheckIn > 35) todos.push({ text: `Last check-in was ${plural(sinceCheckIn, "day")} ago — time for this month's.`, action: "Check in", run: () => go("networth", "checkin") });
    else todos.push({ ok: true, text: `Balances checked in ${sinceCheckIn === 0 ? "today" : `${plural(sinceCheckIn, "day")} ago`} (${fmtDate(latest.date)}).` });

    // FIRE ← budget & balances. Only once there's a check-in (so a fresh device never pushes the
    // example budget), and never one-tap a change that would zero a FIRE input.
    const changes = latest ? moneySync.changes : [];
    const risky = changes.filter(r => r.value === 0 && r.current > 0);
    const safe = changes.filter(r => !risky.includes(r));
    if (safe.length) todos.push({
      text: <>FIRE is behind your latest numbers: {safe.map(r => `${r.label.toLowerCase()} ${fmt(r.current)} → ${fmt(r.value)}`).join(" · ")}.</>,
      action: "Update FIRE",
      run: () => {
        window.MoneyEngine.writeFireSync(safe);
        try { localStorage.setItem(window.MoneyEngine.MONEY_KEY, JSON.stringify({ ...money, lastSync: todayISO() })); } catch {}
        refresh(`FIRE updated (${plural(safe.length, "input")}).`);
      },
    });
    if (risky.length) todos.push({ warn: true, text: `${risky.map(r => r.label).join(", ")} would be set to $0 in FIRE — enter the balance at a check-in or untick it.`, action: "Review", run: () => go("networth") });
    if (!safe.length && !risky.length && latest) todos.push({ ok: true, text: "FIRE matches your budget and balances." });

    // FIRE ← home loan
    const moneyLoanBal = now.loan;
    if (loan && loan.main.payoffISO && !loan.fireSynced) todos.push({
      text: `FIRE's mortgage is out of date — Home loan says ${fmtFull(loan.repayMonthly)}/mo until age ${loan.payoffAge}.`,
      action: "Update FIRE",
      run: () => {
        let f = {}; try { f = JSON.parse(localStorage.getItem("fire-calc-au-inputs") || "{}"); } catch {}
        try { localStorage.setItem("fire-calc-au-inputs", JSON.stringify({ ...f, mortgageRepayment: Math.round(loan.repayMonthly), mortgagePayoffAge: loan.payoffAge })); } catch {}
        refresh("FIRE now includes your mortgage.");
      },
    });
    else if (!loan && moneyLoanBal > 0) todos.push({ text: `You have ${fmt(moneyLoanBal)} of debt — set up the home loan to see your mortgage-free date and include it in FIRE.`, action: "Set up", run: () => go("loan") });
    else if (loan && loan.main.payoffISO && loan.fireSynced) todos.push({ ok: true, text: `FIRE includes your mortgage until age ${loan.payoffAge}.` });
    if (loan && loanInputs && latest && moneyLoanBal > 0 && Math.abs(moneyLoanBal - num(loanInputs.principal)) > 1000) todos.push({
      text: `Home loan balance (${fmt(num(loanInputs.principal))}) differs from your last check-in (${fmt(moneyLoanBal)}).`,
      action: "Open", run: () => go("loan"),
    });

    if (m.surplus < 0) todos.push({ warn: true, text: `Spending is ${fmt(-m.surplus)}/mo more than take-home pay.`, action: "Budget", run: () => go("budget") });
    else if (m.unallocated < -0.5) todos.push({ warn: true, text: `Savings allocations exceed your surplus by ${fmtFull(-m.unallocated)}/mo.`, action: "Budget", run: () => go("budget") });
    if (fire.depletedAge.full != null) todos.push({ warn: true, text: `Your FIRE plan runs out of money at age ${fire.depletedAge.full}.`, action: "Review", run: () => go("fire") });

    const sinceBackup = daysSince(meta.lastBackup);
    if (hasData && (sinceBackup == null || sinceBackup > 30)) todos.push({
      text: sinceBackup == null ? "No backup yet — your data lives only in this browser." : `Last backup was ${plural(sinceBackup, "day")} ago.`,
      action: "Back up", run: () => { window.pwaExport && window.pwaExport(); refresh("Backup downloaded."); },
    });
    const open = todos.filter(t => !t.ok);

    // ─── Net worth history (sparkline) + asset mix ───
    const history = m.snaps.map(s => ({ label: fmtDate(s.date), nw: window.MoneyEngine.snapshotTotals(money.accounts, s).nw }));
    const mix = ASSET_CATS.map(c => ({ c, v: now[c] })).filter(x => x.v > 0);
    const assets = now.assets;

    // ─── FIRE summary ───
    const yearOf = (age) => age == null ? null : new Date().getFullYear() + (age - fireIn.currentAge);
    const portfolio = num(fireIn.superBalance) + num(fireIn.outsideBalance);
    const fireP = fire.fireNumber > 0 ? portfolio / fire.fireNumber : 0;
    const msLine = (label, ms, color) => (
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
        <span style={{ color: T.textMid }}>{label}</span>
        <span style={{ ...mono, color: ms.atAge == null ? T.red : color }}>
          {ms.atAge == null ? "not reached" : ms.atAge <= fireIn.currentAge ? "now ✓" : `${yearOf(ms.atAge)} · age ${ms.atAge}`}
        </span>
      </div>
    );

    const grid = { display: "grid", gap: 16, marginBottom: 16 };
    const cols4 = { ...grid, gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))" };

    return (
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: `${isMobile ? 16 : 20}px ${isMobile ? 16 : 32}px 96px`, color: "#c8d5e2" }}>
        <div style={{ ...grid, gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.5fr) minmax(0,1fr)" }}>
          {/* Net worth hero */}
          <Card title="Net worth" right={<TabLink go={go} tab="networth">Net worth</TabLink>}>
            {latest ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                  <Big color={T.accent} size={isMobile ? 34 : 42}>{fmtFull(now.nw)}</Big>
                  {prev && (
                    <span style={{ ...mono, fontSize: 14, color: now.nw - m.before.nw >= 0 ? T.green : T.red }}>
                      {fmtSigned(now.nw - m.before.nw)} since {fmtDate(prev.date)}
                    </span>
                  )}
                </div>
                <Sub>as of {fmtDate(latest.date)} · {fmt(assets)} assets − {fmt(now.loan)} debt</Sub>
                {history.length >= 2 && (
                  <div style={{ height: 90, marginTop: 10, marginLeft: -6 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={history} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="ovNW" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={T.accent} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={T.accent} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" hide />
                        <YAxis hide domain={["dataMin", "dataMax"]} />
                        <Tooltip formatter={(v) => fmtFull(v)} labelStyle={{ color: T.accent }}
                          contentStyle={{ background: "rgba(16,22,36,0.95)", border: `1px solid ${T.accentDim}`, borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="nw" name="Net worth" stroke={T.accent} strokeWidth={2} fill="url(#ovNW)" isAnimationActive={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {assets > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                      {mix.map((x, i) => (
                        <div key={x.c} title={`${CATS[x.c].label}: ${fmtFull(x.v)}`}
                          style={{ width: `${x.v / assets * 100}%`, background: CATS[x.c].color, opacity: 0.85, borderRight: i < mix.length - 1 ? "1px solid #0b1120" : "none" }} />
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 8 }}>
                      {mix.map(x => (
                        <span key={x.c} style={{ fontSize: 11, color: T.textMid, display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: CATS[x.c].color }} />
                          {CATS[x.c].label} <span style={{ ...mono, color: T.text, fontWeight: 500 }}>{fmt(x.v)}</span>
                        </span>
                      ))}
                      {now.loan > 0 && (
                        <span style={{ fontSize: 11, color: T.textMid, display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: T.red }} />
                          Debt <span style={{ ...mono, color: T.red, fontWeight: 500 }}>−{fmt(now.loan)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: "18px 0" }}>
                <div style={{ fontSize: 15, color: T.text, marginBottom: 6 }}>Start by recording what you have.</div>
                <Sub>Type in your super, investments, cash, home and mortgage balances once a month — the app builds your net-worth history from there.</Sub>
                <Button primary style={{ marginTop: 14 }} onClick={() => go("networth", "checkin")}>✎ First check-in</Button>
              </div>
            )}
          </Card>

          {/* To-do */}
          <Card title={open.length ? `To do · ${open.length}` : "To do"}>
            <div style={{ display: "grid", gap: 10 }}>
              {todos.map((t, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "20px minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
                  <Icon ok={t.ok} warn={t.warn} />
                  <div style={{ fontSize: 12, color: t.ok ? T.textDim : T.text, lineHeight: 1.45 }}>{t.text}</div>
                  {t.action ? <Button primary={!t.warn} onClick={t.run} style={{ padding: "5px 10px", fontSize: 11 }}>{t.action}</Button> : <span />}
                </div>
              ))}
            </div>
            {!open.length && <div style={{ fontSize: 12, color: T.green, marginTop: 12 }}>All caught up ✓</div>}
            {done && <div style={{ fontSize: 11, color: T.green, marginTop: 10 }}>✓ {done}</div>}
          </Card>
        </div>

        <div style={cols4}>
          {/* Cash flow */}
          <Card title="Monthly cash flow" right={<TabLink go={go} tab="budget">Budget</TabLink>}>
            <Big color={m.surplus >= 0 ? T.teal : T.red}>{fmtFull(m.surplus)}<span style={{ fontSize: 13, color: T.textDim }}>/mo</span></Big>
            <Sub>saved · {Math.round(Math.max(0, m.savingRate) * 100)}% of {fmtFull(m.incomeM)} take-home</Sub>
            <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 12, background: "rgba(255,255,255,0.04)" }}>
              <div style={{ width: `${m.incomeM > 0 ? Math.min(100, m.expM / m.incomeM * 100) : 0}%`, background: T.red, opacity: 0.65 }} />
              <div style={{ width: `${m.incomeM > 0 ? Math.max(0, m.surplus / m.incomeM * 100) : 0}%`, background: T.teal, opacity: 0.85 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textDim, marginTop: 6, ...mono }}>
              <span>spend {fmt(m.expM)}</span><span>invest {fmt(m.fireSavingM)}</span>
            </div>
          </Card>

          {/* Emergency fund */}
          <Card title="Emergency fund" right={<TabLink go={go} tab="networth">Net worth</TabLink>}>
            {latest ? (() => {
              const next = money.efRungs.find(r => r * m.expM > now.ef);
              return (
                <>
                  <Big color={T.green}>{m.runway.toFixed(1)}<span style={{ fontSize: 13, color: T.textDim }}> months</span></Big>
                  <Sub>{fmt(now.ef)} covers {m.runway.toFixed(1)} months of {fmtFull(m.expM)}/mo expenses</Sub>
                  {next ? <><Bar p={m.runway / next} color={T.green} /><Sub>{fmt(next * m.expM - now.ef)} to the {next}-month goal</Sub></>
                    : <Sub>Every goal on the ladder reached ✓</Sub>}
                </>
              );
            })() : <Sub>Do a check-in to see your runway.</Sub>}
          </Card>

          {/* Home loan */}
          <Card title="Home loan" right={<TabLink go={go} tab="loan">Home loan</TabLink>}>
            {loan ? (
              loan.main.payoffISO ? (
                <>
                  <Big color={T.purple}>{fmtDate(loan.main.payoffISO)}</Big>
                  <Sub>mortgage-free at age {loan.payoffAge} · {fmt(num(loanInputs.principal))} owing at {num(loanInputs.ratePct)}%</Sub>
                  {loan.main.offsetCoversISO && <Sub>Offset overtakes the loan {fmtDate(loan.main.offsetCoversISO)}</Sub>}
                  <Sub>{fmt(loan.main.totalInterest)} interest still to pay</Sub>
                </>
              ) : <><Big color={T.red} size={20}>Never paid off</Big><Sub>Repayments don't cover the interest.</Sub></>
            ) : (
              <>
                <Sub>See your mortgage-free date and how your offset changes it.</Sub>
                <Button primary style={{ marginTop: 12 }} onClick={() => go("loan")}>Set up</Button>
              </>
            )}
          </Card>

          {/* FIRE */}
          <Card title="FIRE" right={<TabLink go={go} tab="fire">FIRE</TabLink>}>
            <Big color={T.indigo}>{fire.fullFire.atAge == null ? "Not reached" : fire.fullFire.atAge <= fireIn.currentAge ? "Already ✓" : `~${yearOf(fire.fullFire.atAge)}`}</Big>
            <Sub>Full FIRE{fire.fullFire.atAge != null && fire.fullFire.atAge > fireIn.currentAge ? ` at age ${fire.fullFire.atAge}` : ""} · {Math.round(fireP * 100)}% of {fmt(fire.fireNumber)}</Sub>
            <Bar p={fireP} color={T.indigo} />
            <div style={{ marginTop: 8 }}>
              {msLine("Coast FIRE", fire.coastRetire, T.green)}
              {msLine("Barista FIRE", fire.barista, T.accent)}
            </div>
            <div style={{ fontSize: 11, marginTop: 8, color: fire.depletedAge.full != null ? T.red : T.textDim }}>
              {fire.depletedAge.full != null ? `⚠ runs out at ${fire.depletedAge.full}` : `✓ lasts past ${fire.projectionEndAge}`}
              {fire.mortOn ? ` · mortgage until ${fire.mortgageEndAge}` : ""}
            </div>
          </Card>
        </div>

        <div style={{ fontSize: 11, color: T.textDark, lineHeight: 1.6, textAlign: "center", marginTop: 8 }}>
          Everything stays on this device — no bank logins, no servers. Back up regularly.
        </div>
      </div>
    );
  }

  window.OverviewPage = Overview;
  window.OverviewMeta = { META_KEY };
})();
