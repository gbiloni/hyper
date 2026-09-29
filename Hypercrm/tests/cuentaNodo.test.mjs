// Corre con:  node --test tests/cuentaNodo.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolverIdNodo } from '../src/lib/cuentaNodo.ts';

test('id_nodo del formulario nuevo', () => {
  assert.equal(resolverIdNodo({ id_nodo: 3 }, '9'), 3);
  assert.equal(resolverIdNodo({ id_nodo: '4' }, '9'), 4);
});

test('id_nodo inválido: null (no cae a la cookie, para no asignar un nodo que nadie eligió)', () => {
  assert.equal(resolverIdNodo({ id_nodo: 0 }, '9'), null);
  assert.equal(resolverIdNodo({ id_nodo: 'abc' }, '9'), null);
  assert.equal(resolverIdNodo({ id_nodo: -2 }, '9'), null);
});

test('pantalla vieja con id_nodos[]: solo si eligió exactamente uno', () => {
  assert.equal(resolverIdNodo({ id_nodos: [5] }, '9'), 5);
  assert.equal(resolverIdNodo({ id_nodos: [5, 6] }, '9'), null);
  assert.equal(resolverIdNodo({ id_nodos: [] }, '9'), null);
});

test('sin nodo en el body: el nodo activo de la cookie', () => {
  assert.equal(resolverIdNodo({}, '7'), 7);
  assert.equal(resolverIdNodo(undefined, '7'), 7);
  assert.equal(resolverIdNodo({}, undefined), null);
});
