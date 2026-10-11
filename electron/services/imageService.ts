import '../env';
import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime-types';

interface UploadResult { success: boolean; relativePath?: string; }
interface DeleteResult { success: boolean; message: string; }

class ImageService {
  getBasePath(): string {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron');
    const isDev = !app.isPackaged;

    if (isDev) {
      return process.env.DEV_BASE_PATH || path.normalize(path.join(app.getPath('userData'), 'dev_images'));
    }

    const ip = process.env.NAS_IP ? process.env.NAS_IP.trim() : null;
    const nasPath = process.env.NAS_PATH ? process.env.NAS_PATH.trim() : null;

    if (ip && nasPath) {
      const cleanNasPath = nasPath.replace(/^[/\\]+/, '');
      return path.normalize(`\\\\${ip}\\${cleanNasPath}`);
    }

    return process.env.BASE_PATH || 'C:\\NAS\\Imagenes';
  }

  async uploadImage(productId: number, buffer: Buffer, originalName: string): Promise<UploadResult> {
    try {
      if (!buffer || buffer.length === 0) throw new Error('El archivo está vacío o es inválido.');
      const mimeType = mime.lookup(originalName) as string | false;
      if (!mimeType || !mimeType.startsWith('image/')) throw new Error('El archivo proporcionado no es una imagen válida.');
      if (!productId) throw new Error('El ID del producto es obligatorio.');

      const basePath = this.getBasePath();
      const ext = path.extname(originalName) || `.${mime.extension(mimeType) || 'jpg'}`;
      const uniqueName = `${uuidv4()}${ext}`;
      const relativePath = `producto_${productId}_${uniqueName}`;

      const absoluteFolder = path.normalize(basePath);
      const absolutePathTmp = path.normalize(path.join(basePath, `${relativePath}.tmp`));
      const absolutePathFinal = path.normalize(path.join(basePath, relativePath));

      if (!absolutePathTmp.startsWith(absoluteFolder)) throw new Error('Intento de salto de directorio bloqueado.');

      await fs.ensureDir(absoluteFolder);
      await fs.writeFile(absolutePathTmp, buffer);

      const stats = await fs.stat(absolutePathTmp);
      if (stats.size !== buffer.length) {
        await fs.remove(absolutePathTmp);
        throw new Error('La validación de tamaño del archivo ha fallado (posible error de red con el NAS).');
      }

      await fs.rename(absolutePathTmp, absolutePathFinal);
      return { success: true, relativePath };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      console.error('Error en el proceso de subida de imagen al NAS:', err.message);
      if (err.code === 'ENOENT' || err.code === 'ETIMEDOUT' || err.code === 'ENOTDIR') {
        throw new Error(`Fallo de conexión/acceso con el NAS: ${err.message}`);
      }
      throw error;
    }
  }

  async deleteImage(relativePath: string): Promise<DeleteResult> {
    try {
      if (!relativePath) throw new Error('Se requiere la ruta relativa de la imagen a eliminar.');
      const basePath = this.getBasePath();
      const absolutePath = path.normalize(path.join(basePath, relativePath));

      if (!absolutePath.startsWith(path.normalize(basePath))) throw new Error('Intento de salto de directorio bloqueado.');

      const exists = await fs.pathExists(absolutePath);
      if (!exists) return { success: false, message: 'El archivo indicado para eliminar no existe.' };

      await fs.remove(absolutePath);
      return { success: true, message: 'Archivo eliminado correctamente.' };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      console.error('Error al eliminar la imagen del NAS:', err.message);
      if (err.code === 'ENOENT' || err.code === 'ETIMEDOUT') {
        throw new Error(`Fallo de conexión/acceso con el NAS: ${err.message}`);
      }
      throw error;
    }
  }
}

export default new ImageService();
