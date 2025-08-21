import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
	const fecha = new Date(date);

	const opciones: Intl.DateTimeFormatOptions = {
		timeZone: "America/Mexico_City",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false
	};

	// Esto da: "21/08/2025, 14:35:22"
	const formateado = new Intl.DateTimeFormat("es-MX", opciones).format(fecha);

	// Convertirlo a formato SQLite: YYYY-MM-DD HH:MM:SS
	const [fechaParte, horaParte] = formateado.split(', ');
	const [dia, mes, anio] = fechaParte.split('/');
	return `${anio}-${mes}-${dia} ${horaParte}`;
}
