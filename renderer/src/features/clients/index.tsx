import { useEffect, useState } from "react";
import { ClientApiService } from "./ClientApiService";
import type { Client } from "./types";

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      const data = await ClientApiService.findAll();
      setClients(data);
    };
    fetchClients();
  }, []);

  return (
    <div>
      <h2>Clientes</h2>
      <ul>
        {clients.map((c) => (
          <li key={c.id}>{c.name} - {c.phone}</li>
        ))}
      </ul>
    </div>
  );
}
