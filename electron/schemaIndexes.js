const schemaIndexes = `

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
  CREATE INDEX IF NOT EXISTS idx_payments_cash_session_id                ON payments(cash_session_id);

  -- simple_order_payments
  CREATE INDEX IF NOT EXISTS idx_simple_order_payments_simple_order_id   ON simple_order_payments(simple_order_id);
  CREATE INDEX IF NOT EXISTS idx_simple_order_payments_user_id           ON simple_order_payments(user_id);
  CREATE INDEX IF NOT EXISTS idx_simple_order_payments_cash_session_id   ON simple_order_payments(cash_session_id);

  -- products
  CREATE INDEX IF NOT EXISTS idx_products_active                         ON products(active);

  -- simple_orders
  CREATE INDEX IF NOT EXISTS idx_simple_orders_user_id                   ON simple_orders(user_id);

  -- cash_sessions
  CREATE INDEX IF NOT EXISTS idx_cash_sessions_active_status             ON cash_sessions(status) WHERE status = 'open';
  CREATE INDEX IF NOT EXISTS idx_cash_sessions_date_range                ON cash_sessions(opening_date, closing_date);

  -- expenses
  CREATE INDEX IF NOT EXISTS idx_expenses_session_active                 ON expenses(cash_session_id) WHERE active = TRUE;
  CREATE INDEX IF NOT EXISTS idx_expenses_user_date_active               ON expenses(user_id, date) WHERE active = TRUE;
  CREATE INDEX IF NOT EXISTS idx_expenses_active_true                    ON expenses(date) WHERE active = TRUE;

`;

module.exports = schemaIndexes;
