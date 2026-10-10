const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');

function repositoryPath(relativePath) {
  return path.join(repositoryRoot, ...relativePath.split('/'));
}

function readRepositoryFile(relativePath) {
  return fs.readFileSync(repositoryPath(relativePath), 'utf8');
}

function getAttribute(tag, attributeName) {
  const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? match[2] : undefined;
}

function tagsNamed(html, tagName) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) || [];
}

function hasClass(tag, className) {
  const classes = (getAttribute(tag, 'class') || '').split(/\s+/);
  return classes.includes(className);
}

function hasHref(html, expectedHref) {
  return tagsNamed(html, 'a').some((tag) => getAttribute(tag, 'href') === expectedHref);
}

test('required public files exist', () => {
  const requiredFiles = [
    'index.html',
    'privacy/index.html',
    'terms/index.html',
    'sitemap.xml',
    'script.js',
    'style.css',
  ];

  for (const relativePath of requiredFiles) {
    assert.equal(
      fs.existsSync(repositoryPath(relativePath)),
      true,
      `Missing required public file: ${relativePath}`,
    );
  }
});

test('main page retains required structural invariants', () => {
  const html = readRepositoryFile('index.html');
  const mainContent = tagsNamed(html, 'main').find(
    (tag) => getAttribute(tag, 'id') === 'main-content',
  );
  const mobileNavToggle = tagsNamed(html, 'button').find((tag) =>
    hasClass(tag, 'mobile-nav-toggle'),
  );
  const waitlistForm = tagsNamed(html, 'form').find((tag) => hasClass(tag, 'waitlist-form'));

  assert.ok(mainContent, 'Expected a main element with id="main-content"');
  assert.ok(mobileNavToggle, 'Expected an element with class="mobile-nav-toggle"');
  assert.equal(getAttribute(mobileNavToggle, 'aria-expanded'), 'false');
  assert.ok(waitlistForm, 'Expected a form with class="waitlist-form"');
});

test('waitlist form retains its submission and privacy contract', () => {
  const html = readRepositoryFile('index.html');
  const waitlistForm = tagsNamed(html, 'form').find((tag) => hasClass(tag, 'waitlist-form'));
  const emailInput = tagsNamed(html, 'input').find(
    (tag) => getAttribute(tag, 'name') === 'email',
  );

  assert.ok(waitlistForm, 'Expected the waitlist form');
  assert.equal(getAttribute(waitlistForm, 'action'), 'https://formspree.io/f/xeedzvqb');
  assert.equal((getAttribute(waitlistForm, 'method') || '').toUpperCase(), 'POST');
  assert.ok(emailInput, 'Expected the email input');
  assert.equal(getAttribute(emailInput, 'type'), 'email');
  assert.equal(getAttribute(emailInput, 'name'), 'email');
  assert.match(emailInput, /\brequired(?:\s*=\s*(["']).*?\1)?(?=\s|\/?>)/i);
  assert.equal(hasHref(html, '/privacy/'), true, 'Expected a link to /privacy/');
});

test('security metadata and external blank-target links retain protections', () => {
  const htmlFiles = ['index.html', 'privacy/index.html', 'terms/index.html'];
  const mainHtml = readRepositoryFile('index.html');
  const cspMeta = tagsNamed(mainHtml, 'meta').find(
    (tag) => (getAttribute(tag, 'http-equiv') || '').toLowerCase() === 'content-security-policy',
  );

  assert.ok(cspMeta, 'Expected Content-Security-Policy metadata');
  const csp = getAttribute(cspMeta, 'content') || '';
  assert.match(csp, /(?:^|;)\s*object-src\s+'none'\s*(?:;|$)/i);
  assert.match(csp, /(?:^|;)\s*base-uri\s+'self'\s*(?:;|$)/i);
  assert.match(csp, /(?:^|;)\s*connect-src\s+[^;]*https:\/\/formspree\.io(?:\s|;|$)/i);
  assert.match(csp, /(?:^|;)\s*form-action\s+[^;]*https:\/\/formspree\.io(?:\s|;|$)/i);

  for (const relativePath of htmlFiles) {
    const html = readRepositoryFile(relativePath);
    const externalBlankLinks = tagsNamed(html, 'a').filter((tag) => {
      const href = getAttribute(tag, 'href') || '';
      return getAttribute(tag, 'target') === '_blank' && /^https?:\/\//i.test(href);
    });

    for (const link of externalBlankLinks) {
      const relTokens = (getAttribute(link, 'rel') || '').toLowerCase().split(/\s+/);
      assert.ok(relTokens.includes('noopener'), `${relativePath}: target="_blank" link lacks noopener`);
      assert.ok(relTokens.includes('noreferrer'), `${relativePath}: target="_blank" link lacks noreferrer`);
    }
  }
});

test('main page retains legal and experiment navigation', () => {
  const html = readRepositoryFile('index.html');

  assert.equal(hasHref(html, '/privacy/'), true, 'Expected a link to /privacy/');
  assert.equal(hasHref(html, '/terms/'), true, 'Expected a link to /terms/');
  assert.equal(hasHref(html, '/experiment'), true, 'Expected a link to /experiment');
});

test('sitemap retains all required public URLs', () => {
  const sitemap = readRepositoryFile('sitemap.xml');
  const requiredUrls = [
    'https://humnlabs.io/',
    'https://humnlabs.io/experiment/',
    'https://humnlabs.io/privacy/',
    'https://humnlabs.io/terms/',
  ];

  for (const url of requiredUrls) {
    assert.ok(sitemap.includes(`<loc>${url}</loc>`), `Sitemap is missing ${url}`);
  }
});

test('public copy retains operator and product-truth invariants', () => {
  const mainHtml = readRepositoryFile('index.html');
  const experimentHtml = readRepositoryFile('experiment/index.html');
  const experimentJs = readRepositoryFile('experiment/experiment.js');
  const privacyHtml = readRepositoryFile('privacy/index.html');
  const termsHtml = readRepositoryFile('terms/index.html');

  assert.equal(mainHtml.includes('confidence-based verification'), false);
  assert.equal(experimentHtml.includes('HUMN Labs Inc.'), false);
  assert.ok(
    experimentHtml.includes('© 2026 HUMNLABS — operated by Smyrna Digitale. All rights reserved.'),
  );

  for (const legalHtml of [privacyHtml, termsHtml]) {
    assert.ok(legalHtml.includes('Smyrna Bouw'));
    assert.ok(legalHtml.includes('72332050'));
    assert.ok(legalHtml.includes('NL002480877B28'));
    assert.equal(legalHtml.includes('LEGAL DOKÜMANTASYON'), false);
  }

  assert.ok(privacyHtml.includes('a trade name of <strong>Smyrna Bouw</strong>'));
  assert.equal(termsHtml.includes('exclusive property of HUMNLABS'), false);

  assert.equal(experimentHtml.includes('Nothing is sent to any server.'), false);
  assert.equal(experimentHtml.includes('No cookies, storage, or logs are created or saved.'), false);
  assert.ok(
    experimentHtml.includes(
      'Experiment signal samples are not transmitted to HUMNLABS servers or persistently stored by the experiment.',
    ),
  );
  assert.ok(
    experimentHtml.includes(
      'Standard web hosting request logs may still be processed as described in our Privacy Policy.',
    ),
  );

  assert.ok(experimentHtml.includes('The reaction signal will be marked as Excluded'));
  assert.ok(experimentJs.includes("reactionStatus = 'Excluded';"));
});

test('report and experiment-data wording avoids retired or unsupported claims', () => {
  const publicPages = [
    'index.html',
    'privacy/index.html',
    'terms/index.html',
    'experiment/index.html',
  ];
  const retiredPhrases = [
    'Human Presence &amp; Trust Report 2026',
    'Human Presence & Trust Report 2026',
    'volatile browser RAM',
    '100% session-only retention',
    'Discarded immediately',
    'registered for early access',
  ];

  for (const relativePath of publicPages) {
    const html = readRepositoryFile(relativePath);
    for (const phrase of retiredPhrases) {
      assert.equal(html.includes(phrase), false, `${relativePath} still contains "${phrase}"`);
    }
  }

  for (const relativePath of ['privacy/index.html', 'terms/index.html']) {
    assert.equal(
      readRepositoryFile(relativePath).includes('confidence in human presence'),
      false,
      `${relativePath} still contains "confidence in human presence"`,
    );
  }
});

test('public pages keep unique ids and resolvable homepage fragment links', () => {
  const publicPages = [
    'index.html',
    'privacy/index.html',
    'terms/index.html',
    'experiment/index.html',
    '404.html',
  ];
  const idsFor = (html) => [...html.matchAll(/\sid\s*=\s*"([^"]+)"/g)].map((match) => match[1]);
  const homepageIds = new Set(idsFor(readRepositoryFile('index.html')));
  const legacyAnchors = [
    'insight',
    'challenge',
    'problem',
    'research-areas',
    'current-research',
    'methodology',
    'engine-status',
    'boundaries',
    'dashboard',
    'waitlist',
  ];

  for (const anchor of legacyAnchors) {
    assert.ok(homepageIds.has(anchor), `Homepage is missing legacy anchor #${anchor}`);
  }

  for (const relativePath of publicPages) {
    const html = readRepositoryFile(relativePath);
    const ids = idsFor(html);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert.deepEqual(duplicates, [], `${relativePath} has duplicate ids`);

    const pageIds = new Set(ids);
    for (const tag of tagsNamed(html, 'a')) {
      const href = getAttribute(tag, 'href') || '';
      if (href.startsWith('/#')) {
        assert.ok(homepageIds.has(href.slice(2)), `${relativePath}: broken link ${href}`);
      } else if (href.startsWith('#')) {
        assert.ok(pageIds.has(href.slice(1)), `${relativePath}: broken link ${href}`);
      }
    }
  }
});

