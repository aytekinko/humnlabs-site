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
