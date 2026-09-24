const fs = require('fs');
let content = fs.readFileSync('src/components/intel/AutomationCalculator.jsx', 'utf8');

content = content.replace(
`  const annualDividend = useTransform([springEfficiency, springHours], ([eff, hrs]) => {
    // A conceptual formula: Savings scale with hours to show impact. Baseline is 40 hours = 1x.
    const hoursMultiplier = hrs / 40;
    const savingsPool = totalCorporateTaxBase * (eff / 100) * hoursMultiplier;
    return Math.round(savingsPool / populationEligible);
  });`,
`  const annualDividend = useTransform([springEfficiency, springHours], ([eff, hrs]) => {
    // A conceptual formula: Savings scale with hours to show impact. Baseline is 40 hours = 1x.
    if (populationEligible <= 0) return 0;
    const effSafe = isNaN(eff) || eff < 0 ? 0 : eff;
    const hrsSafe = isNaN(hrs) || hrs < 0 ? 0 : hrs;
    const hoursMultiplier = hrsSafe / 40;
    const savingsPool = totalCorporateTaxBase * (effSafe / 100) * hoursMultiplier;
    const result = Math.round(savingsPool / populationEligible);
    return isNaN(result) || !isFinite(result) ? 0 : result;
  });`
);

content = content.replace(
`  const monthlyDividend = useTransform(annualDividend, (annual) => {
    return Math.round(annual / 12);
  });`,
`  const monthlyDividend = useTransform(annualDividend, (annual) => {
    const annualSafe = isNaN(annual) ? 0 : annual;
    const result = Math.round(annualSafe / 12);
    return isNaN(result) || !isFinite(result) ? 0 : result;
  });`
);

content = content.replace(
  /<span className="truncate">\{displayMonthly\.toLocaleString\(\)\}<\/span>/g,
  '<span className="truncate">{new Intl.NumberFormat().format(displayMonthly)}</span>'
);

content = content.replace(
  /<span className="truncate">\{displayAnnual\.toLocaleString\(\)\}<\/span>/g,
  '<span className="truncate">{new Intl.NumberFormat().format(displayAnnual)}</span>'
);

content = content.replace(
  /displayMonthly\.toLocaleString\(\)/g,
  'new Intl.NumberFormat().format(displayMonthly)'
);

content = content.replace(
  /displayAnnual\.toLocaleString\(\)/g,
  'new Intl.NumberFormat().format(displayAnnual)'
);

fs.writeFileSync('src/components/intel/AutomationCalculator.jsx', content);
