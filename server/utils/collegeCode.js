const crypto = require('crypto');

const CODE_REGEX = /^[A-Z0-9-]{4,32}$/;

const normalizeCollegeName = (value) => String(value || '').trim();

const createBaseCode = (name) => {
  const normalized = normalizeCollegeName(name)
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return 'COLLEGE';
  }

  const words = normalized.split(' ').filter(Boolean);
  const initials = words.map((word) => word[0]).join('');

  let candidate = '';
  if (initials.length >= 4) {
    candidate = initials.slice(0, 12);
  } else {
    candidate = words.join('-').replace(/-+/g, '-').slice(0, 18);
  }

  if (candidate.length < 4) {
    candidate = `${candidate}COLL`.slice(0, 8);
  }

  return candidate;
};

const generateCandidateWithSuffix = (base) => {
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const safeBase = String(base || 'COLLEGE').slice(0, 27).replace(/-+$/g, '');
  return `${safeBase}-${suffix}`.slice(0, 32);
};

const buildUniqueCollegeCode = async ({ name, existsCode }) => {
  const base = createBaseCode(name);
  const direct = base.slice(0, 32);

  if (CODE_REGEX.test(direct) && !(await existsCode(direct))) {
    return direct;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateCandidateWithSuffix(base);
    if (CODE_REGEX.test(candidate) && !(await existsCode(candidate))) {
      return candidate;
    }
  }

  throw new Error('Unable to generate a unique college code. Please try again.');
};

module.exports = {
  CODE_REGEX,
  normalizeCollegeName,
  buildUniqueCollegeCode,
};
