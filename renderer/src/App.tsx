// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.tsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>

//     </>
//   )
// }

// export default App



import { useEffect, useState } from 'react';
import type { Client } from './types/global';

function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClients = async () => {
    try {
      setLoading(true);
      const result = await window.electron.getAllClients();
      setClients(result);
      console.log("Clientes cargados:", result);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    try {
      const newClient = { 
        name: 'Nuevo Cliente', 
        phone: "5551234567", 
        address: "Oaxaca", 
        description: "Cliente frecuente" 
      };
      
      const result = await window.electron.createClient(newClient);
      console.log('Cliente creado:', result);
      
      // Recargar la lista de clientes
      await loadClients();
    } catch (err) {
      console.error('Error creating client:', err);
      setError('Error al crear cliente');
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gestión de Clientes</h1>
      
      <button 
        onClick={handleCreateClient}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4 hover:bg-blue-600"
      >
        Crear Cliente de Prueba
      </button>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Lista de Clientes ({clients.length})</h2>
        {clients.length === 0 ? (
          <p>No hay clientes registrados.</p>
        ) : (
          <ul className="space-y-2">
            {clients.map((client) => (
              <li key={client.id} className="border p-3 rounded">
                <div><strong>Nombre:</strong> {client.name}</div>
                <div><strong>Teléfono:</strong> {client.phone || 'N/A'}</div>
                <div><strong>Dirección:</strong> {client.address || 'N/A'}</div>
                <div><strong>Descripción:</strong> {client.description || 'N/A'}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
