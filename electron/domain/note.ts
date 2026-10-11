import type { NoteRow, NoteStatus } from '../types/domain';

class Note {
  id: number;
  created_by: number;
  edited_by: number;
  client: string | null;
  phone: string | null;
  text: string | null;
  date: string;
  status: NoteStatus;
  active: boolean;
  created_by_username: string | null;
  edited_by_username: string | null;

  constructor({ id, created_by, edited_by, client, phone, text, date, status, active, created_by_username, edited_by_username }: NoteRow) {
    this.id = id;
    this.created_by = created_by;
    this.edited_by = edited_by;
    this.client = client;
    this.phone = phone;
    this.text = text;
    this.date = date;
    this.status = status;
    this.active = active;
    this.created_by_username = created_by_username || null;
    this.edited_by_username = edited_by_username || null;
  }

  isValid(): boolean {
    return !!(
      this.created_by && this.created_by > 0 &&
      this.edited_by && this.edited_by > 0 &&
      this.date && this.status && this.active !== undefined
    );
  }

  toPlainObject() {
    return { id: this.id, created_by: this.created_by, edited_by: this.edited_by, client: this.client, phone: this.phone, text: this.text, date: this.date, status: this.status, active: this.active, created_by_username: this.created_by_username, edited_by_username: this.edited_by_username };
  }
}

export default Note;
