(function () {
  // Practice Areas dropdown — open on hover, close after a short delay
  var wrap = document.querySelector('.nav-dropdown-wrap');
  if (wrap) {
    var closeTimer = null;
    wrap.addEventListener('mouseenter', function () {
      clearTimeout(closeTimer);
      wrap.classList.add('open');
    });
    wrap.addEventListener('mouseleave', function () {
      closeTimer = setTimeout(function () {
        wrap.classList.remove('open');
      }, 180);
    });
  }

  // Mobile drawer
  var toggle = document.querySelector('.nav-toggle');
  var drawer = document.querySelector('.mobile-drawer');
  if (toggle && drawer) {
    toggle.addEventListener('click', function () {
      var open = drawer.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Close' : 'Menu';
    });
  }

  // Contact form — client-side only; swaps to the thank-you panel on submit.
  // Wire to email/CRM before launch (see README).
  var form = document.querySelector('.contact-form-wrap form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('#cf-name');
      var phone = form.querySelector('#cf-phone');
      var valid = true;
      [name, phone].forEach(function (field) {
        if (!field.value.trim()) {
          field.classList.add('invalid');
          valid = false;
        } else {
          field.classList.remove('invalid');
        }
      });
      if (!valid) return;
      document.querySelector('.contact-form-wrap').style.display = 'none';
      document.querySelector('.contact-thanks').classList.add('visible');
    });
  }
})();
