class Expenses {
	constructor({
		id,
		cash_session_id,
		user_id,
		edited_by,
		amount,
		description,
		date,
		active
	}) {
		this.id = id;
		this.cash_session_id = cash_session_id;
		this.user_id = user_id;
		this.edited_by = edited_by;
		this.amount = parseFloat(amount) || 0;
		this.description = description;
		this.date = date;
		this.active = active;
	}

	isValid() {
		return (
			this.cash_session_id &&
			this.cash_session_id > 0 &&
			this.user_id &&
			this.user_id > 0 &&
			typeof this.amount === 'number' &&
			this.amount > 0 &&
			!isNaN(this.amount) &&
			this.description &&
			this.date &&
			this.active
		);
	}

	toPlainObject() {
		return {
			id: this.id,
			cash_session_id: this.cash_session_id,
			user_id: this.user_id,
			edited_by: this.edited_by,
			amount: this.amount,
			description: this.description,
			date: this.date,
			active: this.active
		};
	}
}

module.exports = Expenses;