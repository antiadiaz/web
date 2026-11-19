/**
 * ANTIADIAZ.COM — CONTACT FORM (FORMSUBMIT + GDPR/LOPDGDD) & LEGAL MODAL
 */

import { initSectionHalftone } from './halftone.js';

const FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/hola@antiadiaz.com';

const LEGAL_HASH_MAP = Object.freeze({
  '#legal-notice': 'legal',
  '#privacy-policy': 'privacy',
  '#cookie-policy': 'cookies',
});

function bindContactForm({
  formId,
  nameId,
  emailId,
  subjectId,
  messageId,
  privacyId,
  honeyId,
  statusId,
}) {
  const form = document.getElementById(formId);
  if (!form) {
    return;
  }

  const nameInput = document.getElementById(nameId);
  const emailInput = document.getElementById(emailId);
  const subjectInput = document.getElementById(subjectId);
  const messageInput = document.getElementById(messageId);
  const privacyInput = document.getElementById(privacyId);
  const honeyInput = document.getElementById(honeyId);
  const submitButton = form.querySelector('.contact-submit');
  const submitLabel = submitButton ? submitButton.querySelector('span') : null;
  const statusEl = document.getElementById(statusId);

  const defaultButtonText = submitLabel ? submitLabel.textContent : 'Send message';
  let isSubmitting = false;

  function setStatus(message, type = 'neutral', { allowEmailFallback = false } = {}) {
    if (!statusEl) return;
    statusEl.className = 'contact-status';
    if (type === 'success') statusEl.classList.add('is-success');
    if (type === 'error') statusEl.classList.add('is-error');

    statusEl.textContent = '';
    if (!message) {
      statusEl.hidden = true;
      return;
    }

    statusEl.hidden = false;
    statusEl.appendChild(document.createTextNode(message));

    if (allowEmailFallback) {
      statusEl.appendChild(document.createTextNode(' '));
      const fallbackLink = document.createElement('a');
      fallbackLink.href = 'mailto:hola@antiadiaz.com';
      fallbackLink.className = 'contact-status__link';
      fallbackLink.textContent = 'hola@antiadiaz.com';
      statusEl.appendChild(fallbackLink);
      statusEl.appendChild(document.createTextNode('.'));
    }
  }

  function setLoading(loading) {
    isSubmitting = loading;
    if (submitButton) {
      submitButton.disabled = loading;
      submitButton.setAttribute('aria-busy', String(loading));
    }
    if (submitLabel) {
      submitLabel.textContent = loading ? 'Sending...' : defaultButtonText;
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    // Silent honeypot check against automated bots
    if (honeyInput && honeyInput.value.trim() !== '') {
      form.reset();
      return;
    }

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const subject = subjectInput ? subjectInput.value.trim() : '';
    const message = messageInput ? messageInput.value.trim() : '';
    const consentGiven = privacyInput ? privacyInput.checked : false;

    if (!name) {
      setStatus('Please enter your name.', 'error');
      nameInput?.focus();
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('Please enter a valid email address.', 'error');
      emailInput?.focus();
      return;
    }

    if (!message) {
      setStatus('Please write a message before sending.', 'error');
      messageInput?.focus();
      return;
    }

    if (!consentGiven) {
      setStatus(
        'Please accept the Privacy Policy so your inquiry can be processed under GDPR / LOPDGDD.',
        'error'
      );
      privacyInput?.focus();
      return;
    }

    setStatus('');
    setLoading(true);

    try {
      const response = await fetch(FORMSUBMIT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          _replyto: email,
          _subject: subject ? `[antiadiaz.com] ${subject}` : '[antiadiaz.com] New portfolio inquiry',
          message,
          gdpr_consent: 'Accepted (RGPD / Spanish LOPDGDD)',
          _template: 'table',
        }),
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      const succeeded =
        response.ok &&
        payload &&
        (payload.success === true || payload.success === 'true');

      if (succeeded) {
        form.reset();
        setStatus(
          'Message sent successfully. Thank you—I will reply to your email shortly.',
          'success'
        );
      } else {
        setStatus(
          'Your message could not be delivered automatically right now. Please write directly to',
          'error',
          { allowEmailFallback: true }
        );
      }
    } catch {
      setStatus(
        'Network error while sending the form. You can also write directly to',
        'error',
        { allowEmailFallback: true }
      );
    } finally {
      setLoading(false);
    }
  });
}

export function initContact() {
  initSectionHalftone({
    section: document.getElementById('contact'),
    canvas: document.getElementById('contact-halftone'),
    variant: 'contact',
    protectedSelectors: [
      '.contact-heading',
      '.contact-copy',
      '.contact-links',
      '.contact-form',
    ],
  });

  bindContactForm({
    formId: 'contact-form',
    nameId: 'contact-name',
    emailId: 'contact-email',
    subjectId: 'contact-subject',
    messageId: 'contact-message',
    privacyId: 'contact-privacy',
    honeyId: 'contact-honey',
    statusId: 'contact-status',
  });

  initSectionHalftone({
    section: document.getElementById('illustration-contact'),
    canvas: document.getElementById('illustration-contact-halftone'),
    variant: 'contact',
    rgb: '255, 255, 255',
    densityScale: 0.34,
    alphaScale: 0.48,
    protectedSelectors: [
      '.contact-heading',
      '.contact-copy',
      '.contact-links',
      '.contact-form',
    ],
  });

  bindContactForm({
    formId: 'illustration-contact-form',
    nameId: 'illus-contact-name',
    emailId: 'illus-contact-email',
    subjectId: 'illus-contact-subject',
    messageId: 'illus-contact-message',
    privacyId: 'illus-contact-privacy',
    honeyId: 'illus-contact-honey',
    statusId: 'illus-contact-status',
  });
}

export function initLegalModal() {
  const modal = document.getElementById('legal-modal');
  if (!modal) {
    return;
  }

  const closeButton = document.getElementById('legal-modal-close');
  const bodyEl = modal.querySelector('.legal-modal__body');
  const triggers = Array.from(document.querySelectorAll('[data-legal-doc]'));
  const tabs = Array.from(modal.querySelectorAll('[data-legal-tab]'));
  const panels = Array.from(modal.querySelectorAll('[data-legal-panel]'));

  let lastTrigger = null;

  function selectDoc(docKey) {
    const valid = panels.some((panel) => panel.getAttribute('data-legal-panel') === docKey);
    const targetDoc = valid ? docKey : 'legal';

    tabs.forEach((tab) => {
      const isCurrent = tab.getAttribute('data-legal-tab') === targetDoc;
      tab.classList.toggle('is-active', isCurrent);
      tab.setAttribute('aria-selected', String(isCurrent));
    });

    panels.forEach((panel) => {
      const isCurrent = panel.getAttribute('data-legal-panel') === targetDoc;
      panel.hidden = !isCurrent;
    });

    if (bodyEl) {
      bodyEl.scrollTop = 0;
    }
  }

  function openModal(docKey, triggerEl = null) {
    lastTrigger = triggerEl;
    selectDoc(docKey);
    modal.hidden = false;
    requestAnimationFrame(() => {
      modal.classList.add('is-open');
    });
    if (closeButton) {
      closeButton.focus();
    }
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.classList.remove('is-open');
    window.setTimeout(() => {
      modal.hidden = true;
    }, 200);
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const docKey = trigger.getAttribute('data-legal-doc') || 'legal';
      openModal(docKey, trigger);
    });
  });

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const docKey = tab.getAttribute('data-legal-tab') || 'legal';
      selectDoc(docKey);
    });
  });

  if (closeButton) {
    closeButton.addEventListener('click', closeModal);
  }

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) {
      closeModal();
    }
  });

  const initialHash = window.location.hash;
  if (initialHash && LEGAL_HASH_MAP[initialHash]) {
    openModal(LEGAL_HASH_MAP[initialHash]);
  }
}

