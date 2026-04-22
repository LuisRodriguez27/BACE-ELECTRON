const pgSchema = `
  CREATE TABLE IF NOT EXISTS users (
    id       SERIAL       PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    active   BOOLEAN      NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS permissions (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    active      BOOLEAN      NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS user_permissions (
    user_id       INTEGER NOT NULL REFERENCES users(id),
    permission_id INTEGER NOT NULL REFERENCES permissions(id),
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (user_id, permission_id)
  );

  CREATE TABLE IF NOT EXISTS clients (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    phone       VARCHAR(50)  NOT NULL,
    address     TEXT,
    description TEXT,
    color       VARCHAR(50),
    active      BOOLEAN      NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS products (
    id             SERIAL       PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    serial_number  VARCHAR(255) UNIQUE,
    price          DECIMAL(10,2) NOT NULL,
    promo_price    DECIMAL(10,2),
    discount_price DECIMAL(10,2),
    images         TEXT,
    description    TEXT,
    active         BOOLEAN      NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS product_templates (
    id             SERIAL        PRIMARY KEY,
    product_id     INTEGER       NOT NULL REFERENCES products(id),
    final_price    DECIMAL(10,2) NOT NULL,
    promo_price    DECIMAL(10,2),
    discount_price DECIMAL(10,2),
    width          DECIMAL(10,2),
    height         DECIMAL(10,2),
    colors         TEXT,
    position       TEXT,
    texts          TEXT,
    description    TEXT,
    created_by     INTEGER       REFERENCES users(id),
    active         BOOLEAN       NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id                   SERIAL        PRIMARY KEY,
    client_id            INTEGER       NOT NULL REFERENCES clients(id),
    user_id              INTEGER       NOT NULL REFERENCES users(id),
    edited_by            INTEGER       REFERENCES users(id),
    date                 TIMESTAMPTZ   NOT NULL,
    total                DECIMAL(10,2) DEFAULT 0,
    converted_to_order   INTEGER       NOT NULL DEFAULT 0,
    converted_to_order_id INTEGER,
    active               BOOLEAN       NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                      SERIAL        PRIMARY KEY,
    client_id               INTEGER       NOT NULL REFERENCES clients(id),
    user_id                 INTEGER       NOT NULL REFERENCES users(id),
    edited_by               INTEGER       REFERENCES users(id),
    date                    TIMESTAMPTZ   NOT NULL,
    estimated_delivery_date TIMESTAMPTZ,
    status                  VARCHAR(50)   NOT NULL DEFAULT 'Revision',
    total                   DECIMAL(10,2) DEFAULT 0,
    notes                   TEXT,
    description             TEXT,
    responsable             VARCHAR(255),
    created_from_budget_id  INTEGER       REFERENCES budgets(id),
    active                  BOOLEAN       NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS order_products (
    id          SERIAL        PRIMARY KEY,
    order_id    INTEGER       NOT NULL REFERENCES orders(id),
    product_id  INTEGER       REFERENCES products(id),
    template_id INTEGER       REFERENCES product_templates(id),
    quantity    DECIMAL(10,4) NOT NULL,
    unit_price  DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    CHECK (product_id IS NOT NULL OR template_id IS NOT NULL)
  );

  CREATE TABLE IF NOT EXISTS budget_products (
    id          SERIAL        PRIMARY KEY,
    budget_id   INTEGER       NOT NULL REFERENCES budgets(id),
    product_id  INTEGER       REFERENCES products(id),
    template_id INTEGER       REFERENCES product_templates(id),
    quantity    DECIMAL(10,4) NOT NULL,
    unit_price  DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    CHECK (product_id IS NOT NULL OR template_id IS NOT NULL)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id        SERIAL        PRIMARY KEY,
    order_id  INTEGER       REFERENCES orders(id),
    amount    DECIMAL(10,2) NOT NULL,
    date      TIMESTAMPTZ,
    descripcion TEXT,
    info      TEXT
  );

  CREATE TABLE IF NOT EXISTS simple_orders (
    id          SERIAL        PRIMARY KEY,
    user_id     INTEGER       NOT NULL REFERENCES users(id),
    date        TIMESTAMPTZ   NOT NULL,
    concept     TEXT          NOT NULL,
    client_name VARCHAR(255),
    total       DECIMAL(10,2) DEFAULT 0,
    active      BOOLEAN       NOT NULL DEFAULT TRUE
  );

  CREATE TABLE IF NOT EXISTS simple_order_payments (
    id              SERIAL        PRIMARY KEY,
    simple_order_id INTEGER       NOT NULL REFERENCES simple_orders(id),
    user_id         INTEGER       NOT NULL REFERENCES users(id),
    amount          DECIMAL(10,2) NOT NULL,
    date            TIMESTAMPTZ   NOT NULL,
    descripcion     TEXT
  );

  CREATE TABLE IF NOT EXISTS cash_sessions (
    id               SERIAL        PRIMARY KEY,
    opening_date     TIMESTAMPTZ   NOT NULL,
    closing_date     TIMESTAMPTZ,
    opening_balance  DECIMAL(10,2) NOT NULL DEFAULT 0,
    expected_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    closing_balance  DECIMAL(10,2) NOT NULL DEFAULT 0,
    status           VARCHAR(50)   NOT NULL DEFAULT 'open',
    notes            TEXT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id                SERIAL        PRIMARY KEY,
    cash_session_id   INTEGER       NOT NULL REFERENCES cash_sessions(id),
    user_id           INTEGER       NOT NULL REFERENCES users(id),
    edited_by         INTEGER       REFERENCES users(id),
    amount            DECIMAL(10,2) NOT NULL,
    description       TEXT          NOT NULL,
    date              TIMESTAMPTZ   NOT NULL,
    active            BOOLEAN       NOT NULL DEFAULT TRUE
  );


  -- ============================================================
  -- ÍNDICES DE RENDIMIENTO (Llaves foráneas + columnas frecuentes)
  -- Las BDs existentes los reciben a través de la migración v10.
  -- ============================================================

  -- user_permissions
  CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id               ON user_permissions(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id          ON user_permissions(permission_id);

  -- product_templates
  CREATE INDEX IF NOT EXISTS idx_product_templates_product_id            ON product_templates(product_id);
  CREATE INDEX IF NOT EXISTS idx_product_templates_created_by            ON product_templates(created_by);

  -- budgets
  CREATE INDEX IF NOT EXISTS idx_budgets_client_id                       ON budgets(client_id);
  CREATE INDEX IF NOT EXISTS idx_budgets_user_id                         ON budgets(user_id);
  CREATE INDEX IF NOT EXISTS idx_budgets_edited_by                       ON budgets(edited_by);
  CREATE INDEX IF NOT EXISTS idx_budgets_converted_to_order_id           ON budgets(converted_to_order_id);
  CREATE INDEX IF NOT EXISTS idx_budgets_active                          ON budgets(active);

  -- orders
  CREATE INDEX IF NOT EXISTS idx_orders_client_id                        ON orders(client_id);
  CREATE INDEX IF NOT EXISTS idx_orders_user_id                          ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_edited_by                        ON orders(edited_by);
  CREATE INDEX IF NOT EXISTS idx_orders_created_from_budget_id           ON orders(created_from_budget_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status                           ON orders(status);

  -- order_products
  CREATE INDEX IF NOT EXISTS idx_order_products_order_id                 ON order_products(order_id);
  CREATE INDEX IF NOT EXISTS idx_order_products_product_id               ON order_products(product_id);
  CREATE INDEX IF NOT EXISTS idx_order_products_template_id              ON order_products(template_id);

  -- budget_products
  CREATE INDEX IF NOT EXISTS idx_budget_products_budget_id               ON budget_products(budget_id);
  CREATE INDEX IF NOT EXISTS idx_budget_products_product_id              ON budget_products(product_id);
  CREATE INDEX IF NOT EXISTS idx_budget_products_template_id             ON budget_products(template_id);

  -- payments
  CREATE INDEX IF NOT EXISTS idx_payments_order_id                       ON payments(order_id);

  -- products
  CREATE INDEX IF NOT EXISTS idx_products_active                         ON products(active);

  -- simple_orders
  CREATE INDEX IF NOT EXISTS idx_simple_orders_user_id                   ON simple_orders(user_id);

  -- simple_order_payments
  CREATE INDEX IF NOT EXISTS idx_simple_order_payments_simple_order_id   ON simple_order_payments(simple_order_id);
  CREATE INDEX IF NOT EXISTS idx_simple_order_payments_user_id           ON simple_order_payments(user_id);

  -- cash_sessions
  CREATE INDEX IF NOT EXISTS idx_cash_sessions_active_status             ON cash_sessions(status) WHERE status = 'open';
  CREATE INDEX IF NOT EXISTS idx_cash_sessions_date_range                ON cash_sessions(opening_date, closing_date);

  -- expenses
  CREATE INDEX IF NOT EXISTS idx_expenses_session_active                 ON expenses(cash_session_id) WHERE active = TRUE;
  CREATE INDEX IF NOT EXISTS idx_expenses_user_date_active               ON expenses(user_id, date) WHERE active = TRUE;
  CREATE INDEX IF NOT EXISTS idx_expenses_active_true                    ON expenses(date)   WHERE active = TRUE;

`;

module.exports = pgSchema;
