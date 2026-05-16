const katex = require('katex');

const normalizeMathSource = (source) => {
  let s = String(source).trim();
  if (s.startsWith('$$') && s.endsWith('$$')) return s.slice(2, -2).trim();
  if (s.startsWith('$') && s.endsWith('$')) return s.slice(1, -1).trim();
  if (s.startsWith('\\(') && s.endsWith('\\)')) return s.slice(2, -2).trim();
  if (s.startsWith('\\[') && s.endsWith('\\]')) return s.slice(2, -2).trim();
  return s;
};

const preprocessMathDelimiters = (content) => {
  const inlineCodeRegex = /(`+)([^`]*?)\1/g;
  const convertSegment = (segment) => {
    const stash = [];
    const protectedSegment = segment.replace(inlineCodeRegex, (match) => {
      const key = `__INLINE_CODE_${stash.length}__`;
      stash.push(match);
      return key;
    });
    let replaced = protectedSegment
      .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, inner) => `$$${inner}$$`)
      .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, inner) => `$${inner}$`);
    stash.forEach((value, idx) => {
      replaced = replaced.replace(`__INLINE_CODE_${idx}__`, value);
    });
    return replaced;
  };
  return convertSegment(content);
};

const testCases = [
  '$x$',
  '$E = mc^2$',
  '\\(x + y\\)',
  '\\[\\frac{d}{dt}(x/t)\\]',
  '$$\\int_0^\\infty e^{-x^2} \\; dx$$',
  '$$x + y$$',
  '$\\frac{a}{b}$',
  '$\\frac{d}{dt}\\left(\\frac{x}{t}\\right)$',
  'plain text without math',
  '`code $not$ math`',
];

for (const t of testCases) {
  const pre = preprocessMathDelimiters(t);
  const norm = normalizeMathSource(pre);
  let okInline = true;
  let okDisplay = true;
  try { katex.renderToString(norm, { displayMode: false, throwOnError: true }); } catch (e) { okInline = false; }
  try { katex.renderToString(norm, { displayMode: true, throwOnError: true }); } catch (e) { okDisplay = false; }

  console.log('---');
  console.log('raw   :', t);
  console.log('pre   :', pre);
  console.log('norm  :', norm);
  console.log('inline-ok :', okInline, 'display-ok :', okDisplay);
}

console.log('done');
