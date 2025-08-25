import { useAuth } from "@/utils/auth";
import type { LoginData } from "./types";


export const authService = {
	logIn: async (credentials: LoginData) => {
		const response = await window.api.verifyPassword(credentials);
		return response
	},
	
	logOut: () => {
		useAuth.getState().reset();
	},

	getMe: async () => {
		const response = await window.api
	}
}