// Limites de negócio (antes eram "números mágicos" espalhados pelo código).
const ADMIN_PRIORITY_THRESHOLD = 1000;
const USER_MAX_VISIBLE_VALUE = 500;

// --- Políticas de acesso por perfil (Replace Conditional with Polymorphism) ---
const ROLE_POLICIES = new Map([
  [
    'ADMIN',
    {
      prepare(item) {
        if (item.value > ADMIN_PRIORITY_THRESHOLD) {
          item.priority = true;
        }
      },
      canSee: () => true,
    },
  ],
  [
    'USER',
    {
      prepare() {},
      canSee: (item) => item.value <= USER_MAX_VISIBLE_VALUE,
    },
  ],
]);

// --- Formatadores por tipo de relatório (um por formato, sem if/else aninhado) ---
const csvFormatter = {
  header: () => 'ID,NOME,VALOR,USUARIO\n',
  row: (item, user) => `${item.id},${item.name},${item.value},${user.name}\n`,
  footer: (total) => `\nTotal,,\n${total},,\n`,
};

const htmlFormatter = {
  header: (user) =>
    '<html><body>\n' +
    '<h1>Relatório</h1>\n' +
    `<h2>Usuário: ${user.name}</h2>\n` +
    '<table>\n' +
    '<tr><th>ID</th><th>Nome</th><th>Valor</th></tr>\n',
  row: (item) => {
    const style = item.priority ? ' style="font-weight:bold;"' : '';
    return `<tr${style}><td>${item.id}</td><td>${item.name}</td><td>${item.value}</td></tr>\n`;
  },
  footer: (total) =>
    '</table>\n' + `<h3>Total: ${total}</h3>\n` + '</body></html>\n',
};

const FORMATTERS = new Map([
  ['CSV', csvFormatter],
  ['HTML', htmlFormatter],
]);

export class ReportGenerator {
  constructor(database) {
    this.db = database;
  }

  /**
   * Gera um relatório de itens baseado no tipo e no usuário.
   * - Admins veem tudo.
   * - Users comuns só veem itens com valor <= 500.
   */
  generateReport(reportType, user, items) {
    const formatter = FORMATTERS.get(reportType);
    if (!formatter) {
      return '';
    }

    const visibleItems = this.selectVisibleItems(user, items);
    const total = visibleItems.reduce((sum, item) => sum + item.value, 0);

    const body = visibleItems.map((item) => formatter.row(item, user)).join('');

    return (formatter.header(user) + body + formatter.footer(total)).trim();
  }

  selectVisibleItems(user, items) {
    const policy = ROLE_POLICIES.get(user.role);
    if (!policy) {
      return [];
    }

    items.forEach((item) => policy.prepare(item));
    return items.filter((item) => policy.canSee(item));
  }
}
