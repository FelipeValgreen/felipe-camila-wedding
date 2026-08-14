import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOperationalAction } from '../lib/copilot-operations';

function action(text: string) {
  const result = parseOperationalAction(text);
  assert.ok(result, `Expected an operational action for: ${text}`);
  assert.equal(result.requiresConfirmation, true);
  return result;
}

test('parses table geometry and seating operations', () => {
  const move = action('Mueve mesa 3 a X 12 Y 8');
  assert.equal(move.type, 'table.update');
  assert.deepEqual(move.payload.patch, { position_x_m: 12, position_y_m: 8 });

  const seat = action('Asigna a Juan Pérez a la mesa 3');
  assert.equal(seat.type, 'seating.assign');
  assert.equal(seat.payload.guestName, 'Juan Pérez');
  assert.equal(seat.payload.tableNumber, 3);
});

test('parses guest updates', () => {
  const guest = action('Marca a Juan Pérez como no asiste');
  assert.equal(guest.type, 'guest.update');
  assert.equal(guest.payload.updates.attendance_status, 'not_attending');
});

test('parses music update and delete operations', () => {
  const update = action('Marca canción Perfect como confirmado');
  assert.equal(update.type, 'music.update');
  assert.equal(update.payload.updates.status, 'Confirmado');

  const remove = action('Elimina canción Perfect');
  assert.equal(remove.type, 'music.delete');
  assert.equal(remove.payload.musicName, 'Perfect');
});

test('parses timeline update, reschedule and delete operations', () => {
  const status = action('Marca bloque Primer baile como confirmado');
  assert.equal(status.type, 'timeline.update');
  assert.equal(status.payload.updates.status, 'Confirmado');

  const move = action('Reprograma bloque Primer baile para 2026-10-23 22:30');
  assert.equal(move.type, 'timeline.update');
  assert.equal(move.payload.updates.dateTime, '2026-10-23T22:30');

  assert.equal(action('Elimina bloque Primer baile').type, 'timeline.delete');
});

test('parses task complete reopen and delete operations', () => {
  const complete = action('Completa tarea Confirmar flores');
  assert.equal(complete.type, 'task.update');
  assert.equal(complete.payload.updates.status, 'Completada');

  const reopen = action('Reabre tarea Confirmar flores');
  assert.equal(reopen.type, 'task.update');
  assert.equal(reopen.payload.updates.status, 'Pendiente');

  assert.equal(action('Elimina tarea Confirmar flores').type, 'task.delete');
});

test('parses Chilean budget create update delete and payment operations', () => {
  const create = action('Agrega un gasto Fotógrafo por $500.000');
  assert.equal(create.type, 'budget.create');
  assert.equal(create.payload.projectedGross, 500000);

  const update = action('Cambia el monto de Fotógrafo a $650.000');
  assert.equal(update.type, 'budget.update');
  assert.equal(update.payload.updates.projectedGross, 650000);

  assert.equal(action('Elimina gasto Fotógrafo del presupuesto').type, 'budget.delete');

  const payment = action('Registra un pago de $200.000 para Fotógrafo');
  assert.equal(payment.type, 'payment.create');
  assert.equal(payment.payload.amount, 200000);
  assert.equal(payment.payload.budgetName, 'Fotógrafo');
});

test('parses vendor create update and delete operations', () => {
  const create = action('Agrega proveedor Flores del Valle categoría Decoración');
  assert.equal(create.type, 'vendor.create');
  assert.equal(create.payload.name, 'Flores del Valle');
  assert.equal(create.payload.category, 'Decoración');

  const update = action('Marca proveedor Flores del Valle como contratado');
  assert.equal(update.type, 'vendor.update');
  assert.equal(update.payload.updates.status, 'Contratado');

  assert.equal(action('Elimina proveedor Flores del Valle').type, 'vendor.delete');
});
