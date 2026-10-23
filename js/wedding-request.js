document.querySelectorAll('form[data-wedding-request]').forEach(form => {
  const button = form.querySelector('button[type="submit"]');
  const result = form.querySelector('[data-result]');
  if (!button || !result) return;
  result.setAttribute('role', 'status');
  result.setAttribute('aria-live', 'polite');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    data.kind = form.dataset.weddingRequest;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Enviando…';
    result.dataset.state = 'loading';
    result.textContent = 'Estamos registrando tu solicitud.';
    try {
      const response = await fetch('/api/wedding/request', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error('No se pudo registrar. Prueba nuevamente más tarde.');
      result.dataset.state = 'success';
      result.textContent = 'Recibimos tu solicitud. Quedó pendiente de revisión; no significa que el premio o resultado esté aprobado.';
      form.reset();
    } catch (error) {
      result.dataset.state = 'error';
      result.textContent = error.message || 'Ocurrió un problema. Inténtalo nuevamente.';
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
});
