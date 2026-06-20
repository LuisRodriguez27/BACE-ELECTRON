---
name: front-new-module-integration
description: "Triggers when implementing a new page or module in the React frontend, adding state stores, API services, routing components, and layout views."
---

# Frontend New Module Integration Guide

This skill details how to integrate a new module on the Vite/React frontend, using an audit trail or **`Bitacora`** (logbook) module as a concrete guide, explaining the form structure, validation schemas, and state management.

---

## 1. Directory Structure

When adding a new frontend module, create or modify:

```text
renderer/src/
 ├── features/bitacora/                       <-- Feature folder
 │    ├── components/                         <-- Modal/Form sub-components
 │    │    └── CreateBitacoraModal.tsx        <-- Modal with React Hook Form
 │    ├── BitacoraApiService.ts                <-- API Service wrapper
 │    ├── index.tsx                            <-- Core feature view component
 │    └── types.ts                             <-- Zod Schemas & TypeScript interfaces
 ├── routes/
 │    └── dashboard.bitacora.tsx               <-- Route registration
 └── components/layout/
      └── Sidebar.tsx                          <-- [MODIFY] Add navigation link
```

---

## 2. Integration Recipe

### Step 1: Types & Zod Validation Schemas (`features/bitacora/types.ts`)
Form schemas must be defined using **Zod** to validate structures before submission. TypeScript types are then inferred dynamically:

```typescript
import { z } from 'zod';

// 1. Zod validation schema
export const createBitacoraSchema = z.object({
  accion: z.string().min(3, 'El nombre de la acción debe tener al menos 3 caracteres'),
  detalles: z.string().optional(),
});

// 2. Inferred form payload types
export type CreateBitacoraForm = z.infer<typeof createBitacoraSchema>;

// 3. Model entity interface
export interface Bitacora {
  id: number;
  user_id: number;
  accion: string;
  detalles?: string | Record<string, any>;
  date: string;
}
```

---

### Step 2: Form & Modal Component (`features/bitacora/components/CreateBitacoraModal.tsx`)
Forms are structured using **React Hook Form** combined with `@hookform/resolvers/zod` to bind the schema validation. IPC errors are caught and cleaned using `extractErrorMessage`:

```tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { extractErrorMessage } from '@/utils/errorHandling';
import { BitacoraApiService } from '../BitacoraApiService';
import { createBitacoraSchema, type CreateBitacoraForm } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (item: any) => void;
}

export const CreateBitacoraModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateBitacoraForm>({
    resolver: zodResolver(createBitacoraSchema)
  });

  const onSubmit = async (data: CreateBitacoraForm) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const newLog = await BitacoraApiService.create(data);
      onCreated(newLog);
      reset();
      onClose();
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold">Registrar Acción</h2>
        {error && <div className="text-red-600 my-2 text-sm">{error}</div>}
        
        <div className="mt-4">
          <label className="block text-sm">Nombre de la acción *</label>
          <input className="w-full border p-2 rounded mt-1" {...register('accion')} />
          {errors.accion && <p className="text-red-500 text-xs mt-1">{errors.accion.message}</p>}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} className="border px-4 py-2 rounded">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded">
            {isSubmitting ? 'Registrando...' : 'Registrar'}
          </button>
        </div>
      </form>
    </div>
  );
};
```

---

### Step 3: Implement API Service (`features/bitacora/BitacoraApiService.ts`)
Create a service class mapping methods to `window.api` calls:
```typescript
import type { Bitacora, CreateBitacoraForm } from './types';

export const BitacoraApiService = {
  findPaginated: async (page: number, limit: number): Promise<{ data: Bitacora[] }> => {
    return window.api.getBitacoras(page, limit);
  },
  create: async (data: CreateBitacoraForm): Promise<Bitacora> => {
    return window.api.createBitacora(data);
  },
};
```

---

### Step 4: Create Router Entry (`routes/dashboard.bitacora.tsx`)
Register the sub-route under `/dashboard` with TanStack Router. Point the route's component key to the default export of the feature folder:
```tsx
import { createFileRoute } from '@tanstack/react-router';
import RouteComponent from '@/features/bitacora';

export const Route = createFileRoute('/dashboard/bitacora')({
  component: RouteComponent,
});
```

*Note: TanStack Router will automatically rebuild the route tree in [routeTree.gen.ts](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/renderer/src/routeTree.gen.ts).*

---

### Step 5: Wire Navigation Link (`components/layout/Sidebar.tsx`)
Add the path definition inside the `menuItems` array in [Sidebar.tsx](file:///c:/Users/Luis/Documents/PROJECTS/BACE-ELECTRON/renderer/src/components/layout/Sidebar.tsx):
```typescript
{
  id: 'bitacora',
  label: 'Bitácora',
  icon: Printer,
  path: '/dashboard/bitacora'
}
```
If access control is required, filter using `canAccess('Ver Bitacora')`.
