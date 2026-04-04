require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

// Definir el BASE_PATH desde las variables de entorno, o uno por defecto
class ImageService {
  getBasePath() {
    const { app } = require('electron');
    const isDev = !app.isPackaged;

    if (isDev) {
      return process.env.DEV_BASE_PATH || path.normalize(path.join(app.getPath('userData'), 'dev_images'));
    }

    const ip = process.env.NAS_IP ? process.env.NAS_IP.trim() : null;
    const nasPath = process.env.NAS_PATH ? process.env.NAS_PATH.trim() : null;

    if (ip && nasPath) {
      // Remover barras/slashes iniciales de nasPath para que la concatenación no se rompa (ej. \\192.168.1.90\\carpeta)
      const cleanNasPath = nasPath.replace(/^[/\\]+/, '');
      return path.normalize(`\\\\${ip}\\${cleanNasPath}`);
    }

    return process.env.BASE_PATH || 'C:\\NAS\\Imagenes';
  }

  async uploadImage(productId, buffer, originalName) {
    try {
      if (!buffer || buffer.length === 0) {
        throw new Error('El archivo está vacío o es inválido.');
      }

      // 1. Validar el tipo MIME
      const mimeType = mime.lookup(originalName);
      if (!mimeType || !mimeType.startsWith('image/')) {
        throw new Error('El archivo proporcionado no es una imagen válida.');
      }

      if (!productId) {
        throw new Error('El ID del producto es obligatorio.');
      }

      const basePath = this.getBasePath();

      // 2. Generar nombre único usando UUID
      const ext = path.extname(originalName) || `.${mime.extension(mimeType) || 'jpg'}`;
      const uniqueName = `${uuidv4()}${ext}`;
      
      // 3. Crear la ruta relativa plana (directamente en la raíz del NAS/Dev folder)
      const relativePath = `producto_${productId}_${uniqueName}`;

      // 4. Generar rutas absolutas
      const absoluteFolder = path.normalize(basePath);
      const absolutePathTmp = path.normalize(path.join(basePath, `${relativePath}.tmp`));
      const absolutePathFinal = path.normalize(path.join(basePath, relativePath));

      // 5. Seguridad: Evitar ataques de path traversal (Directory Traversal)
      if (!absolutePathTmp.startsWith(absoluteFolder)) {
        throw new Error('Intento de salto de directorio bloqueado.');
      }

      // 6. Crear la sub-carpeta en el NAS si no existe
      await fs.ensureDir(absoluteFolder);

      // 7. Escritura Atómica
      // Paso 1: Guardar archivo temporal
      await fs.writeFile(absolutePathTmp, buffer);
      
      // Paso 2: Verificar integridad
      const stats = await fs.stat(absolutePathTmp);
      if (stats.size !== buffer.length) {
        await fs.remove(absolutePathTmp); // Limpieza si falla
        throw new Error('La validación de tamaño del archivo ha fallado (posible error de red con el NAS).');
      }

      // Paso 3: Renombrar al archivo definitivo
      await fs.rename(absolutePathTmp, absolutePathFinal);

      // 8. Retornar ruta relativa para guardar en BD
      return {
        success: true,
        relativePath: relativePath
      };

    } catch (error) {
      console.error('Error en el proceso de subida de imagen al NAS:', error.message);
      // Extraemos códigos de error para NAS caídos
      if (error.code === 'ENOENT' || error.code === 'ETIMEDOUT' || error.code === 'ENOTDIR') {
        throw new Error(`Fallo de conexión/acceso con el NAS: ${error.message}`);
      }
      throw error;
    }
  }

  async deleteImage(relativePath) {
    try {
      if (!relativePath) {
        throw new Error('Se requiere la ruta relativa de la imagen a eliminar.');
      }

      const basePath = this.getBasePath();
      const absolutePath = path.normalize(path.join(basePath, relativePath));
      
      // 1. Seguridad: Evitar ataques de Path Traversal
      if (!absolutePath.startsWith(path.normalize(basePath))) {
        throw new Error('Intento de salto de directorio bloqueado.');
      }

      // 2. Comprobar previa existencia
      const exists = await fs.pathExists(absolutePath);
      if (!exists) {
        return { 
          success: false, 
          message: 'El archivo indicado para eliminar no existe.' 
        };
      }

      // 3. Eliminar archivo
      await fs.remove(absolutePath);
      return { 
        success: true,
        message: 'Archivo eliminado correctamente.' 
      };
    } catch (error) {
      console.error('Error al eliminar la imagen del NAS:', error.message);
      // Extraemos códigos de error comunes de NAS
      if (error.code === 'ENOENT' || error.code === 'ETIMEDOUT') {
        throw new Error(`Fallo de conexión/acceso con el NAS: ${error.message}`);
      }
      throw error;
    }
  }
}

module.exports = new ImageService();
