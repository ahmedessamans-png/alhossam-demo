// DRYV Pages Module
// About, size guide, FAQ, contact, track order, policies, 404, cookie bar, per-route SEO
// Depends on: DRYV_CORE, LBN_I18N, catalog.json

(() => {
  'use strict';

  const { domReady, $, $$, delegate, fetchJSON, formatEGP, show, hide, toggleHidden, storage, showToast, navigate, route } = window.DRYV_CORE;
  const I18N = window.LBN_I18N;

  let catalog = null;
  let currentLang = 'en';
  let cookieAccepted = false;

  function t(key, vars) {
    let str = I18N[currentLang]?.[key] || I18N.en[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
      });
    }
    return str;
  }

  async function loadCatalog() {
    try {
      catalog = await fetchJSON('catalog.json?v=20261102b');
      currentLang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
    } catch (err) {
      console.error('Failed to load catalog:', err);
      catalog = { settings: {}, policies: {}, governorates: [] };
    }
  }

  function updatePageSEO(title, description, ogImage) {
    document.title = title;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && ogImage) ogImg.setAttribute('content', ogImage);
  }

  function getPolicyContent(key) {
    return catalog?.policies?.[key]?.[currentLang] || catalog?.policies?.[key]?.en || '';
  }

  function renderAboutPage() {
    const main = $('#mainContent');
    if (!main) return;

    updatePageSEO(
      `${t('aboutTitle')} | DRYV`,
      'Learn about DRYV - premium athletic apparel and gymwear built for movement. Strength in Motion.',
      'https://dryv.com/assets/img/cover-about.jpg'
    );

    main.innerHTML = `
      <div class="page-content" aria-labelledby="aboutTitle">
        <h1 id="aboutTitle">${t('aboutTitle')}</h1>
        <h2>${t('aboutSubtitle')}</h2>
        <p>DRYV is an Egypt-based training-wear brand shaped around a simple idea: what you wear should move with the work. Our collection focuses on two training essentials: the Core Training Tank and the Fitted Compression Tee with clean lines and an athletic fit.</p>
        <p>We keep the range focused and the purpose clear: considered training pieces for movement, built around the discipline of showing up and putting in the work. Strength in Motion is more than a slogan; it is the mindset behind the brand.</p>
        <h2>Our Products</h2>
        <p>Core Training Tank: a fitted tank built for movement. Available in Black, White, and Heather Grey.</p>
        <p>Fitted Compression Tee: a compression tee designed for performance. Fitted, supportive, breathable. Available in Black, White, and Charcoal.</p>
        <h2>Designed in Egypt</h2>
        <p>Designed locally. Quality you can feel, prices that make sense.</p>
        <p><em>Note: All product specifications, fabric compositions, and manufacturing details are draft placeholders for owner approval.</em></p>
      </div>
    `;
  }

  function renderAccountPage() {
    const main = $('#mainContent');
    if (!main) return;
    updatePageSEO(
      'Account | DRYV',
      'DRYV account access and order support.',
      'https://dryv.com/assets/img/cover-account.jpg'
    );
    main.innerHTML = `
      <div class="page-content" aria-labelledby="accountTitle">
        <h1 id="accountTitle">Your Locker</h1>
        <p>Customer accounts are not connected in this preview yet. You can still browse the collection and place a demo order.</p>
        <p><a class="btn btn-primary" href="#/collections/all">Shop all products</a></p>
        <p>Need help with an order? Visit <a href="#/pages/track-order">Track Order</a> or <a href="#/pages/contact">Contact DRYV</a>.</p>
      </div>
    `;
  }

  function renderSizeGuidePage() {
    const main = $('#mainContent');
    if (!main) return;

    updatePageSEO(
      `${t('sizeGuideTitle')} | DRYV`,
      'Find your perfect fit with DRYV size guide. How to measure chest, waist, length, and shoulder for tank tops and compression tees.',
      'https://dryv.com/assets/img/cover-size.jpg'
    );

    main.innerHTML = `
      <div class="page-content" aria-labelledby="sizeGuideTitle">
        <h1 id="sizeGuideTitle">${t('sizeGuideTitle')}</h1>
        <h2>${t('chooseSize')}</h2>
        <p>${t('fitGuidance')}</p>

        <div class="size-guide-steps" role="list" aria-label="${t('chooseSize')}">
          <div class="size-guide-step" role="listitem">
            <div class="step-number">1</div>
            <h3>${t('measureChest')}</h3>
            <p>Wrap the tape around the fullest part of your chest, under the armpits. Keep it level.</p>
          </div>
          <div class="size-guide-step" role="listitem">
            <div class="step-number">2</div>
            <h3>${t('measureWaist')}</h3>
            <p>Measure around the narrowest part of your natural waist, usually just above the navel.</p>
          </div>
          <div class="size-guide-step" role="listitem">
            <div class="step-number">3</div>
            <h3>${t('measureShoulder')}</h3>
            <p>Measure across the back from shoulder seam to shoulder seam.</p>
          </div>
          <div class="size-guide-step" role="listitem">
            <div class="step-number">4</div>
            <h3>${t('measureLength')}</h3>
            <p>Measure from the highest point of the shoulder down to the desired hem length.</p>
          </div>
        </div>

        <table class="size-guide-table">
          <caption>${t('sampleMeasurements')}</caption>
          <thead>
            <tr>
              <th scope="col">${t('size')}</th>
              <th scope="col">${t('chest')}</th>
              <th scope="col">${t('waist')}</th>
              <th scope="col">${t('length')}</th>
              <th scope="col">${t('shoulder')}</th>
            </tr>
          </thead>
          <tbody>
            <tr><th scope="row">S</th><td>86-90</td><td>70-74</td><td>68</td><td>40</td></tr>
            <tr><th scope="row">M</th><td>94-98</td><td>78-82</td><td>70</td><td>42</td></tr>
            <tr><th scope="row">L</th><td>102-106</td><td>86-90</td><td>72</td><td>44</td></tr>
            <tr><th scope="row">XL</th><td>110-114</td><td>94-98</td><td>74</th><td>46</td></tr>
            <tr><th scope="row">XXL</th><td>118-122</td><td>102-106</td><td>76</td><td>48</td></tr>
          </tbody>
        </table>

        <p>${t('sizeHelp')}</p>
      </div>
    `;
  }

  function renderFAQPage() {
    const main = $('#mainContent');
    if (!main) return;

    updatePageSEO(
      `${t('faqTitle')} | DRYV`,
      'Frequently asked questions about DRYV orders, delivery, payment, size & fit, exchanges, and pre-drop launches.',
      'https://dryv.com/assets/img/cover-faq.jpg'
    );

    const faqs = [
      { category: t('faqOrders'), questions: [
        { q: 'How do I place an order?', a: 'Browse the collection, select your size and colour, add to cart, and proceed to checkout. Fill in your details and confirm.' },
        { q: 'Can I modify or cancel my order?', a: 'Orders cannot be modified after placement. Contact support within 1 hour to request cancellation.' },
        { q: 'How do I know my order went through?', a: 'You will see an order confirmation page with your order number (format: DRYV-XXXXXX). In production, a confirmation email/SMS would be sent.' }
      ]},
      { category: t('faqDelivery'), questions: [
        { q: 'How long does delivery take?', a: '3-9 business days depending on your governorate. Cairo & Giza: 3-5 days. Delta & Alexandria: 4-7 days. Upper Egypt & Canal: 5-8 days. Sinai & Red Sea: 6-9 days.' },
        { q: 'Is shipping free?', a: 'Free delivery on orders over EGP 950. Below that, fees apply per zone (see shipping policy).' },
        { q: 'Can I track my order?', a: 'Tracking goes live with the courier integration. Use the Track Order page with your order number and phone/email.' }
      ]},
      { category: t('faqPayment'), questions: [
        { q: 'What payment methods are available?', a: 'Cash on Delivery is available now. Card/Wallet (Paymob) and Fawry reference will be available after merchant account approval.' },
        { q: 'Is there a COD fee?', a: 'No COD fee currently.' },
        { q: 'Can I pay by card?', a: 'Card and wallet payments via Paymob are coming soon. Currently Cash on Delivery only.' }
      ]},
      { category: t('faqSize'), questions: [
        { q: "How do I choose the right size?", a: 'Use the Size Guide page to measure yourself. Our compression garments are fitted by design, so choose your usual size for a compressive fit, or size up for a more relaxed feel.' },
        { q: "What if the size doesn't fit?", a: 'Size exchanges within 2 days of delivery. Item must be unworn with tags attached. See Returns & Exchange policy.' }
      ]},
      { category: t('faqExchange'), questions: [
        { q: 'What is the exchange policy?', a: 'Size exchanges within 2 days of delivery. Item must be unworn with tags attached. No refunds. See Returns & Exchange policy for details.' },
        { q: 'Do you offer refunds?', a: 'No refunds. Exchanges only for size, within 2 days, unworn with tags.' }
      ]},
      { category: t('faqDrops'), questions: [
        { q: 'What is a pre-drop?', a: 'A pre-drop is an early access period before a collection launches publicly. Sign up with your email to get an early access code.' },
        { q: 'How does early access work?', a: 'Enter your early access code on the Early Access page. The code unlocks the collection before the public drop.' },
        { q: 'What if I miss the drop?', a: 'After the early access period, the collection opens to everyone. Sign up for the next drop to get early access next time.' }
      ]}
    ];

    main.innerHTML = `
      <div class="page-content" aria-labelledby="faqTitle">
        <h1 id="faqTitle">${t('faqTitle')}</h1>
        <div class="faq-accordion" id="faqAccordion">
          ${faqs.map((cat, catIdx) => `
            <h2>${cat.category}</h2>
            ${cat.questions.map((faq, qIdx) => `
              <div class="faq-item">
                <button class="faq-question" aria-expanded="false" aria-controls="faq-${catIdx}-${qIdx}">
                  ${faq.q}
                  <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                <div class="faq-answer" id="faq-${catIdx}-${qIdx}" role="region">
                  <p>${faq.a}</p>
                </div>
              </div>
            `).join('')}
          `).join('')}
        </div>
      </div>
    `;

    // Bind FAQ accordion
    delegate($('#faqAccordion'), '.faq-question', 'click', function() {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      const answer = document.getElementById(this.getAttribute('aria-controls'));
      this.setAttribute('aria-expanded', !expanded);
      if (answer) {
        answer.classList.toggle('open', !expanded);
      }
    });
  }

  function renderContactPage() {
    const main = $('#mainContent');
    if (!main) return;

    updatePageSEO(
      `${t('contactTitle')} | DRYV`,
      'Contact DRYV customer support. Get help with orders, delivery, size exchanges, or general inquiries.',
      'https://dryv.com/assets/img/cover-contact.jpg'
    );

    main.innerHTML = `
      <div class="page-content" aria-labelledby="contactTitle">
        <h1 id="contactTitle">${t('contactTitle')}</h1>
        <p>We are here to help. Fill out the form and we will get back to you.</p>

        <form class="contact-form" id="contactForm" novalidate>
          <div class="form-group">
            <label for="contactTopic">${t('topic')}</label>
            <select id="contactTopic" name="topic" required aria-describedby="topicError">
              <option value="">${t('topic')}</option>
              <option value="order">${t('topicOrder')}</option>
              <option value="delivery">${t('topicDelivery')}</option>
              <option value="size">${t('topicSize')}</option>
              <option value="general">${t('topicGeneral')}</option>
            </select>
            <p class="error-message" id="topicError">${t('error')}</p>
          </div>
          <div class="form-group">
            <label for="contactOrderNumber">${t('orderNumberOptional')}</label>
            <input type="text" id="contactOrderNumber" name="orderNumber" placeholder="DRYV-XXXXXX" autocomplete="off" aria-describedby="orderNumberError">
            <p class="error-message" id="orderNumberError">${t('error')}</p>
          </div>
          <div class="form-group">
            <label for="contactEmail">${t('email')}</label>
            <input type="email" id="contactEmail" name="email" required autocomplete="email" aria-describedby="emailError">
            <p class="error-message" id="emailError">${t('error')}</p>
          </div>
          <div class="form-group">
            <label for="contactPhone">${t('phone')}</label>
            <input type="tel" id="contactPhone" name="phone" placeholder="${t('phonePlaceholder')}" autocomplete="tel" aria-describedby="phoneError">
            <p class="error-message" id="phoneError">${t('phoneError')}</p>
          </div>
          <div class="form-group">
            <label for="contactMessage">${t('message')}</label>
            <textarea id="contactMessage" name="message" rows="5" required aria-describedby="messageError"></textarea>
            <p class="error-message" id="messageError">${t('error')}</p>
          </div>
          <button type="submit" class="btn btn-primary">${t('send')}</button>
        </form>

        ${catalog?.settings?.whatsapp ? `
          <a href="${catalog.settings.whatsapp}" class="whatsapp-btn" target="_blank" rel="noopener">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.42.18.728.196.957.088.243-.119.774-.622 1.05-1.115.3-.518.48-1.147.488-1.313.02-.173.078-.355-.079-.561z"/></svg>
            ${t('whatsappSupport')}
          </a>
        ` : ''}
      </div>
    `;

    // Bind form
    const form = $('#contactForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('Message sent (demo)', 'success');
        form.reset();
      });
    }
  }

  function renderSupportPage() {
    const main = $('#mainContent');
    if (!main) return;

    updatePageSEO(
      `${t('supportTitle')} | DRYV`,
      'DRYV customer support. Get help with orders, delivery, size exchanges, returns, and general inquiries.',
      'https://dryv.com/assets/img/cover-support.jpg'
    );

    main.innerHTML = `
      <div class="page-content" aria-labelledby="supportTitle">
        <h1 id="supportTitle">${t('supportTitle')}</h1>
        <p>We are here to help. Choose a topic below or contact us directly.</p>

        <div class="support-options" role="list" aria-label="Support topics">
          <a href="#/pages/contact" class="support-card" role="listitem">
            <div class="support-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h3>${t('supportContact')}</h3>
            <p>${t('supportContactDesc')}</p>
          </a>
          <a href="#/pages/track-order" class="support-card" role="listitem">
            <div class="support-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <h3>${t('supportTrackOrder')}</h3>
            <p>${t('supportTrackOrderDesc')}</p>
          </a>
          <a href="#/pages/faq" class="support-card" role="listitem">
            <div class="support-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h3>${t('supportFAQ')}</h3>
            <p>${t('supportFAQDesc')}</p>
          </a>
          <a href="#/pages/size-guide" class="support-card" role="listitem">
            <div class="support-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3h18v18H3z"/><path d="M12 3v18"/><path d="M3 12h18"/></svg>
            </div>
            <h3>${t('supportSizeGuide')}</h3>
            <p>${t('supportSizeGuideDesc')}</p>
          </a>
          <a href="#/policies/returns" class="support-card" role="listitem">
            <div class="support-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><path d="M18 9l-6 6-6-6"/></svg>
            </div>
            <h3>${t('supportReturns')}</h3>
            <p>${t('supportReturnsDesc')}</p>
          </a>
          <a href="#/policies/shipping" class="support-card" role="listitem">
            <div class="support-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
            </div>
            <h3>${t('supportShipping')}</h3>
            <p>${t('supportShippingDesc')}</p>
          </a>
        </div>

        ${catalog?.settings?.whatsapp ? `
          <div class="support-whatsapp">
            <a href="${catalog.settings.whatsapp}" class="whatsapp-btn" target="_blank" rel="noopener">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.42.18.728.196.957.088.243-.119.774-.622 1.05-1.115.3-.518.48-1.147.488-1.313.02-.173.078-.355-.079-.561z"/></svg>
              ${t('whatsappSupport')}
            </a>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderTrackOrderPage() {
    const main = $('#mainContent');
    if (!main) return;

    updatePageSEO(
      `${t('trackOrderTitle')} | DRYV`,
      'Track your DRYV order. Enter your order number and email or phone to check status.',
      'https://dryv.com/assets/img/cover-track.jpg'
    );

    main.innerHTML = `
      <div class="page-content" aria-labelledby="trackOrderTitle">
        <h1 id="trackOrderTitle">${t('trackOrderTitle')}</h1>
        <p>${t('trackOrderPrompt')}</p>

        <form class="track-order-form" id="trackOrderForm" novalidate>
          <div class="form-group">
            <label for="trackOrderNumber">${t('orderNumber')}</label>
            <input type="text" id="trackOrderNumber" name="orderNumber" placeholder="DRYV-XXXXXX" required autocomplete="off" aria-describedby="trackOrderError">
            <p class="error-message" id="trackOrderError">${t('error')}</p>
          </div>
          <div class="form-group">
            <label for="trackContact">${t('email')}/${t('phone')}</label>
            <input type="text" id="trackContact" name="contact" placeholder="${t('email')} or ${t('phonePlaceholder')}" required autocomplete="off" aria-describedby="trackContactError">
            <p class="error-message" id="trackContactError">${t('error')}</p>
          </div>
          <button type="submit" class="btn btn-primary">${t('trackOrder')}</button>
        </form>

        <div class="track-result" id="trackResult" hidden>
          <p>${t('trackingLive')}</p>
        </div>
      </div>
    `;

    const form = $('#trackOrderForm');
    const result = $('#trackResult');
    if (form && result) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        result.hidden = false;
        result.querySelector('p').textContent = t('trackingLive');
      });
    }
  }

  async function renderPolicyPage(policyKey) {
    const main = $('#mainContent');
    if (!main) return;

    const titles = {
      shipping: t('shippingPolicyTitle'),
      returns: t('returnsPolicyTitle'),
      privacy: t('privacyPolicyTitle'),
      terms: t('termsTitle'),
      cookie: t('cookieNoticeTitle')
    };

    let content = getPolicyContent(policyKey);
    if (!content) {
      // route changed before the catalog finished loading — fetch it, then read again
      await loadCatalog();
      content = getPolicyContent(policyKey);
    }

    updatePageSEO(
      `${titles[policyKey]} | DRYV`,
      content.substring(0, 160),
      'https://dryv.com/assets/img/cover-policy.jpg'
    );

    main.innerHTML = `
      <div class="page-content" aria-labelledby="policyTitle">
        <span class="policy-title">${t('policyTitle')}</span>
        <h1 id="policyTitle">${titles[policyKey]}</h1>
        <div class="policy-content">${content.replace(/\n/g, '<br>')}</div>
      </div>
    `;
  }

  function render404Page() {
    const main = $('#mainContent');
    if (!main) return;

    updatePageSEO(
      `${t('notFoundTitle')} | DRYV`,
      'The page you are looking for has moved or no longer exists.',
      'https://dryv.com/assets/img/cover-policy.jpg'
    );

    main.innerHTML = `
      <div class="not-found-page" role="main">
        <div class="not-found-code" aria-hidden="true">404</div>
        <h1>${t('notFoundTitle')}</h1>
        <p>${t('notFoundText')}</p>
        <a href="#/" class="btn btn-primary">${t('backHome')}</a>
      </div>
    `;
  }

  function initCookieNotice() {
    cookieAccepted = localStorage.getItem('dryv_cookie_consent') === 'accepted';
    const notice = $('#cookieNotice');
    const acceptBtn = $('#cookieAccept');
    const declineBtn = $('#cookieDecline');
    const text = $('#cookieText');

    if (text) text.textContent = t('cookieText');

    if (cookieAccepted) {
      if (notice) notice.hidden = true;
      return;
    }

    if (notice) notice.hidden = false;

    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        localStorage.setItem('dryv_cookie_consent', 'accepted');
        cookieAccepted = true;
        notice.hidden = true;
        // In production, enable analytics cookies here
      });
    }

    if (declineBtn) {
      declineBtn.addEventListener('click', () => {
        localStorage.setItem('dryv_cookie_consent', 'declined');
        cookieAccepted = true; // Don't show again
        notice.hidden = true;
        // In production, disable analytics cookies here
      });
    }
  }

  function parsePageURL() {
    const hash = window.location.hash.slice(1);
    if (hash === '/pages/about') return { type: 'about' };
    if (hash === '/pages/account') return { type: 'account' };
    if (hash === '/pages/size-guide') return { type: 'size-guide' };
    if (hash === '/pages/faq') return { type: 'faq' };
    if (hash === '/pages/contact') return { type: 'contact' };
    if (hash === '/pages/support') return { type: 'support' };
    if (hash === '/pages/track-order') return { type: 'track-order' };
    if (hash.startsWith('/policies/')) return { type: 'policy', key: hash.split('/')[2] };
    if (hash === '/404' || !hash || hash === '/') return null; // Home handled by home.js
    return { type: '404' };
  }

  async function initPages() {
    await loadCatalog();
    await domReady;

    // Set announcement bar text on all page routes
    const announcementText = $('#announcementText');
    if (announcementText) {
      announcementText.textContent = t('freeDelivery');
    }

    initCookieNotice();

    const route = parsePageURL();
    if (route) {
      switch (route.type) {
        case 'about': renderAboutPage(); break;
        case 'account': renderAccountPage(); break;
        case 'size-guide': renderSizeGuidePage(); break;
        case 'faq': renderFAQPage(); break;
        case 'contact': renderContactPage(); break;
        case 'support': renderSupportPage(); break;
        case 'track-order': renderTrackOrderPage(); break;
        case 'policy': renderPolicyPage(route.key); break;
        case '404': render404Page(); break;
      }
    }
  }

  // Register routes with central router
  route('/pages/about', () => renderAboutPage());
  route('/pages/account', () => renderAccountPage());
  route('/pages/size-guide', () => renderSizeGuidePage());
  route('/pages/faq', () => renderFAQPage());
  route('/pages/contact', () => renderContactPage());
  route('/pages/support', () => renderSupportPage());
  route('/pages/track-order', () => renderTrackOrderPage());
  route('/policies/:key', (params) => renderPolicyPage(params.key));
  // 404 fallback - register last so it only matches when nothing else does
  route('*', () => render404Page());

  // Listen for 404 events from router
  window.addEventListener('dryv:routeNotFound', (e) => {
    render404Page();
  });

  // Export for other modules
  const DRYV_PAGES = {
    init: initPages,
    renderAboutPage,
    renderSizeGuidePage,
    renderFAQPage,
    renderContactPage,
    renderTrackOrderPage,
    renderPolicyPage,
    render404Page,
    initCookieNotice
  };

  if (typeof module !== 'undefined') {
    module.exports = DRYV_PAGES;
  }
  window.DRYV_PAGES = DRYV_PAGES;
})();
