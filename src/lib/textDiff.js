// Lightweight word-level diff for the Bible text editor's live "what changed"
// preview. Returns an array of segments: { value, type } where type is one of
// 'equal' | 'added' | 'removed'. This is a simple LCS-based word diff — good
// enough to visually highlight edits as you type (not a full Myers diff).

function tokenize(str) {
  // Split into words + the whitespace between them, keeping both so the
  // reconstructed text preserves spacing.
  return String(str).match(/\s+|\S+/g) || [];
}

export function diffWords(oldStr, newStr) {
  const a = tokenize(oldStr);
  const b = tokenize(newStr);
  const n = a.length;
  const m = b.length;

  // LCS length table.
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out = [];
  const push = (type, value) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.value += value;
    else out.push({ type, value });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('equal', a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('removed', a[i]);
      i++;
    } else {
      push('added', b[j]);
      j++;
    }
  }
  while (i < n) { push('removed', a[i]); i++; }
  while (j < m) { push('added', b[j]); j++; }

  return out;
}