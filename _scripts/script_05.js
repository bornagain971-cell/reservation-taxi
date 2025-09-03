
(function () {
  const estimateBtn = document.querySelector('#estimateBtn, button[data-role="estimate"], .btn-estimate');
  const depart = document.querySelector('#start, #depart, #origin, input[name="origin"], input[name="start"]');
  const dest = document.querySelector('#end, #destination, #dest, input[name="destination"]');

  if (!estimateBtn || !depart || !dest) return;

  let errorEl = document.createElement('div');
  errorEl.id = 'estimate-error';
  errorEl.style.display = 'none';
  errorEl.style.color = '#c53030';
  errorEl.style.marginTop = '8px';
  errorEl.style.fontSize = '0.9rem';
  errorEl.setAttribute('aria-live', 'polite');

  const priceBox = document.querySelector('#priceBox, .price-box, #estimatePriceBox') || estimateBtn.parentElement;
  priceBox.appendChild(errorEl);

  function clearError() {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }

  function validate() {
    const d = depart.value.trim();
    const a = dest.value.trim();
    if (!d || !a) {
      errorEl.textContent = "Oups ! Pour obtenir votre estimation, indiquez dâ€™abord le lieu de dÃ©part et la destination.";
      errorEl.style.display = 'block';
      return false;
    }
    clearError();
    return true;
  }

  estimateBtn.addEventListener('click', function (e) {
    if (!validate()) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  depart.addEventListener('input', clearError);
  dest.addEventListener('input', clearError);
})();
