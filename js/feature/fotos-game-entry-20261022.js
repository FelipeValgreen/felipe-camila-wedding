import { join, restore } from '/plot-twist/client.js';
const form = document.querySelector('#landing-game-form');
const error = document.querySelector('#game-entry-error');
const table = document.querySelector('#game-table');
table.addEventListener('input', () => table.setCustomValidity(''));
form.addEventListener('submit', async event => {
  event.preventDefault();
  const tableCode = table.value.trim().toLowerCase();
  if (!/^(?:[1-9][0-9]{0,2}|novios)$/.test(tableCode)) {
    table.setCustomValidity('Escribe tu número de mesa o la palabra novios.');
    table.reportValidity();
    return;
  }
  const button = form.querySelector('button');
  if (button.disabled) return;
  button.disabled = true;
  button.textContent = 'Entrando…';
  error.textContent = '';
  try {
    const existing = await restore();
    if (!existing?.player) {
      await join({nickname: document.querySelector('#game-nickname').value.trim(), tableCode});
    }
    location.assign('/plot-twist/');
  } catch (err) {
    error.textContent = ({TABLE_NOT_FOUND:'No encontramos esa mesa. Revisa el número de tu mesa.',NICKNAME_TAKEN:'Ese nombre ya está usado en tu mesa. Prueba otro apodo.'})[err.message] || 'No pudimos entrar al juego. Revisa tu conexión e inténtalo nuevamente.';
    button.disabled = false;
    button.textContent = 'Entrar al juego';
  }
});
