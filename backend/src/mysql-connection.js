export function normalizeMysqlUrl(connectionUrl) {
  const url = new URL(connectionUrl);
  if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL must use MySQL.');
  if (url.searchParams.get('ssl-mode')?.toUpperCase() === 'REQUIRED') {
    url.searchParams.delete('ssl-mode');
    url.searchParams.set('sslaccept', 'strict');
  }
  return url.toString();
}

export function mysqlConnectionOptions(connectionUrl) {
  const url = new URL(normalizeMysqlUrl(connectionUrl));
  const options = {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
  };
  if (url.searchParams.get('sslaccept') === 'strict') {
    options.ssl = { rejectUnauthorized: true };
  }
  return options;
}
