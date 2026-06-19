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

import { PoolClient } from 'pg';
import type { Db } from './types/db';
import type { Migration } from './types/migrations';
import * as bcryptjs from 'bcryptjs';

const MIGRATIONS: Migration[] = [

  // v1: Seed inicial — usuario admin + todos los permisos base
  {
    version: 1,
    name: 'initial_seed',
    up: async (client: PoolClient) => {
      const hash = bcryptjs.hashSync('admin123', 10);

      const { rows: [admin] } = await client.query<{ id: number }>(
        `INSERT INTO users (username, password, active) VALUES ($1, $2, true) RETURNING id`,
        ['admin', hash]
      );

      const permissions: [string, string][] = [
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
        const { rows: [perm] } = await client.query<{ id: number }>(
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
    up: async (client: PoolClient) => {
      const newPerms: [string, string][] = [
        ['Estadisticas',          'Permite visualizar las estadisticas de ventas'],
        ['Editar Presupuestos',   'Permite editar los presupuestos registrados'],
        ['Ver Pagos',             'Permite ver los pagos registrados'],
        ['Estadisticas: Filtros', 'Permite filtrar las estadisticas'],
        ['Estadisticas: Hoy',     'Permite ver solo las estadisticas de hoy'],
      ];

      const { rows: admins } = await client.query<{ id: number }>(
        `SELECT id FROM users WHERE username = 'admin'`
      );

      for (const [name, description] of newPerms) {
        const { rows: [perm] } = await client.query<{ id: number }>(
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
    up: async (client: PoolClient) => {
      await client.query(`UPDATE orders SET status = 'Revision'   WHERE status = 'pendiente'`);
      await client.query(`UPDATE orders SET status = 'Produccion' WHERE status = 'en proceso'`);
      await client.query(`UPDATE orders SET status = 'Completado' WHERE status = 'completado'`);
      await client.query(`UPDATE orders SET status = 'Cancelado'  WHERE status = 'cancelado'`);
    }
  },

  // v4: Nuevas columnas en products
  {
    version: 4,
    name: 'add_product_price_columns',
    up: async (client: PoolClient) => {
      await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price    DECIMAL(10,2)`);
      await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10,2)`);
      await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS images         TEXT`);
    }
  },

  // v5: Nuevas columnas en product_templates y simple_orders
  {
    version: 5,
    name: 'add_template_and_simple_orders_columns',
    up: async (client: PoolClient) => {
      await client.query(`ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS promo_price    DECIMAL(10,2)`);
      await client.query(`ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS discount_price DECIMAL(10,2)`);
      await client.query(`ALTER TABLE simple_orders     ADD COLUMN IF NOT EXISTS client_name    VARCHAR(255)`);
    }
  },

  // v6: payments.order_id nullable + columna info
  {
    version: 6,
    name: 'payments_nullable_order_id_and_info',
    up: async (client: PoolClient) => {
      await client.query(`ALTER TABLE payments ALTER COLUMN order_id DROP NOT NULL`);
      await client.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS info TEXT`);
    }
  },

  // v7: Arrancar el SERIAL de orders desde 14549
  {
    version: 7,
    name: 'orders_id_seq_min_value',
    up: async (client: PoolClient) => {
      await client.query(`SELECT setval('orders_id_seq', 14549, false)`);
    }
  },

  // v8: Convertir columnas active de INTEGER → BOOLEAN
  {
    version: 8,
    name: 'convert_active_to_boolean',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ data_type: string; column_default: string | null }>(
        `SELECT data_type, column_default FROM information_schema.columns
         WHERE table_name = 'users' AND column_name = 'active'`
      );
      return rows.length > 0 && rows[0].data_type === 'boolean' && rows[0].column_default !== null;
    },
    up: async (client: PoolClient) => {
      const tables = [
        'users', 'permissions', 'user_permissions', 'clients',
        'products', 'product_templates', 'budgets', 'orders', 'simple_orders'
      ];
      for (const table of tables) {
        const { rows } = await client.query<{ data_type: string }>(
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
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ data_type: string }>(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = 'orders' AND column_name = 'date'`
      );
      return rows.length > 0 && rows[0].data_type === 'timestamp with time zone';
    },
    up: async (client: PoolClient) => {
      const columns = [
        { table: 'budgets',               column: 'date' },
        { table: 'orders',                column: 'date' },
        { table: 'orders',                column: 'estimated_delivery_date' },
        { table: 'payments',              column: 'date' },
        { table: 'simple_orders',         column: 'date' },
        { table: 'simple_order_payments', column: 'date' },
      ];
      for (const { table, column } of columns) {
        const { rows } = await client.query<{ data_type: string }>(
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
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ '?column?': number }>(
        `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_client_id'`
      );
      return rows.length > 0;
    },
    up: async (client: PoolClient) => {
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
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(
        `SELECT COUNT(*) FROM information_schema.tables
         WHERE table_name IN ('cash_sessions', 'expenses')`
      );
      return parseInt(rows[0].count) === 2;
    },
    up: async (client: PoolClient) => {
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
        CREATE INDEX IF NOT EXISTS idx_cash_sessions_active_status             ON cash_sessions(status) WHERE status = 'open';
        CREATE INDEX IF NOT EXISTS idx_cash_sessions_date_range                ON cash_sessions(opening_date, closing_date);
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
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(`
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name IN ('payments', 'simple_order_payments')
          AND column_name = 'cash_session_id'
      `);
      return parseInt(rows[0].count) === 2;
    },
    up: async (client: PoolClient) => {
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
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ id: number }>(`
        SELECT id FROM permissions
        WHERE name = 'Abrir caja'
        LIMIT 1;
      `);
      return rows.length > 0;
    },
    up: async (client: PoolClient) => {
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
        AND p.name IN ('Abrir Caja', 'Cerrar Caja', 'Ver Caja', 'Registrar Egreso')
      `);
    }
  },

  {
    version: 14,
    name: 'add_delivered_and_paid_to_order_products',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(`
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = 'order_products'
          AND column_name IN ('is_delivered', 'is_paid')
      `);
      return parseInt(rows[0].count) === 2;
    },
    up: async (client: PoolClient) => {
      await client.query(`
        ALTER TABLE order_products
          ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN NOT NULL DEFAULT FALSE
      `);
      await client.query(`
        ALTER TABLE order_products
          ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE
      `);
    }
  },

  // v15: Crear extensiones unaccent y pg_trgm para búsquedas difusas
  {
    version: 15,
    name: 'add_search_extensions',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(`
        SELECT COUNT(*) FROM pg_extension
        WHERE extname IN ('unaccent', 'pg_trgm')
      `);
      return parseInt(rows[0].count) >= 2;
    },
    up: async (client: PoolClient) => {
      await client.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
      await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    }
  },

  // v16: Agregar columna client_phone a simple_orders
  {
    version: 16,
    name: 'add_client_phone_to_simple_orders',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(`
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = 'simple_orders'
          AND column_name = 'client_phone'
      `);
      return parseInt(rows[0].count) === 1;
    },
    up: async (client: PoolClient) => {
      await client.query(`
        ALTER TABLE simple_orders
          ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50)
      `);
    }
  },

  // v17: Agregar columna phone a payments para pagos libres
  {
    version: 17,
    name: 'add_phone_to_payments',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(`
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = 'payments'
          AND column_name = 'phone'
      `);
      return parseInt(rows[0].count) === 1;
    },
    up: async (client: PoolClient) => {
      await client.query(`
        ALTER TABLE payments
          ADD COLUMN IF NOT EXISTS phone VARCHAR(50)
      `);
    }
  },

  // v18: Agregar columna client_name a payments para pagos libres
  {
    version: 18,
    name: 'add_client_name_to_payments',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(`
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = 'payments'
          AND column_name = 'client_name'
      `);
      return parseInt(rows[0].count) === 1;
    },
    up: async (client: PoolClient) => {
      await client.query(`
        ALTER TABLE payments
          ADD COLUMN IF NOT EXISTS client_name VARCHAR(255)
      `);
    }
  },

  // v19: Agregar permisos de mayoristas
  {
    version: 19,
    name: 'add_supplier_permissions',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ id: number }>(`
        SELECT id FROM permissions
        WHERE name = 'Ver Mayoristas'
        LIMIT 1;
      `);
      return rows.length > 0;
    },
    up: async (client: PoolClient) => {
      await client.query(`
        INSERT INTO permissions (name, description, active)
        VALUES
          ('Ver Mayoristas', 'Permite ver el módulo de mayoristas/proveedores', true),
          ('Crear Orden Mayorista', 'Permite crear una orden para un mayorista', true)
        ON CONFLICT (name) DO UPDATE SET active = true;
      `);
      await client.query(`
        INSERT INTO user_permissions (user_id, permission_id, active)
        SELECT u.id, p.id, true
        FROM users u
        CROSS JOIN permissions p
        WHERE u.id = 1
          AND p.name IN ('Ver Mayoristas', 'Crear Orden Mayorista')
        ON CONFLICT DO NOTHING;
      `);
    }
  },

  // v20: Agregar columna user_id a supplier_orders
  {
    version: 20,
    name: 'add_user_id_to_supplier_orders',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(`
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = 'supplier_orders'
          AND column_name = 'user_id'
      `);
      return parseInt(rows[0].count) === 1;
    },
    up: async (client: PoolClient) => {
      await client.query(`
        ALTER TABLE supplier_orders
          ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_supplier_orders_user_id
          ON supplier_orders(user_id)
      `);
    }
  },

  // v21: Agregar permiso de reabrir caja
  {
    version: 21,
    name: 'add_reopen_cash_permission',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ id: number }>(`
        SELECT id FROM permissions
        WHERE name = 'Reabrir Caja'
        LIMIT 1;
      `);
      return rows.length > 0;
    },
    up: async (client: PoolClient) => {
      await client.query(`
        INSERT INTO permissions (name, description, active)
        VALUES
          ('Reabrir Caja', 'Permite volver a abrir una sesión de caja cerrada', true)
        ON CONFLICT (name) DO UPDATE SET active = true;
      `);
      await client.query(`
        INSERT INTO user_permissions (user_id, permission_id, active)
        SELECT u.id, p.id, true
        FROM users u
        CROSS JOIN permissions p
        WHERE u.id = 1
          AND p.name = 'Reabrir Caja'
        ON CONFLICT DO NOTHING;
      `);
    }
  },

  // v22: Crear tabla de bitácora de impresión y agregar permisos correspondientes
  {
    version: 22,
    name: 'create_print_logs_table',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(`
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_name = 'print_logs'
      `);
      return parseInt(rows[0].count) === 1;
    },
    up: async (client: PoolClient) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS print_logs (
          id                   SERIAL        PRIMARY KEY,
          order_id             INTEGER       REFERENCES orders(id) ON DELETE SET NULL,
          descripcion          TEXT          NOT NULL,
          hora_entrega         TIMESTAMPTZ   NOT NULL,
          responsable          VARCHAR(255)  NOT NULL CHECK (responsable IN ('most', 'maq')),
          observaciones        TEXT,
          envio                VARCHAR(255)  NOT NULL,
          pago                 DECIMAL(10,2),
          maquila_completada   BOOLEAN       NOT NULL DEFAULT FALSE,
          mostrador_completado BOOLEAN       NOT NULL DEFAULT FALSE,
          created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
          active               BOOLEAN       NOT NULL DEFAULT TRUE
        );
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_print_logs_order_id ON print_logs(order_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_print_logs_active ON print_logs(active);`);
      await client.query(`
        INSERT INTO permissions (name, description, active)
        VALUES
          ('Ver Bitacora de Impresion', 'Permite ver la bitácora de impresión', true),
          ('Gestionar Bitacora de Impresion', 'Permite crear, editar y eliminar registros de la bitácora de impresión', true)
        ON CONFLICT (name) DO UPDATE SET active = true;
      `);
      await client.query(`
        INSERT INTO user_permissions (user_id, permission_id, active)
        SELECT u.id, p.id, true
        FROM users u
        CROSS JOIN permissions p
        WHERE u.id = 1
          AND p.name IN ('Ver Bitacora de Impresion', 'Gestionar Bitacora de Impresion')
        ON CONFLICT DO NOTHING;
      `);
    }
  },

  // v23: Agregar columnas faltantes a print_logs si ya existía la tabla
  {
    version: 23,
    name: 'add_print_logs_missing_columns',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(`
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = 'print_logs' AND column_name = 'created_at'
      `);
      return parseInt(rows[0].count) === 1;
    },
    up: async (client: PoolClient) => {
      await client.query(`
        ALTER TABLE print_logs
          ADD COLUMN IF NOT EXISTS maquila_completada BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS mostrador_completado BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      `);
      await client.query(`
        ALTER TABLE print_logs
          DROP CONSTRAINT IF EXISTS chk_responsable,
          ADD CONSTRAINT chk_responsable CHECK (responsable IN ('most', 'maq'));
      `);
    }
  },

  // v24: Agregar columna status a print_logs
  {
    version: 24,
    name: 'add_print_logs_status_column',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(`
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = 'print_logs' AND column_name = 'status'
      `);
      return parseInt(rows[0].count) === 1;
    },
    up: async (client: PoolClient) => {
      await client.query(`
        ALTER TABLE print_logs
          ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'Pendiente'
          CHECK (status IN ('Pendiente', 'En Proceso', 'Realizado'));
      `);
    }
  },

  // v25: Renombrar maquila_completada → completado y eliminar mostrador_completado
  {
    version: 25,
    name: 'rename_maquila_completada_to_completado_and_drop_mostrador_completado',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(`
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = 'print_logs' AND column_name = 'completado'
      `);
      return parseInt(rows[0].count) === 1;
    },
    up: async (client: PoolClient) => {
      await client.query(`ALTER TABLE print_logs RENAME COLUMN maquila_completada TO completado;`);
      await client.query(`ALTER TABLE print_logs DROP COLUMN IF EXISTS mostrador_completado;`);
    }
  },

  // v26: total en supplier_orders, supplier_order_id en expenses, normalizar estados
  {
    version: 26,
    name: 'add_total_to_supplier_orders_and_supplier_order_id_to_expenses_and_normalize_statuses',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(`
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = 'supplier_orders' AND column_name = 'total'
      `);
      return parseInt(rows[0].count) === 1;
    },
    up: async (client: PoolClient) => {
      await client.query(`ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS total DECIMAL(10,2) DEFAULT 0`);
      await client.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_order_id INTEGER REFERENCES supplier_orders(id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_supplier_order_id ON expenses(supplier_order_id)`);
      await client.query(`
        UPDATE supplier_orders
        SET status = 'pendiente'
        WHERE LOWER(status) = 'recibido' OR LOWER(status) = 'pendiente' OR status IS NULL
      `);
      await client.query(`
        UPDATE supplier_orders
        SET status = 'cancelado'
        WHERE LOWER(status) = 'cancelado'
      `);
    }
  },

  // v27: Actualizar estados entregado → pagado en supplier_orders
  {
    version: 27,
    name: 'update_supplier_order_statuses_to_remove_entregado',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(`
        SELECT COUNT(*) FROM schema_migrations WHERE version = 27
      `);
      return parseInt(rows[0].count) === 1;
    },
    up: async (client: PoolClient) => {
      await client.query(`
        UPDATE supplier_orders
        SET status = 'pagado'
        WHERE LOWER(status) = 'entregado'
      `);
    }
  },

  // v28: Convertir budgets.converted_to_order de INTEGER → BOOLEAN
  {
    version: 28,
    name: 'convert_converted_to_order_to_boolean',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ data_type: string }>(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = 'budgets' AND column_name = 'converted_to_order'`
      );
      return rows.length > 0 && rows[0].data_type === 'boolean';
    },
    up: async (client: PoolClient) => {
      await client.query(`ALTER TABLE budgets ALTER COLUMN converted_to_order DROP DEFAULT`);
      await client.query(`ALTER TABLE budgets ALTER COLUMN converted_to_order TYPE BOOLEAN USING (converted_to_order = 1)`);
      await client.query(`ALTER TABLE budgets ALTER COLUMN converted_to_order SET DEFAULT FALSE`);
    }
  },

  // v29: Quitar constraint único de username en users y agregar índice único parcial para usuarios activos
  {
    version: 29,
    name: 'remove_users_username_unique_constraint_and_add_partial_unique_index',
    isApplied: async (client: PoolClient) => {
      const { rows } = await client.query<{ count: string }>(`
        SELECT COUNT(*) FROM pg_indexes
        WHERE indexname = 'idx_users_username_active'
      `);
      return parseInt(rows[0].count) === 1;
    },
    up: async (client: PoolClient) => {
      await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key`);
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_active ON users(username) WHERE active = true`);
    }
  }
];

// ─── RUNNER PRINCIPAL ───────────────────────────────────────────────────────

export async function runMigrations(db: Db, client: PoolClient): Promise<void> {
  // 1. Crear tabla de control si no existe
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER      PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  // 2. Leer versiones ya aplicadas
  const { rows: appliedRows } = await client.query<{ version: number }>(
    `SELECT version FROM schema_migrations ORDER BY version ASC`
  );
  const appliedVersions = new Set(appliedRows.map(r => r.version));

  // 3. Bootstrap: BD existente sin registro de versiones.
  //    Llama a isApplied() por migración para detectar el estado
  //    real de la BD. Las migraciones sin isApplied() (v1-v7)
  //    se asumen aplicadas si la BD ya tiene usuarios.
  if (appliedVersions.size === 0) {
    const { rows: [{ count }] } = await client.query<{ count: string }>(
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
      const err = e as Error;
      console.error(`Error en migración v${migration.version}: ${err.message}`);
      throw new Error(`Fallo en migración v${migration.version} — se hizo rollback: ${err.message}`);
    }
  }

  if (ran === 0) {
    console.log('No hay migraciones pendientes.');
  } else {
    console.log(`${ran} migración(es) aplicada(s) exitosamente.`);
  }
}

