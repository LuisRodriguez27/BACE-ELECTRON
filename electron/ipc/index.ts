import { registerUserIpc } from './userIpc';
import { registerAuthIpc } from './authIpc';
import { registerPermissionIpc } from './permissionIpc';
import { registerClientIpc } from './clientIpc';
import { registerProductIpc } from './productIpc';
import { registerProductTemplateIpc } from './productTemplateIpc';
import { registerOrderIpc } from './orderIpc';
import { registerPaymentIpc } from './paymentIpc';
import { registerBudgetIpc } from './budgetIpc';
import { registerStatsIpc } from './statsIpc';
import { registerSimpleOrderIpc } from './simpleOrderIpc';
import { registerCashSessionIpc } from './cashSessionIpc';
import { registerExpensesIpc } from './expensesIpc';
import { registerSupplierIpc } from './supplierIpc';
import { registerSupplierOrderIpc } from './supplierOrderIpc';
import { registerPrintLogIpc } from './printLogIpc';
import { registerImageIpc } from './imageIpc';

export function registerIpcHandlers(): void {
  registerUserIpc();
  registerAuthIpc();
  registerPermissionIpc();
  registerClientIpc();
  registerProductIpc();
  registerProductTemplateIpc();
  registerOrderIpc();
  registerPaymentIpc();
  registerBudgetIpc();
  registerStatsIpc();
  registerSimpleOrderIpc();
  registerCashSessionIpc();
  registerExpensesIpc();
  registerSupplierIpc();
  registerSupplierOrderIpc();
  registerPrintLogIpc();
  registerImageIpc();
}
