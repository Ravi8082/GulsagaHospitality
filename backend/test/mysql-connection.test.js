import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mysqlConnectionOptions, normalizeMysqlUrl } from '../src/mysql-connection.js';

test('Aiven required TLS URLs normalize to Prisma strict TLS and mysql2 TLS options', () => {
  const connectionUrl = 'mysql://avnadmin:p%40ss%3Aword@db.example:18701/defaultdb?ssl-mode=REQUIRED';
  const normalized = new URL(normalizeMysqlUrl(connectionUrl));
  const options = mysqlConnectionOptions(connectionUrl);

  assert.equal(normalized.searchParams.get('ssl-mode'), null);
  assert.equal(normalized.searchParams.get('sslaccept'), 'strict');
  assert.equal(options.host, 'db.example');
  assert.equal(options.port, 18701);
  assert.equal(options.user, 'avnadmin');
  assert.equal(options.password, 'p@ss:word');
  assert.equal(options.database, 'defaultdb');
  assert.deepEqual(options.ssl, { rejectUnauthorized: true });
});

test('Local MySQL URLs keep their existing non-TLS configuration', () => {
  const options = mysqlConnectionOptions('mysql://user:pass@127.0.0.1:3306/gulsaga');
  assert.equal(options.host, '127.0.0.1');
  assert.equal(options.database, 'gulsaga');
  assert.equal('ssl' in options, false);
});
