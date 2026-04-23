const schemaTables = `

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
    id             SERIAL        PRIMARY KEY,
    name           VARCHAR(255)  NOT NULL,
    serial_number  VARCHAR(255)  UNIQUE,
    price          DECIMAL(10,2) NOT NULL,
    promo_price    DECIMAL(10,2),
    discount_price DECIMAL(10,2),
    images         TEXT,
    description    TEXT,
    active         BOOLEAN       NOT NULL DEFAULT TRUE
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
    id                    SERIAL        PRIMARY KEY,
    client_id             INTEGER       NOT NULL REFERENCES clients(id),
    user_id               INTEGER       NOT NULL REFERENCES users(id),
    edited_by             INTEGER       REFERENCES users(id),
    date                  TIMESTAMPTZ   NOT NULL,
    total                 DECIMAL(10,2) DEFAULT 0,
    converted_to_order    INTEGER       NOT NULL DEFAULT 0,
    converted_to_order_id INTEGER,
    active                BOOLEAN       NOT NULL DEFAULT TRUE
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

  CREATE TABLE IF NOT EXISTS payments (
    id               SERIAL        PRIMARY KEY,
    order_id         INTEGER       REFERENCES orders(id),
    cash_session_id  INTEGER       REFERENCES cash_sessions(id),
    amount           DECIMAL(10,2) NOT NULL,
    date             TIMESTAMPTZ,
    descripcion      TEXT,
    info             TEXT
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
    id               SERIAL        PRIMARY KEY,
    simple_order_id  INTEGER       NOT NULL REFERENCES simple_orders(id),
    user_id          INTEGER       NOT NULL REFERENCES users(id),
    cash_session_id  INTEGER       REFERENCES cash_sessions(id),
    amount           DECIMAL(10,2) NOT NULL,
    date             TIMESTAMPTZ   NOT NULL,
    descripcion      TEXT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id              SERIAL        PRIMARY KEY,
    cash_session_id INTEGER       NOT NULL REFERENCES cash_sessions(id),
    user_id         INTEGER       NOT NULL REFERENCES users(id),
    edited_by       INTEGER       REFERENCES users(id),
    amount          DECIMAL(10,2) NOT NULL,
    description     TEXT          NOT NULL,
    date            TIMESTAMPTZ   NOT NULL,
    active          BOOLEAN       NOT NULL DEFAULT TRUE
  );

`;

module.exports = schemaTables;
