---
name: database-sql
description: "Triggers when interacting with PostgreSQL, managing database queries, using the connection pool, handling transactions with AsyncLocalStorage, or implementing logical soft deletes."
---

# PostgreSQL Database, Transactions, and Soft Deletes

This skill explains how to safely query the PostgreSQL database using the connection pool, coordinate transactions using `AsyncLocalStorage`, and handle logical deletions (soft deletes) in the backend.

---

## 1. Connection Pool and the `db` Wrapper (`electron/db.ts`)

Database connections are managed via a pool from the `pg` library. The primary database utility is [db.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/electron/db.ts).

### Core Methods on `db`:
* **`db.getOne<T>(sql, params)`**: Runs a parameterized query and returns the first row or `null` if no results are found.
  ```typescript
  const user = await db.getOne<UserRow>('SELECT * FROM users WHERE id = $1', [userId]);
  ```
* **`db.getAll<T>(sql, params)`**: Runs a parameterized query and returns an array of matching rows.
  ```typescript
  const activeUsers = await db.getAll<UserRow>('SELECT * FROM users WHERE active = TRUE');
  ```
* **`db.execute(sql, params)`**: Used for write queries (`INSERT`, `UPDATE`, `DELETE`). For `INSERT` queries without a `RETURNING` clause, the wrapper automatically appends `RETURNING *` to capture the generated ID. Returns `{ changes: number, lastInsertRowid: number | null }`.
  ```typescript
  const result = await db.execute('UPDATE users SET active = FALSE WHERE id = $1', [id]);
  ```
* **`db.exec(sql)`**: Runs raw SQL scripts (primarily used for system initialization and seeding).

---

## 2. Transactions via `AsyncLocalStorage`

When a business workflow requires executing multiple database operations atomically (where if one fails, all previous operations are rolled back), use a SQL transaction (`BEGIN`, `COMMIT`, `ROLLBACK`).

To avoid manually passing a transaction database client through multiple layers of repository methods, [db.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/electron/db.ts) encapsulates the active connection context using **`AsyncLocalStorage`**:

```typescript
const asyncLocalStorage = new AsyncLocalStorage<PoolClient>();
```

### How it works:
1. Calling `db.transaction(fn)` connects a client from the Pool, executes `BEGIN`, and places the client inside the `AsyncLocalStorage` context.
2. Inside the transaction callback `fn`, any calls made to `db.getOne`, `db.getAll`, or `db.execute` automatically detect the active transaction client via `asyncLocalStorage.getStore() ?? pool`.
3. If the callback resolves successfully, a `COMMIT` is executed. If any error is thrown, a `ROLLBACK` is performed automatically.
4. The database connection is released back to the pool in a `finally` block.

### Example in the Service Layer:
```typescript
import db from '../db';
import orderRepository from '../repositories/orderRepository';
import paymentRepository from '../repositories/paymentRepository';

class OrderService {
  async registerOrderAndPayment(orderData: CreateOrderData, paymentAmount: number) {
    return await db.transaction(async () => {
      // Both operations run on the exact same database connection under a single transaction block
      const order = await orderRepository.create(orderData);
      
      await paymentRepository.create({
        order_id: order.id,
        amount: paymentAmount,
        date: new Date().toISOString(),
        descripcion: 'Order advance payment'
      });
      
      return order;
    })();
  }
}
```

---

## 3. Logical Deletion (Soft Delete)

To preserve transactional history and avoid cascading database issues, the application **never physically deletes rows (`DELETE FROM ...`)** from main tables (such as `clients`, `products`, `expenses`, `orders`, or `users`).

### Implementation Pattern:
1. Tables are defined with an `active BOOLEAN NOT NULL DEFAULT TRUE` column.
2. Select queries in repositories always filter using `WHERE active = TRUE`.
3. The delete operation updates this flag to `FALSE`.

### Example in Repository (`expensesRepository.ts`):
```typescript
async delete(id: number): Promise<boolean> {
  const result = await db.execute(
    `UPDATE expenses SET active = FALSE WHERE id = $1 AND active = TRUE`, 
    [id]
  );
  return (result.changes ?? 0) > 0;
}
```

---

## 4. SQL Best Practices

* **Parameterized Queries**: Always use placeholders (`$1`, `$2`, etc.) when executing queries with dynamic variables. Never concatenate strings to build SQL queries, ensuring protection against SQL injection attacks.
* **Decimal Data Parser**: Postgres represents decimal and high-precision numbers as strings in JavaScript to avoid rounding issues. In `db.ts`, type parsers automatically cast `DECIMAL` types to float using `parseFloat`. Ensure that database models or service calculations sanitize numeric inputs using `parseFloat(String(value))` or `parseInt(String(value))` for logical validation consistency.
