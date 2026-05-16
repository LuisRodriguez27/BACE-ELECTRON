// SISTEMA DE MIGRACIONES VERSIONADO
// Cada migración se ejecuta UNA SOLA VEZ y queda registrada
// en la tabla schema_migrations. Si la app inicia y ya están
// todas aplicadas, no hace ningún trabajo extra.
//
// Reglas para agregar migraciones nuevas:
//   1. Agrega un objeto al array MIGRATIONS con el siguiente
//      número de versión disponible.
//   2. Escribe toda la lógica usando `client.query()` (no db.xxx)
//      para que quede dentro de la misma transacción.
//   3. NUNCA modifiques o elimines migraciones ya aplicadas.

const MIGRATIONS = [

  // v1: Seed inicial — usuario admin + todos los permisos base
  {
    version: 1,
    name: 'initial_seed',
    up: async (client) => {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('admin123', 10);

      const { rows: [admin] } = await client.query(
        `INSERT INTO users (username, password, active) VALUES ($1, $2, true) RETURNING id`,
        ['admin', hash]
      );

      const permissions = [
        ['Gestionar Usuario',     'Permite crear, editar o desactivar usuarios'],
        ['Gestionar Permisos',    'Permite asignar o revocar permisos a los usuarios'],
        ['Crear Cliente',         'Permite registrar nuevos clientes'],
        ['Editar Cliente',        'Permite modificar datos de clientes'],
        ['Eliminar Cliente',      'Permite eliminar o desactivar clientes'],
        ['Crear Producto',        'Permite registrar nuevos productos'],
        ['Editar Producto',       'Permite modificar información de productos'],
        ['Eliminar Producto',     'Permite eliminar o desactivar productos'],
        ['Crear Plantilla',       'Permite crear plantillas de productos'],
        ['Editar Plantilla',      'Permite modificar plantillas de productos'],
        ['Eliminar Plantilla',    'Permite eliminar plantillas de productos'],
        ['Crear Órdenes',         'Permite registrar nuevas órdenes'],
        ['Editar Órdenes',        'Permite modificar órdenes'],
        ['Cancelar Órdenes',      'Permite cancelar órdenes'],
        ['Crear Presupuestos',    'Permite registrar nuevos presupuestos'],
        ['Eliminar Presupuestos', 'Permite eliminar presupuestos'],
        ['Editar Presupuestos',   'Permite editar los presupuestos registrados'],
        ['Ver pagos',             'Permite ver los pagos registrados'],
        ['Registrar Pagos',       'Permite registrar pagos en órdenes'],
        ['Eliminar Pagos',        'Permite eliminar o anular pagos'],
        ['Estadisticas',          'Permite visualizar las estadisticas de ventas'],
        ['Estadisticas: Filtros', 'Permite filtrar las estadisticas'],
        ['Estadisticas: Hoy',     'Permite ver solo las estadisticas de hoy'],
      ];

      for (const [name, description] of permissions) {
        const { rows: [perm] } = await client.query(
          `INSERT INTO permissions (name, description, active) VALUES ($1, $2, true)
           ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id`,
          [name, description]
        );
        await client.query(
          `INSERT INTO user_permissions (user_id, permission_id, active) VALUES ($1, $2, true)
           ON CONFLICT DO NOTHING`,
          [admin.id, perm.id]
        );
      }
    }
  },

  // v2: Asegurar permisos nuevos en admin (para BDs pre-v1)
  {
    version: 2,
    name: 'ensure_new_permissions_on_admin',
    up: async (client) => {
      const newPerms = [
        ['Estadisticas',          'Permite visualizar las estadisticas de ventas'],
        ['Editar Presupuestos',   'Permite editar los presupuestos registrados'],
        ['Ver Pagos',             'Permite ver los pagos registrados'],
        ['Estadisticas: Filtros', 'Permite filtrar las estadisticas'],
        ['Estadisticas: Hoy',     'Permite ver solo las estadisticas de hoy'],
      ];

      const { rows: admins } = await client.query(
        `SELECT id FROM users WHERE username = 'admin'`
      );

      for (const [name, description] of newPerms) {
        const { rows: [perm] } = await client.query(
          `INSERT INTO permissions (name, description, active) VALUES ($1, $2, true)
           ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id`,
          [name, description]
        );
        for (const admin of admins) {
          await client.query(
            `INSERT INTO user_permissions (user_id, permission_id, active) VALUES ($1, $2, true)
             ON CONFLICT DO NOTHING`,
            [admin.id, perm.id]
          );
        }
      }
    }
  },

  // v3: Normalizar estados de órdenes (de SQLite legacy)
  {
    version: 3,
    name: 'normalize_order_statuses',
    up: async (client) => {
      await client.query(`UPDATE orders SET status = 'Revision'  WHERE status = 'pendiente'`);
      await client.query(`UPDATE orders SET status = 'Produccion' WHERE status = 'en proceso'`);
      await client.query(`UPDATE orders SET status = 'Completado' WHERE status = 'completado'`);
      await client.query(`UPDATE orders SET status = 'Cancelado'  WHERE status = 'cancelado'`);
    }
  },

  // v4: Nuevas columnas en products
  {
    version: 4,
    name: 'add_product_price_columns',
    up: async (client) => {
      await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price    DECIMAL(10,2)`);
      await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10,2)`);
      await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS images         TEXT`);
    }
  },

  // v5: Nuevas columnas en product_templates y simple_orders
  {
    version: 5,
    name: 'add_template_and_simple_orders_columns',
    up: async (client) => {
      await client.query(`ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS promo_price    DECIMAL(10,2)`);
      await client.query(`ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10,2)`);
      await client.query(`ALTER TABLE simple_orders     ADD COLUMN IF NOT EXISTS client_name    VARCHAR(255)`);
    }
  },

  // v6: payments.order_id nullable + columna info
  {
    version: 6,
    name: 'payments_nullable_order_id_and_info',
    up: async (client) => {
      await client.query(`ALTER TABLE payments ALTER COLUMN order_id DROP NOT NULL`);
      await client.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS info TEXT`);
    }
  },

  // v7: Arrancar el SERIAL de orders desde 14549
  {
    version: 7,
    name: 'orders_id_seq_min_value',
    up: async (client) => {
      await client.query(`SELECT setval('orders_id_seq', 14549, false)`);
    }
  },

  // v8: Convertir columnas active de INTEGER → BOOLEAN
  {
    version: 8,
    name: 'convert_active_to_boolean',
    // Verificar si users.active ya es BOOLEAN (proxy de todas las tablas)
    isApplied: async (client) => {
      const { rows } = await client.query(
        `SELECT data_type, column_default FROM information_schema.columns
         WHERE table_name = 'users' AND column_name = 'active'`
      );
      return rows.length > 0 && rows[0].data_type === 'boolean' && rows[0].column_default !== null;
    },
    up: async (client) => {
      const tables = [
        'users', 'permissions', 'user_permissions', 'clients',
        'products', 'product_templates', 'budgets', 'orders', 'simple_orders'
      ];
      for (const table of tables) {
        const { rows } = await client.query(
          `SELECT data_type FROM information_schema.columns
           WHERE table_name = $1 AND column_name = 'active'`,
          [table]
        );
        if (rows.length > 0 && rows[0].data_type !== 'boolean') {
          await client.query(`ALTER TABLE ${table} ALTER COLUMN active DROP DEFAULT`);
          await client.query(`ALTER TABLE ${table} ALTER COLUMN active TYPE BOOLEAN USING (active = 1)`);
        }
        await client.query(`ALTER TABLE ${table} ALTER COLUMN active SET DEFAULT TRUE`);
      }
    }
  },

  // v9: Convertir columnas date de TIMESTAMP → TIMESTAMPTZ
  {
    version: 9,
    name: 'convert_timestamp_to_timestamptz',
    // Verificar si orders.date ya es TIMESTAMPTZ
    isApplied: async (client) => {
      const { rows } = await client.query(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = 'orders' AND column_name = 'date'`
      );
      return rows.length > 0 && rows[0].data_type === 'timestamp with time zone';
    },
    up: async (client) => {
      const columns = [
        { table: 'budgets',               column: 'date' },
        { table: 'orders',                column: 'date' },
        { table: 'orders',                column: 'estimated_delivery_date' },
        { table: 'payments',              column: 'date' },
        { table: 'simple_orders',         column: 'date' },
        { table: 'simple_order_payments', column: 'date' },
      ];
      for (const { table, column } of columns) {
        const { rows } = await client.query(
          `SELECT data_type FROM information_schema.columns
           WHERE table_name = $1 AND column_name = $2`,
          [table, column]
        );
        if (rows.length > 0 && rows[0].data_type === 'timestamp without time zone') {
          await client.query(
            `ALTER TABLE ${table} ALTER COLUMN ${column} TYPE TIMESTAMPTZ
             USING ${column} AT TIME ZONE 'UTC'`
          );
        }
      }
    }
  },

  // v10: Crear índices para todas las llaves foráneas
  {
    version: 10,
    name: 'create_fk_indexes',
    // Verificar si al menos uno de los índices ya existe
    isApplied: async (client) => {
      const { rows } = await client.query(
        `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_client_id'`
      );
      return rows.length > 0;
    },
    up: async (client) => {
      const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id               ON user_permissions(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id          ON user_permissions(permission_id)`,
        `CREATE INDEX IF NOT EXISTS idx_product_templates_product_id            ON product_templates(product_id)`,
        `CREATE INDEX IF NOT EXISTS idx_product_templates_created_by            ON product_templates(created_by)`,
        `CREATE INDEX IF NOT EXISTS idx_budgets_client_id                       ON budgets(client_id)`,
        `CREATE INDEX IF NOT EXISTS idx_budgets_user_id                         ON budgets(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_budgets_edited_by                       ON budgets(edited_by)`,
        `CREATE INDEX IF NOT EXISTS idx_budgets_converted_to_order_id           ON budgets(converted_to_order_id)`,
        `CREATE INDEX IF NOT EXISTS idx_budgets_active                          ON budgets(active)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_client_id                        ON orders(client_id)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_user_id                          ON orders(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_edited_by                        ON orders(edited_by)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_created_from_budget_id           ON orders(created_from_budget_id)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_status                           ON orders(status)`,
        `CREATE INDEX IF NOT EXISTS idx_order_products_order_id                 ON order_products(order_id)`,
        `CREATE INDEX IF NOT EXISTS idx_order_products_product_id               ON order_products(product_id)`,
        `CREATE INDEX IF NOT EXISTS idx_order_products_template_id              ON order_products(template_id)`,
        `CREATE INDEX IF NOT EXISTS idx_budget_products_budget_id               ON budget_products(budget_id)`,
        `CREATE INDEX IF NOT EXISTS idx_budget_products_product_id              ON budget_products(product_id)`,
        `CREATE INDEX IF NOT EXISTS idx_budget_products_template_id             ON budget_products(template_id)`,
        `CREATE INDEX IF NOT EXISTS idx_payments_order_id                       ON payments(order_id)`,
        `CREATE INDEX IF NOT EXISTS idx_products_active                         ON products(active)`,
        `CREATE INDEX IF NOT EXISTS idx_simple_orders_user_id                   ON simple_orders(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_simple_order_payments_simple_order_id   ON simple_order_payments(simple_order_id)`,
        `CREATE INDEX IF NOT EXISTS idx_simple_order_payments_user_id           ON simple_order_payments(user_id)`,
      ];
      for (const sql of indexes) {
        await client.query(sql);
      }
    }
  },

  // v11: Crear tablas para egreso y caja
  {
    version: 11,
    name: 'create_cash/expenses_tables',
    isApplied: async (client) => {
    const { rows } = await client.query(
      `SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_name IN ('cash_sessions', 'expenses')`
    );
    // Si el conteo es 2, la migración ya está completa
    return parseInt(rows[0].count) === 2;
  },
    up: async (client) => {
      const schema = `
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

        -- Índices
        -- cash_sessions
        CREATE INDEX IF NOT EXISTS idx_cash_sessions_active_status             ON cash_sessions(status) WHERE status = 'open';
        CREATE INDEX IF NOT EXISTS idx_cash_sessions_date_range                ON cash_sessions(opening_date, closing_date);

        -- expenses
        CREATE INDEX IF NOT EXISTS idx_expenses_session_active                 ON expenses(cash_session_id) WHERE active = TRUE;
        CREATE INDEX IF NOT EXISTS idx_expenses_user_date_active               ON expenses(user_id, date) WHERE active = TRUE;
        CREATE INDEX IF NOT EXISTS idx_expenses_active_true                    ON expenses(date)   WHERE active = TRUE;
        `;
      await client.query(schema);
    }
  },

  // v12: Agregar cash_session_id a payments y simple_order_payments
  {
    version: 12,
    name: 'add_cash_session_id_to_payments',
    isApplied: async (client) => {
      const { rows } = await client.query(`
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name IN ('payments', 'simple_order_payments')
          AND column_name = 'cash_session_id'
      `);
      // Si ambas tablas ya tienen la columna, el conteo es 2
      return parseInt(rows[0].count) === 2;
    },
    up: async (client) => {
      await client.query(`
        ALTER TABLE payments
          ADD COLUMN IF NOT EXISTS cash_session_id INTEGER REFERENCES cash_sessions(id)
      `);
      await client.query(`
        ALTER TABLE simple_order_payments
          ADD COLUMN IF NOT EXISTS cash_session_id INTEGER REFERENCES cash_sessions(id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_payments_cash_session_id
          ON payments(cash_session_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_simple_order_payments_cash_session_id
          ON simple_order_payments(cash_session_id)
      `);
    }
  },

  {
    version: 13,
    name: 'add_cash_permissions',
    isApplied: async (client) => {
      const { rows } = await client.query(`
        SELECT id FROM permissions 
      WHERE name = 'Abrir caja' 
      LIMIT 1;
      `);
      return rows.length > 0;
    },
    up: async (client) => {
      await client.query(`
        INSERT INTO permissions (name, description, active)
        VALUES
          ('Abrir Caja', 'Abre una caja', true),
          ('Cerrar Caja', 'Cierra una caja', true),
          ('Ver Caja', 'Puede ver los movimientos de la caja', true),
          ('Registrar Egreso', 'Puede registrar egresos', true);
      `);
      await client.query(`
        INSERT INTO user_permissions (user_id, permission_id, active)
        SELECT u.id, p.id, true
        FROM users u
        CROSS JOIN permissions p
        WHERE u.id = 1
        AND p.name IN ('Abrir Caja', 'Cerrar Caja', 'Ver Caja', 'Registrar Egreso');
      `)
    }
  },

  // AGREGA NUEVAS MIGRACIONES AQUÍ
];

// RUNNER PRINCIPAL
async function runMigrations(db, client) {
  // 1. Crear tabla de control si no existe
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER      PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  // 2. Leer versiones ya aplicadas
  const { rows: appliedRows } = await client.query(
    `SELECT version FROM schema_migrations ORDER BY version ASC`
  );
  const appliedVersions = new Set(appliedRows.map(r => r.version));

  // 3. Bootstrap: BD existente sin registro de versiones.
  //    Llama a isApplied() por migración para detectar el estado
  //    real de la BD. Las migraciones sin isApplied() (v1-v7)
  //    se asumen aplicadas si la BD ya tiene usuarios.
  if (appliedVersions.size === 0) {
    const { rows: [{ count }] } = await client.query(
      `SELECT COUNT(*) as count FROM users`
    );
    if (parseInt(count) > 0) {
      console.log('Bootstrap: BD existente detectada. Inspeccionando estado...');
      for (const m of MIGRATIONS) {
        const alreadyApplied = m.isApplied
          ? await m.isApplied(client)
          : true; // v1-v7 sin función de detección → asumir aplicadas
        if (alreadyApplied) {
          await client.query(
            `INSERT INTO schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [m.version, m.name]
          );
          appliedVersions.add(m.version);
          console.log(`v${m.version} (${m.name}): ya aplicada.`);
        } else {
          console.log(`v${m.version} (${m.name}): pendiente, se aplicará ahora.`);
        }
      }
      console.log('Bootstrap completado.');
    }
  }

  // 4. Ejecutar migraciones pendientes en orden estricto
  let ran = 0;
  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) continue;

    console.log(`Migración v${migration.version} (${migration.name})...`);
    try {
      await client.query('BEGIN');
      await migration.up(client);
      await client.query(
        `INSERT INTO schema_migrations (version, name) VALUES ($1, $2)`,
        [migration.version, migration.name]
      );
      await client.query('COMMIT');
      console.log(`v${migration.version} aplicada.`);
      ran++;
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(`Error en migración v${migration.version}: ${e.message}`);
      throw new Error(`Fallo en migración v${migration.version} — se hizo rollback: ${e.message}`);
    }
  }

  if (ran === 0) {
    console.log('No hay migraciones pendientes.');
  } else {
    console.log(`${ran} migración(es) aplicada(s) exitosamente.`);
  }
}

module.exports = { runMigrations };
