export interface SimpleOrderPayment {
  id: number;
  simple_order_id: number;
  user_id: number;
  user_username?: string;
  amount: number;
  date: string;
  descripcion?: string;
}

export interface SimpleOrder {
  id: number;
  user_id: number;
  date: string;
  concept: string;
  client_name?: string;
  total: number;
  active: boolean;
  user?: {
    id: number;
    username: string;
  };
  payments: SimpleOrderPayment[];
  totalPaid: number;
  balance: number;
}

export interface CreateSimpleOrderForm {
  user_id: number;
  date?: string;
  client_name?: string;
  concept: string;
  total: number;
  active?: boolean;
}

export interface CreateSimpleOrderPaymentForm {
  simple_order_id: number;
  user_id: number;
  amount: number;
  date?: string;
  descripcion?: string;
}

export interface UpdateSimpleOrderPaymentForm {
  amount: number;
  date?: string;
  descripcion?: string;
}
