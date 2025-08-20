const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {

  // Usuarios
  getAllUsers: () => ipcRenderer.invoke('users:getAll'),
  getUserById: (id) => ipcRenderer.invoke('users:getById', id),
  createUser: (data) => ipcRenderer.invoke('users:create', data),
  updateUser: (id, username, password) => ipcRenderer.invoke('users:update', id, username, password),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),

  // Permisos
  getAllPermissions: () => ipcRenderer.invoke('permissions:getAll'),
  getPermissionsById: (id) => ipcRenderer.invoke('permissions:getById', id),
  getPermissionsByUserId: (userId) => ipcRenderer.invoke('permissions:getByUserId', userId),
  createPermission: (data) => ipcRenderer.invoke('permissions:create', data),
  updatePermission: (id, data) => ipcRenderer.invoke('permissions:update', id, data),
  deletePermission: (id) => ipcRenderer.invoke('permissions:delete', id),
  assignPermissionToUser: (data) => ipcRenderer.invoke('permissions:assignToUser', data),
  removePermissionFromUser: (data) => ipcRenderer.invoke('permissions:removeFromUser', data),

});
